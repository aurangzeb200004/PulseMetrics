'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Bell, Layers, ExternalLink } from 'lucide-react';
import { LiveIndicator } from './LiveIndicator';

interface NavbarProps {
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  projectName?: string;
  projectId?: string;
}

export function Navbar({ connectionStatus, projectName, projectId }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-[#0a0a0f] rounded-[11px] flex items-center justify-center">
                <Activity className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white">Pulse<span className="text-indigo-400">Metrics</span></span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">v1.0</span>
            </div>
          </Link>

          {projectName && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-800 text-sm">
              <span className="text-zinc-500">Project:</span>
              <span className="font-medium text-zinc-200">{projectName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {connectionStatus && <LiveIndicator status={connectionStatus} />}

          <Link
            href="/"
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
          >
            <Layers className="h-3.5 w-3.5" />
            Projects
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            Docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </header>
  );
}

