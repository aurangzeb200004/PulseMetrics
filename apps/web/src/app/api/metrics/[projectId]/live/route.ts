import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET /api/metrics/:projectId/live
export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const since = Date.now() - 60000;
  const points = store.telemetry
    .filter(t => t.project_id === params.projectId && t.timestamp >= since)
    .sort((a, b) => a.timestamp - b.timestamp);

  return NextResponse.json({ points });
}

