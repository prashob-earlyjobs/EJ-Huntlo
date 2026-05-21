"use client";

import { useState } from "react";

import { companyFaviconUrl } from "@/lib/companyLogo";
import type { SessionEmployerRow } from "@/lib/sessionCandidateDetail";

export function companyLogoFromEmployer(emp: SessionEmployerRow): string | null {
  return companyFaviconUrl(emp.company_website_domain, emp.company_website);
}

type Props = {
  domain?: string;
  website?: string;
  src?: string | null;
  alt?: string;
  className?: string;
};

export function CompanyLogo({
  domain,
  website,
  src,
  alt = "",
  className = "dashboard-profile-company-logo",
}: Props) {
  const [failed, setFailed] = useState(false);
  const url = src ?? companyFaviconUrl(domain, website);

  if (!url || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
