import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { store } from '@/lib/store';

// GET /api/health-checks/:projectId  — list checks for a project
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const checks = Array.from(store.healthChecks.values())
      .filter(h => h.project_id === projectId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(check => {
        const latest = store.getLatestHealthResult(check.id);
        return {
          ...check,
          last_status: latest?.status,
          last_response_time: latest?.response_time_ms,
          last_status_code: latest?.status_code,
          last_ssl_days: latest?.ssl_days_remaining,
          last_checked_at: latest?.timestamp,
        };
      });

    return NextResponse.json({ healthChecks: checks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/health-checks/:projectId  — create check
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const { name, url, interval_seconds } = await request.json();

    if (!name || !url) {
      return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const check = {
      id,
      project_id: projectId,
      name: name.trim(),
      url: url.trim(),
      interval_seconds: Math.max(10, parseInt(interval_seconds || '60', 10)),
      active: 1,
    };

    store.healthChecks.set(id, check);

    // Seed an immediate pending result
    store.addHealthResult({ check_id: id, status: 'UNKNOWN', response_time_ms: 0, status_code: null, ssl_days_remaining: null, timestamp: Date.now() });

    return NextResponse.json({ healthCheck: check }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/health-checks/:id  — delete a check (id is the check id, not project)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!store.healthChecks.has(params.id)) {
    return NextResponse.json({ error: 'Health check not found' }, { status: 404 });
  }
  store.healthChecks.delete(params.id);
  return NextResponse.json({ success: true });
}

