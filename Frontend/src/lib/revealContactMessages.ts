export type RevealContactType = "EMAIL" | "PHONE";

export function revealContactNotFoundMessage(revealType: RevealContactType): string {
  return revealType === "EMAIL"
    ? "Email not available for this profile."
    : "Phone not available for this profile.";
}

/** User-facing copy for failed reveal (API message or default not-found). */
export function revealContactErrorMessage(
  revealType: RevealContactType,
  apiMessage?: string
): string {
  const trimmed = typeof apiMessage === "string" ? apiMessage.trim() : "";
  if (trimmed) {
    // Upstream sometimes returns async-status messages even when no value was returned.
    // In our UX this case should be treated as unavailable.
    if (/request sent|requested|queued|processing/i.test(trimmed)) {
      return revealContactNotFoundMessage(revealType);
    }
    if (/not found|not available|unavailable/i.test(trimmed)) return trimmed;
    if (trimmed !== "Reveal failed" && trimmed !== "Contact not found") return trimmed;
  }
  return revealContactNotFoundMessage(revealType);
}
