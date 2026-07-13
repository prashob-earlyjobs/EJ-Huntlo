import type {
  EvaluationCriterion,
  ScreeningCandidate,
  ScreeningQuestion,
  ScreeningResultDetail,
  ScreeningResultRow,
  ScreeningRow,
  VoiceScriptSections,
} from "@/components/dashboard/screening/types";

export const mockScreeningStats = {
  totalScreenings: 156,
  completed: 98,
  shortlisted: 42,
  avgScore: "78%",
};

export const mockScreenings: ScreeningRow[] = [
  {
    id: "react-dev-voice",
    name: "React Developer Voice Screening",
    type: "voice",
    candidates: 120,
    completed: 84,
    shortlisted: 32,
    status: "active",
    createdDate: "Jun 28, 2026",
  },
  {
    id: "sales-video",
    name: "Sales Executive Video Screening",
    type: "video",
    candidates: 60,
    completed: 38,
    shortlisted: 14,
    status: "completed",
    createdDate: "Jun 22, 2026",
  },
  {
    id: "support-voice",
    name: "Customer Support Voice Screening",
    type: "voice",
    candidates: 80,
    completed: 22,
    shortlisted: 8,
    status: "draft",
    createdDate: "Jul 1, 2026",
  },
];

export const mockCandidates: ScreeningCandidate[] = [
  {
    id: "c1",
    name: "Rahul Nair",
    role: "React Developer",
    location: "Bangalore",
    experience: "4 yrs",
    matchScore: 92,
    status: "Interested",
  },
  {
    id: "c2",
    name: "Priya Menon",
    role: "Frontend Engineer",
    location: "Kochi",
    experience: "3 yrs",
    matchScore: 88,
    status: "Open to offers",
  },
  {
    id: "c3",
    name: "Arjun Patel",
    role: "Full Stack Developer",
    location: "Hyderabad",
    experience: "5 yrs",
    matchScore: 85,
    status: "Screening pending",
  },
  {
    id: "c4",
    name: "Sneha Iyer",
    role: "UI Developer",
    location: "Chennai",
    experience: "2 yrs",
    matchScore: 79,
    status: "Available",
  },
  {
    id: "c5",
    name: "Vikram Singh",
    role: "React Native Dev",
    location: "Pune",
    experience: "6 yrs",
    matchScore: 91,
    status: "Interested",
  },
];

export const mockVoiceQuestions: ScreeningQuestion[] = [
  {
    id: "vq1",
    text: "Are you currently looking for a job change?",
    hint: "Yes/No with brief reason",
    criteriaTag: "Interest",
    weight: 10,
    required: true,
  },
  {
    id: "vq2",
    text: "How many years of experience do you have in {jd_role} or similar roles?",
    hint: "Numeric answer, compare with {jd_experience}",
    criteriaTag: "Experience",
    weight: 15,
    required: true,
  },
  {
    id: "vq3",
    text: "What is your current location?",
    criteriaTag: "Location",
    weight: 10,
    required: true,
  },
  {
    id: "vq4",
    text: "Are you comfortable with the work location for this role?",
    criteriaTag: "Availability",
    weight: 10,
    required: true,
  },
  {
    id: "vq5",
    text: "What is your expected salary?",
    hint: "Compare with budget range",
    criteriaTag: "Salary Fit",
    weight: 15,
    required: true,
  },
  {
    id: "vq6",
    text: "When can you join?",
    criteriaTag: "Availability",
    weight: 10,
    required: true,
  },
  {
    id: "vq7",
    text: "Please briefly explain your relevant experience.",
    criteriaTag: "Role Fit",
    weight: 30,
    required: true,
  },
];

export const mockVideoQuestions: ScreeningQuestion[] = [
  {
    id: "vid1",
    text: "Please introduce yourself briefly.",
    criteriaTag: "Communication",
    weight: 15,
    required: true,
    responseTimeLimit: "1 minute",
  },
  {
    id: "vid2",
    text: "Why are you interested in this role?",
    criteriaTag: "Role Fit",
    weight: 15,
    required: true,
    responseTimeLimit: "1 minute",
  },
  {
    id: "vid3",
    text: "Explain your relevant experience for this position.",
    criteriaTag: "Experience Relevance",
    weight: 20,
    required: true,
    responseTimeLimit: "2 minutes",
  },
  {
    id: "vid4",
    text: "Tell us about one challenge you solved in your previous work.",
    criteriaTag: "Clarity of Answer",
    weight: 15,
    required: true,
    responseTimeLimit: "2 minutes",
  },
  {
    id: "vid5",
    text: "Are you comfortable with the job location and work timing?",
    criteriaTag: "Availability",
    weight: 15,
    required: true,
    responseTimeLimit: "1 minute",
  },
  {
    id: "vid6",
    text: "What is your expected salary and notice period?",
    criteriaTag: "Salary Fit",
    weight: 20,
    required: true,
    responseTimeLimit: "1 minute",
  },
];

export const mockVoiceScript: VoiceScriptSections = {
  opening:
    "Hi {callee_name}, this is Huntlo AI calling on behalf of {jd_company} regarding a {jd_role} opportunity. I would like to ask you a few quick questions to understand your interest and eligibility.",
  jobIntro:
    "We are hiring for a {jd_role} role at {jd_company}. The role requires {jd_experience} of relevant experience.",
  closing:
    "Thank you for your time, {callee_name}. Our recruiting team will review your responses and get back to you shortly. Have a great day!",
};

export const mockEvaluationCriteria: EvaluationCriterion[] = [
  {
    id: "comm",
    label: "Communication",
    description: "Clarity, fluency, and professionalism in responses",
    weight: 20,
    enabled: true,
  },
  {
    id: "role",
    label: "Role Fit",
    description: "Alignment with job requirements and motivation",
    weight: 20,
    enabled: true,
  },
  {
    id: "conf",
    label: "Confidence",
    description: "Confidence and composure while answering",
    weight: 10,
    enabled: true,
  },
  {
    id: "exp",
    label: "Experience Relevance",
    description: "Relevance of past experience to the role",
    weight: 20,
    enabled: true,
  },
  {
    id: "clarity",
    label: "Clarity of Answer",
    description: "Structured and complete answers",
    weight: 10,
    enabled: true,
  },
  {
    id: "avail",
    label: "Availability",
    description: "Location, notice period, and work timing fit",
    weight: 10,
    enabled: true,
  },
  {
    id: "salary",
    label: "Salary Fit",
    description: "Salary expectations within budget",
    weight: 10,
    enabled: true,
  },
];

export const mockScreeningDetailStats = {
  total: 120,
  invited: 118,
  completed: 84,
  shortlisted: 32,
  rejected: 18,
  pending: 34,
  avgScore: 78,
};

export const mockFunnelStages = [
  { label: "Selected", count: 120 },
  { label: "Invited/Called", count: 118 },
  { label: "Completed", count: 84 },
  { label: "Shortlisted", count: 32 },
  { label: "Scheduled", count: 12 },
];

export const mockScreeningResults: ScreeningResultRow[] = [
  {
    id: "r1",
    name: "Rahul Nair",
    role: "React Developer",
    type: "voice",
    status: "completed",
    score: 82,
    recommendation: "strong_fit",
    keyStrength: "Strong React experience",
    concern: "Salary slightly above budget",
    completedAt: "Jun 29, 2026",
  },
  {
    id: "r2",
    name: "Priya Menon",
    role: "Frontend Engineer",
    type: "voice",
    status: "in_progress",
    score: null,
    recommendation: null,
    keyStrength: "-",
    concern: "-",
    completedAt: "-",
  },
  {
    id: "r3",
    name: "Arjun Patel",
    role: "Full Stack Developer",
    type: "voice",
    status: "shortlisted",
    score: 76,
    recommendation: "good_fit",
    keyStrength: "Good full-stack background",
    concern: "Needs recruiter review",
    completedAt: "Jun 28, 2026",
  },
  {
    id: "r4",
    name: "Sneha Iyer",
    role: "UI Developer",
    type: "voice",
    status: "no_response",
    score: null,
    recommendation: null,
    keyStrength: "-",
    concern: "No response after 2 attempts",
    completedAt: "-",
  },
  {
    id: "r5",
    name: "Vikram Singh",
    role: "React Native Dev",
    type: "voice",
    status: "rejected",
    score: 54,
    recommendation: "not_recommended",
    keyStrength: "Experienced developer",
    concern: "Not open to relocation",
    completedAt: "Jun 27, 2026",
  },
];

export const mockResultDetail: ScreeningResultDetail = {
  id: "r1",
  name: "Rahul Nair",
  role: "React Developer",
  location: "Bangalore",
  experience: "4 years",
  overallScore: 82,
  recommendation: "strong_fit",
  type: "voice",
  aiSummary:
    "Rahul shows strong React and Node.js experience, is open to relocation, and can join within 30 days. Salary expectation is slightly higher than the budget.",
  scorecard: [
    { label: "Communication", score: 82 },
    { label: "Role Fit", score: 76 },
    { label: "Experience", score: 80 },
    { label: "Availability", score: 90 },
    { label: "Salary Fit", score: 68 },
  ],
  insights: [
    "Interested in the role",
    "Comfortable with Bangalore location",
    "Notice period: 30 days",
    "Expected salary: ₹8 LPA",
    "Has relevant experience",
  ],
  concerns: [
    "Salary expectation above budget",
    "Limited experience in required tool",
    "Needs recruiter review",
  ],
};

export const mockVoiceTranscript = [
  { speaker: "AI", text: "Are you currently looking for a job change?" },
  { speaker: "Candidate", text: "Yes, I am actively looking." },
  { speaker: "AI", text: "How many years of experience do you have in React development?" },
  { speaker: "Candidate", text: "I have about 4 years of experience with React and Node.js." },
  { speaker: "AI", text: "What is your expected salary?" },
  { speaker: "Candidate", text: "I am looking for around 8 lakhs per annum." },
];

export const mockVideoTranscript = [
  {
    question: "Please introduce yourself briefly.",
    answer:
      "Hi, I am Rahul Nair, a React developer with 4 years of experience building scalable web applications.",
  },
  {
    question: "Why are you interested in this role?",
    answer:
      "The tech stack aligns with my expertise and the company mission resonates with me.",
  },
];

export const SCRIPT_VARIABLES = [
  "{callee_name}",
  "{jd_role}",
  "{jd_company}",
  "{jd_experience}",
];
