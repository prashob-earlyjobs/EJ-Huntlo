/** Screening goal → call objective sent to Hunar (mirrors Frontend/src/lib/screeningGoals.ts). */

function screeningGoalObjective(details = {}) {
  const goal = String(details.goal || "interest").trim();
  const role = String(details.jobTitle || "").trim() || "the role";
  const company = String(details.companyName || "").trim();
  const atCompany = company ? ` at ${company}` : "";

  switch (goal) {
    case "eligibility":
      return `Screen the candidate for the ${role} role${atCompany} — verify basic eligibility including relevant experience, location, notice period, and compensation expectations.`;
    case "communication":
      return `Screen the candidate for the ${role} role${atCompany} — evaluate communication clarity, professionalism, and responsiveness through a short structured conversation.`;
    case "shortlist":
      return `Screen the candidate for the ${role} role${atCompany} — confirm interest, verify eligibility, ask screening questions, and determine interview readiness.`;
    case "custom":
      return `Screen the candidate for the ${role} role${atCompany} — follow the custom voice script configured for this screening.`;
    case "interest":
    default:
      return `Screen the candidate for the ${role} role${atCompany} — confirm identity, explain the opportunity briefly, check interest level, and capture any questions before next steps.`;
  }
}

module.exports = {
  screeningGoalObjective,
};
