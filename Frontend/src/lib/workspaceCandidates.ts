import type { PoolCandidateRow } from "@/components/dashboard/CandidatePoolPanel";

export type WorkspaceCandidateDoc = {
  _id?: string;
  sourcingSessionId?: string;
  finalScore?: number;
  profile?: {
    name?: string;
    region?: string;
    years_of_experience_raw?: number;
    linkedin_profile_url?: string;
    profile_picture_permalink?: string;
    open_to_cards?: string[];
    skills?: string[];
    current_employers_object?: {
      company_name?: string;
      job_title?: string;
    }[];
  };
  profileAnalysis?: {
    highlights?: { Highlight?: string }[];
    recommendation?: string;
  };
};

export function candidateRowKey(candidate: PoolCandidateRow) {
  return candidate.id ?? candidate.name;
}

export function candidateIdentityKey(candidate: {
  id?: string;
  sourcingSessionId?: string;
  linkedin_profile_url?: string;
  name?: string;
}) {
  const id = String(candidate.id || "").trim();
  const source = String(candidate.sourcingSessionId || "").trim();
  if (id) return `id:${source}:${id}`;
  const profile = String(candidate.linkedin_profile_url || "").trim();
  if (profile) return `li:${source}:${profile}`;
  return `name:${String(candidate.name || "").trim().toLowerCase()}`;
}

function buildCandidateRowRawDoc(candidate: PoolCandidateRow): WorkspaceCandidateDoc {
  const yearsMatch = candidate.experience.match(/(\d+)/);
  const years = yearsMatch ? Number(yearsMatch[1]) : undefined;
  const skills =
    candidate.skills && candidate.skills !== "—"
      ? candidate.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  return {
    _id: candidate.id,
    sourcingSessionId: candidate.sourcingSessionId,
    finalScore: candidate.finalScore ?? undefined,
    profile: {
      name: candidate.name,
      region: candidate.location,
      linkedin_profile_url: candidate.linkedin_profile_url,
      years_of_experience_raw: Number.isFinite(years) ? years : undefined,
      skills,
      current_employers_object:
        candidate.role && candidate.role !== "—"
          ? [
              {
                job_title: candidate.role,
                company_name: candidate.currentCompany || undefined,
              },
            ]
          : undefined,
    },
    profileAnalysis: {
      recommendation: candidate.recommendation || undefined,
      highlights: Array.isArray(candidate.highlights)
        ? candidate.highlights.map((h) => ({ Highlight: h }))
        : undefined,
    },
  };
}

export function mergeWorkspaceCandidatesWithDetailedDocs(
  candidates: PoolCandidateRow[],
  detailedDocs: WorkspaceCandidateDoc[]
): PoolCandidateRow[] {
  const byId = new Map<string, WorkspaceCandidateDoc>();
  const byLinkedIn = new Map<string, WorkspaceCandidateDoc>();

  for (const doc of detailedDocs) {
    if (doc?._id) byId.set(String(doc._id), doc);
    const linkedin = doc.profile?.linkedin_profile_url?.trim();
    if (linkedin) byLinkedIn.set(linkedin, doc);
  }

  return candidates.map((candidate) => {
    if (candidate.rawDoc && typeof candidate.rawDoc === "object") {
      return candidate;
    }

    const id = String(candidate.id || "").trim();
    let doc = id ? byId.get(id) : undefined;
    if (!doc && candidate.linkedin_profile_url) {
      doc = byLinkedIn.get(candidate.linkedin_profile_url.trim());
    }

    const rawDoc = doc || buildCandidateRowRawDoc(candidate);
    return { ...candidate, rawDoc };
  });
}
