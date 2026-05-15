/**
 * Build sourcing-session JSON from a free-text prompt (until structured parsing exists).
 * Matches the shape expected by POST /wl/sourcing-session.
 */
const buildSourcingSessionPayloadFromPrompt = (prompt) => {
  const userText =
    typeof prompt === "string" && prompt.trim()
      ? prompt.trim()
      : "Job Title: Open role, Experience: 1–10 years, Location: India";

  const sessionTitle =
    typeof prompt === "string" && prompt.trim()
      ? prompt.trim().split(/\r?\n/)[0].slice(0, 120).trim()
      : userText.slice(0, 120);

  return {
    sessionTitle,
    jdDetail: {
      userText,
      sampleProfileURL: "",
    },
    queries: {
      country_region: { type: "(.)", value: ["India"] },
      "current_employers.title": { type: "IN", value: ["Developer"] },
      years_of_experience_raw: { type: "RANGE", value: [1, 10] },
      region: { type: "IN", value: ["India"] },
      skills: {
        type: "IN",
        value: { mandatory: [], core: [], secondary: [] },
      },
      allowFallback: { type: "NA", value: [true] },
    },
  };
};

module.exports = { buildSourcingSessionPayloadFromPrompt };
