import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// POST /api/ingest
export async function POST(request: Request) {
  try {
    const { projectId, apiKey, events } = await request.json();

    if (!projectId || !apiKey) {
      return NextResponse.json({ error: 'Missing projectId or apiKey' }, { status: 401 });
    }
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'events must be a non-empty array' }, { status: 400 });
    }

    const project = store.projects.get(projectId);
    if (!project || project.api_key !== apiKey) {
      return NextResponse.json({ error: 'Invalid projectId or apiKey' }, { status: 403 });
    }

    let processed = 0;
    const now = Date.now();

    for (const item of events) {
      const timestamp = item.timestamp || now;

      if (item.type === 'request') {
        store.addTelemetry({
          project_id: projectId,
          endpoint: item.endpoint || '/',
          method: item.method || 'GET',
          status_code: item.statusCode || 200,
          duration_ms: item.durationMs || 0,
          memory_mb: item.memoryMb || 0,
          timestamp,
        });
        processed++;

        if ((item.statusCode || 200) >= 400) {
          store.addError({
            project_id: projectId,
            message: `HTTP ${item.statusCode} on ${item.method} ${item.endpoint}`,
            endpoint: item.endpoint,
            timestamp,
          });
        }
      } else if (item.type === 'error') {
        store.addError({
          project_id: projectId,
          message: item.errorMessage || item.message || 'Unknown error',
          stack: item.errorStack || item.stack,
          endpoint: item.endpoint,
          timestamp,
        });
        processed++;
      } else if (item.type === 'custom') {
        store.customEvents.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
          project_id: projectId,
          event_name: item.eventName || 'event',
          value: item.value,
          metadata: item.metadata ? JSON.stringify(item.metadata) : undefined,
          timestamp,
        });
        processed++;
      }
    }

    return NextResponse.json({ success: true, processed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

