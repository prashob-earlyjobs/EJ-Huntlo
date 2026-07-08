import type {
  CampaignDetailStats,
  CampaignTrackingCandidate,
  OutreachCampaignRow,
  OutreachCandidate,
  SequenceStep,
} from "@/components/dashboard/outreach/types";

export const mockOutreachStats = {
  totalCampaigns: 24,
  candidatesContacted: 4280,
  interestedCandidates: 612,
  avgResponseRate: "18.5%",
};

export const mockCampaigns: OutreachCampaignRow[] = [
  {
    id: "react-dev-bangalore",
    name: "React Developer Bangalore Outreach",
    mode: "multi",
    channels: ["WhatsApp", "Email", "Voice"],
    candidates: 250,
    status: "active",
    responseRate: "21%",
    createdDate: "Jun 28, 2026",
  },
  {
    id: "sales-kerala",
    name: "Sales Executive Kerala Follow-up",
    mode: "single",
    channels: ["WhatsApp"],
    candidates: 120,
    status: "completed",
    responseRate: "16%",
    createdDate: "Jun 20, 2026",
  },
  {
    id: "customer-support",
    name: "Customer Support Hiring",
    mode: "multi",
    channels: ["Email", "WhatsApp"],
    candidates: 300,
    status: "draft",
    responseRate: "-",
    createdDate: "Jul 1, 2026",
  },
];

export const mockCandidates: OutreachCandidate[] = [
  {
    id: "c1",
    name: "Rahul Nair",
    role: "React Developer",
    email: "rahul.nair@example.com",
    phone: "+91 98765 43210",
    location: "Bangalore",
    experience: "4 yrs",
    matchScore: 92,
    status: "Available",
  },
  {
    id: "c2",
    name: "Priya Menon",
    role: "Frontend Engineer",
    email: "priya.menon@example.com",
    phone: "+91 91234 56789",
    location: "Kochi",
    experience: "3 yrs",
    matchScore: 88,
    status: "Open to offers",
  },
  {
    id: "c3",
    name: "Arjun Patel",
    role: "Full Stack Developer",
    email: "arjun.patel@example.com",
    phone: "+91 99887 76655",
    location: "Hyderabad",
    experience: "5 yrs",
    matchScore: 85,
    status: "Passive",
  },
  {
    id: "c4",
    name: "Sneha Iyer",
    role: "UI Developer",
    email: "sneha.iyer@example.com",
    phone: "+91 90011 22334",
    location: "Chennai",
    experience: "2 yrs",
    matchScore: 79,
    status: "Available",
  },
  {
    id: "c5",
    name: "Vikram Singh",
    role: "React Native Dev",
    email: "vikram.singh@example.com",
    phone: "+91 98877 66554",
    location: "Pune",
    experience: "6 yrs",
    matchScore: 91,
    status: "Interviewing",
  },
  {
    id: "c6",
    name: "Ananya Das",
    role: "Software Engineer",
    email: "ananya.das@example.com",
    phone: "+91 90123 45678",
    location: "Bangalore",
    experience: "3 yrs",
    matchScore: 87,
    status: "Available",
  },
];

export const mockSequenceSteps: SequenceStep[] = [
  {
    id: "s1",
    channel: "whatsapp",
    label: "WhatsApp",
    delayValue: 0,
    delayUnit: "days",
    condition: "all",
    timingLabel: "Immediately",
  },
  {
    id: "s2",
    channel: "email",
    label: "Email",
    delayValue: 1,
    delayUnit: "days",
    condition: "no_response",
    timingLabel: "After 1 day",
  },
  {
    id: "s3",
    channel: "whatsapp",
    label: "WhatsApp Follow-up",
    delayValue: 2,
    delayUnit: "days",
    condition: "no_response",
    timingLabel: "After 2 days",
  },
  {
    id: "s4",
    channel: "voice",
    label: "AI Voice Call",
    delayValue: 3,
    delayUnit: "days",
    condition: "no_response",
    timingLabel: "After 3 days",
  },
];

export const mockWhatsAppTemplates = [
  { id: "interest", label: "Job Interest Confirmation" },
  { id: "followup", label: "Follow-up Message" },
  { id: "screening", label: "Screening Invitation" },
];

export const mockWhatsAppMessage = `Hi {{candidate_first_name}},

I came across your profile and thought you'd be a great fit for the {{job_title}} role at {{company_name}} in {{job_location}}.

Would you be open to a quick chat about this opportunity?`;

export const mockEmailSubject = "{{job_title}} opportunity at {{company_name}}";

export const mockEmailBody = `Dear {{candidate_first_name}},

We have an exciting {{job_title}} position at {{company_name}} based in {{job_location}}.

Your experience looks like a strong match. Would you be interested in learning more?

Best regards,
Huntlo Recruiting`;

export const mockVoiceScript = `Hello {{candidate_first_name}}, this is a call from {{company_name}} regarding the {{job_title}} position in {{job_location}}.

I'd like to briefly discuss whether this opportunity aligns with your career goals. Do you have a moment to talk?`;

export const mockCampaignStats: CampaignDetailStats = {
  total: 250,
  sent: 248,
  delivered: 241,
  opened: 186,
  replied: 52,
  interested: 38,
  notInterested: 14,
  noResponse: 196,
};

export const mockTrackingCandidates: CampaignTrackingCandidate[] = [
  {
    id: "tc1",
    name: "Rahul Nair",
    role: "React Developer",
    email: "rahul.nair@example.com",
    phone: "+91 98765 43210",
    channel: "WhatsApp",
    lastStep: "WhatsApp reply",
    status: "interested",
    interest: "High",
    lastResponse: "Yes, interested",
    nextAction: "Move to screening",
  },
  {
    id: "tc2",
    name: "Priya Menon",
    role: "Frontend Engineer",
    email: "priya.menon@example.com",
    phone: "+91 91234 56789",
    channel: "Email",
    lastStep: "Email opened",
    status: "no_response",
    interest: "-",
    lastResponse: "-",
    nextAction: "WhatsApp follow-up",
  },
  {
    id: "tc3",
    name: "Arjun Patel",
    role: "Full Stack Developer",
    email: "arjun.patel@example.com",
    phone: "+91 99887 76655",
    channel: "Voice",
    lastStep: "AI call completed",
    status: "call_completed",
    interest: "Medium",
    lastResponse: "Requested callback",
    nextAction: "Schedule interview",
  },
  {
    id: "tc4",
    name: "Sneha Iyer",
    role: "UI Developer",
    email: "sneha.iyer@example.com",
    phone: "+91 90011 22334",
    channel: "WhatsApp",
    lastStep: "Message delivered",
    status: "no_response",
    interest: "-",
    lastResponse: "-",
    nextAction: "Wait for reply",
  },
  {
    id: "tc5",
    name: "Vikram Singh",
    role: "React Native Dev",
    email: "vikram.singh@example.com",
    phone: "+91 98877 66554",
    channel: "Email",
    lastStep: "Not interested",
    status: "not_interested",
    interest: "None",
    lastResponse: "Not looking",
    nextAction: "Archive",
  },
];

export const mockFunnelStages = [
  { label: "Selected", count: 250 },
  { label: "Contacted", count: 248 },
  { label: "Replied", count: 52 },
  { label: "Interested", count: 38 },
  { label: "Screened", count: 12 },
];

export const mockJourneyPreview = [
  "Day 0: WhatsApp sent",
  "Day 1: Email sent if no reply",
  "Day 2: WhatsApp follow-up",
  "Day 3: AI Voice Call",
];
