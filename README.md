# ⚡ PulseMetrics

> Real-time developer telemetry — lightweight Datadog alternative for indie hackers & SaaS founders

![PulseMetrics Dashboard](https://via.placeholder.com/1200x600/0a0a0f/6366f1?text=PulseMetrics+Dashboard)

## What is PulseMetrics?

PulseMetrics is a self-hosted, developer-first observability suite that gives you:

- **Real-time API telemetry** — p50/p95/p99 latency, error rates, throughput
- **Drop-in SDKs** — 1-line setup for Express, Next.js, or any Node.js app  
- **Synthetic health checks** — automated pings from edge regions + SSL monitoring
- **Smart alerting** — threshold-based alerts dispatched to Discord, Slack, or Email
- **Cinematic dashboards** — WebSocket-powered, sub-second live updates

## Quick Start

### Prerequisites
- Node.js 18+
- npm 8+

### 1. Clone & Install

```bash
git clone https://github.com/yourname/pulsemetrics
cd pulsemetrics
npm install
```

### 2. Start Development Servers

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3001
- **Dashboard**: http://localhost:3000

### 3. Create Your First Project

Open http://localhost:3000 → Click "New Project" → Copy your API key.

### 4. Add the SDK to Your App

```bash
npm install @pulsemetrics/sdk
```

**Express:**
```javascript
import { init, pulseMetricsMiddleware } from '@pulsemetrics/sdk';

init({ 
  projectId: 'your-project-id',
  apiKey: 'your-api-key',
  endpoint: 'http://localhost:3001'
});

app.use(pulseMetricsMiddleware());
```

**Next.js** (create `instrumentation.ts`):
```javascript
import { initPulseMetrics } from '@pulsemetrics/sdk';

export function register() {
  initPulseMetrics({
    projectId: 'your-project-id',
    apiKey: 'your-api-key'
  });
}
```

## Architecture

```
┌─────────────────┐     WebSockets      ┌──────────────────┐
│   Your App      │ ──── SDK ──────────▶│  PulseMetrics    │
│  (Express/Next) │     (batched)       │  API (Node.js)   │
└─────────────────┘                     │  + SQLite DB     │
                                        └────────┬─────────┘
┌─────────────────┐     SSE/WS Push             │
│  Dashboard      │◀────────────────────────────┘
│  (Next.js 14)   │
└─────────────────┘
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite (via better-sqlite3) |
| Realtime | WebSockets (ws) |
| Alerts | Discord / Slack webhooks, Resend (email) |
| Health Checks | node-cron + tls |

## Features

### Drop-in SDK
- Auto-captures: request method, path, status code, duration, memory usage
- Path normalization (no cardinality explosion from `/users/123`)
- Batched sending (configurable flush interval)
- Zero dependencies in production

### Real-Time Dashboard
- Sub-second latency updates via WebSocket
- Rolling 60-point time window
- P50/P95/P99 percentile charts
- Error rate heatmap
- Live error feed with stack traces

### Health Monitoring
- HTTP endpoint pinger (configurable intervals)
- SSL certificate expiry tracking (days remaining)
- Multi-endpoint status grid

### Smart Alerting
Set thresholds on:
- `error_rate` > 5%
- `p95_latency` > 500ms  
- `p99_latency` > 1000ms
- `avg_memory` > 512MB
- `request_rate` anomalies

Dispatch to: Discord, Slack, Email (Resend)

## Self-Hosting with Docker

```bash
docker-compose up -d
```

Access dashboard at http://localhost:3000

## Environment Variables

### API (`apps/api/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | API server port |
| CORS_ORIGIN | * | Allowed CORS origin |
| RESEND_API_KEY | - | For email alerts |
| DEBUG | false | Verbose logging |

### Web (`apps/web/.env.local`)
| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | http://localhost:3001 | API base URL |
| NEXT_PUBLIC_WS_URL | ws://localhost:3001 | WebSocket URL |

## License

MIT — build something great.
