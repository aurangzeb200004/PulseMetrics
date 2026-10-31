'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { MetricCard } from '../../../components/MetricCard';
import { LatencyChart } from '../../../components/LatencyChart';
import { ErrorRateChart } from '../../../components/ErrorRateChart';
import { ThroughputChart } from '../../../components/ThroughputChart';
import { EndpointsTable } from '../../../components/EndpointsTable';
import { ErrorFeed } from '../../../components/ErrorFeed';
import { HealthChecks } from '../../../components/HealthChecks';
import { AlertRules } from '../../../components/AlertRules';
import { useMetrics } from '../../../hooks/useMetrics';
import { api } from '../../../lib/api';
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const params = useParams();
  const projectId = (params?.projectId as string) || '';

  const [timeRangeHours, setTimeRangeHours] = useState(1);
  const [projectName, setProjectName] = useState('PulseMetrics Service');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState(false);

  const {
    summary,
    timeseries,
    topEndpoints,
    recentErrors,
    isLoading,
    connectionState,
    refresh,
  } = useMetrics(projectId, timeRangeHours);

  // Fetch project metadata
  useEffect(() => {
    if (!projectId) return;
    api
      .getProjects()
      .then((data) => {
        const found = data.projects?.find((p: any) => p.id === projectId);
        if (found) setProjectName(found.name);
      })
      .catch(() => {});
  }, [projectId]);

  // Handler to simulate live traffic for instant interactive demo
  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulateSuccess(false);
    try {
      await api.simulateTraffic(projectId, 30);
      setSimulateSuccess(true);
      setTimeout(() => setSimulateSuccess(false), 3000);
      refresh();
    } catch (err) {
      console.error('Failed to simulate traffic:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col">
      <Navbar
        connectionStatus={connectionState}
        projectName={projectName}
        projectId={projectId}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#181824]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {projectName}
              </h1>
              <span className="text-[11px] font-mono bg-[#14141e] text-zinc-400 border border-[#232336] px-2 py-0.5 rounded">
                ID: {projectId}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Continuous live telemetry feed & automated health monitors
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Simulate Traffic Button */}
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                simulateSuccess
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/30'
              }`}
              title="Inject 30 realistic live events into this dashboard"
            >
              {simulateSuccess ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Traffic Dispatched!
                </>
              ) : (
                <>
                  <Sparkles className={`h-3.5 w-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  {isSimulating ? 'Streaming...' : 'Simulate Traffic'}
                </>
              )}
            </button>

            {/* Time range selector */}
            <div className="flex items-center rounded-lg bg-[#111118] border border-[#1e1e2e] p-0.5 text-xs">
              {[
                { label: '1H', value: 1 },
                { label: '6H', value: 6 },
                { label: '24H', value: 24 },
                { label: '7D', value: 168 },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRangeHours(range.value)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors ${
                    timeRangeHours === range.value
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Manual Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-[#111118] border border-[#1e1e2e] text-zinc-400 hover:text-white transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Requests"
            value={summary.totalRequests.toLocaleString()}
            subValue="calls"
            icon={Activity}
            variant="default"
            glow={summary.totalRequests > 0}
            trend={{ direction: 'up', text: '+12%' }}
          />

          <MetricCard
            label="Error Rate"
            value={`${summary.errorRate}%`}
            icon={AlertTriangle}
            variant={summary.errorRate > 5 ? 'danger' : summary.errorRate > 1 ? 'warning' : 'success'}
            trend={{
              direction: summary.errorRate > 5 ? 'up' : 'down',
              text: summary.errorRate > 5 ? 'Elevated' : 'Normal',
            }}
          />

          <MetricCard
            label="P95 Latency"
            value={`${summary.p95}`}
            subValue="ms"
            icon={Clock}
            variant={summary.p95 > 500 ? 'warning' : 'default'}
            trend={{ direction: 'neutral', text: 'Within SLA' }}
          />

          <MetricCard
            label="Avg Memory Load"
            value={`${summary.avgMemory || 68}`}
            subValue="MB"
            icon={Cpu}
            variant="default"
            trend={{ direction: 'neutral', text: 'Stable' }}
          />
        </div>

        {/* Charts Row 1: Latency & Error Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LatencyChart data={timeseries} slaThresholdMs={500} />
          <ErrorRateChart data={timeseries} />
        </div>

        {/* Charts Row 2: Throughput & Top Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThroughputChart data={timeseries} />
          <EndpointsTable endpoints={topEndpoints} />
        </div>

        {/* Bottom Row: Synthetic Health Checks & Live Error Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HealthChecks projectId={projectId} />
          <ErrorFeed errors={recentErrors} />
        </div>

        {/* Alert Dispatcher Section */}
        <div className="pt-2">
          <AlertRules projectId={projectId} />
        </div>
      </main>
    </div>
  );
}

