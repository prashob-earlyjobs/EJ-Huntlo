import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type ReportMetricKey =
  | "sent"
  | "replied"
  | "interested"
  | "not_interested"
  | "not_delivered"
  | "awaiting_reply";

export type EmailReportMatrixRow = {
  key: ReportMetricKey | string;
  label: string;
  count: number;
  rate: number;
  description: string;
};

export type ReportMetricCandidate = {
  candidateKey: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  enrollmentStatus: string;
  replyDisposition: string;
  sentCount: number;
  hasReply: boolean;
  detail: string;
  lastSentAt: string | null;
  lastReplyAt: string | null;
};

export type ReportMetricBreakdown = Record<ReportMetricKey, ReportMetricCandidate[]>;

export type EmailReportActivity = {
  type: "sent" | "reply" | "interested" | "not_interested" | "failed" | "skipped";
  candidateKey: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  at: string;
  detail: string;
};

export type ReportActivityPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type CampaignEmailReportActivityResponse = {
  channel: "email" | "whatsapp";
  campaignName: string;
  outreachStatus: string;
  activities: EmailReportActivity[];
  pagination: ReportActivityPagination;
};

export type CampaignEmailReport = {
  channel: "email" | "whatsapp";
  campaignName: string;
  outreachStatus: string;
  outreachStartedAt: string | null;
  totalContacts: number;
  contactsWithEmail: number;
  contactsWithPhone: number;
  enrolled: number;
  sent: number;
  replied: number;
  interested: number;
  notInterested: number;
  notDelivered: number;
  awaitingReply: number;
  matrix: EmailReportMatrixRow[];
  breakdown: ReportMetricBreakdown;
  /** Legacy field; Activity tab uses paginated `/email-report/activity`. */
  recentActivity?: EmailReportActivity[];
  note: string | null;
};

export const REPORT_METRIC_SLUGS: Record<ReportMetricKey, string> = {
  sent: "sent",
  replied: "replied",
  interested: "interested",
  not_interested: "not-interested",
  not_delivered: "not-delivered",
  awaiting_reply: "awaiting-reply",
};

export const REPORT_METRIC_KEYS: ReportMetricKey[] = [
  "sent",
  "replied",
  "interested",
  "not_interested",
  "not_delivered",
  "awaiting_reply",
];

function parseMetricCandidate(raw: unknown): ReportMetricCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    candidateKey: typeof o.candidateKey === "string" ? o.candidateKey : "",
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : "",
    phone: typeof o.phone === "string" ? o.phone : "",
    role: typeof o.role === "string" ? o.role : "",
    company: typeof o.company === "string" ? o.company : "",
    enrollmentStatus: typeof o.enrollmentStatus === "string" ? o.enrollmentStatus : "",
    replyDisposition: typeof o.replyDisposition === "string" ? o.replyDisposition : "unknown",
    sentCount: typeof o.sentCount === "number" ? o.sentCount : 0,
    hasReply: Boolean(o.hasReply),
    detail: typeof o.detail === "string" ? o.detail : "",
    lastSentAt:
      typeof o.lastSentAt === "string"
        ? o.lastSentAt
        : o.lastSentAt
          ? new Date(String(o.lastSentAt)).toISOString()
          : null,
    lastReplyAt:
      typeof o.lastReplyAt === "string"
        ? o.lastReplyAt
        : o.lastReplyAt
          ? new Date(String(o.lastReplyAt)).toISOString()
          : null,
  };
}

function parseBreakdown(raw: unknown): ReportMetricBreakdown {
  const empty = (): ReportMetricBreakdown => ({
    sent: [],
    replied: [],
    interested: [],
    not_interested: [],
    not_delivered: [],
    awaiting_reply: [],
  });

  if (!raw || typeof raw !== "object") return empty();
  const o = raw as Record<string, unknown>;
  const result = empty();
  for (const key of REPORT_METRIC_KEYS) {
    const list = o[key];
    result[key] = Array.isArray(list)
      ? list.map(parseMetricCandidate).filter((c): c is ReportMetricCandidate => c !== null)
      : [];
  }
  return result;
}

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
    contactPhone: typeof o.contactPhone === "string" ? o.contactPhone : "",
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
    : undefined;
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
    contactsWithPhone: typeof o.contactsWithPhone === "number" ? o.contactsWithPhone : 0,
    enrolled: typeof o.enrolled === "number" ? o.enrolled : 0,
    sent: typeof o.sent === "number" ? o.sent : 0,
    replied: typeof o.replied === "number" ? o.replied : 0,
    interested: typeof o.interested === "number" ? o.interested : 0,
    notInterested: typeof o.notInterested === "number" ? o.notInterested : 0,
    notDelivered: typeof o.notDelivered === "number" ? o.notDelivered : 0,
    awaitingReply: typeof o.awaitingReply === "number" ? o.awaitingReply : 0,
    matrix,
    breakdown: parseBreakdown(o.breakdown),
    ...(recentActivity ? { recentActivity } : {}),
    note: typeof o.note === "string" ? o.note : null,
  };
}

function parseActivityPagination(raw: unknown): ReportActivityPagination {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const page = typeof o.page === "number" && o.page > 0 ? o.page : 1;
  const limit = typeof o.limit === "number" && o.limit > 0 ? o.limit : 20;
  const total = typeof o.total === "number" && o.total >= 0 ? o.total : 0;
  const totalPages =
    typeof o.totalPages === "number" && o.totalPages > 0 ? o.totalPages : 1;
  const hasMore = typeof o.hasMore === "boolean" ? o.hasMore : page < totalPages;
  return { page, limit, total, totalPages, hasMore };
}

function parseActivityResponse(raw: unknown): CampaignEmailReportActivityResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const activities = Array.isArray(o.activities)
    ? o.activities.map(parseActivity).filter((a): a is EmailReportActivity => a !== null)
    : [];
  return {
    channel: o.channel === "whatsapp" ? "whatsapp" : "email",
    campaignName: typeof o.campaignName === "string" ? o.campaignName : "",
    outreachStatus: typeof o.outreachStatus === "string" ? o.outreachStatus : "idle",
    activities,
    pagination: parseActivityPagination(o.pagination),
  };
}

export function isReportMetricKey(key: string): key is ReportMetricKey {
  return (REPORT_METRIC_KEYS as string[]).includes(key);
}

export function slugForReportMetric(metric: ReportMetricKey): string {
  return REPORT_METRIC_SLUGS[metric];
}

export function reportMetricFromSlug(slug: string): ReportMetricKey | null {
  const key = String(slug || "").trim().toLowerCase();
  const entry = Object.entries(REPORT_METRIC_SLUGS).find(([, s]) => s === key);
  return entry ? (entry[0] as ReportMetricKey) : null;
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

export const CAMPAIGN_ACTIVITY_PAGE_SIZE = 20;

export async function fetchCampaignEmailReportActivity(
  token: string,
  campaignId: string,
  options?: { page?: number; limit?: number }
): Promise<CampaignEmailReportActivityResponse> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? CAMPAIGN_ACTIVITY_PAGE_SIZE;
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/email-report/activity?${q}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load activity");
  }
  const parsed = parseActivityResponse(data);
  if (!parsed) throw new Error("Invalid activity response");
  return parsed;
}
