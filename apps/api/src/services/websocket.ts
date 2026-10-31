import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface ClientConnection {
  ws: WebSocket;
  projectId?: string;
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientConnection> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = {
        ws,
        isAlive: true,
      };
      this.clients.add(client);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'subscribe' && parsed.projectId) {
            client.projectId = parsed.projectId;
            ws.send(JSON.stringify({ type: 'subscribed', projectId: parsed.projectId, timestamp: Date.now() }));
          } else if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
      });

      ws.on('error', () => {
        this.clients.delete(client);
      });
    });

    // Clean up dead connections every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);

    console.log('[websocket] Real-time WebSocket server initialized');
  }

  public broadcastToProject(projectId: string, message: { type: string; data: any }): void {
    const payload = JSON.stringify({ ...message, timestamp: Date.now() });
    this.clients.forEach((client) => {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (client.projectId === projectId || !client.projectId)
      ) {
        client.ws.send(payload);
      }
    });
  }

  public getSubscriberCount(projectId: string): number {
    let count = 0;
    this.clients.forEach((c) => {
      if (c.projectId === projectId && c.ws.readyState === WebSocket.OPEN) count++;
    });
    return count;
  }

  public close(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.wss) this.wss.close();
  }
}

export const wsManager = new WebSocketManager();

