import type { CampaignContact } from "@/lib/campaigns";
import { authHeaders } from "@/lib/auth";
import { slugifyVoiceResultColumnName, resultFieldCoversScreeningQuestion, getScreeningResultColumnsForQuestionIndex, SCREENING_RESULT_TOPIC_LABELS } from "@/lib/voiceAgentPrompt";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type CampaignVoiceCallResult = {
  summary: string;
  callbackTime: string;
  finalOutcome: string;
  interestLevel: string;
  candidateStatus: string;
  callbackRequested: string;
  candidateQuestions: string[];
  objectionsOrConcerns: string[];
};

export type CampaignVoiceCallRecord = {
  id: string;
  callId: string;
  requestId: string;
  agentId: string;
  candidateKey: string;
  contactName: string;
  toNumber: string;
  fromPhoneNumber: string;
  status: string;
  lifecycleStatus: string;
  answeredBy: string;
  durationSeconds: number | null;
  durationMinutes: number | null;
  eventType: string;
  timezone: string;
  retryCount: number;
  maxRetries: number;
  createdAtHunar: string | null;
  startedAt: string | null;
  endedAt: string | null;
  lastEventAt: string | null;
  statusPayload: Record<string, unknown> | null;
  resultPayload: Record<string, unknown> | null;
  recordingUrl: string;
  recordingPayload: Record<string, unknown> | null;
  summaryText: string;
  summaryPayload: Record<string, unknown> | null;
  callResult: CampaignVoiceCallResult | null;
};

export type CampaignVoiceCallRow = {
  contact: CampaignContact;
  call: CampaignVoiceCallRecord | null;
  displayStatus: string;
};

export type CampaignVoiceCallsResponse = {
  campaignId: string;
  outreachStatus: string;
  outreachChannel: string;
  rows: CampaignVoiceCallRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

function parseCallResult(raw: unknown): CampaignVoiceCallResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const finalOutcome = typeof o.finalOutcome === "string" ? o.finalOutcome.trim() : "";
  const interestLevel = typeof o.interestLevel === "string" ? o.interestLevel.trim() : "";
  const candidateStatus = typeof o.candidateStatus === "string" ? o.candidateStatus.trim() : "";
  const callbackRequested =
    typeof o.callbackRequested === "string" ? o.callbackRequested.trim() : "";
  const callbackTime = typeof o.callbackTime === "string" ? o.callbackTime.trim() : "";
  const candidateQuestions = Array.isArray(o.candidateQuestions)
    ? o.candidateQuestions.filter((item): item is string => typeof item === "string")
    : [];
  const objectionsOrConcerns = Array.isArray(o.objectionsOrConcerns)
    ? o.objectionsOrConcerns.filter((item): item is string => typeof item === "string")
    : [];
  if (
    !summary &&
    !finalOutcome &&
    !interestLevel &&
    !candidateStatus &&
    !callbackRequested &&
    !callbackTime &&
    candidateQuestions.length === 0 &&
    objectionsOrConcerns.length === 0
  ) {
    return null;
  }
  return {
    summary,
    callbackTime,
    finalOutcome,
    interestLevel,
    candidateStatus,
    callbackRequested,
    candidateQuestions,
    objectionsOrConcerns,
  };
}

function parseCallResultFromPayload(
  payload: Record<string, unknown> | null
): CampaignVoiceCallResult | null {
  if (!payload) return null;
  const raw = payload.result;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return parseCallResult({
    summary: r.summary,
    finalOutcome: r.final_outcome,
    interestLevel: r.interest_level,
    candidateStatus: r.candidate_status,
    callbackRequested: r.callback_requested,
    callbackTime: r.callback_time,
    candidateQuestions: r.candidate_questions,
    objectionsOrConcerns: r.objections_or_concerns,
  });
}

export const DEFAULT_VOICE_RESULT_FIELDS: Array<{
  columnName: string;
  expectedValue: string;
}> = [
  { columnName: "summary", expectedValue: "under 50 words" },
  {
    columnName: "candidate_status",
    expectedValue: "Confirmed Candidate, Wrong Person, Unable To Verify, or Call Disconnected",
  },
  {
    columnName: "interest_level",
    expectedValue: "Interested, Not Interested, Requested Callback, or Unclear",
  },
  { columnName: "callback_requested", expectedValue: "Yes or No" },
  { columnName: "callback_time", expectedValue: "callback time or Not provided" },
  { columnName: "candidate_questions", expectedValue: "array of question strings" },
  {
    columnName: "final_outcome",
    expectedValue:
      "Interested, Not Interested, Callback Scheduled, Wrong Person, Incomplete Call, or Unable To Determine",
  },
];

export function formatVoiceResultColumnLabel(columnName: string): string {
  return columnName
    .trim()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatVoiceCallResultValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : "—";
  }
  if (typeof value === "object") {
    const serialized = JSON.stringify(value);
    return serialized === "{}" ? "—" : serialized;
  }
  const text = String(value).trim();
  return text || "—";
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function resolveVoiceCallResultData(
  call: CampaignVoiceCallRecord
): Record<string, unknown> {
  if (call.resultPayload?.result && typeof call.resultPayload.result === "object") {
    return { ...(call.resultPayload.result as Record<string, unknown>) };
  }

  const normalized = call.callResult;
  if (!normalized) return {};

  return {
    summary: normalized.summary,
    callback_time: normalized.callbackTime,
    final_outcome: normalized.finalOutcome,
    interest_level: normalized.interestLevel,
    candidate_status: normalized.candidateStatus,
    callback_requested: normalized.callbackRequested,
    candidate_questions: normalized.candidateQuestions,
    objections_or_concerns: normalized.objectionsOrConcerns,
  };
}

export function getVoiceCallResultFieldValue(
  data: Record<string, unknown>,
  columnName: string
): string {
  const key = columnName.trim();
  if (!key) return "—";

  let value = data[key];
  if (value === undefined) {
    value = data[snakeToCamel(key)];
  }
  if (value === undefined) {
    const lowerKey = key.toLowerCase();
    const matchedKey = Object.keys(data).find((candidate) => candidate.toLowerCase() === lowerKey);
    if (matchedKey) value = data[matchedKey];
  }

  return formatVoiceCallResultValue(value);
}

export function resolveScreeningQuestionAnswer(
  question: string,
  resultFields: Array<{ columnName: string; expectedValue: string }>,
  data: Record<string, unknown>,
  questionIndex = -1
): string {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return "—";

  if (questionIndex >= 0) {
    const mappedColumns = getScreeningResultColumnsForQuestionIndex(questionIndex, trimmedQuestion);
    if (mappedColumns.length > 1) {
      const parts = mappedColumns
        .map((columnName) => {
          const value = getVoiceCallResultFieldValue(data, columnName);
          if (value === "—") return null;
          const label = SCREENING_RESULT_TOPIC_LABELS[columnName.toLowerCase()] || columnName;
          return `${label}: ${value}`;
        })
        .filter(Boolean);
      if (parts.length > 0) return parts.join(" · ");
    }
  }

  const matchedField = resultFields.find((field) =>
    resultFieldCoversScreeningQuestion(field, trimmedQuestion, questionIndex)
  );
  if (matchedField) {
    return getVoiceCallResultFieldValue(data, matchedField.columnName);
  }

  const slug = slugifyVoiceResultColumnName(trimmedQuestion);
  return getVoiceCallResultFieldValue(data, slug);
}

export function resolveVoiceCallResult(
  call: CampaignVoiceCallRecord
): CampaignVoiceCallResult | null {
  return call.callResult || parseCallResultFromPayload(call.resultPayload);
}

export function resolveVoiceCallSummary(call: CampaignVoiceCallRecord): string {
  const result = resolveVoiceCallResult(call);
  return result?.summary.trim() || call.summaryText.trim();
}

function parseCall(raw: unknown): CampaignVoiceCallRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return {
    id,
    callId: typeof o.callId === "string" ? o.callId : "",
    requestId: typeof o.requestId === "string" ? o.requestId : "",
    agentId: typeof o.agentId === "string" ? o.agentId : "",
    candidateKey: typeof o.candidateKey === "string" ? o.candidateKey : "",
    contactName: typeof o.contactName === "string" ? o.contactName : "",
    toNumber: typeof o.toNumber === "string" ? o.toNumber : "",
    fromPhoneNumber: typeof o.fromPhoneNumber === "string" ? o.fromPhoneNumber : "",
    status: typeof o.status === "string" ? o.status : "",
    lifecycleStatus: typeof o.lifecycleStatus === "string" ? o.lifecycleStatus : "",
    answeredBy: typeof o.answeredBy === "string" ? o.answeredBy : "",
    durationSeconds: typeof o.durationSeconds === "number" ? o.durationSeconds : null,
    durationMinutes: typeof o.durationMinutes === "number" ? o.durationMinutes : null,
    eventType: typeof o.eventType === "string" ? o.eventType : "",
    timezone: typeof o.timezone === "string" ? o.timezone : "",
    retryCount: typeof o.retryCount === "number" ? o.retryCount : 0,
    maxRetries: typeof o.maxRetries === "number" ? o.maxRetries : 0,
    createdAtHunar: typeof o.createdAtHunar === "string" ? o.createdAtHunar : null,
    startedAt: typeof o.startedAt === "string" ? o.startedAt : null,
    endedAt: typeof o.endedAt === "string" ? o.endedAt : null,
    lastEventAt: typeof o.lastEventAt === "string" ? o.lastEventAt : null,
    statusPayload:
      o.statusPayload && typeof o.statusPayload === "object"
        ? (o.statusPayload as Record<string, unknown>)
        : null,
    resultPayload:
      o.resultPayload && typeof o.resultPayload === "object"
        ? (o.resultPayload as Record<string, unknown>)
        : null,
    callResult: parseCallResult(o.callResult) || parseCallResultFromPayload(
      o.resultPayload && typeof o.resultPayload === "object"
        ? (o.resultPayload as Record<string, unknown>)
        : null
    ),
    recordingUrl: typeof o.recordingUrl === "string" ? o.recordingUrl : "",
    recordingPayload:
      o.recordingPayload && typeof o.recordingPayload === "object"
        ? (o.recordingPayload as Record<string, unknown>)
        : null,
    summaryText: typeof o.summaryText === "string" ? o.summaryText : "",
    summaryPayload:
      o.summaryPayload && typeof o.summaryPayload === "object"
        ? (o.summaryPayload as Record<string, unknown>)
        : null,
  };
}

function parseContact(raw: unknown): CampaignContact | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const candidateKey = typeof o.candidateKey === "string" ? o.candidateKey : "";
  if (!candidateKey) return null;
  return {
    candidateKey,
    candidateId: typeof o.candidateId === "string" ? o.candidateId : "",
    name: typeof o.name === "string" ? o.name : "",
    email: typeof o.email === "string" ? o.email : "",
    phone: typeof o.phone === "string" ? o.phone : "",
    role: typeof o.role === "string" ? o.role : "",
    company: typeof o.company === "string" ? o.company : "",
    location: typeof o.location === "string" ? o.location : "",
    linkedinUrl: typeof o.linkedinUrl === "string" ? o.linkedinUrl : "",
    sourcingSessionId:
      typeof o.sourcingSessionId === "string" ? o.sourcingSessionId : "",
    jd: typeof o.jd === "string" ? o.jd : "",
    addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString(),
  };
}

function parseRow(raw: unknown): CampaignVoiceCallRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const contact = parseContact(o.contact);
  if (!contact) return null;
  const call = o.call ? parseCall(o.call) : null;
  return {
    contact,
    call,
    displayStatus: typeof o.displayStatus === "string" ? o.displayStatus : "PENDING",
  };
}

export async function fetchCampaignVoiceCalls(
  token: string,
  campaignId: string,
  params?: { page?: number; limit?: number }
): Promise<CampaignVoiceCallsResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  const res = await fetch(
    `${apiBase()}/api/campaigns/${encodeURIComponent(campaignId)}/voice-calls${query ? `?${query}` : ""}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load voice calls"
    );
  }

  const rows = Array.isArray(data.rows)
    ? (data.rows as unknown[])
        .map(parseRow)
        .filter((row): row is CampaignVoiceCallRow => row !== null)
    : [];

  const pagination =
    data.pagination && typeof data.pagination === "object"
      ? (data.pagination as Record<string, unknown>)
      : {};

  return {
    campaignId: typeof data.campaignId === "string" ? data.campaignId : campaignId,
    outreachStatus: typeof data.outreachStatus === "string" ? data.outreachStatus : "idle",
    outreachChannel:
      typeof data.outreachChannel === "string" ? data.outreachChannel : "voice_call",
    rows,
    pagination: {
      page: typeof pagination.page === "number" ? pagination.page : 1,
      limit: typeof pagination.limit === "number" ? pagination.limit : rows.length,
      total: typeof pagination.total === "number" ? pagination.total : rows.length,
      totalPages: typeof pagination.totalPages === "number" ? pagination.totalPages : 1,
      hasMore: Boolean(pagination.hasMore),
    },
  };
}
