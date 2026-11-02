import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET /api/metrics/:projectId
export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const now = Date.now();
    const from = searchParams.get('from') ? parseInt(searchParams.get('from')!) : now - 3600000;
    const to = searchParams.get('to') ? parseInt(searchParams.get('to')!) : now;

    const telemetry = store.getProjectTelemetry(projectId, from, to);
    const errors = store.getProjectErrors(projectId, from, to);

    const totalRequests = telemetry.length;
    const totalErrors = telemetry.filter(t => t.status_code >= 400).length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const avgMemory = totalRequests > 0
      ? telemetry.reduce((s, t) => s + t.memory_mb, 0) / totalRequests : 0;

    // Percentiles
    const durations = telemetry.map(t => t.duration_ms).sort((a, b) => a - b);
    const p50 = store.percentile(durations, 0.50);
    const p95 = store.percentile(durations, 0.95);
    const p99 = store.percentile(durations, 0.99);

    // Timeseries (30 buckets)
    const numBuckets = 30;
    const range = Math.max(1, to - from);
    const bucketSize = Math.max(1000, Math.floor(range / numBuckets));
    const buckets: Record<number, { count: number; errors: number; durations: number[] }> = {};

    telemetry.forEach(t => {
      const bucket = Math.floor((t.timestamp - from) / bucketSize) * bucketSize + from;
      if (!buckets[bucket]) buckets[bucket] = { count: 0, errors: 0, durations: [] };
      buckets[bucket].count++;
      buckets[bucket].durations.push(t.duration_ms);
      if (t.status_code >= 400) buckets[bucket].errors++;
    });

    const timeseries = Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([bucket, data]) => {
        const sorted = data.durations.sort((a, b) => a - b);
        return {
          bucket: Number(bucket),
          count: data.count,
          errors: data.errors,
          p95: store.percentile(sorted, 0.95),
          errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
        };
      });

    // Top endpoints
    const endpointMap: Record<string, { count: number; errors: number; durations: number[]; method: string }> = {};
    telemetry.forEach(t => {
      const key = `${t.method}||${t.endpoint}`;
      if (!endpointMap[key]) endpointMap[key] = { count: 0, errors: 0, durations: [], method: t.method };
      endpointMap[key].count++;
      endpointMap[key].durations.push(t.duration_ms);
      if (t.status_code >= 400) endpointMap[key].errors++;
    });

    const topEndpoints = Object.entries(endpointMap)
      .map(([key, data]) => {
        const endpoint = key.split('||')[1];
        const sorted = data.durations.sort((a, b) => a - b);
        return {
          endpoint,
          method: data.method,
          count: data.count,
          p95: store.percentile(sorted, 0.95),
          errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent errors
    const recentErrors = errors.sort((a, b) => b.timestamp - a.timestamp).slice(0, 25);

    return NextResponse.json({
      summary: {
        totalRequests,
        errorRate: Math.round(errorRate * 100) / 100,
        p50: Math.round(p50 * 10) / 10,
        p95: Math.round(p95 * 10) / 10,
        p99: Math.round(p99 * 10) / 10,
        avgMemory: Math.round(avgMemory * 10) / 10,
      },
      timeseries,
      topEndpoints,
      recentErrors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

