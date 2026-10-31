import { init, getInstance, PulseMetrics } from '../core';
import { PulseMetricsConfig } from '../types';

/**
 * Initialize PulseMetrics inside Next.js instrumentation.ts:
 *
 * export function register() {
 *   initPulseMetrics({ projectId: '...', apiKey: '...' });
 * }
 */
export function initPulseMetrics(config: PulseMetricsConfig): PulseMetrics {
  return init(config);
}

/**
 * High-order function wrapper for Next.js App Router route handlers (e.g. GET, POST).
 * Tracks latency, status codes, memory, and caught exceptions.
 */
export function withPulseMetrics<T extends (...args: any[]) => Promise<Response> | Response>(
  handler: T,
  options?: { endpoint?: string }
): T {
  return (async (...args: any[]): Promise<Response> => {
    const pulse = getInstance();
    const startTime = Date.now();
    const req = args[0];
    const method = req?.method || 'GET';
    const rawPath = options?.endpoint || req?.nextUrl?.pathname || (req?.url ? new URL(req.url).pathname : '/api');
    const endpoint = rawPath
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .replace(/\/\d+/g, '/:id');

    try {
      const response = await handler(...args);
      const durationMs = Date.now() - startTime;
      const statusCode = response.status || 200;
      const memMb = typeof process !== 'undefined' && process.memoryUsage 
        ? Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100 
        : 0;

      if (pulse) {
        (pulse as any).push({
          type: 'request',
          endpoint,
          method,
          statusCode,
          durationMs,
          memoryMb: memMb,
          timestamp: Date.now(),
        });

        if (statusCode >= 400) {
          (pulse as any).push({
            type: 'error',
            endpoint,
            errorMessage: `HTTP ${statusCode} on ${method} ${endpoint}`,
            timestamp: Date.now(),
          });
        }
      }

      return response;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      if (pulse) {
        (pulse as any).push({
          type: 'request',
          endpoint,
          method,
          statusCode: 500,
          durationMs,
          timestamp: Date.now(),
        });
        pulse.captureError(err instanceof Error ? err : new Error(String(err)), { endpoint });
      }
      throw err;
    }
  }) as T;
}

