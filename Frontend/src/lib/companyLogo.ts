/** Normalize hostname from Future Jobs `company_website_domain` or a website URL. */
export function normalizeCompanyDomain(
  domain?: string,
  website?: string
): string | null {
  const fromDomain = typeof domain === "string" ? domain.trim() : "";
  if (fromDomain) return cleanHostname(fromDomain);

  const site = typeof website === "string" ? website.trim() : "";
  if (!site) return null;

  try {
    const url = site.includes("://") ? site : `https://${site}`;
    return cleanHostname(new URL(url).hostname);
  } catch {
    const stripped = site.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
    return cleanHostname(stripped);
  }
}

function cleanHostname(input: string): string | null {
  let host = input.trim().toLowerCase();
  if (!host) return null;
  host = host.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  if (host.startsWith("www.")) host = host.slice(4);
  if (!host || !host.includes(".")) return null;
  return host;
}

/** Google favicon URL for a company domain (falls back to parsing `company_website`). */
export function companyFaviconUrl(domain?: string, website?: string): string | null {
  const host = normalizeCompanyDomain(domain, website);
  if (!host) return null;
  const params = new URLSearchParams({ domain: host, sz: "256" });
  return `https://www.google.com/s2/favicons?${params.toString()}`;
}
