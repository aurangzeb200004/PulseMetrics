'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Bell, Plus, Trash2, Send, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { relativeTime } from '../lib/utils';

interface AlertRuleItem {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  window_seconds: number;
  channel: string;
  webhook_url?: string;
  active: number;
  total_triggers?: number;
  last_triggered?: number;
}

interface AlertHistoryItem {
  id: string;
  rule_name: string;
  metric: string;
  channel: string;
  triggered_at: number;
  resolved_at?: number;
  value: number;
}

interface AlertRulesProps {
  projectId: string;
}

export function AlertRules({ projectId }: AlertRulesProps) {
  const [rules, setRules] = useState<AlertRuleItem[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('p95_latency');
  const [operator, setOperator] = useState('>');
  const [threshold, setThreshold] = useState('500');
  const [windowSec, setWindowSec] = useState('120');
  const [channel, setChannel] = useState('discord');
  const [webhookUrl, setWebhookUrl] = useState('');

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts(projectId);
      setRules(data.rules || []);
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load alert rules:', err);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [projectId]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || threshold === undefined) return;

    try {
      await api.createAlert(projectId, {
        name,
        metric,
        operator,
        threshold: parseFloat(threshold),
        window_seconds: parseInt(windowSec, 10),
        channel,
        webhook_url: webhookUrl,
      });

      setName('');
      setWebhookUrl('');
      setShowAddForm(false);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to create alert rule:', err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleAlert(id);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await api.deleteAlert(id);
      await loadAlerts();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setIsTesting(id);
    setTestResult(null);
    try {
      await api.testAlertWebhook(id);
      setTestResult('Test webhook delivered successfully!');
    } catch (err: any) {
      setTestResult(`Error: ${err.message || 'Failed to dispatch'}`);
    } finally {
      setIsTesting(null);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-400" />
            Multi-Channel Alert Dispatcher
          </h3>
          <p className="text-xs text-zinc-500">
            Real-time threshold triggers dispatched to Discord, Slack, and Resend Email
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Alert Rule
        </button>
      </div>

      {testResult && (
        <div className="mb-4 p-2.5 rounded text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
          {testResult}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleCreateRule} className="mb-5 p-4 rounded-lg bg-[#161622] border border-[#26263a] space-y-3">
          <div className="text-xs font-semibold text-zinc-200">Configure Threshold Rule</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Rule Name (e.g. Critical Latency Spike)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
              required
            />
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500"
            >
              <option value="p95_latency">P95 Latency (ms)</option>
              <option value="p99_latency">P99 Latency (ms)</option>
              <option value="error_rate">Error Rate (%)</option>
              <option value="avg_memory">Avg Memory (MB)</option>
              <option value="request_rate">Request Rate (req/s)</option>
            </select>
            <div className="flex gap-2">
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500"
              >
                <option value=">">&gt; (Greater than)</option>
                <option value=">=">&gt;= (At least)</option>
                <option value="<">&lt; (Less than)</option>
              </select>
              <input
                type="number"
                placeholder="Threshold"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2.5 py-1.5 text-xs text-white w-full focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500"
            >
              <option value="discord">Discord Webhook</option>
              <option value="slack">Slack Webhook</option>
              <option value="email">Email (Resend)</option>
            </select>
            <input
              type="text"
              placeholder={channel === 'email' ? 'Recipient email address' : 'Webhook URL'}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 sm:col-span-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Save Alert Rule
            </button>
          </div>
        </form>
      )}

      {/* Rules list */}
      <div className="space-y-2 mb-6">
        {rules.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            No alert rules configured. Create one to get notified in Discord or Slack!
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-lg bg-[#161622] border border-[#232336] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(rule.id)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  {rule.active ? (
                    <ToggleRight className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-zinc-600" />
                  )}
                </button>
                <div>
                  <div className="font-medium text-zinc-200 flex items-center gap-2">
                    <span>{rule.name}</span>
                    <span className="font-mono text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {rule.channel.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Trigger when <span className="text-amber-400">{rule.metric}</span> {rule.operator} {rule.threshold}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {rule.webhook_url && (
                  <button
                    onClick={() => handleTestWebhook(rule.id)}
                    disabled={isTesting === rule.id}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#0a0a0f] border border-[#2a2a3e] hover:border-zinc-500 text-zinc-300 text-[11px] transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    {isTesting === rule.id ? 'Sending...' : 'Test'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Dispatch History */}
      {history.length > 0 && (
        <div className="border-t border-[#1e1e2e] pt-4">
          <div className="text-xs font-semibold text-zinc-300 mb-2.5">Recent Alert Trigger Logs</div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            {history.map((h) => {
              const isResolved = !!h.resolved_at;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded bg-[#14141e] text-[11px] font-mono text-zinc-400"
                >
                  <div className="flex items-center gap-2">
                    {isResolved ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                    )}
                    <span className="text-zinc-200">{h.rule_name}</span>
                    <span>({h.metric} = {h.value.toFixed(1)})</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span>{isResolved ? 'Resolved' : 'Triggered'}</span>
                    <span>•</span>
                    <span>{relativeTime(h.triggered_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

