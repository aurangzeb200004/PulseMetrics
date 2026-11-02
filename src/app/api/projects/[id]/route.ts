import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET /api/projects/:id
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const project = store.projects.get(params.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ project });
}

// DELETE /api/projects/:id
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!store.projects.has(params.id)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  store.projects.delete(params.id);
  // Cascade delete
  store.telemetry.splice(0, store.telemetry.length, ...store.telemetry.filter(t => t.project_id !== params.id));
  store.errors.splice(0, store.errors.length, ...store.errors.filter(e => e.project_id !== params.id));

  return NextResponse.json({ success: true });
}

