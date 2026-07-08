export type InterviewStatus =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "reschedule_requested"
  | "no_show";

export type InterviewType =
  | "hr"
  | "technical"
  | "manager"
  | "final"
  | "client"
  | "custom";

export type InterviewMode =
  | "google_meet"
  | "zoom"
  | "teams"
  | "phone"
  | "in_person";

export type CalendarProvider = "google" | "outlook";

export type CalendarStatus = "connected" | "not_connected" | "sync_required";

export type CandidateSource =
  | "screened"
  | "outreach_interested"
  | "shortlisted"
  | "csv"
  | "existing_pool"
  | "ats";

export type RescheduleRequestStatus = "pending" | "approved" | "rejected";

export type ScheduleCandidate = {
  id: string;
  name: string;
  role: string;
  location: string;
  experience: string;
  screeningScore: number;
  status: string;
  availability: string;
};

export type Interviewer = {
  id: string;
  name: string;
  role: string;
  timezone: string;
  calendarStatus: CalendarStatus;
};

export type UpcomingInterview = {
  id: string;
  candidate: string;
  role: string;
  interviewType: string;
  interviewer: string;
  dateTime: string;
  status: InterviewStatus;
  reminder: string;
};

export type RecommendedSlot = {
  id: string;
  date: string;
  time: string;
  endTime: string;
  interviewerAvailable: boolean;
  candidateAvailable: boolean;
  confidence: number;
  badge?: "best" | "recommended" | "available";
};

export type RescheduleRequest = {
  id: string;
  candidate: string;
  role: string;
  originalSlot: string;
  requestedSlots: string[];
  reason: string;
  requestedBy: string;
  status: RescheduleRequestStatus;
};

export type CalendarEvent = {
  id: string;
  candidate: string;
  role: string;
  date: string;
  time: string;
  interviewType: string;
  status: InterviewStatus;
  interviewer: string;
};

export type InterviewDetailsForm = {
  name: string;
  jobTitle: string;
  companyName: string;
  interviewType: InterviewType;
  mode: InterviewMode;
  duration: string;
  location: string;
  meetingLink: string;
};

export type InterviewDetail = {
  id: string;
  candidate: string;
  role: string;
  status: InterviewStatus;
  dateTime: string;
  interviewType: string;
  mode: string;
  interviewer: string;
  duration: string;
  meetingLink: string;
  location: string;
  phone: string;
  email: string;
  candidateLocation: string;
  screeningScore: number;
  candidateStatus: string;
  emailSent: boolean;
  whatsappSent: boolean;
  calendarInviteSent: boolean;
  candidateConfirmed: boolean;
};
