/** Shared UI helpers for session result candidate cards. */

import type {
  SessionResultCardData,
  SessionResultHighlight,
} from "@/components/dashboard/SessionResultCandidateCard";
import type { SessionResultDoc } from "@/lib/sessionCandidateDetail";
import { isOpenToWork } from "@/lib/openToWork";

/** Future Jobs first-page size — live search poll stops here. */
export const SESSION_RESULTS_FIRST_PAGE_LIMIT = 200;
/** Max candidates in the session grid (stored DB + fetch-more). */
export const SESSION_RESULTS_MAX = 500;

export type SessionResultDocLike = {
  _id?: string | { toString?: () => string };
  profile?: {
    linkedin_profile_url?: string;
    name?: string;
  };
};

/** Stable person key — LinkedIn first so rotated Future Jobs `_id`s do not remount cards. */
export function sessionResultDocIdentityKey(doc: SessionResultDocLike): string {
  const linkedin =
    typeof doc.profile?.linkedin_profile_url === "string"
      ? doc.profile.linkedin_profile_url.trim().toLowerCase()
      : "";
  if (linkedin) return `li:${linkedin}`;

  const id =
    doc._id != null && String(doc._id).trim() ? String(doc._id).trim() : "";
  if (id) return `id:${id}`;

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

/**
 * Append only new identities; keep existing object refs so React does not remount cards.
 * Returns `prev` unchanged when there is nothing new to add.
 */
export function appendSessionResultDocs<T extends SessionResultDocLike>(
  prev: T[],
  incoming: T[],
  max = SESSION_RESULTS_MAX
): T[] {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev;
  if (prev.length >= max) return prev;

  const seen = new Set<string>();
  for (const doc of prev) {
    const key = sessionResultDocIdentityKey(doc);
    if (key) seen.add(key);
  }

  const additions: T[] = [];
  let anon = 0;
  for (const doc of incoming) {
    if (prev.length + additions.length >= max) break;
    let key = sessionResultDocIdentityKey(doc);
    if (!key) {
      anon += 1;
      key = `anon:${anon}:${prev.length + additions.length}`;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push(doc);
  }

  if (additions.length === 0) return prev;
  return [...prev, ...additions];
}

/**
 * Merge a socket/HTTP poll snapshot into the grid.
 * Prefer append; if snapshot is larger but identities don't match, rebuild
 * from snapshot while keeping existing card refs where possible.
 */
export function mergePollSessionResultDocs<T extends SessionResultDocLike>(
  prev: T[],
  incoming: T[],
  max = SESSION_RESULTS_MAX
): T[] {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev;

  const appended = appendSessionResultDocs(prev, incoming, max);
  if (appended.length > prev.length) return appended;

  const incomingDeduped = dedupeSessionResultDocs(incoming).slice(0, max);
  if (incomingDeduped.length <= prev.length) return prev;

  const prevByKey = new Map<string, T>();
  for (const doc of prev) {
    const key = sessionResultDocIdentityKey(doc);
    if (key) prevByKey.set(key, doc);
  }

  return incomingDeduped.map((doc, idx) => {
    const key = sessionResultDocIdentityKey(doc) || `anon:${idx}`;
    return prevByKey.get(key) ?? doc;
  });
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

function compactSkillsFromDoc(doc: SessionResultDoc): string | undefined {
  const skills = doc.profile?.skills;
  if (!Array.isArray(skills) || skills.length === 0) return undefined;
  const line = skills
    .map((skill) => String(skill ?? "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(", ");
  return line || undefined;
}

function compactAboutFromDoc(doc: SessionResultDoc): string | undefined {
  const recommendation = doc.profileAnalysis?.recommendation?.trim();
  if (recommendation) return recommendation;

  const highlights = doc.profileAnalysis?.highlights;
  const fromHighlights = (highlights ?? [])
    .map((item) => String(item.Highlight || "").trim())
    .filter(Boolean);
  if (fromHighlights.length > 0) return fromHighlights.join(" · ");

  const summary = doc.profile?.summary?.trim();
  if (summary) return summary.length > 220 ? `${summary.slice(0, 217)}…` : summary;

  return undefined;
}

/** Map a Future Jobs session profile doc to compact card data (dashboard + public preview). */
export function sessionDocToCardData(
  doc: SessionResultDoc,
  idx: number,
  options?: { includeLinkedIn?: boolean }
): SessionResultCardData {
  const current = doc.profile?.current_employers_object?.[0];
  const includeLinkedIn = options?.includeLinkedIn !== false;
  const highlights = doc.profileAnalysis?.highlights as SessionResultHighlight[] | undefined;

  const card: SessionResultCardData = {
    id: doc._id || `session-doc-${idx}`,
    name: doc.profile?.name || "Unnamed candidate",
    role: current?.job_title,
    company: current?.company_name,
    companyWebsiteDomain: current?.company_website_domain,
    companyWebsite: current?.company_website,
    openToWork: isOpenToWork(doc.profile?.open_to_cards),
    region: doc.profile?.region,
    yearsExperience: doc.profile?.years_of_experience_raw,
    finalScore: doc.finalScore,
    photoUrl: doc.profile?.profile_picture_permalink,
    linkedinUrl: includeLinkedIn ? doc.profile?.linkedin_profile_url : undefined,
    highlights,
    recommendation: doc.profileAnalysis?.recommendation,
    strengths: doc.profileAnalysis?.analysis?.keyStrengths,
  };

  const skillsLine = compactSkillsFromDoc(doc);
  if (skillsLine) card.compactSkills = skillsLine;

  const about = compactAboutFromDoc(doc);
  if (about) card.compactAbout = about;

  return card;
}
