'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TimeseriesPoint } from '../hooks/useMetrics';

interface ThroughputChartProps {
  data: TimeseriesPoint[];
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    count: d.count,
  }));

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            Request Throughput
            <span className="text-xs font-normal text-zinc-400">(Volume / Interval)</span>
          </h3>
          <p className="text-xs text-zinc-500">Total processed API transactions</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-indigo-400">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          <span>Requests</span>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Awaiting traffic volume...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg bg-[#181824] border border-[#2a2a3e] p-2.5 text-xs shadow-xl">
                        <div className="font-mono text-zinc-400 mb-1">{label}</div>
                        <div className="font-mono font-bold text-indigo-400">
                          {payload[0].value} requests
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

