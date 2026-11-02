'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatMs, relativeTime } from '../lib/utils';
import { ShieldCheck, Globe, Play, Trash2, Plus, Clock, Lock } from 'lucide-react';

interface HealthCheckItem {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  last_status?: string;
  last_response_time?: number;
  last_status_code?: number;
  last_ssl_days?: number;
  last_checked_at?: number;
}

interface HealthChecksProps {
  projectId: string;
}

export function HealthChecks({ projectId }: HealthChecksProps) {
  const [checks, setChecks] = useState<HealthCheckItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newInterval, setNewInterval] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const loadChecks = async () => {
    try {
      const data = await api.getHealthChecks(projectId);
      setChecks(data.healthChecks || []);
    } catch (err) {
      console.error('Failed to load health checks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChecks();
    const interval = setInterval(loadChecks, 20000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;

    setIsSubmitting(true);
    try {
      await api.createHealthCheck(projectId, {
        name: newName,
        url: newUrl,
        interval_seconds: parseInt(newInterval, 10),
      });
      setNewName('');
      setNewUrl('');
      setShowAddModal(false);
      await loadChecks();
    } catch (err) {
      console.error('Failed to create health check:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this synthetic monitor?')) return;
    try {
      await api.deleteHealthCheck(id);
      setChecks(checks.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete check:', err);
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      await api.triggerHealthCheck(id);
      await loadChecks();
    } catch (err) {
      console.error('Failed to trigger health check:', err);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Synthetic Health & SSL Monitors
          </h3>
          <p className="text-xs text-zinc-500">Automated global uptime pings & certificate monitoring</p>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Monitor
        </button>
      </div>

      {showAddModal && (
        <form onSubmit={handleAddCheck} className="mb-4 p-4 rounded-lg bg-[#161622] border border-[#26263a] space-y-3">
          <div className="text-xs font-semibold text-zinc-200">New Synthetic Endpoint Ping</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Monitor Name (e.g. Auth Service)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              type="url"
              placeholder="Target URL (https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <div className="flex gap-2">
              <select
                value={newInterval}
                onChange={(e) => setNewInterval(e.target.value)}
                className="bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
              >
                <option value="30">Every 30s</option>
                <option value="60">Every 60s</option>
                <option value="120">Every 2m</option>
                <option value="300">Every 5m</option>
              </select>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
        {checks.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No synthetic health checks created yet. Add one above!
          </div>
        ) : (
          checks.map((check) => {
            const isUp = check.last_status === 'UP';
            const sslDays = check.last_ssl_days;

            return (
              <div
                key={check.id}
                className="rounded-lg bg-[#161622] border border-[#232336] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-3 w-3 rounded-full flex-shrink-0 ${
                      isUp ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-medium text-xs text-zinc-200 flex items-center gap-2 truncate">
                      <span>{check.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {check.interval_seconds}s
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                      {check.url}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs justify-between sm:justify-end">
                  <div className="flex items-center gap-2">
                    {check.last_response_time !== undefined && (
                      <span className="font-mono text-zinc-300 bg-[#0a0a0f] px-2 py-0.5 rounded border border-[#2a2a3e]">
                        {formatMs(check.last_response_time)}
                      </span>
                    )}

                    {sslDays !== undefined && sslDays !== null && (
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded flex items-center gap-1 border ${
                          sslDays > 30
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : sslDays > 14
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                        }`}
                        title="SSL Certificate Days Remaining"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        SSL: {sslDays}d
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRunNow(check.id)}
                      disabled={runningId === check.id}
                      className="p-1.5 rounded hover:bg-[#232336] text-zinc-400 hover:text-white transition-colors"
                      title="Ping Now"
                    >
                      <Play className={`h-3 w-3 ${runningId === check.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(check.id)}
                      className="p-1.5 rounded hover:bg-[#232336] text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete Monitor"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

