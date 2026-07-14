import type { OutreachCandidate } from "@/components/dashboard/outreach/types";
import type { OutreachCsvImportContact } from "@/lib/outreachModuleCampaignsApi";

function hasContactValue(value: string | undefined): boolean {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 && trimmed !== "-";
}

export function mergeCsvContactsIntoCandidates(
  candidates: OutreachCandidate[],
  contacts: OutreachCsvImportContact[]
): OutreachCandidate[] {
  const byEmail = new Map(contacts.map((c) => [c.email.trim().toLowerCase(), c]));
  const byName = new Map(contacts.map((c) => [c.name.trim().toLowerCase(), c]));

  return candidates.map((candidate) => {
    const hasEmail = hasContactValue(candidate.email);
    const hasPhone = hasContactValue(candidate.phone);
    if (hasEmail && hasPhone) return candidate;

    const match =
      (hasEmail ? byEmail.get(candidate.email.trim().toLowerCase()) : undefined) ||
      byName.get(candidate.name.trim().toLowerCase());
    if (!match) return candidate;

    return {
      ...candidate,
      email: hasEmail ? candidate.email : match.email,
      phone: hasPhone ? candidate.phone : match.phone,
    };
  });
}
