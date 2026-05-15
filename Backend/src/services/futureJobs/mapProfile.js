/**
 * Map one Future Jobs sourcing-session profile doc → dashboard candidate row.
 * @param {object} doc — entry from GET …/sourcing-session/:id/profiles → data.docs[]
 */
function mapFjDocToCandidate(doc) {
  if (!doc || typeof doc !== "object") {
    return null;
  }

  const p = doc.profile && typeof doc.profile === "object" ? doc.profile : {};
  const employers = Array.isArray(p.current_employers_object)
    ? p.current_employers_object
    : [];
  const job = employers[0] || {};
  const years = p.years_of_experience_raw;
  const skillsArr = Array.isArray(p.skills) ? p.skills : [];

  const emailRevealed =
    doc.revealStatus?.email?.revealed &&
    Array.isArray(doc.revealStatus.email.values) &&
    doc.revealStatus.email.values.length > 0;
  const phoneRevealed =
    doc.revealStatus?.phone?.revealed &&
    Array.isArray(doc.revealStatus.phone.values) &&
    doc.revealStatus.phone.values.length > 0;

  const email = emailRevealed
    ? String(doc.revealStatus.email.values[0])
    : "";
  const phone = phoneRevealed
    ? String(doc.revealStatus.phone.values[0])
    : "";

  const score = doc.finalScore;
  const status =
    typeof score === "number" && !Number.isNaN(score)
      ? `Match ${score}/5`
      : "Available";

  return {
    id: doc._id ? String(doc._id) : undefined,
    sourcingSessionId: doc.sourcingSessionId
      ? String(doc.sourcingSessionId)
      : undefined,
    linkedin_profile_url:
      typeof p.linkedin_profile_url === "string" ? p.linkedin_profile_url : "",
    name: typeof p.name === "string" && p.name.trim() ? p.name.trim() : "Unknown",
    role:
      typeof job.job_title === "string" && job.job_title.trim()
        ? job.job_title.trim()
        : "—",
    experience:
      years != null && years !== ""
        ? `${years} ${Number(years) === 1 ? "year" : "years"}`
        : "—",
    location:
      typeof p.region === "string" && p.region.trim() ? p.region.trim() : "—",
    skills: skillsArr.length
      ? skillsArr.slice(0, 12).join(", ")
      : "—",
    status,
    email,
    phone,
  };
}

module.exports = {
  mapFjDocToCandidate,
};
