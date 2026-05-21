"use client";

import { useEffect, useState, type ReactNode } from "react";

import { CompanyLogo, companyLogoFromEmployer } from "@/components/dashboard/CompanyLogo";
import { OpenToWorkBadge } from "@/components/dashboard/OpenToWorkBadge";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { isOpenToWork } from "@/lib/openToWork";
import { formatCandidateScore, nameInitials } from "@/lib/sessionResultUi";
import {
  formatEmployerDateRange,
  type SessionEmployerRow,
  type SessionEducationRow,
  type SessionHonorRow,
  type SessionResultDoc,
} from "@/lib/sessionCandidateDetail";

type CandidateRow = {
  name: string;
  role: string;
  currentCompany?: string;
  location: string;
};

type ProfileDrawerTab = "overview" | "analytics";

type Props = {
  open: boolean;
  doc: SessionResultDoc;
  candidate: CandidateRow;
  detailLoading?: boolean;
  detailError?: string;
  onClose: () => void;
  onRevealEmail: () => void;
  onRevealPhone: () => void;
  onToggleSave: () => void;
  isSaved: boolean;
  isSaveBusy: boolean;
  displayedEmail: string;
  displayedPhone: string;
  emailRevealed: boolean;
  phoneRevealed: boolean;
  emailRevealBusy: boolean;
  phoneRevealBusy: boolean;
  contactRevealNotice: string;
};

function employerTitle(emp: SessionEmployerRow) {
  return emp.job_title || emp.title || "—";
}

function employerCompany(emp: SessionEmployerRow) {
  return emp.company_name || emp.name || "—";
}

function EmployerCompanyLine({ emp }: { emp: SessionEmployerRow }) {
  const name = employerCompany(emp);
  const logoUrl = companyLogoFromEmployer(emp);
  const website =
    typeof emp.company_website === "string" ? emp.company_website.trim() : "";
  const href = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : "";

  const content = (
    <>
      <CompanyLogo src={logoUrl} alt="" className="dashboard-profile-company-logo" />
      <span>{name}</span>
    </>
  );

  if (!href) {
    return (
      <p className="dashboard-profile-role-company dashboard-profile-role-company-row">
        {content}
      </p>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="dashboard-profile-role-company dashboard-profile-role-company--link dashboard-profile-role-company-row"
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </a>
  );
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-profile-section">
      <div className="dashboard-profile-section-head">
        <span className="dashboard-profile-section-icon" aria-hidden>
          <MaterialIcon name={icon} />
        </span>
        <h4 className="dashboard-profile-section-title">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function formatTenureDisplay(years: number): string {
  const totalMonths = Math.max(0, Math.round(years * 12));
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y > 0 && m > 0) return `${y} yr${y === 1 ? "" : "s"} ${m} mos`;
  if (y > 0) return `${y} yr${y === 1 ? "" : "s"}`;
  if (m > 0) return `${m} mos`;
  return "—";
}

function formatExperienceShort(
  yearsLabel?: string,
  yearsRaw?: number
): string | null {
  if (typeof yearsRaw === "number" && yearsRaw >= 0) {
    return `${yearsRaw}y`;
  }
  if (typeof yearsLabel === "string" && yearsLabel.trim()) {
    const m = yearsLabel.match(/(\d+)\s*(?:to\s*(\d+))?\s*years?/i);
    if (m) {
      const hi = m[2] ? Number(m[2]) : Number(m[1]);
      return `${hi}y`;
    }
    return yearsLabel.trim();
  }
  return null;
}

function HeroInlineMeta({
  icon,
  employer,
  children,
}: {
  icon: string;
  employer?: SessionEmployerRow;
  children: ReactNode;
}) {
  if (!children) return null;
  const logoUrl = employer ? companyLogoFromEmployer(employer) : null;
  return (
    <span className="dashboard-profile-hero-inline-meta">
      {logoUrl ? (
        <CompanyLogo src={logoUrl} alt="" className="dashboard-profile-company-logo" />
      ) : (
        <MaterialIcon name={icon} className="shrink-0" aria-hidden />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

function HeroTenureStat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <span className="dashboard-profile-hero-tenure-stat">
      <MaterialIcon name={icon} className="shrink-0" aria-hidden />
      <span>
        {label} – <strong className="dashboard-profile-hero-tenure-val">{value}</strong>
      </span>
    </span>
  );
}

function HeroIconAction({
  icon,
  label,
  onClick,
  href,
  active,
  busy,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  busy?: boolean;
}) {
  const className = [
    "dashboard-profile-hero-icon-btn",
    active ? "dashboard-profile-hero-icon-btn--active" : "",
    busy ? "dashboard-profile-hero-icon-btn--loading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = busy ? (
    <span className="dashboard-reveal-spinner" aria-hidden />
  ) : (
    <MaterialIcon name={icon} />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={label}
        title={label}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      aria-label={label}
      title={label}
      className={className}
    >
      {content}
    </button>
  );
}

function RoleTimelineItem({
  emp,
  keyId,
  current,
}: {
  emp: SessionEmployerRow;
  keyId: string;
  current?: boolean;
}) {
  const dates = formatEmployerDateRange(emp.start_date, emp.end_date);
  const secondary: string[] = [];
  if (emp.location) secondary.push(emp.location);
  if (emp.employment_type) secondary.push(emp.employment_type);
  if (emp.seniority_level) secondary.push(emp.seniority_level);

  return (
    <li
      key={keyId}
      className={`dashboard-profile-timeline-item${current ? " dashboard-profile-timeline-item--current" : ""}`}
    >
      <div className="dashboard-profile-role-card">
        <p className="dashboard-profile-role-title">{employerTitle(emp)}</p>
        <EmployerCompanyLine emp={emp} />
        {dates ? <p className="dashboard-profile-role-meta">{dates}</p> : null}
        {secondary.length > 0 ? (
          <p className="dashboard-profile-role-meta">{secondary.join(" · ")}</p>
        ) : null}
      </div>
    </li>
  );
}

function InsightItem({
  observation,
  evidence,
  variant,
}: {
  observation?: string;
  evidence?: string;
  variant: "positive" | "review";
}) {
  if (!observation && !evidence) return null;
  return (
    <li
      className={`dashboard-profile-insight-item dashboard-profile-insight-item--${variant}`}
    >
      {observation ? (
        <p className="dashboard-profile-insight-obs">{observation}</p>
      ) : null}
      {evidence ? (
        <p className="dashboard-profile-insight-evidence">{evidence}</p>
      ) : null}
    </li>
  );
}

export function SessionCandidateDetailDrawer({
  open,
  doc,
  candidate,
  detailLoading = false,
  detailError = "",
  onClose,
  onRevealEmail,
  onRevealPhone,
  onToggleSave,
  isSaved,
  isSaveBusy,
  displayedEmail,
  displayedPhone,
  emailRevealed,
  phoneRevealed,
  emailRevealBusy,
  phoneRevealBusy,
  contactRevealNotice,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileDrawerTab>("overview");
  const profile = doc.profile;
  const name = profile?.name || candidate.name || "Unnamed candidate";
  const photoUrl =
    typeof profile?.profile_picture_permalink === "string"
      ? profile.profile_picture_permalink.trim()
      : typeof profile?.profile_picture_url === "string"
        ? profile.profile_picture_url.trim()
        : "";
  const linkedinUrl =
    typeof profile?.linkedin_profile_url === "string"
      ? profile.linkedin_profile_url.trim()
      : typeof profile?.flagship_profile_url === "string"
        ? profile.flagship_profile_url.trim()
        : "";
  const currentEmployers = Array.isArray(profile?.current_employers_object)
    ? profile.current_employers_object
    : Array.isArray(profile?.current_employers)
      ? profile.current_employers
      : [];
  const pastEmployers = Array.isArray(profile?.past_employers) ? profile.past_employers : [];
  const education = Array.isArray(profile?.education_background)
    ? profile.education_background
    : [];
  const honors = Array.isArray(profile?.honors) ? profile.honors : [];
  const certifications = Array.isArray(profile?.certifications)
    ? profile.certifications
    : [];
  const languages = Array.isArray(profile?.languages) ? profile.languages : [];
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const highlights = doc.profileAnalysis?.highlights ?? [];
  const strengths = doc.profileAnalysis?.analysis?.keyStrengths ?? [];
  const weaknesses = doc.profileAnalysis?.analysis?.keyWeaknesses ?? [];
  const showImage = Boolean(photoUrl) && !imgFailed;

  const locParts = profile?.location_details
    ? [
        profile.location_details.city,
        profile.location_details.state,
        profile.location_details.country,
      ].filter(Boolean)
    : [];
  const locationLine =
    locParts.length > 0 ? locParts.join(", ") : profile?.region || candidate.location;

  const analyticsCount = strengths.length + weaknesses.length;
  const hasRevealedContact =
    (emailRevealed && displayedEmail) || (phoneRevealed && displayedPhone);

  useEffect(() => {
    if (!open) return;
    setImgFailed(false);
    setActiveTab("overview");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (activeTab === "analytics" && analyticsCount === 0) {
      setActiveTab("overview");
    }
  }, [activeTab, analyticsCount]);

  const primaryRole = currentEmployers[0]
    ? employerTitle(currentEmployers[0])
    : candidate.role;
  const primaryCompany = currentEmployers[0]
    ? employerCompany(currentEmployers[0])
    : candidate.currentCompany;
  const roleTitle =
    primaryRole && primaryRole !== "Role unavailable" ? primaryRole : "";
  const experienceShort = formatExperienceShort(
    profile?.years_of_experience,
    profile?.years_of_experience_raw
  );
  const avgTenureDisplay =
    typeof profile?.averageTenure === "number"
      ? formatTenureDisplay(profile.averageTenure)
      : null;
  const currentTenureDisplay =
    typeof profile?.currentTenure === "number"
      ? formatTenureDisplay(profile.currentTenure)
      : null;
  const showMetaRow = Boolean(primaryCompany || locationLine || experienceShort);
  const showTenureRow = Boolean(avgTenureDisplay || currentTenureDisplay);
  const openToWork = isOpenToWork(profile?.open_to_cards);

  const careerStats: { label: string; value: string }[] = [];
  if (typeof profile?.years_of_experience === "string" && profile.years_of_experience) {
    careerStats.push({ label: "Experience", value: profile.years_of_experience });
  } else if (typeof profile?.years_of_experience_raw === "number") {
    careerStats.push({
      label: "Experience",
      value: `${profile.years_of_experience_raw} yrs`,
    });
  }
  if (profile?.currentCompany) {
    careerStats.push({ label: "Current co.", value: profile.currentCompany });
  }
  if (typeof profile?.currentTenure === "number") {
    careerStats.push({ label: "Tenure", value: `${profile.currentTenure.toFixed(1)} yrs` });
  }
  if (typeof profile?.totalPositions === "number") {
    careerStats.push({ label: "Roles", value: String(profile.totalPositions) });
  }
  if (typeof profile?.uniqueCompanies === "number") {
    careerStats.push({ label: "Companies", value: String(profile.uniqueCompanies) });
  }
  if (typeof profile?.averageTenure === "number") {
    careerStats.push({ label: "Avg tenure", value: `${profile.averageTenure.toFixed(1)} yrs` });
  }

  return (
    <div
      className={`dashboard-overlay fixed inset-0 transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} profile details`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close candidate details"
        className="dashboard-drawer-overlay absolute inset-0"
        onClick={onClose}
      />

      <aside
        className={`dashboard-drawer-panel dashboard-drawer-panel--scout dashboard-profile-drawer absolute right-0 top-0 h-full w-full transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="dashboard-profile-topbar">
          <p className="dashboard-profile-topbar-title">Candidate profile</p>
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-ghost shrink-0 p-1.5"
            aria-label="Close profile"
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <div className="dashboard-profile-drawer-scroll">
          <div className="dashboard-profile-drawer-content">
            <div className="dashboard-profile-drawer-body-inner">
              {detailLoading ? (
                <div className="dashboard-profile-loading" role="status">
                  <span className="dashboard-apply-progress-spinner" aria-hidden />
                  Loading full profile…
                </div>
              ) : null}
              {detailError ? (
                <p className="dashboard-alert-warning" role="alert">
                  {detailError}
                </p>
              ) : null}

              <article className="dashboard-profile-hero">
                <div className="dashboard-profile-hero-layout">
                  <div
                    className="dashboard-candidate-avatar dashboard-profile-drawer-avatar"
                    aria-hidden
                  >
                    {showImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setImgFailed(true)}
                      />
                    ) : (
                      nameInitials(name)
                    )}
                  </div>

                  <div className="dashboard-profile-hero-body">
                    <div className="dashboard-profile-hero-top">
                      <div className="dashboard-profile-hero-identity">
                        <div className="dashboard-profile-hero-name-row">
                          <h2 className="dashboard-profile-hero-name">{name}</h2>
                          {openToWork ? <OpenToWorkBadge compact /> : null}
                        </div>
                        {roleTitle ? (
                          <p className="dashboard-profile-hero-role">{roleTitle}</p>
                        ) : null}

                        {showMetaRow ? (
                          <div className="dashboard-profile-hero-meta-row">
                            {primaryCompany ? (
                              <HeroInlineMeta
                                icon="business"
                                employer={currentEmployers[0]}
                              >
                                {primaryCompany}
                              </HeroInlineMeta>
                            ) : null}
                            {locationLine ? (
                              <HeroInlineMeta icon="location_on">{locationLine}</HeroInlineMeta>
                            ) : null}
                            {experienceShort ? (
                              <HeroInlineMeta icon="work_history">{experienceShort}</HeroInlineMeta>
                            ) : null}
                          </div>
                        ) : null}

                        {showTenureRow ? (
                          <div className="dashboard-profile-hero-tenure-row">
                            {avgTenureDisplay ? (
                              <HeroTenureStat
                                icon="bar_chart"
                                label="Avg. Job Tenure"
                                value={avgTenureDisplay}
                              />
                            ) : null}
                            {currentTenureDisplay ? (
                              <HeroTenureStat
                                icon="schedule"
                                label="Current Tenure"
                                value={currentTenureDisplay}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="dashboard-profile-hero-aside">
                        <div
                          className="dashboard-profile-hero-actions"
                          role="group"
                          aria-label="Profile actions"
                        >
                          <HeroIconAction
                            icon="mail"
                            label={
                              emailRevealBusy
                                ? "Revealing email"
                                : emailRevealed
                                  ? "Email revealed"
                                  : "Reveal email"
                            }
                            onClick={onRevealEmail}
                            active={emailRevealed}
                            busy={emailRevealBusy}
                          />
                          <HeroIconAction
                            icon="call"
                            label={
                              phoneRevealBusy
                                ? "Revealing phone"
                                : phoneRevealed
                                  ? "Phone revealed"
                                  : "Reveal phone"
                            }
                            onClick={onRevealPhone}
                            active={phoneRevealed}
                            busy={phoneRevealBusy}
                          />
                          {linkedinUrl ? (
                            <HeroIconAction
                              icon="link"
                              label="Open LinkedIn profile"
                              href={linkedinUrl}
                            />
                          ) : null}
                        </div>
                        {typeof doc.finalScore === "number" && doc.finalScore > 0 ? (
                          <div
                            className="dashboard-profile-rating-badge"
                            title={`Match score ${formatCandidateScore(doc.finalScore)} out of 5`}
                          >
                            <span className="dashboard-profile-rating-value">
                              {formatCandidateScore(doc.finalScore)}
                            </span>
                            <MaterialIcon
                              name="star"
                              className="dashboard-profile-rating-star"
                              aria-hidden
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {contactRevealNotice || hasRevealedContact ? (
                  <div className="dashboard-profile-hero-contact">
                    {contactRevealNotice ? (
                      <p className="dashboard-profile-hero-alert dashboard-alert-warning">
                        {contactRevealNotice}
                      </p>
                    ) : null}
                    {hasRevealedContact ? (
                      <div className="dashboard-profile-hero-contact-grid">
                        {emailRevealed && displayedEmail ? (
                          <a
                            href={`mailto:${displayedEmail}`}
                            className="dashboard-profile-contact-pill"
                          >
                            <MaterialIcon name="mail" className="shrink-0 text-[16px]" />
                            <span className="truncate">{displayedEmail}</span>
                          </a>
                        ) : null}
                        {phoneRevealed && displayedPhone ? (
                          <a
                            href={`tel:${displayedPhone.replace(/\s/g, "")}`}
                            className="dashboard-profile-contact-pill"
                          >
                            <MaterialIcon name="call" className="shrink-0 text-[16px]" />
                            <span className="truncate">{displayedPhone}</span>
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>

              <div className="dashboard-profile-sticky-tabs">
                <div
                  className="dashboard-profile-tabs"
                  role="tablist"
                  aria-label="Profile sections"
                >
                  <button
                    type="button"
                    role="tab"
                    id="profile-tab-overview"
                    aria-selected={activeTab === "overview"}
                    aria-controls="profile-panel-overview"
                    className={`dashboard-profile-tab${activeTab === "overview" ? " dashboard-profile-tab--active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="profile-tab-analytics"
                    aria-selected={activeTab === "analytics"}
                    aria-controls="profile-panel-analytics"
                    className={`dashboard-profile-tab${activeTab === "analytics" ? " dashboard-profile-tab--active" : ""}`}
                    onClick={() => setActiveTab("analytics")}
                    disabled={analyticsCount === 0}
                  >
                    Analytics
                    {analyticsCount > 0 ? (
                      <span className="dashboard-profile-tab-badge">{analyticsCount}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="dashboard-profile-tab-panels">
                {activeTab === "overview" ? (
                  <div
                    id="profile-panel-overview"
                    role="tabpanel"
                    aria-labelledby="profile-tab-overview"
                    className="dashboard-profile-tab-panel"
                  >
                    {profile?.summary ? (
                      <ProfileSection icon="description" title="Summary">
                        <p className="dashboard-profile-summary">{profile.summary}</p>
                      </ProfileSection>
                    ) : null}

                    {careerStats.length > 0 ? (
                      <ProfileSection icon="insights" title="Career overview">
                        <dl className="dashboard-profile-stat-grid">
                          {careerStats.map((s) => (
                            <div key={s.label} className="dashboard-profile-stat">
                              <dt className="dashboard-profile-stat-label">{s.label}</dt>
                              <dd className="dashboard-profile-stat-value">{s.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </ProfileSection>
                    ) : null}

                    {currentEmployers.length > 0 ? (
                      <ProfileSection icon="work" title="Current roles">
                        <ul className="dashboard-profile-timeline">
                          {currentEmployers.map((emp, i) => (
                            <RoleTimelineItem
                              key={`cur-${i}`}
                              keyId={`cur-${i}`}
                              emp={emp}
                              current
                            />
                          ))}
                        </ul>
                      </ProfileSection>
                    ) : null}

                    {pastEmployers.length > 0 ? (
                      <ProfileSection icon="history" title="Experience">
                        <ul className="dashboard-profile-timeline">
                          {pastEmployers.map((emp, i) => (
                            <RoleTimelineItem key={`past-${i}`} keyId={`past-${i}`} emp={emp} />
                          ))}
                        </ul>
                      </ProfileSection>
                    ) : null}

                    {education.length > 0 ? (
                      <ProfileSection icon="school" title="Education">
                        <ul className="dashboard-profile-edu-list">
                          {education.map((ed: SessionEducationRow, i) => {
                            const dates = formatEmployerDateRange(
                              ed.start_date,
                              ed.end_date
                            );
                            return (
                              <li key={`edu-${i}`} className="dashboard-profile-edu-card">
                                {ed.degree_name || ed.institute_name ? (
                                  <div className="dashboard-profile-edu-primary">
                                    {ed.degree_name ? (
                                      <p className="dashboard-profile-edu-degree">
                                        {ed.degree_name}
                                      </p>
                                    ) : null}
                                    {ed.institute_name ? (
                                      <p className="dashboard-profile-edu-school">
                                        {ed.institute_name}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}
                                {ed.field_of_study ? (
                                  <p className="dashboard-profile-edu-field">
                                    {ed.field_of_study}
                                  </p>
                                ) : null}
                                {dates ? (
                                  <p className="dashboard-profile-edu-dates">{dates}</p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </ProfileSection>
                    ) : null}

                    {skills.length > 0 ? (
                      <ProfileSection icon="psychology" title="Skills">
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <span key={skill} className="dashboard-chip">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </ProfileSection>
                    ) : null}

                    {certifications.length > 0 ? (
                      <ProfileSection icon="verified" title="Certifications">
                        <ul className="dashboard-profile-cert-list">
                          {certifications.map((c, i) => (
                            <li key={`cert-${i}`} className="dashboard-profile-cert-item">
                              {typeof c === "string" ? c : String(c)}
                            </li>
                          ))}
                        </ul>
                      </ProfileSection>
                    ) : null}

                    {honors.length > 0 ? (
                      <ProfileSection icon="emoji_events" title="Honors & awards">
                        <ul className="dashboard-profile-timeline">
                          {honors.map((h: SessionHonorRow, i) => (
                            <li key={`honor-${i}`} className="dashboard-profile-edu-card">
                              {h.title ? (
                                <p className="dashboard-profile-edu-degree">{h.title}</p>
                              ) : null}
                              {h.issuer ? (
                                <p className="dashboard-profile-edu-school">{h.issuer}</p>
                              ) : null}
                              {h.description ? (
                                <p className="dashboard-profile-edu-meta">{h.description}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </ProfileSection>
                    ) : null}

                    {languages.length > 0 ? (
                      <ProfileSection icon="translate" title="Languages">
                        <p className="dashboard-text-body">{languages.join(", ")}</p>
                      </ProfileSection>
                    ) : null}

                    {highlights.length > 0 ? (
                      <ProfileSection icon="auto_awesome" title="Highlights">
                        <ul className="dashboard-profile-insight-list">
                          {highlights.map((h, i) => (
                            <li key={`${h.Category}-${i}`} className="dashboard-profile-highlight">
                              {h.Category ? (
                                <span className="dashboard-profile-highlight-category">
                                  {h.Category}
                                </span>
                              ) : null}
                              <p className="dashboard-profile-highlight-text">
                                {h.Highlight || "—"}
                              </p>
                              {h.ReasonForHighlight ? (
                                <p className="dashboard-profile-highlight-reason">
                                  {h.ReasonForHighlight}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </ProfileSection>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === "analytics" ? (
                  <div
                    id="profile-panel-analytics"
                    role="tabpanel"
                    aria-labelledby="profile-tab-analytics"
                    className="dashboard-profile-tab-panel"
                  >
                    {analyticsCount === 0 ? (
                      <div className="dashboard-profile-analytics-empty">
                        <span className="dashboard-profile-analytics-empty-icon" aria-hidden>
                          <MaterialIcon name="analytics" className="text-[22px]" />
                        </span>
                        <p className="dashboard-profile-analytics-empty-title">
                          No AI analytics
                        </p>
                        <p className="dashboard-profile-analytics-empty-text">
                          Match insights and review notes appear when analysis is available.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="dashboard-profile-analytics-banner">
                          <span className="dashboard-profile-analytics-banner-icon" aria-hidden>
                            <MaterialIcon name="auto_awesome" className="text-[16px]" />
                          </span>
                          <p className="dashboard-profile-analytics-banner-text">
                            AI-generated evaluation based on your search criteria. Verify
                            details before outreach.
                          </p>
                        </div>

                        {strengths.length > 0 ? (
                          <ProfileSection icon="thumb_up" title="Key strengths">
                            <ul className="dashboard-profile-insight-list">
                              {strengths.map((s, i) => (
                                <InsightItem
                                  key={`strength-${i}`}
                                  observation={s.observation}
                                  evidence={s.evidence}
                                  variant="positive"
                                />
                              ))}
                            </ul>
                          </ProfileSection>
                        ) : null}

                        {weaknesses.length > 0 ? (
                          <ProfileSection icon="rate_review" title="Areas to review">
                            <ul className="dashboard-profile-insight-list">
                              {weaknesses.map((w, i) => (
                                <InsightItem
                                  key={`weakness-${i}`}
                                  observation={w.observation}
                                  evidence={w.evidence}
                                  variant="review"
                                />
                              ))}
                            </ul>
                          </ProfileSection>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <footer className="dashboard-profile-drawer-footer">
          <button
            type="button"
            onClick={onToggleSave}
            disabled={isSaveBusy}
            className={`dashboard-profile-save-btn py-2.5 disabled:opacity-60 ${
              isSaved
                ? "dashboard-btn-secondary dashboard-btn-toggle-active"
                : "dashboard-btn-primary"
            }`}
          >
            <MaterialIcon
              name={isSaved ? "bookmark" : "bookmark_add"}
              className="text-[18px]"
            />
            {isSaveBusy ? "Saving…" : isSaved ? "Saved to list" : "Save candidate"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
