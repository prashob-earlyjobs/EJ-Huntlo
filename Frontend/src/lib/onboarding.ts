import type { StoredAuth } from "./auth";
import { getStoredAuth } from "./auth";

export type OnboardingFormData = {
  companyType: string | null;
  hiringChallenges: string[];
  outreachChannels: string[];
  hiringVolume: string | null;
};

export const EMPTY_ONBOARDING: OnboardingFormData = {
  companyType: null,
  hiringChallenges: [],
  outreachChannels: [],
  hiringVolume: null,
};

export const COMPANY_TYPE_OPTIONS = [
  { id: "recruitment_agency", label: "Recruitment Agency", icon: "groups" },
  { id: "startup", label: "Startup", icon: "rocket_launch" },
  { id: "enterprise_gcc", label: "Enterprise / GCC", icon: "domain" },
  { id: "staffing_firm", label: "Staffing Firm", icon: "engineering" },
  { id: "executive_search", label: "Executive Search", icon: "manage_accounts" },
] as const;

export const HIRING_CHALLENGE_OPTIONS = [
  {
    id: "finding_qualified",
    label: "Finding qualified candidates",
    description: "Sourcing the right talent takes too much time.",
    icon: "search",
  },
  {
    id: "low_response",
    label: "Low response rates",
    description: "Candidates are not replying to initial outreach.",
    icon: "mail_lock",
  },
  {
    id: "manual_outreach",
    label: "Manual outreach",
    description: "Spending hours drafting and sending messages.",
    icon: "send_and_archive",
  },
  {
    id: "screening",
    label: "Screening candidates",
    description: "Reviewing resumes and initial qualifications is slow.",
    icon: "fact_check",
  },
  {
    id: "followups",
    label: "Follow-ups & coordination",
    description: "Tracking conversations and scheduling interviews.",
    icon: "sync",
  },
  {
    id: "high_volume",
    label: "Managing high hiring volume",
    description: "Overwhelmed by the sheer number of open roles.",
    icon: "groups",
  },
] as const;

export const OUTREACH_CHANNEL_OPTIONS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Direct, informal messaging.",
    icon: "chat",
    hint: "Most recruiters in India prefer WhatsApp workflows.",
  },
  { id: "email", label: "Email", description: "Formal, structured communication.", icon: "mail" },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Professional networking & InMail.",
    icon: "work",
  },
  { id: "calls", label: "Calls", description: "Direct voice conversations.", icon: "call" },
  { id: "sms", label: "SMS", description: "Standard text messaging.", icon: "sms" },
] as const;

export const HIRING_VOLUME_OPTIONS = [
  { id: "1_5", label: "1–5 roles", subtitle: "Targeted Search", icon: "person" },
  { id: "5_20", label: "5–20 roles", subtitle: "Growth Phase", icon: "groups_2" },
  { id: "20_100", label: "20–100 roles", subtitle: "Scaling Operations", icon: "domain" },
  { id: "100_plus", label: "100+ roles", subtitle: "Enterprise Volume", icon: "public" },
] as const;

export const ONBOARDING_STEP_COUNT = 5;

export function postAuthPath(user: Pick<StoredAuth, "role" | "onboardingCompleted">): string {
  if (user.role === "admin") return "/admin/dashboard";
  if (!user.onboardingCompleted) return "/onboarding";
  return "/dashboard";
}

export function mergeStoredAuthUser(
  patch: Partial<StoredAuth> & { onboardingCompleted?: boolean }
): StoredAuth | null {
  const auth = getStoredAuth();
  if (!auth) return null;
  const next = { ...auth, ...patch };
  localStorage.setItem("authUser", JSON.stringify(next));
  return next;
}
