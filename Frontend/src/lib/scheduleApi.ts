import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (data as { message?: string })?.message === "string"
        ? (data as { message: string }).message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export type ScheduleStats = {
  interviewsScheduled: number;
  confirmed: number;
  pendingConfirmation: number;
  rescheduleRequests: number;
  noShows: number;
  canceled: number;
};

export type ScheduleUpcomingInterview = {
  id: string;
  candidateId: string;
  scheduleCandidateId: string;
  campaignId: string;
  source: "direct" | "campaign" | "calendly";
  candidateName: string;
  inviteeName: string;
  inviteeEmail: string;
  role: string;
  eventName: string;
  hostName: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  rescheduleUrl: string;
  cancelUrl: string;
  timezone: string;
  locationLabel: string;
  campaignName: string;
};

export type ScheduleCandidateRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  location: string;
  status: string;
  meetingUri: string;
  meetingName: string;
  schedulingUrl: string;
  source: string;
  notes: string;
};

export type CalendlyMeetingOption = {
  uri: string;
  name: string;
  schedulingUrl: string;
  slug?: string;
  durationMinutes?: number | null;
};

export async function fetchScheduleOverview(token: string, options?: { sync?: boolean }) {
  const qs = new URLSearchParams();
  if (options?.sync === false) qs.set("sync", "0");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${apiBase()}/api/schedule/overview${suffix}`, {
    headers: authHeaders(token),
  });
  return parseJson<{
    success: boolean;
    stats: ScheduleStats;
    upcoming: ScheduleUpcomingInterview[];
    interviews: ScheduleUpcomingInterview[];
    calendlyConnected: boolean;
  }>(res);
}

export async function syncScheduleBookings(token: string) {
  const res = await fetch(`${apiBase()}/api/schedule/sync`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return parseJson<{
    success: boolean;
    synced: number;
    message: string;
    stats: ScheduleStats;
    upcoming: ScheduleUpcomingInterview[];
    interviews: ScheduleUpcomingInterview[];
    calendlyConnected: boolean;
  }>(res);
}

export async function fetchScheduleMeetings(token: string) {
  const res = await fetch(`${apiBase()}/api/schedule/meetings`, {
    headers: authHeaders(token),
  });
  return parseJson<{ success: boolean; meetings: CalendlyMeetingOption[] }>(res);
}

export async function fetchScheduleCandidates(token: string) {
  const res = await fetch(`${apiBase()}/api/schedule/candidates`, {
    headers: authHeaders(token),
  });
  return parseJson<{ success: boolean; candidates: ScheduleCandidateRow[] }>(res);
}

export async function createScheduleCandidate(
  token: string,
  payload: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
    company?: string;
    location?: string;
    notes?: string;
    source?: string;
    meetingUri?: string;
    meetingName?: string;
    schedulingUrl?: string;
  }
) {
  const res = await fetch(`${apiBase()}/api/schedule/candidates`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<{ success: boolean; candidate: ScheduleCandidateRow }>(res);
}

export async function createScheduleCandidatesBatch(
  token: string,
  candidates: Array<{
    name: string;
    email: string;
    phone?: string;
    role?: string;
    company?: string;
    location?: string;
    notes?: string;
    source?: string;
    meetingUri?: string;
    meetingName?: string;
    schedulingUrl?: string;
  }>,
  options?: {
    sendLinks?: boolean;
    channels?: { email?: boolean; whatsapp?: boolean };
  }
) {
  const res = await fetch(`${apiBase()}/api/schedule/candidates`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      candidates,
      sendLinks: options?.sendLinks,
      channels: options?.channels,
    }),
  });
  return parseJson<{
    success: boolean;
    candidates: ScheduleCandidateRow[];
    deliverySummary?: {
      emailSent: number;
      whatsappSent: number;
      failed: number;
    };
  }>(res);
}

export async function sendScheduleCandidateLink(
  token: string,
  candidateId: string,
  payload?: { meetingUri?: string; meetingName?: string; schedulingUrl?: string }
) {
  const res = await fetch(`${apiBase()}/api/schedule/candidates/${candidateId}/send-link`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return parseJson<{
    success: boolean;
    candidate: ScheduleCandidateRow;
    schedulingUrl: string;
    emailSent?: boolean;
    whatsappSent?: boolean;
  }>(res);
}

export type ScheduleReminderSettings = {
  inviteEmail: boolean;
  inviteWhatsapp: boolean;
  inviteCalendar: boolean;
  reminder24h: boolean;
  reminder6h: boolean;
  reminder1h: boolean;
  reminder15m: boolean;
  reminderEmail: boolean;
  reminderWhatsapp: boolean;
};

export async function fetchScheduleReminderSettings(token: string) {
  const res = await fetch(`${apiBase()}/api/schedule/reminder-settings`, {
    headers: authHeaders(token),
  });
  return parseJson<{ success: boolean; settings: ScheduleReminderSettings }>(res);
}

export async function updateScheduleReminderSettings(
  token: string,
  settings: Partial<ScheduleReminderSettings>
) {
  const res = await fetch(`${apiBase()}/api/schedule/reminder-settings`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return parseJson<{ success: boolean; settings: ScheduleReminderSettings }>(res);
}
