/** Maps logical keys → User schema field names for $inc. */
const USAGE_FIELD = {
  candidateSearches: "usageCandidateSearches",
  emailUnveils: "usageEmailUnveils",
  candidateUnveils: "usageCandidateUnveils",
  mobileUnveils: "usageMobileUnveils",
  linkedinLookups: "usageLinkedinLookups",
};

function utilisationFromUser(user) {
  return {
    candidateSearches: Math.max(0, Math.floor(Number(user?.usageCandidateSearches ?? 0))),
    emailUnveils: Math.max(0, Math.floor(Number(user?.usageEmailUnveils ?? 0))),
    candidateUnveils: Math.max(0, Math.floor(Number(user?.usageCandidateUnveils ?? 0))),
    mobileUnveils: Math.max(0, Math.floor(Number(user?.usageMobileUnveils ?? 0))),
    linkedinLookups: Math.max(0, Math.floor(Number(user?.usageLinkedinLookups ?? 0))),
  };
}

module.exports = {
  USAGE_FIELD,
  utilisationFromUser,
};
