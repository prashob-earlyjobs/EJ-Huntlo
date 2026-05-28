import { authHeaders } from "@/lib/auth";
import type { CampaignContact } from "@/lib/campaigns";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type WhatsAppMessageDirection = "outbound" | "inbound";
export type WhatsAppMessageStatus = "sent" | "delivered" | "read" | "failed" | "pending";

export type WhatsAppThreadMessage = {
  id: string;
  direction: WhatsAppMessageDirection;
  body: string;
  sentAt: string;
  status?: WhatsAppMessageStatus;
  sequenceStep?: string;
  provider?: string;
  externalMessageId?: string;
  errorMessage?: string;
};

export type WhatsAppThreadStatus = "replied" | "awaiting" | "no_phone" | "failed";

export type WhatsAppSessionWindow = {
  canReply: boolean;
  expiresAt: string | null;
};

export type WhatsAppContactThread = {
  contactKey: string;
  contact: CampaignContact;
  lastPreview: string;
  /** ISO date string — format in UI */
  lastTimeLabel: string;
  unreadCount: number;
  /** When the recruiter last opened this thread */
  lastReadAt: string | null;
  threadStatus: WhatsAppThreadStatus;
  sessionWindow: WhatsAppSessionWindow;
  messages: WhatsAppThreadMessage[];
  messageCount: number;
  hasMoreMessages: boolean;
  enrollment?: {
    status: string;
    currentStepOrder: number;
    sentCount: number;
    lastError: string;
    nextSendAt: string | null;
  } | null;
};

export type CampaignWhatsAppConversationsResponse = {
  campaignId: string;
  outreachStatus: string;
  outreachChannel: string;
  threadCount: number;
  threadPage: number;
  threadPageSize: number;
  hasMoreThreads: boolean;
  threads: WhatsAppContactThread[];
};

function parseContact(raw: unknown): CampaignContact | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidateKey = typeof o.candidateKey === "string" ? o.candidateKey : "";
  if (!candidateKey) return null;
  return {
    candidateKey,
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : "",
    phone: typeof o.phone === "string" ? o.phone : "",
    role: typeof o.role === "string" ? o.role : "",
    company: typeof o.company === "string" ? o.company : "",
    addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString(),
  };
}

function parseMessage(raw: unknown): WhatsAppThreadMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const direction = o.direction === "inbound" ? "inbound" : "outbound";
  const status = o.status as WhatsAppMessageStatus | undefined;
  return {
    id,
    direction,
    body: typeof o.body === "string" ? o.body : "",
    sentAt: typeof o.sentAt === "string" ? o.sentAt : new Date().toISOString(),
    status:
      status === "sent" ||
      status === "delivered" ||
      status === "read" ||
      status === "failed" ||
      status === "pending"
        ? status
        : "sent",
    sequenceStep: typeof o.sequenceStep === "string" ? o.sequenceStep : "",
    provider: typeof o.provider === "string" ? o.provider : "",
    externalMessageId: typeof o.externalMessageId === "string" ? o.externalMessageId : "",
    errorMessage: typeof o.errorMessage === "string" ? o.errorMessage : "",
  };
}

function parseThread(raw: unknown): WhatsAppContactThread | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const contact = parseContact(o.contact);
  const contactKey = typeof o.contactKey === "string" ? o.contactKey : contact?.candidateKey;
  if (!contactKey || !contact) return null;

  const messages = Array.isArray(o.messages)
    ? o.messages.map(parseMessage).filter((m): m is WhatsAppThreadMessage => m !== null)
    : [];

  const threadStatus = o.threadStatus as WhatsAppThreadStatus;
  const status: WhatsAppThreadStatus =
    threadStatus === "replied" ||
    threadStatus === "awaiting" ||
    threadStatus === "no_phone" ||
    threadStatus === "failed"
      ? threadStatus
      : "awaiting";

  let sessionWindow: WhatsAppSessionWindow = { canReply: false, expiresAt: null };
  if (o.sessionWindow && typeof o.sessionWindow === "object") {
    const sw = o.sessionWindow as Record<string, unknown>;
    sessionWindow = {
      canReply: Boolean(sw.canReply),
      expiresAt: typeof sw.expiresAt === "string" ? sw.expiresAt : null,
    };
  }

  let enrollment: WhatsAppContactThread["enrollment"] = null;
  if (o.enrollment && typeof o.enrollment === "object") {
    const e = o.enrollment as Record<string, unknown>;
    enrollment = {
      status: typeof e.status === "string" ? e.status : "",
      currentStepOrder: typeof e.currentStepOrder === "number" ? e.currentStepOrder : 1,
      sentCount: typeof e.sentCount === "number" ? e.sentCount : 0,
      lastError: typeof e.lastError === "string" ? e.lastError : "",
      nextSendAt: typeof e.nextSendAt === "string" ? e.nextSendAt : null,
    };
  }

  return {
    contactKey,
    contact,
    messages,
    lastPreview: typeof o.lastPreview === "string" ? o.lastPreview : "",
    lastTimeLabel:
      typeof o.lastTimeLabel === "string" ? o.lastTimeLabel : contact.addedAt,
    unreadCount: typeof o.unreadCount === "number" ? o.unreadCount : 0,
    lastReadAt: typeof o.lastReadAt === "string" ? o.lastReadAt : null,
    threadStatus: status,
    sessionWindow,
    enrollment,
    messageCount: typeof o.messageCount === "number" ? o.messageCount : messages.length,
    hasMoreMessages: Boolean(o.hasMoreMessages),
  };
}

export function formatWhatsAppMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function fetchCampaignWhatsAppConversations(
  token: string,
  campaignId: string,
  params?: { threadPage?: number; threadPageSize?: number; messagePageSize?: number }
): Promise<CampaignWhatsAppConversationsResponse> {
  const qs = new URLSearchParams();
  if (params?.threadPage) qs.set("threadPage", String(params.threadPage));
  if (params?.threadPageSize) qs.set("threadPageSize", String(params.threadPageSize));
  if (params?.messagePageSize) qs.set("messagePageSize", String(params.messagePageSize));
  const query = qs.toString();
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/whatsapp-conversations${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Failed to load WhatsApp conversations"
    );
  }

  const threads = Array.isArray(data.threads)
    ? data.threads.map(parseThread).filter((t): t is WhatsAppContactThread => t !== null)
    : [];

  return {
    campaignId: typeof data.campaignId === "string" ? data.campaignId : campaignId,
    outreachStatus: typeof data.outreachStatus === "string" ? data.outreachStatus : "idle",
    outreachChannel:
      typeof data.outreachChannel === "string" ? data.outreachChannel : "whatsapp",
    threadCount: typeof data.threadCount === "number" ? data.threadCount : threads.length,
    threadPage: typeof data.threadPage === "number" ? data.threadPage : 1,
    threadPageSize: typeof data.threadPageSize === "number" ? data.threadPageSize : threads.length,
    hasMoreThreads: Boolean(data.hasMoreThreads),
    threads,
  };
}

export type CampaignWhatsAppThreadMessagesResponse = {
  candidateKey: string;
  page: number;
  pageSize: number;
  totalMessages: number;
  hasMore: boolean;
  messages: WhatsAppThreadMessage[];
};

export async function fetchCampaignWhatsAppThreadMessages(
  token: string,
  campaignId: string,
  candidateKey: string,
  params?: { page?: number; pageSize?: number }
): Promise<CampaignWhatsAppThreadMessagesResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const query = qs.toString();
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/whatsapp-conversations/${encodeURIComponent(candidateKey)}/messages${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Failed to load WhatsApp thread messages"
    );
  }
  const messages = Array.isArray(data.messages)
    ? data.messages.map(parseMessage).filter((m): m is WhatsAppThreadMessage => m !== null)
    : [];
  return {
    candidateKey:
      typeof data.candidateKey === "string" ? data.candidateKey : candidateKey,
    page: typeof data.page === "number" ? data.page : params?.page || 1,
    pageSize: typeof data.pageSize === "number" ? data.pageSize : params?.pageSize || 30,
    totalMessages: typeof data.totalMessages === "number" ? data.totalMessages : messages.length,
    hasMore: Boolean(data.hasMore),
    messages,
  };
}

export type SendWhatsAppSessionMessageResponse = {
  message: WhatsAppThreadMessage;
  sessionWindow: WhatsAppSessionWindow;
  lastReadAt: string | null;
  unreadCount: number;
};

export async function sendCampaignWhatsAppSessionMessage(
  token: string,
  campaignId: string,
  candidateKey: string,
  body: string
): Promise<SendWhatsAppSessionMessageResponse> {
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/whatsapp-conversations/${encodeURIComponent(candidateKey)}/messages`,
    {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to send WhatsApp message"
    );
  }

  const message = parseMessage(data.message);
  if (!message) {
    throw new Error("Invalid response from server");
  }

  let sessionWindow: WhatsAppSessionWindow = { canReply: false, expiresAt: null };
  if (data.sessionWindow && typeof data.sessionWindow === "object") {
    const sw = data.sessionWindow as Record<string, unknown>;
    sessionWindow = {
      canReply: Boolean(sw.canReply),
      expiresAt: typeof sw.expiresAt === "string" ? sw.expiresAt : null,
    };
  }

  return {
    message,
    sessionWindow,
    lastReadAt: typeof data.lastReadAt === "string" ? data.lastReadAt : null,
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}

export async function markCampaignWhatsAppThreadRead(
  token: string,
  campaignId: string,
  candidateKey: string
): Promise<{ candidateKey: string; lastReadAt: string; unreadCount: number }> {
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/whatsapp-conversations/${encodeURIComponent(candidateKey)}/read`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to mark thread as read"
    );
  }
  return {
    candidateKey:
      typeof data.candidateKey === "string" ? data.candidateKey : candidateKey,
    lastReadAt:
      typeof data.lastReadAt === "string" ? data.lastReadAt : new Date().toISOString(),
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}
