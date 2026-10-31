'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TimeseriesPoint } from '../hooks/useMetrics';

interface ErrorRateChartProps {
  data: TimeseriesPoint[];
}

export function ErrorRateChart({ data }: ErrorRateChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    errorRate: Math.round(d.errorRate * 10) / 10,
    errors: d.errors,
  }));

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            Error Rate %
            <span className="text-xs font-normal text-zinc-400">(4xx & 5xx)</span>
          </h3>
          <p className="text-xs text-zinc-500">Live proportion of failing requests</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-rose-400">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span>Failure %</span>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Awaiting error telemetry...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                unit="%"
                domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.2))]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-lg bg-[#181824] border border-[#2a2a3e] p-2.5 text-xs shadow-xl">
                        <div className="font-mono text-zinc-400 mb-1">{label}</div>
                        <div className="font-mono font-bold text-rose-400">
                          Error Rate: {item.errorRate}% ({item.errors} errors)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={5}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'Warn (5%)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
              />
              <Area
                type="monotone"
                dataKey="errorRate"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#errorGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

