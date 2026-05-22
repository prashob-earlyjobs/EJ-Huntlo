/** Domain / website from Future Jobs scout `current_employers[0]` for favicon logos. */
function scoutEmployerDomain(employer) {
  if (!employer || typeof employer !== "object") return "";
  const fromListed = employer.employer_company_website_domain;
  if (Array.isArray(fromListed) && fromListed[0]) {
    return String(fromListed[0]).trim();
  }
  if (typeof fromListed === "string" && fromListed.trim()) {
    return fromListed.trim();
  }
  if (Array.isArray(employer.domains) && employer.domains[0]) {
    return String(employer.domains[0]).trim();
  }
  return "";
}

function scoutEmployerWebsite(employer) {
  if (!employer || typeof employer !== "object") return "";
  const site =
    typeof employer.employer_company_website === "string"
      ? employer.employer_company_website.trim()
      : "";
  if (site) return site;
  const domain = scoutEmployerDomain(employer);
  return domain ? `https://${domain}` : "";
}

function companyMetaFromFjProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return { companyWebsiteDomain: "", companyWebsite: "" };
  }
  const current =
    Array.isArray(profile.current_employers) && profile.current_employers.length > 0
      ? profile.current_employers[0]
      : null;
  return {
    companyWebsiteDomain: scoutEmployerDomain(current),
    companyWebsite: scoutEmployerWebsite(current),
  };
}

module.exports = {
  scoutEmployerDomain,
  scoutEmployerWebsite,
  companyMetaFromFjProfile,
};
