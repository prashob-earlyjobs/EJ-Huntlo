const mongoose = require("mongoose");
const {
  createSourcingSession,
  updateSourcingSession,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  buildSourcingSessionPayloadFromPrompt,
  filterFormFromCreateResponse,
  mergeFilterFormIntoSession,
  buildSessionPayloadForApply,
  buildSessionPayloadFromPromptAndFilter,
  getSourcingSessionAnnotation,
  filterFormFromAnnotation,
  mapFjDocToCandidate,
} = require("../services/futureJobs");
const SourcingSession = require("../models/SourcingSession");
const SourcedCandidateDetail = require("../models/SourcedCandidateDetail");
const SavedCandidate = require("../models/SavedCandidate");
const SavedCandidateList = require("../models/SavedCandidateList");
const { logApi, safeJsonPreview } = require("../utils/logger");
const { incrementUserUsage } = require("../utils/incrementUserUsage");
const { assertQuotaAvailableByUserId } = require("../services/planQuotas");
const { respondIfQuotaExceeded } = require("../utils/quotaHttp");
const { resolveContactReveal } = require("../services/contactRevealService");

/** Wait after POST /wl/sourcing-session before GET …/profiles (Search Candidates apply). */
const POST_SESSION_CREATE_PROFILES_WAIT_MS = 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bumpSourcingRevealUsage(userId, revealType) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) return;
  const uid = String(userId);
  if (revealType === "EMAIL") {
    await incrementUserUsage(uid, "emailUnveils");
  } else if (revealType === "PHONE") {
    await incrementUserUsage(uid, "mobileUnveils");
  }
}

function clampInt(n, min, max, fallback) {
  const v = parseInt(String(n), 10);
  if (Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function parseQueryBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const s = String(value).toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return defaultValue;
}

function escapeRegexLiteral(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive match on stored candidate fields (name, role, company, skills, etc.). */
function buildSourcedCandidateSearchFilter(searchRaw) {
  const q = typeof searchRaw === "string" ? searchRaw.trim() : "";
  if (!q) return null;
  const regex = new RegExp(escapeRegexLiteral(q), "i");
  return {
    $or: [
      { name: regex },
      { linkedinProfileUrl: regex },
      { "rawDoc.profile.name": regex },
      { "rawDoc.profile.region": regex },
      { "rawDoc.profile.linkedin_profile_url": regex },
      { "rawDoc.profile.skills": regex },
      { "rawDoc.profile.current_employers_object.job_title": regex },
      { "rawDoc.profile.current_employers_object.company_name": regex },
      { "rawDoc.profileAnalysis.recommendation": regex },
      { "rawDoc.profileAnalysis.highlights.Highlight": regex },
    ],
  };
}

/**
 * Map Future Jobs GET …/profiles JSON → candidates list + pagination snapshot.
 */
function mapProfilesResToLists(profilesRes) {
  const candidates = [];
  let profilesPagination = null;
  const d = profilesRes?.data;
  if (d && typeof d === "object") {
    profilesPagination = {
      totalDocs: d.totalDocs,
      page: d.page,
      limit: d.limit,
      totalPages: d.totalPages,
      hasNextPage: d.hasNextPage,
      hasPrevPage: d.hasPrevPage,
      nextPage: d.nextPage,
      prevPage: d.prevPage,
    };
  }
  const docs = d?.docs;
  if (Array.isArray(docs)) {
    for (const doc of docs) {
      const row = mapFjDocToCandidate(doc);
      if (row) candidates.push(row);
    }
  }
  return { candidates, profilesPagination, futureJobsProfiles: profilesRes };
}

async function persistCandidateDetails({
  userId,
  sourcingSessionId,
  profilesRes,
  loggerHandler,
}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return;
  if (!sourcingSessionId) return;
  const docs = profilesRes?.data?.docs;
  if (!Array.isArray(docs) || docs.length === 0) return;

  const ops = docs.map((doc, idx) => {
    const candidateId = String(doc?._id || "").trim();
    const linkedinProfileUrl = String(doc?.profile?.linkedin_profile_url || "").trim();
    const name = String(doc?.profile?.name || "").trim();
    const finalScore =
      typeof doc?.finalScore === "number" ? doc.finalScore : null;

    const filter =
      candidateId !== ""
        ? {
            userId: new mongoose.Types.ObjectId(userId),
            sourcingSessionId: String(sourcingSessionId),
            candidateId,
          }
        : {
            userId: new mongoose.Types.ObjectId(userId),
            sourcingSessionId: String(sourcingSessionId),
            linkedinProfileUrl: linkedinProfileUrl || `unknown-${idx}`,
          };

    return {
      updateOne: {
        filter,
        update: {
          $set: {
            userId: new mongoose.Types.ObjectId(userId),
            sourcingSessionId: String(sourcingSessionId),
            candidateId,
            linkedinProfileUrl,
            name,
            finalScore,
            rawDoc: doc,
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length === 0) return;
  try {
    const r = await SourcedCandidateDetail.bulkWrite(ops, { ordered: false });
    logApi(loggerHandler, "candidate details persisted", {
      userId,
      sourcingSessionId: String(sourcingSessionId),
      matched: r.matchedCount,
      modified: r.modifiedCount,
      upserted: r.upsertedCount,
      totalOps: ops.length,
    });
  } catch (err) {
    logApi(loggerHandler, "candidate details persist failed", {
      userId,
      sourcingSessionId: String(sourcingSessionId),
      message: err?.message,
      detailsPreview: err?.details
        ? safeJsonPreview(err.details, 400)
        : undefined,
    });
  }
}

async function persistSourcingSessionRow({
  userId,
  sessionId,
  prompt,
  payload,
  usingSessionOverride,
  futureJobs,
  profilesPagination,
  candidates,
  profilesFetchError,
}) {
  if (
    sessionId == null ||
    String(sessionId).trim() === "" ||
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  const sessionTitle =
    typeof payload?.sessionTitle === "string" ? payload.sessionTitle.trim() : "";

  const doc = await SourcingSession.findOneAndUpdate(
    { futureJobsSessionId: String(sessionId) },
    {
      $set: {
        userId: new mongoose.Types.ObjectId(userId),
        futureJobsSessionId: String(sessionId),
        prompt: prompt || "",
        sessionTitle,
        usingSessionOverride: Boolean(usingSessionOverride),
        futureJobsStatus:
          typeof futureJobs?.status === "string" ? futureJobs.status : "",
        totalDocs:
          profilesPagination != null &&
          typeof profilesPagination.totalDocs === "number" &&
          profilesPagination.totalDocs > 0
            ? profilesPagination.totalDocs
            : typeof futureJobs?.data?.sourcing?.total_display_count === "number"
              ? futureJobs.data.sourcing.total_display_count
              : null,
        candidateCountFirstPage: Array.isArray(candidates) ? candidates.length : 0,
        candidatePreview: (Array.isArray(candidates) ? candidates : [])
          .slice(0, 20)
          .map((c) => ({
            id: c.id || "",
            sourcingSessionId: c.sourcingSessionId || "",
            linkedin_profile_url: c.linkedin_profile_url || "",
            name: c.name || "",
            role: c.role || "",
            location: c.location || "",
            status: c.status || "",
          })),
        profilesFetchError: profilesFetchError ?? null,
      },
    },
    { upsert: true, new: true }
  );

  return doc?._id?.toString() ?? null;
}

async function fetchProfilesForSession({
  userId,
  sessionId,
  page,
  limit,
  sourcingMeta,
  sessionMeta,
  loggerHandler,
  waitBeforeFetchMs = 0,
}) {
  if (waitBeforeFetchMs > 0) {
    logApi(loggerHandler, "waiting after session create before profiles fetch", {
      sessionId: String(sessionId),
      waitMs: waitBeforeFetchMs,
    });
    await sleep(waitBeforeFetchMs);
  }

  const profilesRes = await getSourcingSessionProfilesWhenReady(String(sessionId), {
    page,
    limit,
    expectedProfileCount:
      typeof sourcingMeta?.total_display_count === "number"
        ? sourcingMeta.total_display_count
        : typeof sourcingMeta?.newProfilesCount === "number"
          ? sourcingMeta.newProfilesCount
          : null,
    profileMatchingStatus:
      typeof sourcingMeta?.profileMatchingStatus === "string"
        ? sourcingMeta.profileMatchingStatus
        : typeof sessionMeta?.profileMatchingStatus === "string"
          ? sessionMeta.profileMatchingStatus
          : null,
  });

  await persistCandidateDetails({
    userId,
    sourcingSessionId: String(sessionId),
    profilesRes,
    loggerHandler,
  });

  return mapProfilesResToLists(profilesRes);
}

/**
 * POST /api/candidates/search/annotate
 * Parse prompt via Future Jobs get-annotation → prefill filter drawer.
 * Body: prompt (string) or userText, optional linkedin_profile_url
 */
const annotateSearchPrompt = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const userText =
      typeof req.body?.userText === "string" && req.body.userText.trim()
        ? req.body.userText.trim()
        : typeof req.body?.prompt === "string"
          ? req.body.prompt.trim()
          : "";

    if (!userText) {
      return res.status(400).json({
        success: false,
        message: "prompt is required",
      });
    }

    const linkedin_profile_url =
      typeof req.body?.linkedin_profile_url === "string"
        ? req.body.linkedin_profile_url
        : "";

    logApi("candidates/search/annotate", "incoming", {
      userId,
      userTextLength: userText.length,
    });

    const futureJobs = await getSourcingSessionAnnotation({
      userText,
      linkedin_profile_url,
    });

    const annotationData =
      futureJobs?.data && typeof futureJobs.data === "object" ? futureJobs.data : {};
    const filterForm = filterFormFromAnnotation(annotationData);

    logApi("candidates/search/annotate", "success", {
      userId,
      fieldCount: Object.keys(annotationData).length,
    });

    return res.status(200).json({
      success: true,
      filterForm,
      annotation: annotationData,
      futureJobs,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/search/annotate", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to analyze search prompt",
      details: error.details,
    });
  }
};

/**
 * POST /api/candidates/search/create
 * Create sourcing session only (no profile fetch). Opens filter step on frontend.
 */
const createSearchSession = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    const sessionOverride = req.body?.session;
    const usingSessionOverride = Boolean(
      sessionOverride &&
        typeof sessionOverride === "object" &&
        !Array.isArray(sessionOverride)
    );
    const payload = usingSessionOverride
      ? sessionOverride
      : buildSourcingSessionPayloadFromPrompt(prompt);

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      try {
        await assertQuotaAvailableByUserId(userId, "candidateSearches");
      } catch (quotaErr) {
        if (respondIfQuotaExceeded(res, quotaErr)) return;
        throw quotaErr;
      }
    }

    logApi("candidates/search/create", "incoming", {
      userId,
      promptLength: prompt.length,
      payloadPreview: safeJsonPreview(payload),
    });

    const futureJobs = await createSourcingSession(payload);
    const sessionId = futureJobs?.data?.session?._id;

    if (sessionId == null || sessionId === "") {
      return res.status(502).json({
        success: false,
        message: "Search completed but no sourcing session was returned.",
        futureJobs,
      });
    }

    const sourcingMeta = futureJobs?.data?.sourcing;
    const sessionMeta = futureJobs?.data?.session;
    const filterForm = filterFormFromCreateResponse(futureJobs, payload);

    let savedSessionId = null;
    try {
      savedSessionId = await persistSourcingSessionRow({
        userId,
        sessionId: String(sessionId),
        prompt,
        payload,
        usingSessionOverride,
        futureJobs,
        profilesPagination: null,
        candidates: [],
        profilesFetchError: null,
      });
    } catch (persistErr) {
      logApi("candidates/search/create", "persist failed", {
        userId,
        message: persistErr?.message,
      });
    }

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      await incrementUserUsage(String(userId), "candidateSearches");
    }

    logApi("candidates/search/create", "success", {
      userId,
      sessionId: String(sessionId),
    });

    return res.status(200).json({
      success: true,
      prompt,
      sessionId: String(sessionId),
      filterForm,
      sessionPayload: sessionMeta ?? null,
      requestPayload: payload,
      futureJobs,
      savedSessionId: savedSessionId ?? undefined,
    });
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    const status = error.statusCode || 500;
    logApi("candidates/search/create", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to create search session",
      details: error.details,
    });
  }
};

/**
 * POST /api/candidates/search/apply
 * Create sourcing session from prompt + filter form, then fetch profiles.
 */
const applySearchFilters = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "prompt is required",
      });
    }

    const filterForm =
      req.body?.filterForm && typeof req.body.filterForm === "object"
        ? req.body.filterForm
        : null;
    if (!filterForm) {
      return res.status(400).json({
        success: false,
        message: "filterForm is required",
      });
    }

    const page = clampInt(req.body?.page, 1, 100, 1);
    const limit = clampInt(req.body?.limit, 1, 100, 20);

    try {
      await assertQuotaAvailableByUserId(userId, "candidateSearches");
    } catch (quotaErr) {
      if (respondIfQuotaExceeded(res, quotaErr)) return;
      throw quotaErr;
    }

    const payload = buildSessionPayloadFromPromptAndFilter(prompt, filterForm);

    logApi("candidates/search/apply", "incoming", {
      userId,
      promptLength: prompt.length,
      payloadPreview: safeJsonPreview(payload),
    });

    const futureJobs = await createSourcingSession(payload);
    const sessionId = futureJobs?.data?.session?._id;

    if (sessionId == null || sessionId === "") {
      return res.status(502).json({
        success: false,
        message: "Search completed but no sourcing session was returned.",
        futureJobs,
      });
    }

    const sourcingMeta = futureJobs?.data?.sourcing;
    const sessionMeta = futureJobs?.data?.session;
    const responseFilterForm = filterFormFromCreateResponse(futureJobs, payload);

    let profilesFetchError = null;
    let candidates = [];
    let profilesPagination = null;
    let futureJobsProfiles = null;

    try {
      const mapped = await fetchProfilesForSession({
        userId,
        sessionId: String(sessionId),
        page,
        limit,
        sourcingMeta:
          sourcingMeta && typeof sourcingMeta === "object" ? sourcingMeta : {},
        sessionMeta:
          sessionMeta && typeof sessionMeta === "object" ? sessionMeta : {},
        loggerHandler: "candidates/search/apply",
        waitBeforeFetchMs: POST_SESSION_CREATE_PROFILES_WAIT_MS,
      });
      profilesPagination = mapped.profilesPagination;
      candidates = mapped.candidates;
      futureJobsProfiles = mapped.futureJobsProfiles;
    } catch (err) {
      profilesFetchError =
        typeof err?.message === "string" ? err.message : "Profiles fetch failed";
      logApi("candidates/search/apply", "profiles failed", {
        userId,
        sessionId: String(sessionId),
        message: profilesFetchError,
      });
    }

    let savedSessionId = null;
    try {
      savedSessionId = await persistSourcingSessionRow({
        userId,
        sessionId: String(sessionId),
        prompt,
        payload,
        usingSessionOverride: false,
        futureJobs,
        profilesPagination,
        candidates,
        profilesFetchError,
      });
    } catch (persistErr) {
      logApi("candidates/search/apply", "persist failed", {
        message: persistErr?.message,
      });
    }

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      await incrementUserUsage(String(userId), "candidateSearches");
    }

    logApi("candidates/search/apply", "success", {
      userId,
      sessionId: String(sessionId),
      candidateCount: candidates.length,
    });

    return res.status(200).json({
      success: true,
      prompt,
      sessionId: String(sessionId),
      page,
      limit,
      filterForm: responseFilterForm,
      sessionPayload: sessionMeta ?? null,
      candidates,
      profilesPagination: profilesPagination ?? undefined,
      futureJobsProfiles: futureJobsProfiles ?? undefined,
      profilesFetchError: profilesFetchError ?? undefined,
      futureJobs,
      savedSessionId: savedSessionId ?? undefined,
    });
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    const status = error.statusCode || 500;
    logApi("candidates/search/apply", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to apply filters and load profiles",
      details: error.details,
    });
  }
};

/**
 * POST /api/candidates/search
 * Body:
 *   - prompt (string, optional): free-text → default sourcing payload
 *   - session (object, optional): full Future Jobs sourcing-session body (overrides prompt mapping)
 */
const searchCandidates = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    const sessionOverride = req.body?.session;
    const usingSessionOverride = Boolean(
      sessionOverride &&
        typeof sessionOverride === "object" &&
        !Array.isArray(sessionOverride)
    );
    const payload = usingSessionOverride
      ? sessionOverride
      : buildSourcingSessionPayloadFromPrompt(prompt);

    logApi("candidates/search", "incoming", {
      userId,
      promptLength: prompt.length,
      usingSessionOverride,
      payloadPreview: safeJsonPreview(payload),
    });

    const page = clampInt(req.body?.page, 1, 100, 1);
    const limit = clampInt(req.body?.limit, 1, 100, 20);

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      try {
        await assertQuotaAvailableByUserId(userId, "candidateSearches");
      } catch (quotaErr) {
        if (respondIfQuotaExceeded(res, quotaErr)) return;
        throw quotaErr;
      }
    }

    const futureJobs = await createSourcingSession(payload);

    const sessionId = futureJobs?.data?.session?._id;
    const candidates = [];
    let profilesPagination = null;
    let profilesFetchError = null;
    /** Full GET …/profiles JSON (statusCode, data.docs, etc.) for browser / clients */
    let futureJobsProfiles = null;

    logApi("candidates/search", "sourcing session created", {
      userId,
      futureJobsStatus: futureJobs?.status,
      sessionId: sessionId != null ? String(sessionId) : null,
      hasSession: Boolean(sessionId),
    });

    if (sessionId == null || sessionId === "") {
      logApi("candidates/search", "skip profiles — no session id in create response", {
        userId,
        dataKeys: futureJobs?.data ? Object.keys(futureJobs.data) : [],
      });
    } else {
      try {
        logApi("candidates/search", "fetching profiles", {
          userId,
          sessionId: String(sessionId),
          page,
          limit,
        });

        const sourcingMeta = futureJobs?.data?.sourcing;
        const profilesRes = await getSourcingSessionProfilesWhenReady(
          String(sessionId),
          {
            page,
            limit,
            expectedProfileCount:
              typeof sourcingMeta?.total_display_count === "number"
                ? sourcingMeta.total_display_count
                : typeof sourcingMeta?.newProfilesCount === "number"
                  ? sourcingMeta.newProfilesCount
                  : null,
            profileMatchingStatus:
              typeof sourcingMeta?.profileMatchingStatus === "string"
                ? sourcingMeta.profileMatchingStatus
                : typeof futureJobs?.data?.session?.profileMatchingStatus ===
                    "string"
                  ? futureJobs.data.session.profileMatchingStatus
                  : null,
          }
        );
        futureJobsProfiles = profilesRes;
        await persistCandidateDetails({
          userId,
          sourcingSessionId: String(sessionId),
          profilesRes,
          loggerHandler: "candidates/search",
        });

        const mapped = mapProfilesResToLists(profilesRes);
        profilesPagination = mapped.profilesPagination;
        candidates.push(...mapped.candidates);

        const docs = profilesRes?.data?.docs;
        const docCount = Array.isArray(docs) ? docs.length : 0;

        logApi("candidates/search", "profiles received", {
          userId,
          sessionId: String(sessionId),
          fjStatus: profilesRes?.status,
          fjMessage: profilesRes?.message,
          docCount,
          candidatesMapped: candidates.length,
          firstProfileName:
            docCount > 0 && docs[0]?.profile?.name
              ? String(docs[0].profile.name).slice(0, 80)
              : null,
        });
      } catch (err) {
        profilesFetchError =
          typeof err?.message === "string" ? err.message : "Profiles fetch failed";
        logApi("candidates/search", "profiles fetch failed", {
          userId,
          sessionId: String(sessionId),
          message: profilesFetchError,
          detailsPreview: err?.details
            ? safeJsonPreview(err.details, 400)
            : undefined,
        });
      }
    }

    logApi("candidates/search", "success", {
      userId,
      futureJobsStatus: futureJobs?.status,
      sessionId: futureJobs?.data?.session?._id,
      candidateCount: candidates.length,
      includesRawProfiles: Boolean(futureJobsProfiles),
    });

    let savedSessionId = null;
    if (
      sessionId != null &&
      String(sessionId).trim() !== "" &&
      userId &&
      mongoose.Types.ObjectId.isValid(userId)
    ) {
      try {
        const sessionTitle =
          typeof payload?.sessionTitle === "string"
            ? payload.sessionTitle.trim()
            : "";
        const doc = await SourcingSession.create({
          userId: new mongoose.Types.ObjectId(userId),
          futureJobsSessionId: String(sessionId),
          prompt,
          sessionTitle,
          usingSessionOverride,
          futureJobsStatus:
            typeof futureJobs?.status === "string" ? futureJobs.status : "",
          totalDocs:
            profilesPagination != null &&
            typeof profilesPagination.totalDocs === "number" &&
            profilesPagination.totalDocs > 0
              ? profilesPagination.totalDocs
              : typeof futureJobs?.data?.sourcing?.total_display_count ===
                  "number"
                ? futureJobs.data.sourcing.total_display_count
                : null,
          candidateCountFirstPage: candidates.length,
          candidatePreview: candidates.slice(0, 20).map((c) => ({
            id: c.id || "",
            sourcingSessionId: c.sourcingSessionId || "",
            linkedin_profile_url: c.linkedin_profile_url || "",
            name: c.name || "",
            role: c.role || "",
            location: c.location || "",
            status: c.status || "",
          })),
          profilesFetchError: profilesFetchError ?? null,
        });
        savedSessionId = doc._id.toString();
      } catch (persistErr) {
        logApi("candidates/search", "sourcing session persist failed", {
          userId,
          message: persistErr?.message,
        });
      }
    }

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      await incrementUserUsage(String(userId), "candidateSearches");
    }

    return res.status(200).json({
      success: true,
      prompt,
      page,
      limit,
      candidates,
      profilesPagination: profilesPagination ?? undefined,
      futureJobsProfiles: futureJobsProfiles ?? undefined,
      profilesFetchError: profilesFetchError ?? undefined,
      savedSessionId: savedSessionId ?? undefined,
      futureJobs,
    });
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    const status = error.statusCode || 500;
    logApi("candidates/search", "error", {
      userId,
      status,
      message: error.message,
      detailsPreview: error.details
        ? safeJsonPreview(error.details, 500)
        : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Candidate search failed",
      details: error.details,
    });
  }
};

/**
 * GET /api/candidates/session/:sessionId/profiles
 * Query: page, limit, fetchMore (optional; if true, POST …/fetch-more then GET profiles)
 */
const loadSessionProfiles = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const rawId = req.params.sessionId;
    const sessionId =
      rawId != null && String(rawId).trim() !== "" ? String(rawId).trim() : "";
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const owned = await SourcingSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      futureJobsSessionId: sessionId,
    })
      .select("_id totalDocs")
      .lean();

    if (!owned) {
      return res.status(403).json({
        success: false,
        message:
          "This sourcing session was not found for your account, or it was created before history was enabled.",
      });
    }

    const page = clampInt(req.query.page, 1, 100, 1);
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const fetchMore = parseQueryBool(req.query.fetchMore, false);

    logApi("candidates/session/profiles", "incoming", {
      userId,
      sessionId,
      page,
      limit,
      fetchMore,
    });

    let fetchMoreResult = null;
    let fetchMoreError = null;

    if (fetchMore) {
      try {
        fetchMoreResult = await fetchMoreSourcingSession(sessionId, {});
        logApi("candidates/session/profiles", "fetch-more ok", {
          userId,
          sessionId,
          fjStatus: fetchMoreResult?.status,
        });
      } catch (err) {
        fetchMoreError =
          typeof err?.message === "string" ? err.message : "fetch-more failed";
        logApi("candidates/session/profiles", "fetch-more failed", {
          userId,
          sessionId,
          message: fetchMoreError,
          detailsPreview: err?.details
            ? safeJsonPreview(err.details, 400)
            : undefined,
        });
      }
    }

    let profilesRes = await getSourcingSessionProfiles(sessionId, { page, limit });
    const initialDocCount = Array.isArray(profilesRes?.data?.docs)
      ? profilesRes.data.docs.length
      : 0;
    const initialTotalDocs =
      typeof profilesRes?.data?.totalDocs === "number"
        ? profilesRes.data.totalDocs
        : 0;

    if (
      page === 1 &&
      !fetchMore &&
      initialDocCount === 0 &&
      initialTotalDocs === 0
    ) {
      const expectedFromSession =
        typeof owned?.totalDocs === "number" && owned.totalDocs > 0
          ? owned.totalDocs
          : 1;
      profilesRes = await getSourcingSessionProfilesWhenReady(sessionId, {
        page,
        limit,
        expectedProfileCount: expectedFromSession,
        profileMatchingStatus: "processing",
      });
    }
    await persistCandidateDetails({
      userId,
      sourcingSessionId: sessionId,
      profilesRes,
      loggerHandler: "candidates/session/profiles",
    });
    const { candidates, profilesPagination, futureJobsProfiles } =
      mapProfilesResToLists(profilesRes);

    const docs = profilesRes?.data?.docs;
    const docCount = Array.isArray(docs) ? docs.length : 0;

    logApi("candidates/session/profiles", "success", {
      userId,
      sessionId,
      docCount,
      candidatesMapped: candidates.length,
      fetchMoreRan: fetchMore,
      fetchMoreError: fetchMoreError || undefined,
    });

    return res.status(200).json({
      success: true,
      sessionId,
      page,
      limit,
      fetchMoreRequested: fetchMore,
      fetchMoreResult: fetchMoreResult ?? undefined,
      fetchMoreError: fetchMoreError ?? undefined,
      candidates,
      profilesPagination: profilesPagination ?? undefined,
      futureJobsProfiles,
      profilesFetchError: fetchMoreError
        ? `fetch-more: ${fetchMoreError}`
        : undefined,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/session/profiles", "error", {
      userId,
      status,
      message: error.message,
      detailsPreview: error.details
        ? safeJsonPreview(error.details, 500)
        : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load session profiles",
      details: error.details,
    });
  }
};

/**
 * GET /api/candidates/session/:sessionId/stored-candidates
 * Returns previously persisted full candidate docs from our DB (no external API call).
 */
const loadStoredSessionCandidates = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const rawId = req.params.sessionId;
    const sessionId =
      rawId != null && String(rawId).trim() !== "" ? String(rawId).trim() : "";
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const owned = await SourcingSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      futureJobsSessionId: sessionId,
    })
      .select("_id")
      .lean();

    if (!owned) {
      return res.status(403).json({
        success: false,
        message:
          "This sourcing session was not found for your account, or it was created before history was enabled.",
      });
    }

    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const skip = (page - 1) * limit;

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
      sourcingSessionId: sessionId,
    };

    const [totalDocs, rows] = await Promise.all([
      SourcedCandidateDetail.countDocuments(filter),
      SourcedCandidateDetail.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const detailedDocs = rows
      .map((r) => r?.rawDoc)
      .filter((d) => d && typeof d === "object");
    const candidates = detailedDocs
      .map((doc) => mapFjDocToCandidate(doc))
      .filter(Boolean);

    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
    const profilesPagination = {
      totalDocs,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };

    logApi("candidates/session/stored", "success", {
      userId,
      sessionId,
      page,
      limit,
      totalDocs,
      returned: detailedDocs.length,
    });

    return res.status(200).json({
      success: true,
      sessionId,
      page,
      limit,
      detailedDocs,
      candidates,
      profilesPagination,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/session/stored", "error", {
      userId,
      status,
      message: error.message,
      detailsPreview: error.details
        ? safeJsonPreview(error.details, 500)
        : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load stored session candidates",
      details: error.details,
    });
  }
};

/**
 * GET /api/candidates/all
 * All persisted sourced candidates for the authenticated user (all searches), paginated.
 * Query: page (default 1), limit (1–100, default 20), sessionId (optional), q (optional search)
 */
const listAllSourcedCandidates = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const skip = (page - 1) * limit;

    const sessionFilter =
      req.query.sessionId != null && String(req.query.sessionId).trim() !== ""
        ? String(req.query.sessionId).trim()
        : "";
    const searchQ =
      req.query.q != null
        ? String(req.query.q).trim()
        : req.query.search != null
          ? String(req.query.search).trim()
          : "";

    const baseFilter = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (sessionFilter) {
      baseFilter.sourcingSessionId = sessionFilter;
    }

    const searchFilter = buildSourcedCandidateSearchFilter(searchQ);
    const filter = searchFilter ? { ...baseFilter, ...searchFilter } : baseFilter;

    const [totalDocs, totalInScope, rows] = await Promise.all([
      SourcedCandidateDetail.countDocuments(filter),
      SourcedCandidateDetail.countDocuments(baseFilter),
      SourcedCandidateDetail.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const detailedDocs = rows
      .map((r) => r?.rawDoc)
      .filter((d) => d && typeof d === "object");
    const candidates = rows
      .map((row) => {
        const mapped = mapFjDocToCandidate(row?.rawDoc);
        if (!mapped) return null;
        if (!mapped.sourcingSessionId && row.sourcingSessionId) {
          mapped.sourcingSessionId = String(row.sourcingSessionId);
        }
        if (
          mapped.finalScore == null &&
          typeof row.finalScore === "number" &&
          !Number.isNaN(row.finalScore)
        ) {
          mapped.finalScore = row.finalScore;
        }
        return mapped;
      })
      .filter(Boolean);

    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
    const profilesPagination = {
      totalDocs,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };

    logApi("candidates/all", "success", {
      userId,
      page,
      limit,
      totalDocs,
      totalInScope,
      returned: candidates.length,
      sessionFilter: sessionFilter || undefined,
      searchQ: searchQ || undefined,
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      search: searchQ,
      totalInScope,
      candidates,
      detailedDocs,
      profilesPagination,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/all", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load candidates",
    });
  }
};

/**
 * GET /api/candidates/admin/all
 * Admin: all persisted sourced candidates (optionally filtered by user / session).
 */
const listAllSourcedCandidatesAdmin = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const skip = (page - 1) * limit;

    const sessionFilter =
      req.query.sessionId != null && String(req.query.sessionId).trim() !== ""
        ? String(req.query.sessionId).trim()
        : "";
    const userFilter =
      req.query.userId != null && String(req.query.userId).trim() !== ""
        ? String(req.query.userId).trim()
        : "";
    const searchQ =
      req.query.q != null
        ? String(req.query.q).trim()
        : req.query.search != null
          ? String(req.query.search).trim()
          : "";

    const baseFilter = {};
    if (userFilter) {
      if (!mongoose.Types.ObjectId.isValid(userFilter)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
        });
      }
      baseFilter.userId = new mongoose.Types.ObjectId(userFilter);
    }
    if (sessionFilter) {
      baseFilter.sourcingSessionId = sessionFilter;
    }

    const searchFilter = buildSourcedCandidateSearchFilter(searchQ);
    const filter = searchFilter ? { ...baseFilter, ...searchFilter } : baseFilter;

    const [totalDocs, totalInScope, rows] = await Promise.all([
      SourcedCandidateDetail.countDocuments(filter),
      SourcedCandidateDetail.countDocuments(baseFilter),
      SourcedCandidateDetail.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName email")
        .lean(),
    ]);

    const detailedDocs = rows
      .map((r) => r?.rawDoc)
      .filter((d) => d && typeof d === "object");
    const candidates = rows
      .map((row) => {
        const mapped = mapFjDocToCandidate(row?.rawDoc);
        if (!mapped) return null;
        if (!mapped.sourcingSessionId && row.sourcingSessionId) {
          mapped.sourcingSessionId = String(row.sourcingSessionId);
        }
        if (
          mapped.finalScore == null &&
          typeof row.finalScore === "number" &&
          !Number.isNaN(row.finalScore)
        ) {
          mapped.finalScore = row.finalScore;
        }
        const owner = row.userId;
        if (owner && typeof owner === "object") {
          const fullName =
            typeof owner.fullName === "string" ? owner.fullName.trim() : "";
          const email = typeof owner.email === "string" ? owner.email.trim() : "";
          mapped.ownerLabel =
            fullName && email ? `${fullName} · ${email}` : fullName || email || "";
          mapped.ownerUserId =
            owner._id != null ? String(owner._id) : String(row.userId || "");
        }
        return mapped;
      })
      .filter(Boolean);

    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
    const profilesPagination = {
      totalDocs,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };

    logApi("candidates/admin/all", "success", {
      page,
      limit,
      totalDocs,
      totalInScope,
      returned: candidates.length,
      sessionFilter: sessionFilter || undefined,
      userFilter: userFilter || undefined,
      searchQ: searchQ || undefined,
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      search: searchQ,
      totalInScope,
      candidates,
      detailedDocs,
      profilesPagination,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/admin/all", "error", {
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load candidates",
    });
  }
};

/**
 * GET /api/candidates/admin/sessions
 * Admin: sourcing sessions for pool filters (optional userId).
 */
const listSourcingSessionsAdmin = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 1, 200, 50);
    const userFilter =
      req.query.userId != null && String(req.query.userId).trim() !== ""
        ? String(req.query.userId).trim()
        : "";

    const filter = {};
    if (userFilter) {
      if (!mongoose.Types.ObjectId.isValid(userFilter)) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
        });
      }
      filter.userId = new mongoose.Types.ObjectId(userFilter);
    }

    const docs = await SourcingSession.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "fullName email")
      .lean();

    logApi("candidates/admin/sessions", "list", {
      count: docs.length,
      limit,
      userFilter: userFilter || undefined,
    });

    return res.status(200).json({
      success: true,
      sessions: docs.map((d) => {
        const owner = d.userId;
        const ownerName =
          owner && typeof owner === "object" && typeof owner.fullName === "string"
            ? owner.fullName.trim()
            : "";
        const promptLabel =
          (typeof d.prompt === "string" && d.prompt.trim()) ||
          (typeof d.sessionTitle === "string" && d.sessionTitle.trim()) ||
          "Untitled search";
        return {
          id: d.futureJobsSessionId,
          futureJobsSessionId: d.futureJobsSessionId,
          userId: owner?._id != null ? String(owner._id) : String(d.userId || ""),
          ownerName,
          prompt: d.prompt,
          sessionTitle: d.sessionTitle,
          label: ownerName ? `${ownerName}: ${promptLabel}` : promptLabel,
          createdAt: d.createdAt,
        };
      }),
    });
  } catch (error) {
    logApi("candidates/admin/sessions", "error", {
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list sessions",
    });
  }
};

/**
 * GET /api/candidates/sessions
 * Query: limit (1–100, default 30)
 */
const listSourcingSessions = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const limit = clampInt(req.query.limit, 1, 100, 30);

    const docs = await SourcingSession.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    logApi("candidates/sessions", "list", {
      userId,
      count: docs.length,
      limit,
    });

    return res.status(200).json({
      success: true,
      sessions: docs.map((d) => ({
        id: d._id.toString(),
        futureJobsSessionId: d.futureJobsSessionId,
        prompt: d.prompt,
        sessionTitle: d.sessionTitle,
        usingSessionOverride: d.usingSessionOverride,
        futureJobsStatus: d.futureJobsStatus,
        totalDocs: d.totalDocs,
        candidateCountFirstPage: d.candidateCountFirstPage,
        candidatePreview: Array.isArray(d.candidatePreview)
          ? d.candidatePreview.map((c) => ({
              id: c?.id || "",
              sourcingSessionId: c?.sourcingSessionId || "",
              linkedin_profile_url: c?.linkedin_profile_url || "",
              name: c?.name || "",
              role: c?.role || "",
              location: c?.location || "",
              status: c?.status || "",
            }))
          : [],
        profilesFetchError: d.profilesFetchError,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    logApi("candidates/sessions", "error", {
      userId,
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list sessions",
    });
  }
};

/**
 * GET /api/candidates/recent-searches
 * Query: limit (1–20, default 5)
 */
const listRecentSearches = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const limit = clampInt(req.query.limit, 1, 20, 5);
    const docs = await SourcingSession.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const searches = docs
      .map((d) => ({
        id: d._id.toString(),
        futureJobsSessionId:
          typeof d.futureJobsSessionId === "string" ? d.futureJobsSessionId.trim() : "",
        text:
          typeof d.prompt === "string" && d.prompt.trim()
            ? d.prompt.trim()
            : typeof d.sessionTitle === "string" && d.sessionTitle.trim()
              ? d.sessionTitle.trim()
              : "",
        totalDocs: typeof d.totalDocs === "number" ? d.totalDocs : null,
        createdAt: d.createdAt,
      }))
      .filter((x) => x.text !== "");

    logApi("candidates/recent-searches", "list", {
      userId,
      requestedLimit: limit,
      returned: searches.length,
    });

    return res.status(200).json({
      success: true,
      searches,
    });
  } catch (error) {
    logApi("candidates/recent-searches", "error", {
      userId,
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list recent searches",
    });
  }
};

/**
 * POST /api/candidates/reveal-contact
 * Body: { sourcingSessionId, linkedin_profile_url, revealType: "PHONE" | "EMAIL" }
 */
const revealCandidateContact = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sourcingSessionId = String(req.body?.sourcingSessionId || "").trim();
    const linkedinProfileUrl = String(req.body?.linkedin_profile_url || "").trim();
    const revealType = String(req.body?.revealType || "")
      .trim()
      .toUpperCase();

    if (
      !sourcingSessionId ||
      !linkedinProfileUrl ||
      (revealType !== "PHONE" && revealType !== "EMAIL")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "sourcingSessionId, linkedin_profile_url and revealType (PHONE|EMAIL) are required",
      });
    }

    // Ensure session belongs to requesting user.
    const owned = await SourcingSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      futureJobsSessionId: sourcingSessionId,
    })
      .select("_id")
      .lean();
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: "This sourcing session is not available for your account",
      });
    }

    logApi("candidates/reveal-contact", "incoming", {
      userId,
      sourcingSessionId,
      revealType,
    });

    const quotaKey = revealType === "EMAIL" ? "emailUnveils" : "mobileUnveils";

    const result = await resolveContactReveal({
      userId,
      linkedinProfileUrl,
      revealType,
      product: "sourcing",
      unlockMeta: { sourcingSessionId },
      assertQuota: () => assertQuotaAvailableByUserId(userId, quotaKey),
      incrementUsage: () => bumpSourcingRevealUsage(userId, revealType),
      fetchFromFutureJobs: () =>
        revealSourcingSessionContact(
          sourcingSessionId,
          linkedinProfileUrl,
          revealType
        ),
    });

    if (!result.success) {
      logApi("candidates/reveal-contact", "not found", {
        userId,
        sourcingSessionId,
        revealType,
        charged: result.charged,
      });
      return res.status(404).json(result);
    }

    logApi("candidates/reveal-contact", "success", {
      userId,
      sourcingSessionId,
      revealType,
      source: result.source,
      charged: result.charged,
      count: result.values.length,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    const status = error.statusCode || 500;
    logApi("candidates/reveal-contact", "error", {
      userId,
      status,
      message: error.message,
      detailsPreview: error.details
        ? safeJsonPreview(error.details, 500)
        : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to reveal contact",
      details: error.details,
    });
  }
};

/**
 * GET /api/candidates/save-lists
 */
const listSaveLists = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const uid = new mongoose.Types.ObjectId(userId);
    const rows = await SavedCandidateList.find({ userId: uid })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      lists: rows.map((r) => ({
        id: r._id.toString(),
        name: r.name || "",
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load save lists",
    });
  }
};

/**
 * POST /api/candidates/save-lists
 * Body: { name: string }
 */
const createSaveList = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "List name is required",
      });
    }

    const doc = await SavedCandidateList.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: name.slice(0, 120),
    });

    return res.status(200).json({
      success: true,
      list: {
        id: doc._id.toString(),
        name: doc.name || "",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create save list",
    });
  }
};

/**
 * DELETE /api/candidates/save-lists/:listId
 * Removes list and moves saved candidates in that list to General (saveListId null).
 */
const deleteSaveList = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const listId = String(req.params?.listId || "").trim();
    if (!listId || !mongoose.Types.ObjectId.isValid(listId)) {
      return res.status(400).json({
        success: false,
        message: "Valid list id is required",
      });
    }

    const uid = new mongoose.Types.ObjectId(userId);
    const lid = new mongoose.Types.ObjectId(listId);
    const list = await SavedCandidateList.findOne({ _id: lid, userId: uid }).lean();
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "Save list not found",
      });
    }

    await SavedCandidate.updateMany({ userId: uid, saveListId: lid }, { $set: { saveListId: null } });
    await SavedCandidateList.deleteOne({ _id: lid, userId: uid });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete save list",
    });
  }
};

function mapSavedCandidateRow(r) {
  return {
    id: r._id.toString(),
    candidateId: r.candidateId || "",
    sourcingSessionId: r.sourcingSessionId || "",
    linkedin_profile_url: r.linkedinProfileUrl || "",
    name: r.name || "",
    role: r.role || "",
    currentCompany: r.currentCompany || "",
    location: r.location || "",
    experience: r.experience || "",
    finalScore: typeof r.finalScore === "number" ? r.finalScore : null,
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    recommendation: r.recommendation || "",
    rawDoc: r.rawDoc || null,
    status: r.status || "Saved",
    savedAt: r.updatedAt || r.createdAt,
    saveListId: r.saveListId ? r.saveListId.toString() : "",
  };
}

function buildSavedListMongoFilter(userId, listFilter) {
  const uid = new mongoose.Types.ObjectId(userId);
  const filter = { userId: uid };
  const lf = String(listFilter || "__all__").trim();
  if (lf === "__general__") {
    filter.$or = [{ saveListId: null }, { saveListId: { $exists: false } }];
  } else if (lf !== "__all__" && mongoose.Types.ObjectId.isValid(lf)) {
    filter.saveListId = new mongoose.Types.ObjectId(lf);
  }
  return filter;
}

/**
 * GET /api/candidates/saved
 * Query: page (default 1), limit (1–100, default 20), listFilter (__all__ | __general__ | list ObjectId)
 * Query: keysOnly (optional) — returns minimal rows for bookmark state (no pagination)
 */
const listSavedCandidates = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const uid = new mongoose.Types.ObjectId(userId);

    if (parseQueryBool(req.query.keysOnly, false)) {
      const rows = await SavedCandidate.find({ userId: uid })
        .select("candidateId sourcingSessionId linkedinProfileUrl name")
        .lean();

      return res.status(200).json({
        success: true,
        keyRows: rows.map((r) => ({
          candidateId: r.candidateId || "",
          sourcingSessionId: r.sourcingSessionId || "",
          linkedin_profile_url: r.linkedinProfileUrl || "",
          name: r.name || "",
        })),
      });
    }

    const listFilter = String(
      req.query.listFilter ?? req.query.list ?? "__all__"
    ).trim();
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const skip = (page - 1) * limit;
    const filter = buildSavedListMongoFilter(userId, listFilter);

    const [totalSavedCount, totalDocs, rows] = await Promise.all([
      SavedCandidate.countDocuments({ userId: uid }),
      SavedCandidate.countDocuments(filter),
      SavedCandidate.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

    return res.status(200).json({
      success: true,
      candidates: rows.map(mapSavedCandidateRow),
      totalSavedCount,
      listFilter,
      pagination: {
        totalDocs,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load saved candidates",
    });
  }
};

/**
 * POST /api/candidates/saved
 * Body: { candidateId?, sourcingSessionId?, linkedin_profile_url?, name?, role?, location?, experience?, status? }
 */
const saveCandidate = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const candidateId = String(req.body?.candidateId || "").trim();
    const sourcingSessionId = String(req.body?.sourcingSessionId || "").trim();
    const linkedinProfileUrl = String(req.body?.linkedin_profile_url || "").trim();
    const name = String(req.body?.name || "").trim();
    const role = String(req.body?.role || "").trim();
    const currentCompany = String(req.body?.currentCompany || "").trim();
    const location = String(req.body?.location || "").trim();
    const experience = String(req.body?.experience || "").trim();
    const finalScore =
      typeof req.body?.finalScore === "number" ? req.body.finalScore : null;
    const highlights = Array.isArray(req.body?.highlights)
      ? req.body.highlights
          .map((x) => String(x || "").trim())
          .filter((x) => x !== "")
          .slice(0, 20)
      : [];
    const recommendation = String(req.body?.recommendation || "").trim();
    const rawDoc =
      req.body?.rawDoc && typeof req.body?.rawDoc === "object" ? req.body.rawDoc : null;
    const status = String(req.body?.status || "Saved").trim();

    const saveListIdRaw = String(req.body?.saveListId ?? "").trim();
    let saveListIdToSet = null;
    if (saveListIdRaw && mongoose.Types.ObjectId.isValid(saveListIdRaw)) {
      const listOk = await SavedCandidateList.findOne({
        _id: new mongoose.Types.ObjectId(saveListIdRaw),
        userId: new mongoose.Types.ObjectId(userId),
      })
        .select("_id")
        .lean();
      if (listOk) {
        saveListIdToSet = listOk._id;
      }
    }

    if (!candidateId && !linkedinProfileUrl) {
      return res.status(400).json({
        success: false,
        message: "candidateId or linkedin_profile_url is required",
      });
    }

    try {
      await assertQuotaAvailableByUserId(userId, "candidateUnveils");
    } catch (quotaErr) {
      if (respondIfQuotaExceeded(res, quotaErr)) return;
      throw quotaErr;
    }

    const baseFilter = {
      userId: new mongoose.Types.ObjectId(userId),
      sourcingSessionId,
    };
    const filter = candidateId
      ? { ...baseFilter, candidateId }
      : { ...baseFilter, linkedinProfileUrl };

    const doc = await SavedCandidate.findOneAndUpdate(
      filter,
      {
        $set: {
          userId: new mongoose.Types.ObjectId(userId),
          sourcingSessionId,
          candidateId,
          linkedinProfileUrl,
          name,
          role,
          currentCompany,
          location,
          experience,
          finalScore,
          highlights,
          recommendation,
          rawDoc,
          status: status || "Saved",
          saveListId: saveListIdToSet,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      await incrementUserUsage(String(userId), "candidateUnveils");
    }

    return res.status(200).json({
      success: true,
      candidate: {
        id: doc._id.toString(),
        candidateId: doc.candidateId || "",
        sourcingSessionId: doc.sourcingSessionId || "",
        linkedin_profile_url: doc.linkedinProfileUrl || "",
        name: doc.name || "",
        role: doc.role || "",
        currentCompany: doc.currentCompany || "",
        location: doc.location || "",
        experience: doc.experience || "",
        finalScore: typeof doc.finalScore === "number" ? doc.finalScore : null,
        highlights: Array.isArray(doc.highlights) ? doc.highlights : [],
        recommendation: doc.recommendation || "",
        rawDoc: doc.rawDoc || null,
        status: doc.status || "Saved",
        saveListId: doc.saveListId ? doc.saveListId.toString() : "",
      },
    });
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save candidate",
    });
  }
};

/**
 * DELETE /api/candidates/saved
 * Body: { candidateId?, sourcingSessionId?, linkedin_profile_url? }
 */
const unsaveCandidate = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const candidateId = String(req.body?.candidateId || "").trim();
    const sourcingSessionId = String(req.body?.sourcingSessionId || "").trim();
    const linkedinProfileUrl = String(req.body?.linkedin_profile_url || "").trim();

    if (!candidateId && !linkedinProfileUrl) {
      return res.status(400).json({
        success: false,
        message: "candidateId or linkedin_profile_url is required",
      });
    }

    const baseFilter = {
      userId: new mongoose.Types.ObjectId(userId),
      sourcingSessionId,
    };
    const filter = candidateId
      ? { ...baseFilter, candidateId }
      : { ...baseFilter, linkedinProfileUrl };

    const result = await SavedCandidate.deleteOne(filter);

    return res.status(200).json({
      success: true,
      removed: result.deletedCount > 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to unsave candidate",
    });
  }
};

module.exports = {
  searchCandidates,
  annotateSearchPrompt,
  createSearchSession,
  applySearchFilters,
  loadSessionProfiles,
  loadStoredSessionCandidates,
  listAllSourcedCandidates,
  listAllSourcedCandidatesAdmin,
  listSourcingSessionsAdmin,
  listSourcingSessions,
  listRecentSearches,
  revealCandidateContact,
  listSaveLists,
  createSaveList,
  deleteSaveList,
  listSavedCandidates,
  saveCandidate,
  unsaveCandidate,
};
