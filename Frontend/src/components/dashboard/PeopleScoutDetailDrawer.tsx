"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { CompanyLogo } from "@/components/dashboard/CompanyLogo";
import { ProfilePhotoLightbox } from "@/components/dashboard/ProfilePhotoLightbox";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { companyFaviconUrl } from "@/lib/companyLogo";
import { nameInitials } from "@/lib/sessionResultUi";

export type PeopleScoutExperience = {
  title: string;
  company: string;
  duration: string;
  location: string;
  description: string;
  companyWebsiteDomain?: string;
  companyWebsite?: string;
};

export type PeopleScoutProfile = {
  name: string;
  profilePhotoUrl: string;
  headline: string;
  location: string;
  connections: string;
  about: string;
  currentCompany: string;
  currentCompanyWebsiteDomain?: string;
  currentCompanyWebsite?: string;
  experiences: PeopleScoutExperience[];
  education: {
    school: string;
    degree: string;
    duration: string;
  }[];
  skills: string[];
  languages: string[];
  certifications: string[];
  linkedinUrl: string;
  email: string;
  phone: string;
  website: string;
};

type Props = {
  open: boolean;
  profile: PeopleScoutProfile;
  onClose: () => void;
  onRevealEmail: () => void;
  onRevealPhone: () => void;
  emailRevealed: boolean;
  phoneRevealed: boolean;
  emailRevealBusy: boolean;
  phoneRevealBusy: boolean;
  contactRevealNotice: string;
};

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

function HeroInlineMeta({
  icon,
  domain,
  website,
  children,
}: {
  icon: string;
  domain?: string;
  website?: string;
  children: ReactNode;
}) {
  if (!children) return null;
  const favicon = companyFaviconUrl(domain, website);
  return (
    <span className="dashboard-profile-hero-inline-meta">
      {favicon ? (
        <CompanyLogo
          domain={domain}
          website={website}
          alt=""
          className="dashboard-profile-company-logo"
        />
      ) : (
        <MaterialIcon name={icon} className="shrink-0" aria-hidden />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

function ScoutEmployerCompanyLine({ exp }: { exp: PeopleScoutExperience }) {
  const name = exp.company.trim();
  if (!name) return null;
  const website = typeof exp.companyWebsite === "string" ? exp.companyWebsite.trim() : "";
  const href = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : exp.companyWebsiteDomain
      ? `https://${exp.companyWebsiteDomain}`
      : "";

  const content = (
    <>
      <CompanyLogo
        domain={exp.companyWebsiteDomain}
        website={exp.companyWebsite}
        alt=""
        className="dashboard-profile-company-logo"
      />
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

function ScoutExperienceItem({
  exp,
  current,
}: {
  exp: PeopleScoutExperience;
  current?: boolean;
}) {
  const secondary: string[] = [];
  if (exp.location) secondary.push(exp.location);

  return (
    <li
      className={`dashboard-profile-timeline-item${current ? " dashboard-profile-timeline-item--current" : ""}`}
    >
      <div className="dashboard-profile-role-card">
        {exp.title ? <p className="dashboard-profile-role-title">{exp.title}</p> : null}
        <ScoutEmployerCompanyLine exp={exp} />
        {exp.duration ? <p className="dashboard-profile-role-meta">{exp.duration}</p> : null}
        {secondary.length > 0 ? (
          <p className="dashboard-profile-role-meta">{secondary.join(" · ")}</p>
        ) : null}
        {exp.description ? (
          <p className="dashboard-profile-edu-meta mt-2 whitespace-pre-wrap">{exp.description}</p>
        ) : null}
      </div>
    </li>
  );
}

export function PeopleScoutDetailDrawer({
  open,
  profile,
  onClose,
  onRevealEmail,
  onRevealPhone,
  emailRevealed,
  phoneRevealed,
  emailRevealBusy,
  phoneRevealBusy,
  contactRevealNotice,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const photoViewerOpenRef = useRef(false);
  photoViewerOpenRef.current = photoViewerOpen;

  const name = profile.name.trim() || "Unknown";
  const photoUrl = profile.profilePhotoUrl.trim();
  const linkedinUrl = profile.linkedinUrl.trim();
  const roleTitle = profile.headline.trim();
  const showMetaRow = Boolean(
    profile.currentCompany || profile.location || profile.connections
  );
  const showImage = Boolean(photoUrl) && !imgFailed;
  const displayedEmail = profile.email.trim();
  const displayedPhone = profile.phone.trim();
  const hasRevealedContact =
    (emailRevealed && displayedEmail) || (phoneRevealed && displayedPhone);

  useEffect(() => {
    if (!open) {
      setPhotoViewerOpen(false);
      return;
    }
    setImgFailed(false);
    setPhotoViewerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (photoViewerOpenRef.current) {
        setPhotoViewerOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
        aria-label="Close People Scout profile"
        className="dashboard-drawer-overlay absolute inset-0"
        onClick={onClose}
      />

      <aside
        className={`dashboard-drawer-panel dashboard-drawer-panel--scout dashboard-profile-drawer absolute right-0 top-0 h-full w-full transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="dashboard-profile-topbar">
          <p className="dashboard-profile-topbar-title">People Scout profile</p>
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
              <article className="dashboard-profile-hero">
                <div className="dashboard-profile-hero-layout">
                  {showImage ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoViewerOpen(true);
                      }}
                      className="dashboard-candidate-avatar dashboard-profile-drawer-avatar cursor-pointer transition hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      aria-label={`View ${name} profile photo larger`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setImgFailed(true)}
                      />
                    </button>
                  ) : (
                    <div
                      className="dashboard-candidate-avatar dashboard-profile-drawer-avatar"
                      aria-hidden
                    >
                      {nameInitials(name)}
                    </div>
                  )}

                  <div className="dashboard-profile-hero-body">
                    <div className="dashboard-profile-hero-top">
                      <div className="dashboard-profile-hero-identity">
                        <div className="dashboard-profile-hero-name-row">
                          <h2 className="dashboard-profile-hero-name">{name}</h2>
                        </div>
                        {roleTitle ? (
                          <p className="dashboard-profile-hero-role">{roleTitle}</p>
                        ) : null}

                        {showMetaRow ? (
                          <div className="dashboard-profile-hero-meta-row">
                            {profile.currentCompany ? (
                              <HeroInlineMeta
                                icon="business"
                                domain={profile.currentCompanyWebsiteDomain}
                                website={profile.currentCompanyWebsite}
                              >
                                {profile.currentCompany}
                              </HeroInlineMeta>
                            ) : null}
                            {profile.location ? (
                              <HeroInlineMeta icon="location_on">
                                {profile.location}
                              </HeroInlineMeta>
                            ) : null}
                            {profile.connections && profile.connections !== "—" ? (
                              <HeroInlineMeta icon="group">{profile.connections}</HeroInlineMeta>
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
                        {emailRevealed ? (
                          displayedEmail ? (
                            <a
                              href={`mailto:${displayedEmail}`}
                              className="dashboard-profile-contact-pill"
                            >
                              <MaterialIcon name="mail" className="shrink-0 text-[16px]" />
                              <span className="truncate">{displayedEmail}</span>
                            </a>
                          ) : (
                            <span className="dashboard-profile-contact-pill text-[#424656]/70">
                              <MaterialIcon name="mail" className="shrink-0 text-[16px]" />
                              <span>Email not available</span>
                            </span>
                          )
                        ) : null}
                        {phoneRevealed ? (
                          displayedPhone ? (
                            <a
                              href={`tel:${displayedPhone.replace(/\s/g, "")}`}
                              className="dashboard-profile-contact-pill"
                            >
                              <MaterialIcon name="call" className="shrink-0 text-[16px]" />
                              <span className="truncate">{displayedPhone}</span>
                            </a>
                          ) : (
                            <span className="dashboard-profile-contact-pill text-[#424656]/70">
                              <MaterialIcon name="call" className="shrink-0 text-[16px]" />
                              <span>Phone not available</span>
                            </span>
                          )
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>

              <div className="dashboard-profile-tab-panels">
                <div
                  id="people-scout-panel-overview"
                  role="tabpanel"
                  aria-labelledby="people-scout-tab-overview"
                  className="dashboard-profile-tab-panel"
                >
                  {profile.about ? (
                    <ProfileSection icon="description" title="Summary">
                      <p className="dashboard-profile-summary whitespace-pre-wrap">
                        {profile.about}
                      </p>
                    </ProfileSection>
                  ) : null}

                  {profile.experiences.length > 0 ? (
                    <ProfileSection icon="work" title="Experience">
                      <ul className="dashboard-profile-timeline">
                        {profile.experiences.map((exp, idx) => (
                          <ScoutExperienceItem
                            key={`${exp.company}-${exp.title}-${idx}`}
                            exp={exp}
                            current={
                              idx === 0 &&
                              Boolean(profile.currentCompany) &&
                              exp.company === profile.currentCompany
                            }
                          />
                        ))}
                      </ul>
                    </ProfileSection>
                  ) : null}

                  {profile.education.length > 0 ? (
                    <ProfileSection icon="school" title="Education">
                      <ul className="dashboard-profile-edu-list">
                        {profile.education.map((ed, idx) => (
                          <li key={`${ed.school}-${idx}`} className="dashboard-profile-edu-card">
                            {ed.degree || ed.school ? (
                              <div className="dashboard-profile-edu-primary">
                                {ed.degree ? (
                                  <p className="dashboard-profile-edu-degree">{ed.degree}</p>
                                ) : null}
                                {ed.school ? (
                                  <p className="dashboard-profile-edu-school">{ed.school}</p>
                                ) : null}
                              </div>
                            ) : null}
                            {ed.duration ? (
                              <p className="dashboard-profile-edu-dates">{ed.duration}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </ProfileSection>
                  ) : null}

                  {profile.skills.length > 0 ? (
                    <ProfileSection icon="psychology" title="Skills">
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <span key={skill} className="dashboard-chip">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </ProfileSection>
                  ) : null}

                  {profile.languages.length > 0 ? (
                    <ProfileSection icon="translate" title="Languages">
                      <p className="dashboard-text-body">{profile.languages.join(", ")}</p>
                    </ProfileSection>
                  ) : null}

                  {profile.certifications.length > 0 ? (
                    <ProfileSection icon="verified" title="Certifications">
                      <ul className="dashboard-profile-cert-list">
                        {profile.certifications.map((c) => (
                          <li key={c} className="dashboard-profile-cert-item">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </ProfileSection>
                  ) : null}

                  {profile.website &&
                  profile.website !== linkedinUrl &&
                  profile.website.trim() ? (
                    <ProfileSection icon="language" title="Website">
                      <a
                        href={
                          profile.website.startsWith("http")
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dashboard-profile-role-link break-all"
                      >
                        {profile.website}
                      </a>
                    </ProfileSection>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <ProfilePhotoLightbox
        open={photoViewerOpen && showImage}
        photoUrl={photoUrl}
        name={name}
        onClose={() => setPhotoViewerOpen(false)}
      />
    </div>
  );
}
