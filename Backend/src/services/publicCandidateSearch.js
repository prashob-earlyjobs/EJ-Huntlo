/**
 * Strip contact and session identifiers from Future Jobs profile docs for public preview.
 * @param {object} doc
 * @returns {object|null}
 */
function sanitizePublicProfileDoc(doc) {
  if (!doc || typeof doc !== "object") return null;

  const profile =
    doc.profile && typeof doc.profile === "object" ? { ...doc.profile } : null;
  if (profile) {
    delete profile.linkedin_profile_url;
    delete profile.flagship_profile_url;
    delete profile.email;
    delete profile.phone;
  }

  const profileAnalysis =
    doc.profileAnalysis && typeof doc.profileAnalysis === "object"
      ? doc.profileAnalysis
      : undefined;

  return {
    _id: doc._id != null ? String(doc._id) : undefined,
    finalScore: typeof doc.finalScore === "number" ? doc.finalScore : undefined,
    profile,
    profileAnalysis,
  };
}

/**
 * @param {object} profilesRes — Future Jobs GET …/profiles response (all pages merged)
 */
function mapPublicProfilesResponse(profilesRes) {
  const docs = profilesRes?.data?.docs;
  const totalDocs =
    typeof profilesRes?.data?.totalDocs === "number"
      ? profilesRes.data.totalDocs
      : Array.isArray(docs)
        ? docs.length
        : 0;

  const sanitizedDocs = [];
  if (Array.isArray(docs)) {
    for (const doc of docs) {
      const row = sanitizePublicProfileDoc(doc);
      if (row) sanitizedDocs.push(row);
    }
  }

  const count = sanitizedDocs.length;
  return {
    totalMatched: totalDocs > 0 ? totalDocs : count,
    displayedCount: count,
    candidates: sanitizedDocs,
  };
}

module.exports = {
  sanitizePublicProfileDoc,
  mapPublicProfilesResponse,
};
