import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// PUT /api/alerts/:id/toggle
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const rule = store.alertRules.get(params.id);
  if (!rule) return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });

  const updated = { ...rule, active: rule.active === 1 ? 0 : 1 };
  store.alertRules.set(params.id, updated);

  return NextResponse.json({ success: true, active: updated.active });
}

