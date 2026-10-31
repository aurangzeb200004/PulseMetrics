'use client';

import React, { useState } from 'react';
import { RecentError } from '../hooks/useMetrics';
import { relativeTime } from '../lib/utils';
import { AlertCircle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

interface ErrorFeedProps {
  errors: RecentError[];
}

export function ErrorFeed({ errors: initialErrors }: ErrorFeedProps) {
  const [errors, setErrors] = useState<RecentError[]>(initialErrors);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  React.useEffect(() => {
    setErrors(initialErrors);
  }, [initialErrors]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleClear = () => {
    setErrors([]);
  };

  return (
    <div className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-zinc-100">Live Error Stream</h3>
          <span className="text-xs text-zinc-500 font-mono">({errors.length})</span>
        </div>
        {errors.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            title="Clear view"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
        {errors.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
            <AlertCircle className="h-6 w-6 text-emerald-500/50" />
            <span>Zero exceptions captured in this timeframe. All systems healthy!</span>
          </div>
        ) : (
          errors.map((err) => {
            const isExpanded = expandedId === err.id;
            return (
              <div
                key={err.id}
                className="rounded-lg bg-[#161622] border border-[#232336] p-3 text-xs transition-colors hover:border-rose-500/30"
              >
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                  onClick={() => toggleExpand(err.id)}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5 text-zinc-500">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono font-medium text-rose-400 truncate">
                        {err.message}
                      </div>
                      {err.endpoint && (
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
                          {err.endpoint}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 whitespace-nowrap font-mono">
                    {relativeTime(err.timestamp)}
                  </span>
                </div>

                {isExpanded && err.stack && (
                  <div className="mt-2.5 pt-2 border-t border-[#232336]">
                    <pre className="font-mono text-[10px] text-zinc-400 bg-[#0c0c12] p-2 rounded overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {err.stack}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

