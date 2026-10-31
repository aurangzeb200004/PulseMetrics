import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';
import { wsManager } from '../services/websocket';
import { evaluateAlertRules } from '../services/alerting';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { projectId, apiKey, events } = req.body;

    if (!projectId || !apiKey) {
      return res.status(401).json({ error: 'Missing projectId or apiKey' });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events must be a non-empty array' });
    }

    const db = getDb();

    // Validate project & API key
    const project = db
      .prepare('SELECT id FROM projects WHERE id = ? AND api_key = ?')
      .get(projectId, apiKey);

    if (!project) {
      return res.status(403).json({ error: 'Invalid projectId or apiKey' });
    }

    // Prepared statements for batch performance
    const insertTelemetry = db.prepare(`
      INSERT INTO telemetry (id, project_id, endpoint, method, status_code, duration_ms, memory_mb, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertError = db.prepare(`
      INSERT INTO errors (id, project_id, message, stack, endpoint, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertCustom = db.prepare(`
      INSERT INTO custom_events (id, project_id, event_name, value, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let processedCount = 0;

    // Fast transaction execution
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const item of events) {
        const timestamp = item.timestamp || Date.now();
        const id = crypto.randomUUID();

        if (item.type === 'request') {
          insertTelemetry.run(
            id,
            projectId,
            item.endpoint || '/',
            item.method || 'GET',
            item.statusCode || 200,
            item.durationMs || 0,
            item.memoryMb || 0,
            timestamp
          );
          processedCount++;

          wsManager.broadcastToProject(projectId, {
            type: 'telemetry',
            data: {
              id,
              endpoint: item.endpoint || '/',
              method: item.method || 'GET',
              statusCode: item.statusCode || 200,
              durationMs: item.durationMs || 0,
              memoryMb: item.memoryMb || 0,
              timestamp,
            },
          });
        } else if (item.type === 'error') {
          insertError.run(
            id,
            projectId,
            item.errorMessage || item.message || 'Unknown error',
            item.errorStack || item.stack || null,
            item.endpoint || null,
            timestamp
          );
          processedCount++;

          wsManager.broadcastToProject(projectId, {
            type: 'error',
            data: {
              id,
              message: item.errorMessage || item.message || 'Unknown error',
              stack: item.errorStack || item.stack || null,
              endpoint: item.endpoint || null,
              timestamp,
            },
          });
        } else if (item.type === 'custom') {
          insertCustom.run(
            id,
            projectId,
            item.eventName || 'event',
            item.value !== undefined ? item.value : null,
            item.metadata ? JSON.stringify(item.metadata) : null,
            timestamp
          );
          processedCount++;

          wsManager.broadcastToProject(projectId, {
            type: 'custom',
            data: {
              id,
              eventName: item.eventName || 'event',
              value: item.value,
              metadata: item.metadata,
              timestamp,
            },
          });
        }
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    // Evaluate alerts asynchronously
    setImmediate(() => {
      evaluateAlertRules(projectId).catch((err) => {
        console.error('[alert] Evaluation error:', err);
      });
    });

    res.status(200).json({ success: true, processed: processedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
