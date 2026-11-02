import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { store, AlertRule, AlertHistory } from '@/lib/store';

// GET /api/alerts/:projectId
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const projectId = params.id;

  const rules = Array.from(store.alertRules.values())
    .filter(r => r.project_id === projectId)
    .map(r => {
      const history = store.alertHistory.filter(h => h.rule_id === r.id);
      return {
        ...r,
        total_triggers: history.length,
        last_triggered: history.sort((a, b) => b.triggered_at - a.triggered_at)[0]?.triggered_at,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const history = store.alertHistory
    .filter(h => {
      const rule = store.alertRules.get(h.rule_id);
      return rule?.project_id === projectId;
    })
    .sort((a, b) => b.triggered_at - a.triggered_at)
    .slice(0, 20)
    .map(h => {
      const rule = store.alertRules.get(h.rule_id);
      return { ...h, rule_name: rule?.name, metric: rule?.metric, channel: rule?.channel };
    });

  return NextResponse.json({ rules, history });
}

// POST /api/alerts/:projectId — create rule
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const { name, metric, operator, threshold, window_seconds, channel, webhook_url } = await request.json();

    if (!name || !metric || !operator || threshold === undefined || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const rule: AlertRule = {
      id, project_id: projectId,
      name: name.trim(), metric, operator,
      threshold: parseFloat(threshold),
      window_seconds: parseInt(window_seconds || '300', 10),
      channel,
      webhook_url: webhook_url?.trim(),
      active: 1,
    };

    store.alertRules.set(id, rule);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/alerts/:id — delete rule
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!store.alertRules.has(params.id)) {
    return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
  }
  store.alertRules.delete(params.id);
  return NextResponse.json({ success: true });
}

