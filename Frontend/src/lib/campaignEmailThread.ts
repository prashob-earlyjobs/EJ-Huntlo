import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type CampaignEmailThreadMessage = {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  snippet: string;
  bodyText: string;
  receivedAt: string;
  isFromCandidate: boolean;
};

export type ContactEmailThreadResult = {
  hasEnrollment: boolean;
  sentCount: number;
  hasReply: boolean;
  replyCount: number;
  enrollmentStatus: string;
  replyDisposition?: "unknown" | "interested" | "not_interested";
  autoReplyCount?: number;
  messages: CampaignEmailThreadMessage[];
  synced: boolean;
};

function parseMessage(raw: unknown): CampaignEmailThreadMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const receivedAt =
    typeof o.receivedAt === "string"
      ? o.receivedAt
      : o.receivedAt
        ? new Date(String(o.receivedAt)).toISOString()
        : "";
  return {
    id,
    fromEmail: typeof o.fromEmail === "string" ? o.fromEmail : "",
    toEmail: typeof o.toEmail === "string" ? o.toEmail : "",
    subject: typeof o.subject === "string" ? o.subject : "",
    snippet: typeof o.snippet === "string" ? o.snippet : "",
    bodyText: typeof o.bodyText === "string" ? o.bodyText : "",
    receivedAt,
    isFromCandidate: Boolean(o.isFromCandidate),
  };
}

export async function fetchContactEmailThread(
  token: string,
  campaignId: string,
  candidateKey: string,
  options?: { sync?: boolean }
): Promise<ContactEmailThreadResult> {
  const sync = options?.sync ? "1" : "0";
  const key = encodeURIComponent(candidateKey);
  const res = await fetch(
    `${apiBase()}/api/campaigns/${campaignId}/contacts/${key}/email-thread?sync=${sync}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load email thread"
    );
  }
  const messages = Array.isArray(data.messages)
    ? data.messages.map(parseMessage).filter((m): m is CampaignEmailThreadMessage => m !== null)
    : [];
  return {
    hasEnrollment: Boolean(data.hasEnrollment),
    sentCount: typeof data.sentCount === "number" ? data.sentCount : 0,
    hasReply: Boolean(data.hasReply),
    replyCount: typeof data.replyCount === "number" ? data.replyCount : 0,
    enrollmentStatus:
      typeof data.enrollmentStatus === "string" ? data.enrollmentStatus : "",
    replyDisposition:
      data.replyDisposition === "interested" ||
      data.replyDisposition === "not_interested" ||
      data.replyDisposition === "unknown"
        ? data.replyDisposition
        : undefined,
    autoReplyCount:
      typeof data.autoReplyCount === "number" ? data.autoReplyCount : undefined,
    messages,
    synced: Boolean(data.synced),
  };
}

export async function syncCampaignReplies(
  token: string,
  campaignId: string
): Promise<{ newReplies: number; synced: number }> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/sync-replies`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to sync replies"
    );
  }
  return {
    newReplies: typeof data.newReplies === "number" ? data.newReplies : 0,
    synced: typeof data.synced === "number" ? data.synced : 0,
  };
}
