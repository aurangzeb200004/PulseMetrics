'use client';

import React from 'react';

interface LiveIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

export function LiveIndicator({ status }: LiveIndicatorProps) {
  if (status === 'connected') {
    return (
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        LIVE STREAM
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-400 text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse" />
        </span>
        SYNCING...
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700/50 text-zinc-400 text-xs font-medium">
      <span className="h-2 w-2 rounded-full bg-zinc-500" />
      OFFLINE
    </div>
  );
}

