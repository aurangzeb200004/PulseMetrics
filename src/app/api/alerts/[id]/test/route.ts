import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// POST /api/alerts/:id/test
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const rule = store.alertRules.get(params.id);
  if (!rule) return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });

  if (!rule.webhook_url) {
    return NextResponse.json({ error: 'No webhook URL configured for this rule' }, { status: 400 });
  }

  try {
    if (rule.channel === 'discord') {
      await fetch(rule.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🔔 [PulseMetrics Test] ${rule.name}`,
            description: `Webhook verification for **${rule.name}** succeeded! (${rule.metric} ${rule.operator} ${rule.threshold})`,
            color: 0x6366f1,
            timestamp: new Date().toISOString(),
          }],
        }),
      });
    } else if (rule.channel === 'slack') {
      await fetch(rule.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `🔔 *[PulseMetrics Test]* Webhook for *${rule.name}* verified!` }),
      });
    }

    return NextResponse.json({ success: true, message: 'Test notification sent' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send' }, { status: 500 });
  }
}

