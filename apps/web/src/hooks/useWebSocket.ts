'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

export function useWebSocket(
  projectId: string | null,
  onMessage?: (msg: WebSocketMessage) => void
) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!projectId) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    setConnectionState('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        retryCountRef.current = 0;
        ws.send(JSON.stringify({ type: 'subscribe', projectId }));
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(parsed);
          }
        } catch {
          // Ignore unparseable frames
        }
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        // Exponential backoff reconnect
        const backoff = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
        retryCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setConnectionState('disconnected');
    }
  }, [projectId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connectionState };
}

