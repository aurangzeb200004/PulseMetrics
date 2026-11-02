import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET /api/health-checks/:projectId/results
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const projectId = params.id;
  const checkIds = new Set(
    Array.from(store.healthChecks.values())
      .filter(h => h.project_id === projectId)
      .map(h => h.id)
  );

  const results = store.healthResults
    .filter(r => checkIds.has(r.check_id))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100)
    .map(r => {
      const check = store.healthChecks.get(r.check_id);
      return { ...r, check_name: check?.name, url: check?.url };
    });

  return NextResponse.json({ results });
}

