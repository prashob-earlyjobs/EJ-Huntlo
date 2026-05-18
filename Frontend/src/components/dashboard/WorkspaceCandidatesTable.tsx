"use client";

import { useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { nameInitials } from "@/lib/sessionResultUi";

export type WorkspaceCandidate = {
  name: string;
  role: string;
  experience: string;
  location: string;
  skills: string;
  status: string;
  email: string;
  phone: string;
  id?: string;
  sourcingSessionId?: string;
  linkedin_profile_url?: string;
  currentCompany?: string;
  finalScore?: number | null;
  rawDoc?: {
    profile?: {
      profile_picture_permalink?: string;
    };
  } | null;
};

function TableAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = photoUrl?.trim() ?? "";
  const showImage = Boolean(url) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  return (
    <div className="dashboard-table-avatar" aria-hidden>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external profile CDN URLs
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setImgFailed(true)} />
      ) : (
        nameInitials(name)
      )}
    </div>
  );
}

function parseSkillChips(skills: string): string[] {
  if (!skills.trim() || skills.trim() === "—") return [];
  return skills
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function candidatePhotoUrl(c: WorkspaceCandidate): string | undefined {
  const fromRaw = c.rawDoc?.profile?.profile_picture_permalink;
  if (typeof fromRaw === "string" && fromRaw.trim()) return fromRaw.trim();
  return undefined;
}

function CandidateActionsCell({
  linkedin,
  emailRevealed,
  phoneRevealed,
  canOpenDetail,
  onRevealEmail,
  onRevealPhone,
  getDisplayedEmail,
  getDisplayedPhone,
  onOpenDetail,
}: {
  linkedin: string;
  emailRevealed: boolean;
  phoneRevealed: boolean;
  canOpenDetail: boolean;
  onRevealEmail: () => void;
  onRevealPhone: () => void;
  getDisplayedEmail: () => string;
  getDisplayedPhone: () => string;
  onOpenDetail?: () => void;
}) {
  const hasSecondary = Boolean(linkedin || canOpenDetail);

  return (
    <td
      className="dashboard-table-actions-cell"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-end">
        <div className="dashboard-table-actions-toolbar" role="group" aria-label="Candidate actions">
          <button
            type="button"
            title={emailRevealed ? getDisplayedEmail() || "Email" : "Reveal email"}
            aria-label="Reveal email"
            onClick={onRevealEmail}
            className={`dashboard-table-icon-btn${emailRevealed ? " dashboard-table-icon-btn--active" : ""}`}
          >
            <MaterialIcon name="mail" className="text-[18px]" />
          </button>
          <button
            type="button"
            title={phoneRevealed ? getDisplayedPhone() || "Phone" : "Reveal phone"}
            aria-label="Reveal phone"
            onClick={onRevealPhone}
            className={`dashboard-table-icon-btn${phoneRevealed ? " dashboard-table-icon-btn--active" : ""}`}
          >
            <MaterialIcon name="call" className="text-[18px]" />
          </button>
          {hasSecondary ? (
            <>
              <span className="dashboard-table-actions-divider" aria-hidden />
              {linkedin ? (
                <a
                  href={linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open LinkedIn"
                  aria-label="Open LinkedIn profile"
                  className="dashboard-table-icon-btn"
                >
                  <MaterialIcon name="work" className="text-[18px]" />
                </a>
              ) : null}
              {canOpenDetail ? (
                <button
                  type="button"
                  title="View full profile"
                  aria-label="View full profile"
                  onClick={onOpenDetail}
                  className="dashboard-table-icon-btn dashboard-table-icon-btn--primary"
                >
                  <MaterialIcon name="open_in_new" className="text-[18px]" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {emailRevealed || phoneRevealed ? (
          <div className="dashboard-table-revealed-stack">
            {emailRevealed ? (
              <p className="dashboard-table-revealed">{getDisplayedEmail() || "—"}</p>
            ) : null}
            {phoneRevealed ? (
              <p className="dashboard-table-revealed">{getDisplayedPhone() || "—"}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </td>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <tr key={`wc-skeleton-${idx}`} className="dashboard-skeleton-row">
          <td>
            <div className="flex items-center gap-3">
              <div className="dashboard-shimmer h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <div className="dashboard-shimmer h-4 w-32" />
                <div className="dashboard-shimmer h-3 w-20" />
              </div>
            </div>
          </td>
          <td>
            <div className="dashboard-shimmer h-4 w-24" />
          </td>
          <td>
            <div className="dashboard-shimmer h-4 w-16" />
          </td>
          <td>
            <div className="dashboard-shimmer h-4 w-20" />
          </td>
          <td>
            <div className="flex gap-1">
              <div className="dashboard-shimmer h-5 w-14 rounded-full" />
              <div className="dashboard-shimmer h-5 w-12 rounded-full" />
            </div>
          </td>
          <td className="dashboard-table-actions-cell">
            <div className="dashboard-shimmer ml-auto h-9 w-[8.5rem] rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  );
}

type Props = {
  candidates: WorkspaceCandidate[];
  loading: boolean;
  error: string;
  totalDocs: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rowKey: (candidate: WorkspaceCandidate) => string;
  revealedEmailKeys: string[];
  revealedPhoneKeys: string[];
  onRevealEmail: (candidate: WorkspaceCandidate) => void;
  onRevealPhone: (candidate: WorkspaceCandidate) => void;
  getDisplayedEmail: (candidate: WorkspaceCandidate) => string;
  getDisplayedPhone: (candidate: WorkspaceCandidate) => string;
  onOpenDetail?: (candidate: WorkspaceCandidate) => void;
  onGoToSearch?: () => void;
};

export function WorkspaceCandidatesTable({
  candidates,
  loading,
  error,
  totalDocs,
  page,
  totalPages,
  onPageChange,
  rowKey,
  revealedEmailKeys,
  revealedPhoneKeys,
  onRevealEmail,
  onRevealPhone,
  getDisplayedEmail,
  getDisplayedPhone,
  onOpenDetail,
  onGoToSearch,
}: Props) {
  if (error) {
    return <p className="mt-4 dashboard-alert-error">{error}</p>;
  }

  if (!loading && candidates.length === 0) {
    return (
      <div className="dashboard-empty-state">
        <div className="dashboard-empty-state-icon">
          <MaterialIcon name="person_search" className="text-[28px]" />
        </div>
        <p className="mt-4 text-base font-semibold text-[#141b2b]">No candidates yet</p>
        <p className="mt-2 max-w-sm text-sm text-[#424656]">
          Run an AI search to discover profiles. Every candidate you find will appear here
          across all sessions.
        </p>
        {onGoToSearch ? (
          <button type="button" onClick={onGoToSearch} className="dashboard-btn-primary mt-6">
            <MaterialIcon name="search" className="text-base" />
            Search candidates
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 overflow-x-auto">
        <div className="dashboard-table-wrap">
          <table className="dashboard-table" role="grid">
            <thead>
              <tr>
                <th scope="col">Candidate</th>
                <th scope="col">Role</th>
                <th scope="col">Experience</th>
                <th scope="col">Location</th>
                <th scope="col">Skills</th>
                <th scope="col" className="dashboard-table-actions-head">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : (
                candidates.map((candidate) => {
                  const key = rowKey(candidate);
                  const skillChips = parseSkillChips(candidate.skills);
                  const linkedin =
                    typeof candidate.linkedin_profile_url === "string"
                      ? candidate.linkedin_profile_url.trim()
                      : "";
                  const emailRevealed = revealedEmailKeys.includes(key);
                  const phoneRevealed = revealedPhoneKeys.includes(key);
                  const canOpenDetail = Boolean(onOpenDetail && candidate.rawDoc);

                  return (
                    <tr
                      key={key}
                      className={canOpenDetail ? "cursor-pointer" : undefined}
                      onClick={canOpenDetail ? () => onOpenDetail?.(candidate) : undefined}
                      onKeyDown={
                        canOpenDetail
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onOpenDetail?.(candidate);
                              }
                            }
                          : undefined
                      }
                      tabIndex={canOpenDetail ? 0 : undefined}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <TableAvatar
                            name={candidate.name}
                            photoUrl={candidatePhotoUrl(candidate)}
                          />
                          <div className="min-w-0">
                            <span className="dashboard-table-candidate-name block truncate">
                              {candidate.name}
                            </span>
                            {candidate.currentCompany ? (
                              <span className="dashboard-table-candidate-sub block truncate">
                                {candidate.currentCompany}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[10rem]">
                        <span className="line-clamp-2 text-sm">{candidate.role || "—"}</span>
                      </td>
                      <td className="whitespace-nowrap text-sm tabular-nums">
                        {candidate.experience || "—"}
                      </td>
                      <td className="max-w-[9rem]">
                        <span className="line-clamp-2 text-sm">{candidate.location || "—"}</span>
                      </td>
                      <td>
                        {skillChips.length === 0 ? (
                          <span className="text-xs text-[#424656]">—</span>
                        ) : (
                          <div className="dashboard-table-skills">
                            {skillChips.slice(0, 2).map((skill) => (
                              <span key={skill} className="dashboard-chip" title={skill}>
                                {skill}
                              </span>
                            ))}
                            {skillChips.length > 2 ? (
                              <span className="dashboard-chip dashboard-chip--more">
                                +{skillChips.length - 2}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <CandidateActionsCell
                        linkedin={linkedin}
                        emailRevealed={emailRevealed}
                        phoneRevealed={phoneRevealed}
                        canOpenDetail={canOpenDetail}
                        onRevealEmail={() => onRevealEmail(candidate)}
                        onRevealPhone={() => onRevealPhone(candidate)}
                        getDisplayedEmail={() => getDisplayedEmail(candidate)}
                        getDisplayedPhone={() => getDisplayedPhone(candidate)}
                        onOpenDetail={
                          canOpenDetail ? () => onOpenDetail?.(candidate) : undefined
                        }
                      />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="dashboard-pagination">
          <p className="dashboard-pagination-label tabular-nums">
            Page {page} of {totalPages}
            <span className="text-[#424656]/80"> · {totalDocs.toLocaleString()} total</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MaterialIcon name="chevron_left" className="text-base" />
              Previous
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="dashboard-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <MaterialIcon name="chevron_right" className="text-base" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
