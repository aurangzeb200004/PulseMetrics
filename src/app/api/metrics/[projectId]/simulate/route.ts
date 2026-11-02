import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { store } from '@/lib/store';

// POST /api/metrics/:projectId/simulate
export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(100, parseInt(body.count || '30', 10));
    const { projectId } = params;

    const endpoints = [
      { path: '/api/v1/auth/login', method: 'POST', baseMs: 120 },
      { path: '/api/v1/users/me', method: 'GET', baseMs: 45 },
      { path: '/api/v1/projects', method: 'GET', baseMs: 80 },
      { path: '/api/v1/analytics/query', method: 'POST', baseMs: 350 },
      { path: '/api/v1/billing/subscription', method: 'GET', baseMs: 95 },
      { path: '/api/v1/export/csv', method: 'GET', baseMs: 820 },
    ];

    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      const ts = now - Math.floor(Math.random() * 30000);
      const isError = Math.random() < 0.08;
      const statusCode = isError ? (Math.random() < 0.5 ? 500 : 429) : 200;
      const durationMs = Math.max(10, Math.round(ep.baseMs + (Math.random() - 0.5) * 50 + (isError ? 200 : 0)));
      const memoryMb = Math.round(65 + Math.random() * 40);

      store.addTelemetry({ project_id: projectId, endpoint: ep.path, method: ep.method, status_code: statusCode, duration_ms: durationMs, memory_mb: memoryMb, timestamp: ts });

      if (isError) {
        const msg = statusCode === 500 ? 'Internal Server Error: DB connection failed' : 'Rate limit exceeded';
        store.addError({ project_id: projectId, message: msg, stack: `Error: ${msg}\n    at handler (api.ts:44:9)`, endpoint: ep.path, timestamp: ts });
      }
    }

    return NextResponse.json({ success: true, generated: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

