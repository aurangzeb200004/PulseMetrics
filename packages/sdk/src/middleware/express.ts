import { Request, Response, NextFunction } from 'express';
import { _instance } from '../core';

/**
 * Normalizes an API path by replacing UUIDs, Mongo IDs, and numeric IDs with placeholders.
 * Prevents high-cardinality endpoint explosions in telemetry metrics.
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/[0-9a-f]{24}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Drop-in Express middleware that captures:
 * - Request duration in milliseconds
 * - HTTP status code & method
 * - Normalized endpoint path
 * - Memory heap usage in MB
 * - Automatic error capture on 4xx/5xx responses
 */
export function pulseMetricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime();
    const endpoint = normalizePath(req.baseUrl ? `${req.baseUrl}${req.path}` : req.path || '/');
    const method = req.method;

    res.on('finish', () => {
      if (!_instance) return;

      const diff = process.hrtime(startTime);
      const durationMs = Math.round((diff[0] * 1000 + diff[1] / 1e6) * 100) / 100;
      const statusCode = res.statusCode;
      const memUsage = process.memoryUsage();
      const memoryMb = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;

      // Track request latency and stats
      (_instance as any).push({
        type: 'request',
        endpoint,
        method,
        statusCode,
        durationMs,
        memoryMb,
        timestamp: Date.now(),
      });

      // Track error telemetry on HTTP failure
      if (statusCode >= 400) {
        (_instance as any).push({
          type: 'error',
          endpoint,
          errorMessage: `HTTP ${statusCode} on ${method} ${endpoint}`,
          timestamp: Date.now(),
        });
      }
    });

    next();
  };
}

