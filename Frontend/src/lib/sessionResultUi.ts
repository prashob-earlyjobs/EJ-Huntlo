/** Shared UI helpers for session result candidate cards. */

export type SessionResultDocLike = {
  _id?: string;
  profile?: {
    linkedin_profile_url?: string;
    name?: string;
  };
};

/** Stable key for deduping session profile docs (_id, then LinkedIn URL, then name). */
export function sessionResultDocIdentityKey(doc: SessionResultDocLike): string {
  const id = typeof doc._id === "string" ? doc._id.trim() : "";
  if (id) return `id:${id}`;

  const linkedin =
    typeof doc.profile?.linkedin_profile_url === "string"
      ? doc.profile.linkedin_profile_url.trim().toLowerCase()
      : "";
  if (linkedin) return `li:${linkedin}`;

  const name = typeof doc.profile?.name === "string" ? doc.profile.name.trim().toLowerCase() : "";
  if (name) return `name:${name}`;

  return "";
}

/** Remove duplicate candidates (same person, rotated Future Jobs _id, or repeated merges). */
export function dedupeSessionResultDocs<T extends SessionResultDocLike>(docs: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  let anon = 0;

  for (const doc of docs) {
    let key = sessionResultDocIdentityKey(doc);
    if (!key) {
      anon += 1;
      key = `anon:${anon}`;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(doc);
  }

  return out;
}

export function formatCandidateScore(score: number): string {
  const rounded = Math.round(score * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function candidateScoreBadgeClass(score: number): string {
  const base = "dashboard-score-badge";
  if (score >= 3.5) return `${base} dashboard-score-badge--high`;
  if (score >= 2.5) return `${base} dashboard-score-badge--mid`;
  return `${base} dashboard-score-badge--low`;
}

export function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}
