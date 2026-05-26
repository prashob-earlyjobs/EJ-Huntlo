import { getStoredAuth } from "@/lib/auth";
import { buildRealtimeWsUrl, realtimeConfig } from "@/lib/realtime/config";
import {
  RealtimeEvents,
  type CampaignThreadUpdatedPayload,
  type RealtimeEventName,
  type RealtimeMessage,
} from "@/lib/realtime/events";

type ThreadUpdatedHandler = (payload: CampaignThreadUpdatedPayload) => void;
type ConnectionHandler = (connected: boolean) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private threadHandlers = new Set<ThreadUpdatedHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;
  private refCount = 0;

  subscribeThreadUpdated(handler: ThreadUpdatedHandler): () => void {
    this.threadHandlers.add(handler);
    this.connect();
    return () => {
      this.threadHandlers.delete(handler);
      this.release();
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  connect(): void {
    if (!realtimeConfig.enabled || typeof window === "undefined") return;
    this.refCount += 1;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.intentionalClose = false;
    this.openSocket();
  }

  private release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.disconnect();
    }
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.refCount = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifyConnection(false);
  }

  private openSocket(): void {
    const auth = getStoredAuth();
    if (!auth?.token) return;

    const url = buildRealtimeWsUrl(auth.token);
    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.notifyConnection(true);
    };

    ws.onmessage = (ev) => {
      this.handleMessage(ev.data);
    };

    ws.onclose = () => {
      this.socket = null;
      this.notifyConnection(false);
      if (!this.intentionalClose && this.refCount > 0) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      realtimeConfig.reconnectMaxMs,
      realtimeConfig.reconnectMinMs * 2 ** this.reconnectAttempt
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.refCount > 0 && !this.intentionalClose) {
        this.openSocket();
      }
    }, delay);
  }

  private handleMessage(raw: unknown): void {
    let parsed: RealtimeMessage;
    try {
      parsed = JSON.parse(String(raw)) as RealtimeMessage;
    } catch {
      return;
    }
    if (!parsed?.event) return;

    if (parsed.event === RealtimeEvents.CAMPAIGN_THREAD_UPDATED) {
      const data = parsed.data as CampaignThreadUpdatedPayload;
      for (const handler of this.threadHandlers) {
        handler(data);
      }
    }
  }

  private notifyConnection(connected: boolean): void {
    for (const handler of this.connectionHandlers) {
      handler(connected);
    }
  }
}

export const realtimeClient = new RealtimeClient();

export function isCampaignThreadEvent(
  event: string
): event is typeof RealtimeEvents.CAMPAIGN_THREAD_UPDATED {
  return event === RealtimeEvents.CAMPAIGN_THREAD_UPDATED;
}

export type { RealtimeEventName };
