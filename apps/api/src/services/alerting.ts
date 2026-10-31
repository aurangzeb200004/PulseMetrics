import axios from 'axios';
import crypto from 'crypto';
import { getDb } from '../db';
import { wsManager } from './websocket';

interface AlertRule {
  id: string;
  project_id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  window_seconds: number;
  channel: string;
  webhook_url: string;
  active: number;
}

export async function evaluateAlertRules(projectId: string): Promise<void> {
  const db = getDb();

  const rules = db
    .prepare('SELECT * FROM alert_rules WHERE project_id = ? AND active = 1')
    .all(projectId) as unknown as AlertRule[];

  if (!rules || rules.length === 0) return;

  const now = Date.now();

  for (const rule of rules) {
    const windowStart = now - (rule.window_seconds || 300) * 1000;
    let currentValue = 0;

    if (rule.metric === 'error_rate') {
      const stats = db
        .prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
          FROM telemetry
          WHERE project_id = ? AND timestamp >= ?
        `)
        .get(projectId, windowStart) as any;

      const total = Number(stats?.total || 0);
      const errors = Number(stats?.errors || 0);
      currentValue = total > 0 ? (errors / total) * 100 : 0;
    } else if (rule.metric === 'p95_latency' || rule.metric === 'p99_latency') {
      const rows = db
        .prepare(`
          SELECT duration_ms 
          FROM telemetry 
          WHERE project_id = ? AND timestamp >= ?
          ORDER BY duration_ms ASC
        `)
        .all(projectId, windowStart) as unknown as { duration_ms: number }[];

      if (rows.length > 0) {
        const percentile = rule.metric === 'p95_latency' ? 0.95 : 0.99;
        const index = Math.min(Math.floor(rows.length * percentile), rows.length - 1);
        currentValue = rows[index].duration_ms;
      }
    } else if (rule.metric === 'avg_memory') {
      const avg = db
        .prepare(`
          SELECT AVG(memory_mb) as avg_mem 
          FROM telemetry 
          WHERE project_id = ? AND timestamp >= ?
        `)
        .get(projectId, windowStart) as any;

      currentValue = Number(avg?.avg_mem || 0);
    } else if (rule.metric === 'request_rate') {
      const count = db
        .prepare(`
          SELECT COUNT(*) as cnt 
          FROM telemetry 
          WHERE project_id = ? AND timestamp >= ?
        `)
        .get(projectId, windowStart) as any;

      currentValue = Number(count?.cnt || 0) / (rule.window_seconds || 60);
    }

    let isTriggered = false;
    switch (rule.operator) {
      case '>': isTriggered = currentValue > rule.threshold; break;
      case '>=': isTriggered = currentValue >= rule.threshold; break;
      case '<': isTriggered = currentValue < rule.threshold; break;
      case '<=': isTriggered = currentValue <= rule.threshold; break;
      case '==': isTriggered = currentValue === rule.threshold; break;
    }

    const activeAlert = db
      .prepare('SELECT * FROM alert_history WHERE rule_id = ? AND resolved_at IS NULL ORDER BY triggered_at DESC LIMIT 1')
      .get(rule.id) as any;

    if (isTriggered && !activeAlert) {
      const alertId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO alert_history (id, rule_id, triggered_at, value)
        VALUES (?, ?, ?, ?)
      `).run(alertId, rule.id, now, currentValue);

      console.warn(`[alert] Fired: "${rule.name}" (${rule.metric} = ${currentValue.toFixed(2)} ${rule.operator} ${rule.threshold})`);

      await dispatchAlertNotification(rule, currentValue, 'TRIGGERED');

      wsManager.broadcastToProject(projectId, {
        type: 'alert',
        data: {
          id: alertId,
          ruleName: rule.name,
          metric: rule.metric,
          value: currentValue,
          threshold: rule.threshold,
          status: 'TRIGGERED',
          timestamp: now,
        },
      });
    } else if (!isTriggered && activeAlert) {
      db.prepare(`
        UPDATE alert_history 
        SET resolved_at = ?
        WHERE id = ?
      `).run(now, activeAlert.id);

      console.log(`[alert] Resolved: "${rule.name}"`);

      await dispatchAlertNotification(rule, currentValue, 'RESOLVED');

      wsManager.broadcastToProject(projectId, {
        type: 'alert',
        data: {
          id: activeAlert.id,
          ruleName: rule.name,
          metric: rule.metric,
          value: currentValue,
          threshold: rule.threshold,
          status: 'RESOLVED',
          timestamp: now,
        },
      });
    }
  }
}

async function dispatchAlertNotification(
  rule: AlertRule,
  currentValue: number,
  status: 'TRIGGERED' | 'RESOLVED'
): Promise<void> {
  const isTriggered = status === 'TRIGGERED';
  const color = isTriggered ? 0xef4444 : 0x10b981;
  const title = `🚨 [PulseMetrics Alert] ${rule.name}: ${status}`;
  const description = isTriggered
    ? `Metric **${rule.metric}** reached **${currentValue.toFixed(2)}** (Threshold: ${rule.operator} ${rule.threshold})`
    : `Metric **${rule.metric}** has recovered to **${currentValue.toFixed(2)}**`;

  if (rule.channel === 'discord' && rule.webhook_url) {
    try {
      await axios.post(rule.webhook_url, {
        embeds: [
          {
            title,
            description,
            color,
            fields: [
              { name: 'Metric', value: rule.metric, inline: true },
              { name: 'Current Value', value: currentValue.toFixed(2), inline: true },
              { name: 'Threshold', value: `${rule.operator} ${rule.threshold}`, inline: true },
            ],
            footer: { text: 'PulseMetrics Real-Time Telemetry' },
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (err: any) {
      console.error('[alert] Failed to send Discord webhook:', err?.message || err);
    }
  } else if (rule.channel === 'slack' && rule.webhook_url) {
    try {
      await axios.post(rule.webhook_url, {
        text: `*${title}*\n${description}`,
      });
    } catch (err: any) {
      console.error('[alert] Failed to send Slack webhook:', err?.message || err);
    }
  } else if (rule.channel === 'email') {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && rule.webhook_url) {
      try {
        await axios.post(
          'https://api.resend.com/emails',
          {
            from: 'alerts@pulsemetrics.dev',
            to: rule.webhook_url,
            subject: title,
            html: `<div style="font-family: sans-serif; padding: 20px; background: #0a0a0f; color: #fff;">
              <h2 style="color: ${isTriggered ? '#ef4444' : '#10b981'}">${title}</h2>
              <p>${description}</p>
              <p style="color: #6b7280; font-size: 12px;">PulseMetrics Telemetry Alert Dispatcher</p>
            </div>`,
          },
          {
            headers: { Authorization: `Bearer ${resendApiKey}` },
          }
        );
      } catch (err: any) {
        console.error('[alert] Failed to send Resend email:', err?.message || err);
      }
    }
  }
}
