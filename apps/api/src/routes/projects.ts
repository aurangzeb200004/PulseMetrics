import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';

const router = Router();

// GET /api/projects - list all projects
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const projects = db.prepare(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM telemetry t WHERE t.project_id = p.id) as total_events,
        (SELECT COUNT(*) FROM health_checks h WHERE h.project_id = p.id) as total_monitors
      FROM projects p
      ORDER BY created_at DESC
    `).all();

    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - create new project
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const apiKey = `pm_live_${crypto.randomBytes(16).toString('hex')}`;
    const createdAt = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO projects (id, name, api_key, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), apiKey, createdAt);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json({ project });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id - delete project
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id) as any;
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
