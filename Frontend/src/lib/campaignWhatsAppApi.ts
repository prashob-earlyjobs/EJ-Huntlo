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

export type WhatsAppContactThread = {
  contactKey: string;
  contact: CampaignContact;
  lastPreview: string;
  /** ISO date string — format in UI */
  lastTimeLabel: string;
  unreadCount: number;
  threadStatus: WhatsAppThreadStatus;
  messages: WhatsAppThreadMessage[];
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
    threadStatus: status,
    enrollment,
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
  campaignId: string
): Promise<CampaignWhatsAppConversationsResponse> {
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/whatsapp-conversations`,
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
    threads,
  };
}
