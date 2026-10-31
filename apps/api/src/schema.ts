import { getDb } from './db';

export function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      status_code INTEGER NOT NULL DEFAULT 200,
      duration_ms REAL NOT NULL DEFAULT 0,
      memory_mb REAL NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_project_ts ON telemetry(project_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_telemetry_endpoint ON telemetry(project_id, endpoint, timestamp);

    CREATE TABLE IF NOT EXISTS errors (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      endpoint TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_errors_project_ts ON errors(project_id, timestamp);

    CREATE TABLE IF NOT EXISTS custom_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      value REAL,
      metadata TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_custom_events_project_ts ON custom_events(project_id, timestamp);

    CREATE TABLE IF NOT EXISTS health_checks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      interval_seconds INTEGER NOT NULL DEFAULT 60,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_results (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time_ms REAL,
      status_code INTEGER,
      ssl_days_remaining INTEGER,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (check_id) REFERENCES health_checks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_health_results_check_ts ON health_results(check_id, timestamp);

    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      metric TEXT NOT NULL,
      operator TEXT NOT NULL,
      threshold REAL NOT NULL,
      window_seconds INTEGER NOT NULL DEFAULT 300,
      channel TEXT NOT NULL,
      webhook_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert_history (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      triggered_at INTEGER NOT NULL,
      resolved_at INTEGER,
      value REAL NOT NULL,
      FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(rule_id, triggered_at);
  `);

  console.log('[schema] Database schema initialized');
}
