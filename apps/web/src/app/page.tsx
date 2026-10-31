'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Navbar } from '../components/Navbar';
import {
  Activity,
  Plus,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Bell,
  Cpu,
  Zap,
  Terminal,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  api_key: string;
  created_at: number;
  total_events?: number;
  total_monitors?: number;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createProject(projectName.trim());
      setProjectName('');
      setShowModal(false);
      await loadProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
            <Zap className="h-3.5 w-3.5" />
            Lightweight Alternative to Heavy APMs
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            Real-Time Telemetry <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400">
              For High-Velocity Builders
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-8">
            Unify API latency percentiles, error stack traces, server uptime, and multi-channel alert dispatching into cinematic dashboards with sub-second live streaming.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
            <a
              href="#quickstart"
              className="px-5 py-3 rounded-xl bg-[#14141e] hover:bg-[#1a1a27] text-zinc-300 border border-[#26263a] text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Terminal className="h-4 w-4" />
              1-Line SDK Setup
            </a>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 max-w-4xl mx-auto">
          <div className="p-4 rounded-xl bg-[#111118] border border-[#1e1e2e] flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Sub-Second Streaming</div>
              <div className="text-[11px] text-zinc-400">WebSocket-powered live graphs</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111118] border border-[#1e1e2e] flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Synthetic Health & SSL</div>
              <div className="text-[11px] text-zinc-400">Continuous edge uptime pings</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111118] border border-[#1e1e2e] flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Instant Alert Dispatch</div>
              <div className="text-[11px] text-zinc-400">Discord, Slack & Email alerts</div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Active Applications</h2>
              <p className="text-xs text-zinc-400">Select a service to view live observability metrics</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-medium bg-[#161622] hover:bg-[#1f1f30] text-zinc-200 border border-[#2a2a3e] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Application
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-zinc-500">Loading applications...</div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-12 text-center">
              <Activity className="h-10 w-10 text-indigo-400/50 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-zinc-200">No applications created yet</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-4">
                Create your first project to receive telemetry and launch real-time monitoring.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Application
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-xl bg-[#111118] border border-[#1e1e2e] p-5 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-indigo-300 transition-colors">
                        {proj.name}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Active
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="text-[10px] font-mono text-zinc-500 mb-1">API Key</div>
                      <div className="flex items-center justify-between bg-[#0a0a0f] border border-[#1e1e2e] rounded px-2.5 py-1.5 text-xs font-mono text-zinc-400">
                        <span className="truncate max-w-[200px]">{proj.api_key}</span>
                        <button
                          onClick={() => copyToClipboard(proj.api_key, proj.id)}
                          className="text-zinc-500 hover:text-zinc-300 p-1"
                          title="Copy API key"
                        >
                          {copiedKey === proj.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-[#1a1a27] text-zinc-400">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Ingested Events</span>
                        <span className="font-mono text-zinc-200">{proj.total_events || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Synthetic Pings</span>
                        <span className="font-mono text-zinc-200">{proj.total_monitors || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#1a1a27] mt-2">
                    <Link
                      href={`/dashboard/${proj.id}`}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all border border-indigo-500/20 hover:border-transparent"
                    >
                      Open Live Dashboard
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 1-Line Drop-in SDK Quickstart */}
        <div id="quickstart" className="rounded-2xl bg-[#111118] border border-[#1e1e2e] p-6 sm:p-8 max-w-4xl mx-auto shadow-xl">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Terminal className="h-4 w-4" />
            Drop-in Integration
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">1-Line Setup for Express & Next.js</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6">
            Add automatic response latency profiling, memory tracking, and error traces without instrumenting individual handlers.
          </p>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Express Application (`server.js`)</span>
                <span className="text-[10px] text-zinc-500 font-mono">npm install @pulsemetrics/sdk</span>
              </div>
              <div className="rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                <span className="text-purple-400">import</span> express <span className="text-purple-400">from</span> <span className="text-emerald-400">&apos;express&apos;</span>;<br />
                <span className="text-purple-400">import</span> &#123; init, pulseMetricsMiddleware &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">&apos;@pulsemetrics/sdk&apos;</span>;<br /><br />
                <span className="text-purple-400">const</span> app = express();<br /><br />
                <span className="text-zinc-500">&#47;&#47; 1. Initialize client</span><br />
                init(&#123; projectId: <span className="text-emerald-400">&apos;your-project-id&apos;</span>, apiKey: <span className="text-emerald-400">&apos;pm_live_...&apos;</span> &#125;);<br /><br />
                <span className="text-zinc-500">&#47;&#47; 2. Add drop-in middleware</span><br />
                app.<span className="text-cyan-400">use</span>(pulseMetricsMiddleware());
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111118] border border-[#26263a] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Application</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Enter a name for your API or web application to generate credentials.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">Application Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stripe Webhook Service"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

