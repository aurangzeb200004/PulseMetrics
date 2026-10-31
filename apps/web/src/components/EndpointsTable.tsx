'use client';

import React, { useState } from 'react';
import { EndpointMetric } from '../hooks/useMetrics';
import { formatMs, formatNumber, latencyColorClass, errorRateColorClass } from '../lib/utils';
import { ArrowUpDown } from 'lucide-react';

interface EndpointsTableProps {
  endpoints: EndpointMetric[];
}

export function EndpointsTable({ endpoints }: EndpointsTableProps) {
  const [sortBy, setSortBy] = useState<'count' | 'p95' | 'errorRate'>('count');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: 'count' | 'p95' | 'errorRate') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const sortedEndpoints = [...endpoints].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    return sortAsc ? valA - valB : valB - valA;
  });

  const methodBadge = (method: string) => {
    const m = (method || 'GET').toUpperCase();
    switch (m) {
      case 'GET':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">GET</span>;
      case 'POST':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">POST</span>;
      case 'PUT':
      case 'PATCH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">{m}</span>;
      case 'DELETE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">DEL</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-700 text-zinc-300">{m}</span>;
    }
  };

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Top API Endpoints</h3>
            <p className="text-xs text-zinc-500">Latency & reliability sorted by traffic</p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">{endpoints.length} active routes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e1e2e] text-zinc-400">
                <th className="pb-3 font-medium">Endpoint</th>
                <th
                  className="pb-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                  onClick={() => handleSort('count')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Requests <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="pb-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                  onClick={() => handleSort('p95')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    P95 Latency <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="pb-3 font-medium cursor-pointer hover:text-zinc-200 transition-colors"
                  onClick={() => handleSort('errorRate')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Error % <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181824]">
              {sortedEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    No endpoint telemetry received yet.
                  </td>
                </tr>
              ) : (
                sortedEndpoints.map((ep, i) => (
                  <tr key={`${ep.method}-${ep.endpoint}-${i}`} className="hover:bg-[#161622] transition-colors">
                    <td className="py-2.5 flex items-center gap-2">
                      {methodBadge(ep.method)}
                      <span className="font-mono text-zinc-300 truncate max-w-[180px] sm:max-w-[260px]">
                        {ep.endpoint}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-zinc-300">
                      {formatNumber(ep.count)}
                    </td>
                    <td className={`py-2.5 text-right font-mono font-medium ${latencyColorClass(ep.p95)}`}>
                      {formatMs(ep.p95)}
                    </td>
                    <td className={`py-2.5 text-right font-mono font-medium ${errorRateColorClass(ep.errorRate)}`}>
                      {ep.errorRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

