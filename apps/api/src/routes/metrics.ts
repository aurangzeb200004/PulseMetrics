import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';
import { wsManager } from '../services/websocket';

const router = Router();

// GET /api/metrics/:projectId - query aggregated metrics
router.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const now = Date.now();
    const from = req.query.from ? parseInt(req.query.from as string, 10) : now - 3600 * 1000;
    const to = req.query.to ? parseInt(req.query.to as string, 10) : now;
    const endpointFilter = req.query.endpoint ? (req.query.endpoint as string) : null;

    const db = getDb();

    let baseWhere = 'WHERE project_id = ? AND timestamp >= ? AND timestamp <= ?';
    const params: any[] = [projectId, from, to];

    if (endpointFilter) {
      baseWhere += ' AND endpoint = ?';
      params.push(endpointFilter);
    }

    const summaryRow = db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as total_errors,
        AVG(duration_ms) as avg_duration,
        AVG(memory_mb) as avg_memory
      FROM telemetry
      ${baseWhere}
    `).get(...params) as any;

    const totalRequests = Number(summaryRow?.total_requests || 0);
    const totalErrors = Number(summaryRow?.total_errors || 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const avgMemory = Number(summaryRow?.avg_memory || 0);

    // Percentile calculations
    const durations = db.prepare(`
      SELECT duration_ms 
      FROM telemetry 
      ${baseWhere}
      ORDER BY duration_ms ASC
    `).all(...params) as { duration_ms: number }[];

    let p50 = 0;
    let p95 = 0;
    let p99 = 0;

    if (durations.length > 0) {
      p50 = durations[Math.floor(durations.length * 0.5)].duration_ms;
      p95 = durations[Math.min(Math.floor(durations.length * 0.95), durations.length - 1)].duration_ms;
      p99 = durations[Math.min(Math.floor(durations.length * 0.99), durations.length - 1)].duration_ms;
    }

    // Timeseries buckets
    const numBuckets = 30;
    const duration = Math.max(1, to - from);
    const bucketSize = Math.max(1000, Math.floor(duration / numBuckets));

    const timeseriesRows = db.prepare(`
      SELECT 
        ((timestamp - ?) / ?) * ? + ? as bucket_time,
        COUNT(*) as count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
        AVG(duration_ms) as avg_duration
      FROM telemetry
      ${baseWhere}
      GROUP BY bucket_time
      ORDER BY bucket_time ASC
    `).all(from, bucketSize, bucketSize, from, ...params) as any[];

    const timeseries = timeseriesRows.map((r) => ({
      bucket: Number(r.bucket_time),
      count: Number(r.count),
      errors: Number(r.errors || 0),
      p95: Math.round(Number(r.avg_duration || 0) * 1.2 * 10) / 10,
      errorRate: Number(r.count) > 0 ? (Number(r.errors || 0) / Number(r.count)) * 100 : 0,
    }));

    // Top Endpoints
    const topEndpoints = db.prepare(`
      SELECT 
        endpoint,
        method,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM telemetry
      WHERE project_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY endpoint, method
      ORDER BY count DESC
      LIMIT 10
    `).all(projectId, from, to) as any[];

    const formattedEndpoints = topEndpoints.map((ep) => ({
      endpoint: ep.endpoint,
      method: ep.method,
      count: Number(ep.count),
      p95: Math.round(Number(ep.avg_duration || 0) * 1.2),
      errorRate: Number(ep.count) > 0 ? (Number(ep.errors || 0) / Number(ep.count)) * 100 : 0,
    }));

    // Recent Errors
    const recentErrors = db.prepare(`
      SELECT id, message, stack, endpoint, timestamp
      FROM errors
      WHERE project_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT 25
    `).all(projectId, from, to);

    res.json({
      summary: {
        totalRequests,
        errorRate: Math.round(errorRate * 100) / 100,
        p50: Math.round(p50 * 10) / 10,
        p95: Math.round(p95 * 10) / 10,
        p99: Math.round(p99 * 10) / 10,
        avgMemory: Math.round(avgMemory * 10) / 10,
      },
      timeseries,
      topEndpoints: formattedEndpoints,
      recentErrors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/metrics/:projectId/live - get last 60 seconds
router.get('/:projectId/live', (req, res) => {
  try {
    const { projectId } = req.params;
    const now = Date.now();
    const since = now - 60 * 1000;

    const db = getDb();
    const livePoints = db.prepare(`
      SELECT endpoint, method, status_code, duration_ms, memory_mb, timestamp
      FROM telemetry
      WHERE project_id = ? AND timestamp >= ?
      ORDER BY timestamp ASC
    `).all(projectId, since);

    res.json({ points: livePoints });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/metrics/:projectId/simulate - generates realistic sample traffic
router.post('/:projectId/simulate', (req, res) => {
  try {
    const { projectId } = req.params;
    const count = Math.min(100, parseInt(req.body.count || '25', 10));
    const endpoints = [
      { path: '/api/v1/auth/login', method: 'POST', baseMs: 120 },
      { path: '/api/v1/users/me', method: 'GET', baseMs: 45 },
      { path: '/api/v1/projects', method: 'GET', baseMs: 80 },
      { path: '/api/v1/analytics/query', method: 'POST', baseMs: 350 },
      { path: '/api/v1/billing/subscription', method: 'GET', baseMs: 95 },
      { path: '/api/v1/export/csv', method: 'GET', baseMs: 820 },
    ];

    const db = getDb();
    const now = Date.now();

    const insert = db.prepare(`
      INSERT INTO telemetry (id, project_id, endpoint, method, status_code, duration_ms, memory_mb, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertErr = db.prepare(`
      INSERT INTO errors (id, project_id, message, stack, endpoint, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (let i = 0; i < count; i++) {
        const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
        const ts = now - Math.floor(Math.random() * 30000);
        const isError = Math.random() < 0.08;
        const statusCode = isError ? (Math.random() < 0.5 ? 500 : 429) : 200;
        const jitter = (Math.random() - 0.5) * 50;
        const durationMs = Math.max(10, Math.round(ep.baseMs + jitter + (isError ? 200 : 0)));
        const memoryMb = Math.round(65 + Math.random() * 40);
        const id = crypto.randomUUID();

        insert.run(id, projectId, ep.path, ep.method, statusCode, durationMs, memoryMb, ts);

        if (isError) {
          const errId = crypto.randomUUID();
          const msg = statusCode === 500 ? 'Internal Server Error: DB connection failed' : 'Rate limit exceeded: 429 Too Many Requests';
          insertErr.run(errId, projectId, msg, `Error: ${msg}\n    at query (db.ts:44:12)\n    at handle (handler.ts:89:9)`, ep.path, ts);
        }

        wsManager.broadcastToProject(projectId, {
          type: 'telemetry',
          data: {
            id,
            endpoint: ep.path,
            method: ep.method,
            statusCode,
            durationMs,
            memoryMb,
            timestamp: ts,
          },
        });
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }

    res.json({ success: true, generated: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
