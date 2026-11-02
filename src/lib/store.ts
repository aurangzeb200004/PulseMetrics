// In-memory data store — works on Vercel serverless with no external DB required.
// Data persists within the same Lambda warm instance; resets on cold start.
// For production persistence, swap this with Vercel Postgres / PlanetScale / Turso.

import crypto from 'crypto';

export interface Project {
  id: string;
  name: string;
  api_key: string;
  created_at: number;
}

export interface TelemetryEvent {
  id: string;
  project_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  memory_mb: number;
  timestamp: number;
}

export interface AppError {
  id: string;
  project_id: string;
  message: string;
  stack?: string;
  endpoint?: string;
  timestamp: number;
}

export interface CustomEvent {
  id: string;
  project_id: string;
  event_name: string;
  value?: number;
  metadata?: string;
  timestamp: number;
}

export interface HealthCheck {
  id: string;
  project_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  active: number;
}

export interface HealthResult {
  id: string;
  check_id: string;
  status: string;
  response_time_ms: number;
  status_code: number | null;
  ssl_days_remaining: number | null;
  timestamp: number;
}

export interface AlertRule {
  id: string;
  project_id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  window_seconds: number;
  channel: string;
  webhook_url?: string;
  active: number;
}

export interface AlertHistory {
  id: string;
  rule_id: string;
  triggered_at: number;
  resolved_at?: number;
  value: number;
}

class InMemoryStore {
  projects: Map<string, Project> = new Map();
  telemetry: TelemetryEvent[] = [];
  errors: AppError[] = [];
  customEvents: CustomEvent[] = [];
  healthChecks: Map<string, HealthCheck> = new Map();
  healthResults: HealthResult[] = [];
  alertRules: Map<string, AlertRule> = new Map();
  alertHistory: AlertHistory[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const projectId = 'demo-project-001';
    const apiKey = 'pm_live_demo1234567890abcdef';
    const now = Math.floor(Date.now() / 1000);

    this.projects.set(projectId, {
      id: projectId,
      name: 'Production SaaS API',
      api_key: apiKey,
      created_at: now,
    });

    // Generate realistic sample telemetry for the last hour
    const endpoints = [
      { path: '/api/v1/auth/login', method: 'POST', baseMs: 120 },
      { path: '/api/v1/users/me', method: 'GET', baseMs: 45 },
      { path: '/api/v1/projects', method: 'GET', baseMs: 80 },
      { path: '/api/v1/analytics/query', method: 'POST', baseMs: 350 },
      { path: '/api/v1/billing/subscription', method: 'GET', baseMs: 95 },
      { path: '/api/v1/export/csv', method: 'GET', baseMs: 820 },
    ];

    const nowMs = Date.now();
    for (let i = 0; i < 120; i++) {
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      const ts = nowMs - Math.floor(Math.random() * 3600000);
      const isError = Math.random() < 0.07;
      const statusCode = isError ? (Math.random() < 0.5 ? 500 : 429) : 200;
      const jitter = (Math.random() - 0.5) * 50;
      const durationMs = Math.max(10, Math.round(ep.baseMs + jitter + (isError ? 180 : 0)));
      const memoryMb = Math.round(60 + Math.random() * 45);
      const id = crypto.randomUUID();

      this.telemetry.push({
        id, project_id: projectId,
        endpoint: ep.path, method: ep.method,
        status_code: statusCode, duration_ms: durationMs,
        memory_mb: memoryMb, timestamp: ts,
      });

      if (isError) {
        this.errors.push({
          id: crypto.randomUUID(), project_id: projectId,
          message: statusCode === 500 ? 'Internal Server Error: DB connection timeout' : 'Rate limit exceeded',
          stack: `Error: HTTP ${statusCode}\n    at handler (api.ts:89:9)\n    at Layer.handle (router.ts:95:5)`,
          endpoint: ep.path, timestamp: ts,
        });
      }
    }

    // Seed health checks
    const hcData: HealthCheck[] = [
      { id: 'hc-1', project_id: projectId, name: 'Google (SSL & Ping)', url: 'https://www.google.com', interval_seconds: 30, active: 1 },
      { id: 'hc-2', project_id: projectId, name: 'Cloudflare DNS', url: 'https://1.1.1.1', interval_seconds: 60, active: 1 },
      { id: 'hc-3', project_id: projectId, name: 'GitHub API', url: 'https://api.github.com', interval_seconds: 45, active: 1 },
    ];
    hcData.forEach(hc => {
      this.healthChecks.set(hc.id, hc);
      // Seed a recent result for each
      this.healthResults.push({
        id: crypto.randomUUID(), check_id: hc.id,
        status: 'UP', response_time_ms: Math.round(50 + Math.random() * 200),
        status_code: 200, ssl_days_remaining: hc.url.startsWith('https') ? Math.round(60 + Math.random() * 200) : null,
        timestamp: nowMs - Math.floor(Math.random() * 60000),
      });
    });

    // Seed default alert rule
    this.alertRules.set('ar-1', {
      id: 'ar-1', project_id: projectId,
      name: 'High P95 Latency', metric: 'p95_latency',
      operator: '>', threshold: 350, window_seconds: 120,
      channel: 'discord', active: 1,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getProjectTelemetry(projectId: string, from: number, to: number): TelemetryEvent[] {
    return this.telemetry.filter(t =>
      t.project_id === projectId && t.timestamp >= from && t.timestamp <= to
    );
  }

  getProjectErrors(projectId: string, from: number, to: number): AppError[] {
    return this.errors.filter(e =>
      e.project_id === projectId && e.timestamp >= from && e.timestamp <= to
    );
  }

  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
    return sorted[idx];
  }

  addTelemetry(event: Omit<TelemetryEvent, 'id'>): TelemetryEvent {
    const item: TelemetryEvent = { id: crypto.randomUUID(), ...event };
    this.telemetry.push(item);
    // Keep last 50k entries
    if (this.telemetry.length > 50000) this.telemetry.splice(0, 1000);
    return item;
  }

  addError(event: Omit<AppError, 'id'>): AppError {
    const item: AppError = { id: crypto.randomUUID(), ...event };
    this.errors.push(item);
    if (this.errors.length > 5000) this.errors.splice(0, 100);
    return item;
  }

  addHealthResult(result: Omit<HealthResult, 'id'>): HealthResult {
    const item: HealthResult = { id: crypto.randomUUID(), ...result };
    this.healthResults.push(item);
    if (this.healthResults.length > 10000) this.healthResults.splice(0, 500);
    return item;
  }

  getLatestHealthResult(checkId: string): HealthResult | undefined {
    return this.healthResults
      .filter(r => r.check_id === checkId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }
}

// Global singleton — survives hot reloads in dev and warm Lambda invocations on Vercel
const globalForStore = global as typeof global & { __pmStore?: InMemoryStore };
if (!globalForStore.__pmStore) {
  globalForStore.__pmStore = new InMemoryStore();
}
export const store = globalForStore.__pmStore;

