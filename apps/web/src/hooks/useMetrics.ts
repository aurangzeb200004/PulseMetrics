'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from './useWebSocket';

export interface MetricSummary {
  totalRequests: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
  avgMemory: number;
}

export interface TimeseriesPoint {
  bucket: number;
  count: number;
  errors: number;
  p95: number;
  errorRate: number;
}

export interface EndpointMetric {
  endpoint: string;
  method: string;
  count: number;
  p95: number;
  errorRate: number;
}

export interface RecentError {
  id: string;
  message: string;
  stack?: string;
  endpoint?: string;
  timestamp: number;
}

export function useMetrics(projectId: string, timeRangeHours: number = 1) {
  const [summary, setSummary] = useState<MetricSummary>({
    totalRequests: 0,
    errorRate: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    avgMemory: 0,
  });

  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<EndpointMetric[]>([]);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Buffer for computing live percentile adjustments
  const latencyBufferRef = useRef<number[]>([]);

  const fetchMetrics = useCallback(async () => {
    if (!projectId) return;
    try {
      const now = Date.now();
      const from = now - timeRangeHours * 3600 * 1000;
      const data = await api.getMetrics(projectId, from, now);

      setSummary(data.summary);
      setTimeseries(data.timeseries);
      setTopEndpoints(data.topEndpoints);
      setRecentErrors(data.recentErrors);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, timeRangeHours]);

  useEffect(() => {
    setIsLoading(true);
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // Background sync every 15s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Handle incoming WebSocket telemetry events in real time
  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'telemetry' && msg.data) {
      const { durationMs, statusCode, memoryMb, endpoint, method, timestamp } = msg.data;

      // Update summary counters
      setSummary((prev) => {
        const newTotal = prev.totalRequests + 1;
        const isErr = statusCode >= 400;
        const currentErrors = (prev.errorRate / 100) * prev.totalRequests + (isErr ? 1 : 0);
        const newErrorRate = Math.round((currentErrors / newTotal) * 1000) / 10;

        // Add to latency buffer
        latencyBufferRef.current.push(durationMs);
        if (latencyBufferRef.current.length > 100) latencyBufferRef.current.shift();

        const sorted = [...latencyBufferRef.current].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)] || durationMs;
        const p95 = sorted[Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1)] || durationMs;
        const p99 = sorted[Math.min(Math.floor(sorted.length * 0.99), sorted.length - 1)] || durationMs;

        return {
          totalRequests: newTotal,
          errorRate: newErrorRate,
          p50: Math.round(p50),
          p95: Math.round(p95),
          p99: Math.round(p99),
          avgMemory: memoryMb ? Math.round((prev.avgMemory * 0.9 + memoryMb * 0.1) * 10) / 10 : prev.avgMemory,
        };
      });

      // Update live timeseries
      setTimeseries((prev) => {
        if (prev.length === 0) {
          return [{
            bucket: timestamp,
            count: 1,
            errors: statusCode >= 400 ? 1 : 0,
            p95: durationMs,
            errorRate: statusCode >= 400 ? 100 : 0,
          }];
        }

        const last = { ...prev[prev.length - 1] };
        // If within 15 seconds of the last bucket, merge; otherwise push new
        if (timestamp - last.bucket < 15000) {
          last.count += 1;
          if (statusCode >= 400) last.errors += 1;
          last.p95 = Math.max(last.p95, durationMs);
          last.errorRate = (last.errors / last.count) * 100;
          return [...prev.slice(0, -1), last];
        } else {
          const next = {
            bucket: timestamp,
            count: 1,
            errors: statusCode >= 400 ? 1 : 0,
            p95: durationMs,
            errorRate: statusCode >= 400 ? 100 : 0,
          };
          return [...prev.slice(-29), next];
        }
      });

      // Update top endpoints
      setTopEndpoints((prev) => {
        const idx = prev.findIndex((e) => e.endpoint === endpoint && e.method === method);
        if (idx >= 0) {
          const updated = [...prev];
          const curr = updated[idx];
          const newCount = curr.count + 1;
          const isErr = statusCode >= 400;
          const newErrCount = (curr.errorRate / 100) * curr.count + (isErr ? 1 : 0);

          updated[idx] = {
            ...curr,
            count: newCount,
            p95: Math.round(curr.p95 * 0.9 + durationMs * 0.1),
            errorRate: Math.round((newErrCount / newCount) * 1000) / 10,
          };
          return updated.sort((a, b) => b.count - a.count);
        } else {
          return [
            ...prev,
            {
              endpoint,
              method,
              count: 1,
              p95: durationMs,
              errorRate: statusCode >= 400 ? 100 : 0,
            },
          ].slice(0, 10);
        }
      });
    } else if (msg.type === 'error' && msg.data) {
      setRecentErrors((prev) => [msg.data, ...prev.slice(0, 24)]);
    }
  }, []);

  const { connectionState } = useWebSocket(projectId, handleWsMessage);

  return {
    summary,
    timeseries,
    topEndpoints,
    recentErrors,
    isLoading,
    lastUpdated,
    connectionState,
    refresh: fetchMetrics,
  };
}

