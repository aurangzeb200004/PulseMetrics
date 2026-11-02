import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// POST /api/health-checks/:id/run — simulate a ping with random result
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = store.healthChecks.get(params.id);
  if (!check) {
    return NextResponse.json({ error: 'Health check not found' }, { status: 404 });
  }

  // Simulate a ping result (actual HTTP call would need edge runtime or server action)
  const isUp = Math.random() > 0.05;
  const result = store.addHealthResult({
    check_id: params.id,
    status: isUp ? 'UP' : 'DOWN',
    response_time_ms: Math.round(30 + Math.random() * 250),
    status_code: isUp ? 200 : 503,
    ssl_days_remaining: check.url.startsWith('https') ? Math.round(60 + Math.random() * 250) : null,
    timestamp: Date.now(),
  });

  return NextResponse.json({ success: true, result });
}

