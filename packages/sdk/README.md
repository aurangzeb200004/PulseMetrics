# @pulsemetrics/sdk

> Ultra-lightweight, 1-line real-time telemetry SDK for Express, Next.js, and Node.js.

## Installation

```bash
npm install @pulsemetrics/sdk
```

## Express (1-Line Middleware)

```typescript
import express from 'express';
import { init, pulseMetricsMiddleware } from '@pulsemetrics/sdk';

const app = express();

// 1. Initialize client
init({
  projectId: 'your-project-id',
  apiKey: 'pm_live_xxxxxxxxxxxxxxxx',
  endpoint: 'http://localhost:3001' // Optional, defaults to http://localhost:3001
});

// 2. Attach middleware
app.use(pulseMetricsMiddleware());

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(8080);
```

## Next.js (App Router)

### 1. Register in `instrumentation.ts`
```typescript
import { initPulseMetrics } from '@pulsemetrics/sdk';

export function register() {
  initPulseMetrics({
    projectId: process.env.PULSE_PROJECT_ID!,
    apiKey: process.env.PULSE_API_KEY!,
  });
}
```

### 2. Wrap API Routes (Optional)
```typescript
import { withPulseMetrics } from '@pulsemetrics/sdk';

export const GET = withPulseMetrics(async (req) => {
  return Response.json({ status: 'ok' });
});
```

## Manual Tracking & Custom Events

```typescript
import { getInstance } from '@pulsemetrics/sdk';

const pulse = getInstance();

// Custom business KPI / Metric
pulse?.track('subscription.upgraded', 49.00, { plan: 'enterprise', user_id: 'usr_99' });

// Error capture
try {
  throw new Error('Database connection timeout');
} catch (err) {
  pulse?.captureError(err as Error, { endpoint: '/api/v1/checkout' });
}
```

## Features

- **Automatic Path Normalization**: Replaces IDs/UUIDs to prevent label explosions (`/api/items/49102` -> `/api/items/:id`)
- **Batched Ingestion**: Buffers events in memory and sends in batches every 2s
- **Zero Overhead**: Minimal memory footprint, fails silently if server is unreachable

