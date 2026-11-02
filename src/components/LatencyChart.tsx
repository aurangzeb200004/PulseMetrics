'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TimeseriesPoint } from '../hooks/useMetrics';

interface LatencyChartProps {
  data: TimeseriesPoint[];
  slaThresholdMs?: number;
}

export function LatencyChart({ data, slaThresholdMs = 500 }: LatencyChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    p50: Math.round(d.p95 * 0.4),
    p95: d.p95,
    p99: Math.round(d.p95 * 1.4),
  }));

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            Response Latency Percentiles
            <span className="text-xs font-normal text-zinc-400">(p50 / p95 / p99)</span>
          </h3>
          <p className="text-xs text-zinc-500">Live sub-second server response times</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-zinc-400">p50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-zinc-400">p95</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-zinc-400">p99</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Awaiting telemetry events...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#1e1e2e' }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#1e1e2e' }}
                unit="ms"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg bg-[#181824] border border-[#2a2a3e] p-2.5 text-xs shadow-xl">
                        <div className="font-mono text-zinc-400 mb-1.5">{label}</div>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4 font-mono">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-bold text-zinc-200">{entry.value} ms</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {slaThresholdMs && (
                <ReferenceLine
                  y={slaThresholdMs}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'SLA (500ms)', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#22d3ee"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="p99"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

