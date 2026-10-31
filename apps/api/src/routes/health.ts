import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';
import { healthChecker } from '../services/healthChecker';

const router = Router();

// GET /api/health-checks/:projectId - list all checks with latest result
router.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const db = getDb();

    const checks = db.prepare(`
      SELECT 
        h.*,
        r.status as last_status,
        r.response_time_ms as last_response_time,
        r.status_code as last_status_code,
        r.ssl_days_remaining as last_ssl_days,
        r.timestamp as last_checked_at
      FROM health_checks h
      LEFT JOIN health_results r ON r.check_id = h.id AND r.timestamp = (
        SELECT MAX(timestamp) FROM health_results WHERE check_id = h.id
      )
      WHERE h.project_id = ?
      ORDER BY h.name ASC
    `).all(projectId);

    res.json({ healthChecks: checks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/health-checks/:projectId - create health check
router.post('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, url, interval_seconds } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'name and url are required' });
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const intervalSec = Math.max(10, parseInt(interval_seconds || '60', 10));

    db.prepare(`
      INSERT INTO health_checks (id, project_id, name, url, interval_seconds, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, name.trim(), url.trim(), intervalSec);

    const check = db.prepare('SELECT * FROM health_checks WHERE id = ?').get(id) as any;

    healthChecker.scheduleCheck(check);

    res.status(201).json({ healthCheck: check });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/health-checks/:id - delete health check
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    healthChecker.removeCheck(id);
    const result = db.prepare('DELETE FROM health_checks WHERE id = ?').run(id) as any;

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Health check not found' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health-checks/:projectId/results - get recent results
router.get('/:projectId/results', (req, res) => {
  try {
    const { projectId } = req.params;
    const db = getDb();

    const results = db.prepare(`
      SELECT r.*, h.name as check_name, h.url
      FROM health_results r
      JOIN health_checks h ON h.id = r.check_id
      WHERE h.project_id = ?
      ORDER BY r.timestamp DESC
      LIMIT 100
    `).all(projectId);

    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/health-checks/:id/run - trigger immediate ping
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const check = db.prepare('SELECT * FROM health_checks WHERE id = ?').get(id) as any;
    if (!check) {
      return res.status(404).json({ error: 'Health check not found' });
    }

    await healthChecker.runSingleCheck(check);
    const latest = db.prepare('SELECT * FROM health_results WHERE check_id = ? ORDER BY timestamp DESC LIMIT 1').get(id);

    res.json({ success: true, result: latest });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
