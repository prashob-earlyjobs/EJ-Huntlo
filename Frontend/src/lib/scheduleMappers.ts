import type { CalendarEvent, InterviewDetail, InterviewStatus } from "@/components/dashboard/schedule/types";
import type { ScheduleUpcomingInterview } from "@/lib/scheduleApi";

export function mapInterviewStatus(status: string): InterviewStatus {
  const key = String(status || "").trim().toLowerCase();
  if (key === "cancelled" || key === "canceled") return "cancelled";
  if (key === "pending") return "pending";
  if (key === "completed") return "completed";
  if (key === "reschedule_requested") return "reschedule_requested";
  if (key === "no_show") return "no_show";
  return "confirmed";
}

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateParts(startTime: string | null) {
  if (!startTime) return { date: "", time: "", dateTime: "—" };
  try {
    const start = new Date(startTime);
    const date = localDateKey(start);
    const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(start);
    const dateTime = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(start);
    return { date, time, dateTime };
  } catch {
    return { date: "", time: "", dateTime: startTime };
  }
}

function formatDuration(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) return "—";
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

export function upcomingToCalendarEvent(row: ScheduleUpcomingInterview): CalendarEvent {
  const { date, time } = formatDateParts(row.startTime);
  const host = row.hostName?.trim() || "Calendly";
  return {
    id: row.id,
    candidate: row.inviteeName || row.candidateName || row.inviteeEmail || "Candidate",
    role: row.role || "—",
    date,
    time,
    interviewType: row.eventName || "Interview",
    status: mapInterviewStatus(row.status),
    interviewer: host,
    source: row.source,
    campaignName: row.campaignName,
  };
}

export function upcomingToInterviewDetail(row: ScheduleUpcomingInterview): InterviewDetail {
  const { dateTime } = formatDateParts(row.startTime);
  const host = row.hostName?.trim() || "Calendly";
  const location = row.locationLabel?.trim() || "";
  const isLink = /^https?:\/\//i.test(location);

  return {
    id: row.id,
    candidate: row.inviteeName || row.candidateName || row.inviteeEmail || "Candidate",
    role: row.role || "—",
    status: mapInterviewStatus(row.status),
    dateTime: row.timezone ? `${dateTime} (${row.timezone})` : dateTime,
    interviewType: row.eventName || "Interview",
    mode: isLink ? "Video call" : location ? "In person / other" : "Calendly",
    interviewer: host,
    duration: formatDuration(row.startTime, row.endTime),
    meetingLink: isLink ? location : row.rescheduleUrl || "",
    location: isLink ? "" : location,
    phone: "—",
    email: row.inviteeEmail || "—",
    candidateLocation: "—",
    screeningScore: 0,
    candidateStatus:
      row.source === "direct"
        ? "Direct import"
        : row.source === "campaign"
          ? row.campaignName || "Campaign"
          : "Calendly",
    emailSent: false,
    whatsappSent: false,
    calendarInviteSent: true,
    candidateConfirmed: mapInterviewStatus(row.status) === "confirmed",
  };
}
