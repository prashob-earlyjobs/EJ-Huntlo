"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CompanyLogo } from "@/components/dashboard/CompanyLogo";
import { OpenToWorkBadge } from "@/components/dashboard/OpenToWorkBadge";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { companyFaviconUrl } from "@/lib/companyLogo";
import {
  candidateScoreBadgeClass,
  formatCandidateScore,
  nameInitials,
} from "@/lib/sessionResultUi";

export type SessionResultHighlight = {
  Category?: string;
  Highlight?: string;
};

export type SessionResultStrength = {
  observation?: string;
  evidence?: string;
};

export type SessionResultCardData = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  companyWebsiteDomain?: string;
  companyWebsite?: string;
  region?: string;
  yearsExperience?: number;
  finalScore?: number;
  photoUrl?: string;
  linkedinUrl?: string;
  highlights?: SessionResultHighlight[];
  recommendation?: string;
  strengths?: SessionResultStrength[];
  /** Pool grid only: one-line skills before highlight chips. */
  compactSkills?: string;
  /** Pool grid only: 2-line about summary after skills/highlights. */
  compactAbout?: string;
  openToWork?: boolean;
};

type Props = {
  data: SessionResultCardData;
  isActive?: boolean;
  interactive?: boolean;
  variant?: "default" | "compact";
  onSelect?: () => void;
  /** Whole card links here (e.g. public preview → signup). Footer stays clickable above overlay. */
  href?: string;
  footer?: React.ReactNode;
};

function CandidateAvatar({
  name,
  photoUrl,
  compact = false,
}: {
  name: string;
  photoUrl?: string;
  compact?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = typeof photoUrl === "string" ? photoUrl.trim() : "";
  const showImage = Boolean(url) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  return (
    <div
      className={`dashboard-candidate-avatar${compact ? " dashboard-candidate-avatar--compact" : ""}`}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external profile CDN URLs
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : (
        nameInitials(name)
      )}
    </div>
  );
}

export function CandidateRoleCompanyLine({
  role,
  company,
  companyWebsiteDomain,
  companyWebsite,
  compact = false,
  variant = compact ? "compact" : "default",
  className = "",
}: {
  role?: string;
  company?: string;
  companyWebsiteDomain?: string;
  companyWebsite?: string;
  compact?: boolean;
  variant?: "default" | "compact" | "grid";
  className?: string;
}) {
  const roleText = role?.trim() || "Role unavailable";
  const companyText = company?.trim();
  const logoUrl = companyText
    ? companyFaviconUrl(companyWebsiteDomain, companyWebsite)
    : null;

  const resolvedVariant = variant === "default" && compact ? "compact" : variant;
  const textClass =
    resolvedVariant === "grid"
      ? "mt-1 text-sm text-slate-600"
      : resolvedVariant === "compact"
        ? "dashboard-candidate-role--compact mt-0.5 text-xs text-[#424656]"
        : "mt-0.5 text-xs text-[#424656]";

  return (
    <p
      className={`dashboard-candidate-role-line ${textClass} ${className}`.trim()}
      title={
        (resolvedVariant === "compact" || resolvedVariant === "grid") && companyText
          ? `${roleText} · ${companyText}`
          : undefined
      }
    >
      <span>{roleText}</span>
      {companyText ? (
        <span className="dashboard-candidate-role-company">
          <span className="dashboard-candidate-role-sep" aria-hidden>
            ·
          </span>
          {logoUrl ? (
            <CompanyLogo
              src={logoUrl}
              alt=""
              className="dashboard-candidate-company-logo"
            />
          ) : null}
          <span>{companyText}</span>
        </span>
      ) : null}
    </p>
  );
}

function AiInsightBlock({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      <div className="dashboard-ai-insight-label">
        <span>AI recommendation</span>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-[#c2c6d8]/60 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#505f76]">
          <MaterialIcon name="auto_awesome" className="text-[10px]" />
          AI
        </span>
      </div>
      <p className={`dashboard-ai-insight${compact ? " dashboard-ai-insight--compact" : ""}`}>
        {text}
      </p>
    </div>
  );
}

export function SessionResultCandidateCard({
  data,
  isActive = false,
  interactive = false,
  variant = "default",
  onSelect,
  href,
  footer,
}: Props) {
  const compact = variant === "compact";
  const highlights = data.highlights ?? [];
  const strengths = data.strengths ?? [];
  const highlightLimit = compact ? 3 : 4;

  const signupCta = Boolean(href?.trim());
  const cardClass = [
    "dashboard-candidate-card",
    compact ? "dashboard-candidate-card--compact" : "",
    signupCta ? "dashboard-candidate-card--cta" : "",
    interactive || signupCta ? "" : "dashboard-candidate-card--static",
    isActive ? "dashboard-candidate-card--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <CandidateAvatar name={data.name} photoUrl={data.photoUrl} compact={compact} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="dashboard-candidate-name-row">
                <h2
                  className={
                    compact
                      ? "dashboard-candidate-name--compact text-[0.9375rem] font-semibold leading-snug text-[#141b2b]"
                      : "text-base font-semibold text-[#141b2b]"
                  }
                  title={compact ? data.name : undefined}
                >
                  {data.name}
                </h2>
                {data.openToWork ? <OpenToWorkBadge compact /> : null}
              </div>
              {(data.role || data.company) && (
                <CandidateRoleCompanyLine
                  role={data.role}
                  company={data.company}
                  companyWebsiteDomain={data.companyWebsiteDomain}
                  companyWebsite={data.companyWebsite}
                  compact={compact}
                />
              )}
            </div>
            {typeof data.finalScore === "number" ? (
              <span className={candidateScoreBadgeClass(data.finalScore)}>
                {formatCandidateScore(data.finalScore)}/5
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-2 min-w-0 max-w-full truncate text-xs text-[#424656]">
        {data.region || "Location unavailable"}
        {typeof data.yearsExperience === "number" ? ` · ${data.yearsExperience} years` : ""}
      </p>

      {compact && data.compactSkills ? (
        <p
          className="dashboard-candidate-skills-compact mt-2 text-xs text-[#424656]"
          title={data.compactSkills}
        >
          {data.compactSkills}
        </p>
      ) : null}

      {highlights.length > 0 ? (
        <div
          className={`min-w-0 max-w-full flex flex-wrap${
            compact
              ? data.compactSkills
                ? " mt-2 gap-1.5"
                : " mt-2.5 gap-1.5"
              : " mt-3 gap-1.5"
          }`}
        >
          {highlights.slice(0, highlightLimit).map((h, i) => (
            <span
              key={`${h.Category || "h"}-${i}`}
              className="dashboard-chip"
              title={h.Highlight || undefined}
            >
              {compact
                ? h.Highlight || h.Category || "—"
                : `${h.Category ? `${h.Category}: ` : ""}${h.Highlight || "—"}`}
            </span>
          ))}
        </div>
      ) : null}

      {compact && data.compactAbout ? (
        <p className="dashboard-candidate-about-compact mt-2 text-xs leading-snug text-[#424656]">
          {data.compactAbout}
        </p>
      ) : null}

      {!compact && data.recommendation ? (
        <AiInsightBlock text={data.recommendation} compact={false} />
      ) : null}

      {!compact && strengths.length > 0 ? (
        <ul className="dashboard-strength-list">
          {strengths.slice(0, 3).map((s, i) => (
            <li key={`${data.id}-s-${i}`}>{s.observation || "Strength"}</li>
          ))}
        </ul>
      ) : null}

      {data.linkedinUrl && !footer ? (
        <a
          href={data.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dashboard-link-primary mt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <MaterialIcon name="open_in_new" className="text-sm" />
          Open LinkedIn
        </a>
      ) : null}

      {footer ? (
        <div
          className={`dashboard-candidate-actions${compact ? " dashboard-candidate-actions--compact" : ""}`}
        >
          {footer}
        </div>
      ) : null}
    </>
  );

  if (interactive && onSelect) {
    return (
      <article
        role="button"
        tabIndex={0}
        className={cardClass}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {inner}
      </article>
    );
  }

  if (signupCta) {
    return (
      <article className={cardClass}>
        <Link
          href={href!.trim()}
          className="dashboard-candidate-card-overlay-link"
          aria-label={`Create account to view ${data.name}`}
        />
        {inner}
      </article>
    );
  }

  return <article className={cardClass}>{inner}</article>;
}
