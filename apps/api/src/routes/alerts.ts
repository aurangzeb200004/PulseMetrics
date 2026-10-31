import { Router } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { getDb } from '../db';

const router = Router();

// GET /api/alerts/:projectId - list rules and recent history
router.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const db = getDb();

    const rules = db.prepare(`
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM alert_history h WHERE h.rule_id = r.id) as total_triggers,
        (SELECT triggered_at FROM alert_history h WHERE h.rule_id = r.id ORDER BY triggered_at DESC LIMIT 1) as last_triggered
      FROM alert_rules r
      WHERE r.project_id = ?
      ORDER BY r.name ASC
    `).all(projectId);

    const history = db.prepare(`
      SELECT h.*, r.name as rule_name, r.metric, r.channel
      FROM alert_history h
      JOIN alert_rules r ON r.id = h.rule_id
      WHERE r.project_id = ?
      ORDER BY h.triggered_at DESC
      LIMIT 20
    `).all(projectId);

    res.json({ rules, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/:projectId - create alert rule
router.post('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, metric, operator, threshold, window_seconds, channel, webhook_url } = req.body;

    if (!name || !metric || !operator || threshold === undefined || !channel) {
      return res.status(400).json({ error: 'Missing required rule parameters' });
    }

    const db = getDb();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO alert_rules (id, project_id, name, metric, operator, threshold, window_seconds, channel, webhook_url, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      projectId,
      name.trim(),
      metric,
      operator,
      parseFloat(threshold),
      parseInt(window_seconds || '300', 10),
      channel,
      webhook_url ? webhook_url.trim() : null
    );

    const rule = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id);
    res.status(201).json({ rule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/toggle - toggle active state
router.put('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const rule = db.prepare('SELECT active FROM alert_rules WHERE id = ?').get(id) as any;
    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    const newActive = Number(rule.active) === 1 ? 0 : 1;
    db.prepare('UPDATE alert_rules SET active = ? WHERE id = ?').run(newActive, id);

    res.json({ success: true, active: newActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alerts/:id - delete rule
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id) as any;
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/:id/test - dispatch test webhook
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const rule = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as any;

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    if (!rule.webhook_url && rule.channel !== 'email') {
      return res.status(400).json({ error: 'No webhook URL configured for this rule' });
    }

    if (rule.channel === 'discord') {
      await axios.post(rule.webhook_url, {
        embeds: [{
          title: `🔔 [PulseMetrics Test Alert] ${rule.name}`,
          description: `This is a test notification for rule **${rule.name}** (${rule.metric} ${rule.operator} ${rule.threshold}). Your webhook is verified!`,
          color: 0x6366f1,
          timestamp: new Date().toISOString(),
        }]
      });
    } else if (rule.channel === 'slack') {
      await axios.post(rule.webhook_url, {
        text: `🔔 *[PulseMetrics Test Alert]* Webhook verification for *${rule.name}* succeeded!`,
      });
    }

    res.json({ success: true, message: 'Test notification sent successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to dispatch test notification' });
  }
});

export default router;
