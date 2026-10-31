import { PulseMetricsConfig, TelemetryEvent } from './types';

class PulseMetrics {
  private config: Required<PulseMetricsConfig>;
  private queue: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: PulseMetricsConfig) {
    this.config = {
      endpoint: 'http://localhost:3001',
      flushInterval: 2000,
      maxBatchSize: 50,
      sampleRate: 1.0,
      ...config,
    };

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {
        // Silent fail handled inside flush()
      });
    }, this.config.flushInterval);

    // Avoid keeping the process alive just for the flush timer
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }

    // Flush remaining events on process exit
    const exitHandler = () => {
      this.flushSync();
    };
    process.on('exit', exitHandler);
    process.on('SIGINT', () => {
      exitHandler();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      exitHandler();
      process.exit(0);
    });
  }

  /**
   * Track a custom business event.
   */
  track(
    eventName: string,
    value?: number,
    metadata?: Record<string, unknown>
  ): void {
    this.push({
      type: 'custom',
      eventName,
      value,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * Manually capture an error with optional context.
   */
  captureError(
    error: Error,
    context?: { endpoint?: string; metadata?: Record<string, unknown> }
  ): void {
    this.push({
      type: 'error',
      errorMessage: error.message,
      errorStack: error.stack,
      endpoint: context?.endpoint,
      metadata: context?.metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * Internal: apply sampling and enqueue an event.
   */
  // eslint-disable-next-line @typescript-eslint/member-ordering
  _push(event: TelemetryEvent): void {
    this.push(event);
  }

  private push(event: TelemetryEvent): void {
    // Apply sampling rate
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.queue.push(event);

    // Eagerly flush when the batch is full
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush().catch(() => {
        // Silent fail handled inside flush()
      });
    }
  }

  /**
   * Flush the current queue to the PulseMetrics ingestion API.
   * Never throws — errors are swallowed (with a console.warn).
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    // Snapshot and clear queue optimistically
    const batch = this.queue.splice(0, this.config.maxBatchSize);

    const payload = JSON.stringify({
      projectId: this.config.projectId,
      apiKey: this.config.apiKey,
      events: batch,
    });

    const url = `${this.config.endpoint}/api/ingest`;

    try {
      if (typeof fetch !== 'undefined') {
        // Node 18+ native fetch
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } else {
        // Fallback: http/https module (Node < 18)
        await this.sendViaHttp(url, payload);
      }
    } catch (err: unknown) {
      // On failure, put events back (up to maxBatchSize) for retry
      const dropped = batch.splice(this.config.maxBatchSize);
      if (dropped.length > 0) {
        console.warn('[PulseMetrics] Dropping %d events (queue full)', dropped.length);
      }
      this.queue.unshift(...batch);
      // Trim to maxBatchSize to prevent unbounded growth
      if (this.queue.length > this.config.maxBatchSize) {
        this.queue.splice(this.config.maxBatchSize);
      }
      console.warn('[PulseMetrics] Failed to send telemetry:', (err as Error).message);
    }
  }

  /**
   * Synchronous best-effort flush for process exit.
   * Uses the http module because async/await is not reliable at exit time.
   */
  private flushSync(): void {
    if (this.queue.length === 0) return;

    try {
      // Only attempt sync flush in Node.js environments
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { execFileSync } = require('child_process') as typeof import('child_process');
      const payload = JSON.stringify({
        projectId: this.config.projectId,
        apiKey: this.config.apiKey,
        events: this.queue.splice(0),
      });

      const url = new URL(`${this.config.endpoint}/api/ingest`);
      const isHttps = url.protocol === 'https:';
      const nodeBin = process.execPath;

      // Fire a tiny inline Node script that does the HTTP POST synchronously
      const script = `
        const mod = require('${isHttps ? 'https' : 'http'}');
        const data = ${JSON.stringify(payload)};
        const opts = {
          hostname: ${JSON.stringify(url.hostname)},
          port: ${url.port || (isHttps ? 443 : 80)},
          path: ${JSON.stringify(url.pathname)},
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = mod.request(opts);
        req.on('error', () => {});
        req.write(data);
        req.end();
      `.trim();

      execFileSync(nodeBin, ['-e', script], { timeout: 2000, stdio: 'ignore' });
    } catch {
      // Best-effort — ignore errors at exit time
    }
  }

  /**
   * HTTP POST fallback using Node's built-in http/https module.
   */
  private sendViaHttp(url: string, payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(isHttps ? 'https' : 'http') as typeof import('http');

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        };

        const req = mod.request(options, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
          // Drain to avoid memory leaks
          res.resume();
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export { PulseMetrics };
export let _instance: PulseMetrics | null = null;

/**
 * Initialize PulseMetrics and return the client instance.
 * Call this once at app startup.
 */
export function init(config: PulseMetricsConfig): PulseMetrics {
  _instance = new PulseMetrics(config);
  return _instance;
}

/**
 * Retrieve the current PulseMetrics instance (or null if not initialized).
 */
export function getInstance(): PulseMetrics | null {
  return _instance;
}
