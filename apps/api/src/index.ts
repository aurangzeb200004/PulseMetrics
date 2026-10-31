import express from 'express';
import http from 'http';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { getDb } from './db';
import { initSchema } from './schema';
import { corsMiddleware } from './middleware/cors';
import { wsManager } from './services/websocket';
import { healthChecker } from './services/healthChecker';

// Routes
import projectsRouter from './routes/projects';
import ingestRouter from './routes/ingest';
import metricsRouter from './routes/metrics';
import healthRouter from './routes/health';
import alertsRouter from './routes/alerts';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();
const server = http.createServer(app);

// Security & Parsing Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for orchestrators / container
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Mount API routes
app.use('/api/projects', projectsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/health-checks', healthRouter);
app.use('/api/alerts', alertsRouter);

// Initialize DB schema & seed default demo project if empty
function bootstrap() {
  initSchema();

  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM projects').get() as any;

  if (Number(existing?.count || 0) === 0) {
    console.log('[seed] Seeding default project "Production API"...');
    const projectId = 'demo-project-001';
    const apiKey = 'pm_live_demo1234567890abcdef';
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO projects (id, name, api_key, created_at)
      VALUES (?, ?, ?, ?)
    `).run(projectId, 'Production SaaS API', apiKey, now);

    // Seed sample health checks
    db.prepare(`
      INSERT INTO health_checks (id, project_id, name, url, interval_seconds, active)
      VALUES 
        ('hc-1', 'demo-project-001', 'Google Search (SSL & Ping)', 'https://www.google.com', 30, 1),
        ('hc-2', 'demo-project-001', 'Cloudflare DNS', 'https://1.1.1.1', 60, 1),
        ('hc-3', 'demo-project-001', 'GitHub API Status', 'https://api.github.com', 45, 1)
    `).run();

    // Seed default alert rule
    db.prepare(`
      INSERT INTO alert_rules (id, project_id, name, metric, operator, threshold, window_seconds, channel, active)
      VALUES ('ar-1', 'demo-project-001', 'High P95 Latency Warning', 'p95_latency', '>', 350, 120, 'discord', 1)
    `).run();

    console.log('[seed] Default project created with ID:', projectId);
  }
}

bootstrap();

// Initialize WebSocket server
wsManager.init(server);

// Initialize Synthetic Health Checker service
healthChecker.init();

// Start HTTP Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`⚡ PulseMetrics API & Ingestion Engine`);
  console.log(`🚀 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket:   ws://localhost:${PORT}`);
  console.log(`=========================================`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('\n[shutdown] Gracefully stopping PulseMetrics API...');
  healthChecker.stop();
  wsManager.close();
  server.close(() => {
    console.log('[shutdown] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
