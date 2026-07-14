import { authHeaders } from "@/lib/auth";
import type {
  ScreeningDetailsForm,
  ScreeningQuestion,
  ScreeningResultDetail,
  ScreeningResultRow,
  ScreeningRow,
  VoiceScriptSections,
  VoiceTone,
  CallLanguage,
  CandidateSource,
} from "@/components/dashboard/screening/types";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type ScreeningDashboardStats = {
  totalScreenings: number;
  completed: number;
  shortlisted: number;
  avgScore: string;
};

export type ScreeningDetailStats = {
  total: number;
  invited: number;
  completed: number;
  shortlisted: number;
  rejected: number;
  pending: number;
  avgScore: string;
};

export type VoiceScreeningPayload = {
  details: ScreeningDetailsForm;
  candidateIds: string[];
  candidateSource: CandidateSource;
  language: CallLanguage;
  voiceTone: VoiceTone;
  attempts: number;
  attemptGap: string;
  durationLimit?: string;
  autoFollowUp?: boolean;
  consentMessage?: boolean;
  script: VoiceScriptSections;
  questions: ScreeningQuestion[];
  launch?: boolean;
};

type ApiErrorBody = { success?: boolean; message?: string; code?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & ApiErrorBody;
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchScreeningStats(token: string) {
  const res = await fetch(`${apiBase()}/api/screenings/stats`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const data = await parseJson<{ success: boolean; stats: ScreeningDashboardStats }>(res);
  return data.stats;
}

export async function fetchScreenings(
  token: string,
  options?: { page?: number; limit?: number; status?: string }
) {
  const qs = new URLSearchParams();
  if (options?.page) qs.set("page", String(options.page));
  if (options?.limit) qs.set("limit", String(options.limit));
  if (options?.status) qs.set("status", options.status);
  const query = qs.toString();
  const res = await fetch(`${apiBase()}/api/screenings${query ? `?${query}` : ""}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const data = await parseJson<{
    success: boolean;
    screenings: ScreeningRow[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(res);
  return data;
}

export async function fetchScreeningDetail(token: string, screeningId: string) {
  const res = await fetch(`${apiBase()}/api/screenings/${encodeURIComponent(screeningId)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const data = await parseJson<{
    success: boolean;
    screening: ScreeningRow;
    stats: ScreeningDetailStats;
    funnel: { label: string; count: number }[];
    results: ScreeningResultRow[];
  }>(res);
  return data;
}

export async function fetchScreeningCandidateDetail(
  token: string,
  screeningId: string,
  candidateId: string
) {
  const res = await fetch(
    `${apiBase()}/api/screenings/${encodeURIComponent(screeningId)}/candidates/${encodeURIComponent(candidateId)}`,
    { headers: authHeaders(token), cache: "no-store" }
  );
  const data = await parseJson<{
    success: boolean;
    detail: ScreeningResultDetail;
  }>(res);
  return data.detail;
}

export async function createVoiceScreening(token: string, payload: VoiceScreeningPayload) {
  const res = await fetch(`${apiBase()}/api/screenings`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      ...payload,
      screeningType: "voice",
    }),
  });
  const data = await parseJson<{
    success: boolean;
    screening: ScreeningRow;
    launched: boolean;
  }>(res);
  return data;
}

export async function launchScreening(token: string, screeningId: string) {
  const res = await fetch(`${apiBase()}/api/screenings/${encodeURIComponent(screeningId)}/launch`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseJson<{ success: boolean; screening: ScreeningRow }>(res);
}

export async function pauseScreening(token: string, screeningId: string) {
  const res = await fetch(`${apiBase()}/api/screenings/${encodeURIComponent(screeningId)}/pause`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseJson<{ success: boolean; screening: ScreeningRow }>(res);
}

export async function generateScreeningQuestions(
  token: string,
  details: ScreeningDetailsForm
) {
  const jobDescription = String(details.jobDescription || "").trim();
  const res = await fetch(`${apiBase()}/api/screenings/generate-questions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ details, jobDescription }),
  });
  const data = await parseJson<{
    success: boolean;
    questions: ScreeningQuestion[];
    script: VoiceScriptSections;
  }>(res);
  return data;
}

export async function recordScreeningCandidateAction(
  token: string,
  screeningId: string,
  candidateId: string,
  action: string,
  note?: string
) {
  const res = await fetch(
    `${apiBase()}/api/screenings/${encodeURIComponent(screeningId)}/candidates/${encodeURIComponent(candidateId)}/actions`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ action, note }),
    }
  );
  return parseJson<{ success: boolean }>(res);
}
