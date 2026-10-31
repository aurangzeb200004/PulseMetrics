export interface PulseMetricsConfig {
  projectId: string;
  apiKey: string;
  endpoint?: string; // default: 'http://localhost:3001'
  flushInterval?: number; // ms, default: 2000
  maxBatchSize?: number; // default: 50
  sampleRate?: number; // 0-1, default: 1.0
}

export interface TelemetryEvent {
  type: 'request' | 'error' | 'custom';
  endpoint?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  memoryMb?: number;
  errorMessage?: string;
  errorStack?: string;
  eventName?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}
