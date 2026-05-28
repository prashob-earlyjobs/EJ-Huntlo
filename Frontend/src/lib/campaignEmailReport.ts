import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type EmailReportMatrixRow = {
  key: string;
  label: string;
  count: number;
  rate: number;
  description: string;
};

export type EmailReportActivity = {
  type: "sent" | "reply" | "interested" | "not_interested" | "failed" | "skipped";
  candidateKey: string;
  contactName: string;
  contactEmail: string;
  at: string;
  detail: string;
};

export type CampaignEmailReport = {
  channel: "email" | "whatsapp";
  campaignName: string;
  outreachStatus: string;
  outreachStartedAt: string | null;
  totalContacts: number;
  contactsWithEmail: number;
  enrolled: number;
  sent: number;
  replied: number;
  interested: number;
  notInterested: number;
  notDelivered: number;
  awaitingReply: number;
  matrix: EmailReportMatrixRow[];
  recentActivity: EmailReportActivity[];
  note: string | null;
};

function parseMatrixRow(raw: unknown): EmailReportMatrixRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key : "";
  const label = typeof o.label === "string" ? o.label : "";
  if (!key || !label) return null;
  return {
    key,
    label,
    count: typeof o.count === "number" ? o.count : 0,
    rate: typeof o.rate === "number" ? o.rate : 0,
    description: typeof o.description === "string" ? o.description : "",
  };
}

function parseActivity(raw: unknown): EmailReportActivity | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = o.type;
  if (
    type !== "sent" &&
    type !== "reply" &&
    type !== "interested" &&
    type !== "not_interested" &&
    type !== "failed" &&
    type !== "skipped"
  ) {
    return null;
  }
  const at =
    typeof o.at === "string"
      ? o.at
      : o.at
        ? new Date(String(o.at)).toISOString()
        : new Date().toISOString();
  return {
    type,
    candidateKey: typeof o.candidateKey === "string" ? o.candidateKey : "",
    contactName: typeof o.contactName === "string" ? o.contactName : "",
    contactEmail: typeof o.contactEmail === "string" ? o.contactEmail : "",
    at,
    detail: typeof o.detail === "string" ? o.detail : "",
  };
}

function parseReport(raw: unknown): CampaignEmailReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const matrix = Array.isArray(o.matrix)
    ? o.matrix.map(parseMatrixRow).filter((r): r is EmailReportMatrixRow => r !== null)
    : [];
  const recentActivity = Array.isArray(o.recentActivity)
    ? o.recentActivity.map(parseActivity).filter((a): a is EmailReportActivity => a !== null)
    : [];
  return {
    channel: o.channel === "whatsapp" ? "whatsapp" : "email",
    campaignName: typeof o.campaignName === "string" ? o.campaignName : "",
    outreachStatus: typeof o.outreachStatus === "string" ? o.outreachStatus : "idle",
    outreachStartedAt:
      typeof o.outreachStartedAt === "string"
        ? o.outreachStartedAt
        : o.outreachStartedAt
          ? new Date(String(o.outreachStartedAt)).toISOString()
          : null,
    totalContacts: typeof o.totalContacts === "number" ? o.totalContacts : 0,
    contactsWithEmail: typeof o.contactsWithEmail === "number" ? o.contactsWithEmail : 0,
    enrolled: typeof o.enrolled === "number" ? o.enrolled : 0,
    sent: typeof o.sent === "number" ? o.sent : 0,
    replied: typeof o.replied === "number" ? o.replied : 0,
    interested: typeof o.interested === "number" ? o.interested : 0,
    notInterested: typeof o.notInterested === "number" ? o.notInterested : 0,
    notDelivered: typeof o.notDelivered === "number" ? o.notDelivered : 0,
    awaitingReply: typeof o.awaitingReply === "number" ? o.awaitingReply : 0,
    matrix,
    recentActivity,
    note: typeof o.note === "string" ? o.note : null,
  };
}

export async function fetchCampaignEmailReport(
  token: string,
  campaignId: string
): Promise<CampaignEmailReport> {
  const res = await fetch(`${apiBase()}/api/campaigns/${campaignId}/email-report`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load report");
  }
  const report = parseReport(data.report);
  if (!report) throw new Error("Invalid report response");
  return report;
}
