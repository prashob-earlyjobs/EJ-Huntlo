import type {
  CalendarEvent,
  Interviewer,
  RecommendedSlot,
  RescheduleRequest,
  ScheduleCandidate,
  UpcomingInterview,
} from "@/components/dashboard/schedule/types";

export const mockScheduleStats = {
  interviewsScheduled: 86,
  confirmed: 64,
  pendingConfirmation: 14,
  rescheduleRequests: 8,
  noShows: 5,
};

export const mockUpcomingInterviews: UpcomingInterview[] = [
  {
    id: "i1",
    candidate: "Rahul Nair",
    role: "React Developer",
    interviewType: "Technical Round",
    interviewer: "Arjun Menon",
    dateTime: "Today, 4:30 PM",
    status: "confirmed",
    reminder: "WhatsApp + Email",
  },
  {
    id: "i2",
    candidate: "Sneha K",
    role: "Sales Executive",
    interviewType: "HR Round",
    interviewer: "Neha Sharma",
    dateTime: "Tomorrow, 11:00 AM",
    status: "pending",
    reminder: "WhatsApp",
  },
  {
    id: "i3",
    candidate: "Akash P",
    role: "Customer Support",
    interviewType: "Final Round",
    interviewer: "Prashob P",
    dateTime: "Jul 8, 3:00 PM",
    status: "reschedule_requested",
    reminder: "Email",
  },
];

export const mockCandidates: ScheduleCandidate[] = [
  {
    id: "c1",
    name: "Rahul Nair",
    role: "React Developer",
    location: "Bangalore",
    experience: "4 yrs",
    screeningScore: 82,
    status: "Shortlisted",
    availability: "Weekdays 4–7 PM",
  },
  {
    id: "c2",
    name: "Sneha K",
    role: "Sales Executive",
    location: "Kochi",
    experience: "3 yrs",
    screeningScore: 76,
    status: "Interested",
    availability: "Mornings",
  },
  {
    id: "c3",
    name: "Akash P",
    role: "Customer Support",
    location: "Chennai",
    experience: "2 yrs",
    screeningScore: 71,
    status: "Reschedule Requested",
    availability: "Afternoons",
  },
  {
    id: "c4",
    name: "Priya Menon",
    role: "Frontend Engineer",
    location: "Hyderabad",
    experience: "5 yrs",
    screeningScore: 88,
    status: "Screened",
    availability: "Flexible",
  },
  {
    id: "c5",
    name: "Vikram Singh",
    role: "Full Stack Dev",
    location: "Pune",
    experience: "6 yrs",
    screeningScore: 79,
    status: "Pending Schedule",
    availability: "Weekdays",
  },
];

export const mockInterviewers: Interviewer[] = [
  {
    id: "int1",
    name: "Prashob P",
    role: "CTO",
    timezone: "Asia/Kolkata",
    calendarStatus: "connected",
  },
  {
    id: "int2",
    name: "Neha Sharma",
    role: "HR Manager",
    timezone: "Asia/Kolkata",
    calendarStatus: "connected",
  },
  {
    id: "int3",
    name: "Arjun Menon",
    role: "Technical Lead",
    timezone: "Asia/Kolkata",
    calendarStatus: "not_connected",
  },
];

export const mockAvailableSlots: RecommendedSlot[] = [
  {
    id: "s1",
    date: "Today",
    time: "4:30 PM",
    endTime: "5:00 PM",
    interviewerAvailable: true,
    candidateAvailable: true,
    confidence: 92,
    badge: "best",
  },
  {
    id: "s2",
    date: "Tomorrow",
    time: "11:00 AM",
    endTime: "11:30 AM",
    interviewerAvailable: true,
    candidateAvailable: true,
    confidence: 86,
    badge: "recommended",
  },
  {
    id: "s3",
    date: "Tomorrow",
    time: "3:00 PM",
    endTime: "3:30 PM",
    interviewerAvailable: true,
    candidateAvailable: false,
    confidence: 78,
    badge: "available",
  },
  {
    id: "s4",
    date: "Jul 8",
    time: "10:30 AM",
    endTime: "11:00 AM",
    interviewerAvailable: true,
    candidateAvailable: true,
    confidence: 74,
    badge: "available",
  },
];

export const mockRescheduleRequests: RescheduleRequest[] = [
  {
    id: "rr1",
    candidate: "Akash P",
    role: "Customer Support",
    originalSlot: "Jul 8, 3:00 PM",
    requestedSlots: ["Jul 9, 11:00 AM", "Jul 9, 4:00 PM"],
    reason: "Candidate unavailable",
    requestedBy: "Candidate",
    status: "pending",
  },
  {
    id: "rr2",
    candidate: "Sneha K",
    role: "Sales Executive",
    originalSlot: "Today, 5:00 PM",
    requestedSlots: ["Tomorrow, 10:00 AM"],
    reason: "Interviewer conflict",
    requestedBy: "Interviewer",
    status: "pending",
  },
];

export const mockRescheduleStats = {
  newRequests: 5,
  approved: 12,
  rejected: 3,
  pending: 8,
};

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "ce1",
    candidate: "Rahul Nair",
    role: "React Developer",
    date: "2026-07-03",
    time: "16:30",
    interviewType: "Technical",
    status: "confirmed",
    interviewer: "Arjun Menon",
  },
  {
    id: "ce2",
    candidate: "Sneha K",
    role: "Sales Executive",
    date: "2026-07-04",
    time: "11:00",
    interviewType: "HR Round",
    status: "pending",
    interviewer: "Neha Sharma",
  },
  {
    id: "ce3",
    candidate: "Akash P",
    role: "Customer Support",
    date: "2026-07-08",
    time: "15:00",
    interviewType: "Final Round",
    status: "reschedule_requested",
    interviewer: "Prashob P",
  },
];

export const mockInviteMessage = `Hi {{candidate_first_name}}, your interview for the {{job_title}} role at {{company_name}} has been scheduled on {{interview_date}} at {{interview_time}}. Please confirm your availability.`;

export const INVITE_VARIABLES = [
  "{{candidate_first_name}}",
  "{{job_title}}",
  "{{company_name}}",
  "{{interview_date}}",
  "{{interview_time}}",
  "{{meeting_link}}",
  "{{interviewer_name}}",
];

export const mockInterviewDetail = {
  id: "i1",
  candidate: "Rahul Nair",
  role: "React Developer",
  status: "confirmed" as const,
  dateTime: "Today, 4:30 PM – 5:00 PM",
  interviewType: "Technical Round",
  mode: "Google Meet",
  interviewer: "Arjun Menon",
  duration: "30 minutes",
  meetingLink: "https://meet.google.com/abc-defg-hij",
  location: "",
  phone: "+91 98765 43210",
  email: "rahul.nair@email.com",
  candidateLocation: "Bangalore",
  screeningScore: 82,
  candidateStatus: "Shortlisted",
  emailSent: true,
  whatsappSent: true,
  calendarInviteSent: true,
  candidateConfirmed: true,
};

export const mockReports = [
  {
    id: "scheduled",
    title: "Scheduled Interviews Report",
    description: "All upcoming and scheduled interviews in the selected date range.",
  },
  {
    id: "completed",
    title: "Completed Interviews Report",
    description: "Interviews marked as completed with outcomes.",
  },
  {
    id: "noshow",
    title: "No-show Report",
    description: "Candidates who missed scheduled interviews.",
  },
  {
    id: "reschedule",
    title: "Reschedule Report",
    description: "All reschedule requests and outcomes.",
  },
  {
    id: "interviewer",
    title: "Interviewer Performance Report",
    description: "Interview load and completion rates by interviewer.",
  },
];

export const mockCalendarSync = {
  google: { connected: true, lastSynced: "2 minutes ago" },
  outlook: { connected: false, lastSynced: "Never" },
};
