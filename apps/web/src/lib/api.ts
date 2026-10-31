const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = {
  // Projects
  getProjects: async () => {
    const res = await fetch(`${API_BASE}/api/projects`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  createProject: async (name: string) => {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  deleteProject: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
    return res.json();
  },

  // Metrics
  getMetrics: async (projectId: string, from?: number, to?: number, endpoint?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from.toString());
    if (to) params.set('to', to.toString());
    if (endpoint) params.set('endpoint', endpoint);

    const res = await fetch(`${API_BASE}/api/metrics/${projectId}?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  getLivePoints: async (projectId: string) => {
    const res = await fetch(`${API_BASE}/api/metrics/${projectId}/live`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch live points');
    return res.json();
  },

  simulateTraffic: async (projectId: string, count: number = 30) => {
    const res = await fetch(`${API_BASE}/api/metrics/${projectId}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) throw new Error('Failed to simulate traffic');
    return res.json();
  },

  // Health Checks
  getHealthChecks: async (projectId: string) => {
    const res = await fetch(`${API_BASE}/api/health-checks/${projectId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch health checks');
    return res.json();
  },

  createHealthCheck: async (projectId: string, data: { name: string; url: string; interval_seconds: number }) => {
    const res = await fetch(`${API_BASE}/api/health-checks/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create health check');
    return res.json();
  },

  deleteHealthCheck: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/health-checks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete health check');
    return res.json();
  },

  triggerHealthCheck: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/health-checks/${id}/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger health check');
    return res.json();
  },

  // Alert Rules
  getAlerts: async (projectId: string) => {
    const res = await fetch(`${API_BASE}/api/alerts/${projectId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  createAlert: async (projectId: string, data: any) => {
    const res = await fetch(`${API_BASE}/api/alerts/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create alert rule');
    return res.json();
  },

  toggleAlert: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/alerts/${id}/toggle`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to toggle alert rule');
    return res.json();
  },

  deleteAlert: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/alerts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete alert rule');
    return res.json();
  },

  testAlertWebhook: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/alerts/${id}/test`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send test alert');
    }
    return res.json();
  },
};

