import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { store } from '@/lib/store';

// GET /api/projects
export async function GET() {
  try {
    const projects = Array.from(store.projects.values()).map(p => ({
      ...p,
      total_events: store.telemetry.filter(t => t.project_id === p.id).length,
      total_monitors: Array.from(store.healthChecks.values()).filter(h => h.project_id === p.id).length,
    })).sort((a, b) => b.created_at - a.created_at);

    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/projects
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const apiKey = `pm_live_${crypto.randomBytes(16).toString('hex')}`;
    const now = Math.floor(Date.now() / 1000);

    const project = { id, name: name.trim(), api_key: apiKey, created_at: now };
    store.projects.set(id, project);

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

