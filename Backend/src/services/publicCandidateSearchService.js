const {
  createSourcingSession,
  isFjSessionPending,
  fjSessionPendingMessage,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  getSourcingSessionAnnotation,
  buildSessionPayloadFromPromptAndFilter,
  filterFormFromAnnotation,
  enrichFilterFormSkillsFromPrompt,
  normalizeFilterFormForUi,
  ensureSkillsForFutureJobs,
  DEFAULT_FILTER_FORM,
} = require("./futureJobs");
const { mapPublicProfilesResponse } = require("./publicCandidateSearch");
const { logApi, safeJsonPreview } = require("../utils/logger");

/** Same wait as dashboard POST /api/candidates/search/apply. */
const POST_SESSION_CREATE_PROFILES_WAIT_MS = 20_000;

/** Same pagination as dashboard session profile load. */
const PROFILE_FETCH_PAGE_LIMIT = 100;
const PROFILE_FETCH_MAX_PAGES = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sessionIdFromFjCreateResponse(futureJobs) {
  const id = futureJobs?.data?.session?._id;
  return id != null && String(id).trim() !== "" ? String(id).trim() : "";
}

function skillsBucketCount(skillsValue) {
  if (!skillsValue || typeof skillsValue !== "object") return 0;
  const mandatory = Array.isArray(skillsValue.mandatory) ? skillsValue.mandatory.length : 0;
  const core = Array.isArray(skillsValue.core) ? skillsValue.core.length : 0;
  const secondary = Array.isArray(skillsValue.secondary) ? skillsValue.secondary.length : 0;
  return mandatory + core + secondary;
}

function payloadHasSkills(payload) {
  return skillsBucketCount(payload?.queries?.skills?.value) > 0;
}

function normalizeIncomingFilterForm(filterForm) {
  const normalized = normalizeFilterFormForUi(filterForm);
  return normalized || { ...DEFAULT_FILTER_FORM };
}

/**
 * Step 1 — same as dashboard POST /api/candidates/search/annotate (no auth).
 */
async function annotatePublicSearchPrompt(prompt, { clientIp = "" } = {}) {
  const userText = String(prompt || "").trim();
  if (!userText) {
    const err = new Error("prompt is required");
    err.statusCode = 400;
    throw err;
  }

  logApi("public-candidates/annotate", "incoming", {
    clientIp,
    userTextLength: userText.length,
  });

  const futureJobs = await getSourcingSessionAnnotation({
    userText,
    linkedin_profile_url: "",
  });

  const annotationData =
    futureJobs?.data && typeof futureJobs.data === "object" ? futureJobs.data : {};

  const filterForm = enrichFilterFormSkillsFromPrompt(
    filterFormFromAnnotation(annotationData),
    userText
  );

  if (!String(filterForm.keywordSkills || "").trim()) {
    const err = new Error(
      "Could not extract skills from your search. Try a more specific query."
    );
    err.statusCode = 400;
    throw err;
  }

  logApi("public-candidates/annotate", "success", {
    clientIp,
    keywordSkills: filterForm.keywordSkills,
  });

  return { filterForm, annotation: annotationData };
}

/**
 * Step 2 — same as dashboard POST /api/candidates/search/apply (no auth, no quota).
 */
function buildApplyPayload(prompt, filterForm) {
  const normalized = normalizeIncomingFilterForm(filterForm);
  const enriched = enrichFilterFormSkillsFromPrompt(normalized, prompt);

  if (!String(enriched.keywordSkills || "").trim()) {
    const err = new Error("At least one skill is required.");
    err.statusCode = 400;
    throw err;
  }

  const payload = buildSessionPayloadFromPromptAndFilter(prompt, enriched);

  if (!payloadHasSkills(payload)) {
    const repairedSkills = ensureSkillsForFutureJobs(
      { mandatory: [], core: [], secondary: [] },
      enriched,
      payload
    );
    payload.queries = payload.queries && typeof payload.queries === "object" ? payload.queries : {};
    payload.queries.skills = { type: "IN", value: repairedSkills };
  }

  if (!payloadHasSkills(payload)) {
    const err = new Error("At least one skill is required.");
    err.statusCode = 400;
    throw err;
  }

  return { payload, filterForm: enriched };
}

function buildProfilesResWithDocs(baseRes, allDocs) {
  const d = baseRes?.data && typeof baseRes.data === "object" ? baseRes.data : {};
  const count = allDocs.length;
  const fjTotal =
    typeof d.totalDocs === "number" && d.totalDocs > 0 ? d.totalDocs : count;
  return {
    ...baseRes,
    data: {
      ...d,
      docs: allDocs,
      totalDocs: fjTotal,
      page: 1,
      limit: count || PROFILE_FETCH_PAGE_LIMIT,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      nextPage: null,
      prevPage: null,
    },
  };
}

/** Load every profile page Future Jobs exposes for this session (same as dashboard). */
async function fetchAllPublicSessionProfiles(sessionId, pollOptions = {}) {
  const allDocs = [];
  const seen = new Set();
  let lastRes = null;
  let page = 1;

  while (page <= PROFILE_FETCH_MAX_PAGES) {
    const profilesRes =
      page === 1
        ? await getSourcingSessionProfilesWhenReady(String(sessionId), {
            page: 1,
            limit: PROFILE_FETCH_PAGE_LIMIT,
            ...pollOptions,
          })
        : await getSourcingSessionProfiles(String(sessionId), {
            page,
            limit: PROFILE_FETCH_PAGE_LIMIT,
          });

    lastRes = profilesRes;
    const docs = profilesRes?.data?.docs;
    if (Array.isArray(docs)) {
      for (const doc of docs) {
        const id = doc?._id != null ? String(doc._id) : "";
        const linkedin = String(doc?.profile?.linkedin_profile_url || "")
          .trim()
          .toLowerCase();
        const dedupeKey = id || (linkedin ? `li:${linkedin}` : "");
        if (dedupeKey) {
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
        }
        allDocs.push(doc);
      }
    }

    const hasNext = profilesRes?.data?.hasNextPage === true;
    const totalPages =
      typeof profilesRes?.data?.totalPages === "number"
        ? profilesRes.data.totalPages
        : null;
    if (!hasNext) break;
    if (totalPages != null && page >= totalPages) break;
    page += 1;
  }

  return buildProfilesResWithDocs(lastRes || {}, allDocs);
}

async function runPublicCandidateSearch({
  prompt,
  filterForm,
  clientIp = "",
}) {
  const trimmedPrompt = String(prompt || "").trim();
  if (!trimmedPrompt) {
    const err = new Error("prompt is required");
    err.statusCode = 400;
    throw err;
  }

  let resolvedFilterForm = filterForm;
  if (!resolvedFilterForm || typeof resolvedFilterForm !== "object") {
    const annotated = await annotatePublicSearchPrompt(trimmedPrompt, { clientIp });
    resolvedFilterForm = annotated.filterForm;
  }

  const { payload, filterForm: enrichedFilterForm } = buildApplyPayload(
    trimmedPrompt,
    resolvedFilterForm
  );

  logApi("public-candidates/search", "create payload", {
    clientIp,
    keywordSkills: enrichedFilterForm.keywordSkills,
    skillsBuckets: payload.queries.skills.value,
    payloadPreview: safeJsonPreview(payload),
  });

  const futureJobs = await createSourcingSession(payload);
  const sessionId = sessionIdFromFjCreateResponse(futureJobs);

  logApi("public-candidates/search", "session created", {
    clientIp,
    sessionId: sessionId || null,
    futureJobsStatus: futureJobs?.status,
  });

  if (isFjSessionPending(futureJobs)) {
    return {
      sessionPending: true,
      message: fjSessionPendingMessage(futureJobs),
      prompt: trimmedPrompt,
      filterForm: enrichedFilterForm,
      totalMatched: 0,
      displayedCount: 0,
      candidates: [],
    };
  }

  if (!sessionId) {
    const err = new Error("Search session could not be started. Please try again.");
    err.statusCode = 502;
    throw err;
  }

  logApi("public-candidates/search", "waiting before profiles fetch", {
    clientIp,
    sessionId,
    waitMs: POST_SESSION_CREATE_PROFILES_WAIT_MS,
  });
  await sleep(POST_SESSION_CREATE_PROFILES_WAIT_MS);

  const sourcingMeta = futureJobs?.data?.sourcing;
  const pollOptions = {
    expectedProfileCount:
      typeof sourcingMeta?.total_display_count === "number"
        ? sourcingMeta.total_display_count
        : typeof sourcingMeta?.newProfilesCount === "number"
          ? sourcingMeta.newProfilesCount
          : null,
    profileMatchingStatus:
      typeof sourcingMeta?.profileMatchingStatus === "string"
        ? sourcingMeta.profileMatchingStatus
        : typeof futureJobs?.data?.session?.profileMatchingStatus === "string"
          ? futureJobs.data.session.profileMatchingStatus
          : null,
  };

  const profilesRes = await fetchAllPublicSessionProfiles(sessionId, pollOptions);
  const mapped = mapPublicProfilesResponse(profilesRes);

  logApi("public-candidates/search", "success", {
    clientIp,
    displayedCount: mapped.displayedCount,
    totalMatched: mapped.totalMatched,
  });

  const sessionTitle =
    typeof payload?.sessionTitle === "string" ? payload.sessionTitle.trim() : "";

  return {
    sessionPending: false,
    futureJobsSessionId: sessionId,
    sessionTitle,
    prompt: trimmedPrompt,
    filterForm: enrichedFilterForm,
    totalMatched: mapped.totalMatched,
    displayedCount: mapped.displayedCount,
    candidates: mapped.candidates,
  };
}

module.exports = {
  annotatePublicSearchPrompt,
  buildApplyPayload,
  runPublicCandidateSearch,
  POST_SESSION_CREATE_PROFILES_WAIT_MS,
};
