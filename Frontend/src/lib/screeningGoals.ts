import type { ScreeningGoal } from "@/components/dashboard/screening/types";

export type ScreeningGoalDetails = {
  jobTitle?: string;
  companyName?: string;
};

export const SCREENING_GOAL_OPTIONS: { value: ScreeningGoal; label: string }[] = [
  { value: "interest", label: "Check candidate interest" },
  { value: "eligibility", label: "Verify basic eligibility" },
  { value: "communication", label: "Evaluate communication" },
  { value: "shortlist", label: "Shortlist for interview" },
  { value: "custom", label: "Custom" },
];

export function screeningGoalPrompt(
  goal: ScreeningGoal,
  details: ScreeningGoalDetails = {}
): string {
  const role = details.jobTitle?.trim() || "{job_title}";
  const company = details.companyName?.trim();
  const atCompany = company ? ` at ${company}` : "";

  switch (goal) {
    case "interest":
      return `Screen the candidate for the ${role} role${atCompany} — confirm identity, explain the opportunity briefly, check interest level, and capture any questions before next steps.`;
    case "eligibility":
      return `Screen the candidate for the ${role} role${atCompany} — verify basic eligibility including relevant experience, location, notice period, and compensation expectations.`;
    case "communication":
      return `Screen the candidate for the ${role} role${atCompany} — evaluate communication clarity, professionalism, and responsiveness through a short structured conversation.`;
    case "shortlist":
      return `Screen the candidate for the ${role} role${atCompany} — confirm interest, verify eligibility, ask screening questions, and determine interview readiness.`;
    case "custom":
      return "Define your own call objective and voice script in the Configure and Questions steps. The prompt you set there will be sent to the AI voice agent.";
    default:
      return "";
  }
}
