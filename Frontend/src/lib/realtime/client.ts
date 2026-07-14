import { getStoredAuth } from "@/lib/auth";
import { buildRealtimeWsUrl, realtimeConfig } from "@/lib/realtime/config";
import {
  RealtimeEvents,
  type CampaignThreadUpdatedPayload,
  type CandidateSearchPollPayload,
  type RealtimeEventName,
  type RealtimeMessage,
} from "@/lib/realtime/events";

type ThreadUpdatedHandler = (payload: CampaignThreadUpdatedPayload) => void;
type CandidateSearchPollHandler = (payload: CandidateSearchPollPayload) => void;
type ConnectionHandler = (connected: boolean) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private threadHandlers = new Set<ThreadUpdatedHandler>();
  private searchPollHandlers = new Set<CandidateSearchPollHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private intentionalClose = false;
  private refCount = 0;
  /** Kept open while any page session is active (logged-in user). */
  private sessionHeld = false;
  private userId = "";

  subscribeThreadUpdated(handler: ThreadUpdatedHandler): () => void {
    this.threadHandlers.add(handler);
    this.connect();
    return () => {
      this.threadHandlers.delete(handler);
      this.release();
    };
  }

  subscribeCandidateSearchPoll(handler: CandidateSearchPollHandler): () => void {
    this.searchPollHandlers.add(handler);
    this.connect();
    return () => {
      this.searchPollHandlers.delete(handler);
      this.release();
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /** Keep socket open for the whole page session (any route). */
  connectForSession(): void {
    if (!realtimeConfig.enabled || typeof window === "undefined") return;
    this.sessionHeld = true;
    this.intentionalClose = false;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.openSocket();
  }

  /** End page-session hold (e.g. logout / root unmount). */
  disconnectSession(): void {
    this.sessionHeld = false;
    if (this.refCount === 0) {
      this.disconnect();
    }
  }

  connect(): void {
    if (!realtimeConfig.enabled || typeof window === "undefined") return;
    this.refCount += 1;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.intentionalClose = false;
    this.openSocket();
  }

  private release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0 && !this.sessionHeld) {
      this.disconnect();
    }
  }

  private shouldStayConnected(): boolean {
    return this.sessionHeld || this.refCount > 0;
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.refCount = 0;
    this.sessionHeld = false;
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

  /** Send a client message; always includes userId. */
  send(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const auth = getStoredAuth();
    const userId = this.userId || auth?.id || "";
    this.socket.send(JSON.stringify({ ...payload, userId }));
  }

  private openSocket(): void {
    const auth = getStoredAuth();
    if (!auth?.token) return;

    // Do not send userId in the query — backend trusts JWT `sub` only.
    // A mismatched localStorage id was closing the socket (4401) so emits never arrived.
    this.userId = String(auth.id || "").trim();
    const url = buildRealtimeWsUrl(auth.token);
    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.notifyConnection(true);
      if (typeof console !== "undefined") {
        console.info("[realtime] connected");
      }
    };

    ws.onmessage = (ev) => {
      this.handleMessage(ev.data);
    };

    ws.onclose = (ev) => {
      this.socket = null;
      this.notifyConnection(false);
      if (typeof console !== "undefined" && ev.code !== 1000) {
        console.warn("[realtime] closed", ev.code, ev.reason || "");
      }
      if (!this.intentionalClose && this.shouldStayConnected()) {
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
      if (this.shouldStayConnected() && !this.intentionalClose) {
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
      return;
    }

    if (parsed.event === RealtimeEvents.CANDIDATE_SEARCH_POLL) {
      const data = parsed.data as CandidateSearchPollPayload;
      const docCount = Array.isArray(data.docs) ? data.docs.length : 0;
      console.info(
        `[realtime] candidates.search.poll status=${data.done ? "done" : "polling"} hits:${data.candidateCount ?? docCount}`
      );
      for (const handler of this.searchPollHandlers) {
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
