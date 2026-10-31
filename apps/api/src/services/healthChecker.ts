import axios from 'axios';
import tls from 'tls';
import { URL } from 'url';
import crypto from 'crypto';
import { getDb } from '../db';
import { wsManager } from './websocket';

interface HealthCheck {
  id: string;
  project_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  active: number;
}

class HealthCheckerService {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  public init(): void {
    const db = getDb();
    const checks = db
      .prepare('SELECT * FROM health_checks WHERE active = 1')
      .all() as unknown as HealthCheck[];

    for (const check of checks) {
      this.scheduleCheck(check);
    }

    console.log(`[health-checker] Initialized ${checks.length} synthetic health checks`);
  }

  public scheduleCheck(check: HealthCheck): void {
    this.removeCheck(check.id);

    const intervalMs = Math.max(10, check.interval_seconds || 60) * 1000;

    this.runSingleCheck(check).catch(() => {});

    const timer = setInterval(() => {
      this.runSingleCheck(check).catch(() => {});
    }, intervalMs);

    this.timers.set(check.id, timer);
  }

  public removeCheck(checkId: string): void {
    const existing = this.timers.get(checkId);
    if (existing) {
      clearInterval(existing);
      this.timers.delete(checkId);
    }
  }

  public async runSingleCheck(check: HealthCheck): Promise<void> {
    const db = getDb();
    const startTime = Date.now();
    let status = 'UP';
    let statusCode: number | null = null;
    let responseTimeMs = 0;
    let sslDaysRemaining: number | null = null;

    try {
      const response = await axios.get(check.url, {
        timeout: 10000,
        validateStatus: () => true,
      });

      responseTimeMs = Date.now() - startTime;
      statusCode = response.status;
      status = response.status >= 200 && response.status < 400 ? 'UP' : 'DOWN';
    } catch {
      responseTimeMs = Date.now() - startTime;
      status = 'DOWN';
      statusCode = 0;
    }

    if (check.url.startsWith('https://')) {
      try {
        sslDaysRemaining = await this.checkSslCertificate(check.url);
      } catch {
        sslDaysRemaining = null;
      }
    }

    const resultId = crypto.randomUUID();
    const timestamp = Date.now();

    try {
      db.prepare(`
        INSERT INTO health_results (id, check_id, status, response_time_ms, status_code, ssl_days_remaining, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(resultId, check.id, status, responseTimeMs, statusCode, sslDaysRemaining, timestamp);
    } catch (err) {
      console.error('[health-checker] Failed to insert result:', err);
    }

    wsManager.broadcastToProject(check.project_id, {
      type: 'health',
      data: {
        id: resultId,
        checkId: check.id,
        name: check.name,
        url: check.url,
        status,
        statusCode,
        responseTimeMs,
        sslDaysRemaining,
        timestamp,
      },
    });
  }

  private checkSslCertificate(urlString: string): Promise<number | null> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(urlString);
        const host = parsed.hostname;
        const port = parsed.port ? parseInt(parsed.port, 10) : 443;

        const socket = tls.connect(
          {
            host,
            port,
            servername: host,
            rejectUnauthorized: false,
          },
          () => {
            const cert = socket.getPeerCertificate();
            socket.end();

            if (cert && cert.valid_to) {
              const expiryDate = new Date(cert.valid_to);
              const daysRemaining = Math.round(
                (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              resolve(daysRemaining);
            } else {
              resolve(null);
            }
          }
        );

        socket.setTimeout(5000, () => {
          socket.destroy();
          resolve(null);
        });

        socket.on('error', () => {
          socket.destroy();
          resolve(null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  public stop(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}

export const healthChecker = new HealthCheckerService();
