const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  createSourcingSession,
  updateSourcingSession,
  isFjSessionPending,
  fjSessionPendingMessage,
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
  getSourcingSessionCandidateDetails,
  getFilterAutocomplete,
  filterFormFromAnnotation,
  normalizeFilterFormForUi,
  enrichFilterFormSkillsFromPrompt,
  mapFjDocToCandidate,
} = require("../services/futureJobs");
const SourcingSession = require("../models/SourcingSession");
const SourcedCandidateDetail = require("../models/SourcedCandidateDetail");
const SavedCandidate = require("../models/SavedCandidate");
const SavedCandidateList = require("../models/SavedCandidateList");
const { logApi, safeJsonPreview } = require("../utils/logger");
const { incrementUserUsage } = require("../utils/incrementUserUsage");
const { assertQuotaAvailableByUserId } = require("../services/planQuotas");
const { emitCandidateSearchPoll } = require("../realtime/notify");
const { respondIfQuotaExceeded } = require("../utils/quotaHttp");
const {
  resolveContactReveal,
  lookupUserRevealedContacts,
} = require("../services/contactRevealService");
const { normalizeLinkedinProfileUrl } = require("../utils/contactReveal");
const {
  userIdFilterForActor,
  findSessionInScope,
  forbidden,
} = require("../utils/orgScope");

/** Wait after POST /wl/sourcing-session before GET …/profiles (Search Candidates apply). */
const POST_SESSION_CREATE_PROFILES_WAIT_MS = 20_000;
/** Widen location stepwise when FJ returns no matches / empty polls. */
const REGION_EXPAND_GEO_STEPS = ["60_km", "120_km"];

function normalizeGeoDistanceToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Next geo step to try, or null when 60→120 chain is exhausted. */
function nextRegionExpandGeoDistance(form) {
  const geo = normalizeGeoDistanceToken(form?.geoDistance);
  const hasOther = Boolean(form?.searchOtherRegions);
  const last = REGION_EXPAND_GEO_STEPS[REGION_EXPAND_GEO_STEPS.length - 1];
  if (hasOther && geo === last) return null;
  const idx = REGION_EXPAND_GEO_STEPS.indexOf(geo);
  if (hasOther && idx >= 0 && idx + 1 < REGION_EXPAND_GEO_STEPS.length) {
    return REGION_EXPAND_GEO_STEPS[idx + 1];
  }
  return REGION_EXPAND_GEO_STEPS[0];
}

function expandFilterFormForRegionGeo(form, geoDistance) {
  const base =
    form && typeof form === "object" && !Array.isArray(form) ? { ...form } : {};
  return {
    ...base,
    searchOtherRegions: true,
    geoDistance,
  };
}

const costlyFutureJobsActions = new Map();

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function requestHash(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

async function runCostlyFutureJobsAction(key, fn) {
  if (costlyFutureJobsActions.has(key)) {
    const err = new Error("This Future Jobs request is already in progress. Please wait.");
    err.statusCode = 409;
    err.code = "FUTURE_JOBS_REQUEST_IN_PROGRESS";
    throw err;
  }

  const promise = Promise.resolve().then(fn);
  costlyFutureJobsActions.set(key, promise);
  try {
    return await promise;
  } finally {
    costlyFutureJobsActions.delete(key);
  }
}

function sessionIdFromFjCreateResponse(futureJobs, fallbackId = "") {
  const fallback = typeof fallbackId === "string" ? fallbackId.trim() : "";
  if (fallback) return fallback;
  const id = futureJobs?.data?.session?._id;
  return id != null && String(id).trim() !== "" ? String(id).trim() : "";
}

/** Page size / hard cap when loading profiles from Future Jobs (initial search). */
const PROFILE_FETCH_PAGE_LIMIT = 200;
/** Initial search loads a single page only (max 200 candidates), same as earlier behavior. */
const PROFILE_FETCH_MAX_PAGES = 1;
const STORED_CANDIDATES_ALL_LIMIT = 500;

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

/** Parse YYYY-MM-DD (date input) or ISO datetime for admin session filters. */
function parseAdminDateFilter(value, bound) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    if (bound === "start") {
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** User-submitted drawer form wins; FJ round-trip may drop RANGE fields (e.g. years of experience). */
function mergePersistedFilterForm(userForm, responseForm) {
  const userNorm = normalizeFilterFormForUi(userForm);
  const responseNorm = normalizeFilterFormForUi(responseForm);
  if (!userNorm) return responseNorm;
  if (!responseNorm) return userNorm;

  const merged = { ...responseNorm, ...userNorm };

  for (const key of [
    "yearsExpMin",
    "yearsExpMax",
    "headcountGrowthMin",
    "headcountGrowthMax",
    "companyHeadcountMin",
    "companyHeadcountMax",
    "yearFoundedMin",
    "yearFoundedMax",
    "keywordSkills",
    "currentTitle",
    "seniorityLevel",
    "location",
    "functionCategory",
    "industry",
  ]) {
    const userVal =
      typeof userNorm[key] === "string" ? userNorm[key].trim() : userNorm[key];
    const responseVal =
      typeof merged[key] === "string" ? String(merged[key]).trim() : merged[key];
    if (userVal !== "" && userVal != null) {
      merged[key] = userNorm[key];
    } else if (responseVal !== "" && responseVal != null) {
      merged[key] = merged[key];
    }
  }

  if (Array.isArray(userNorm.selectRegion) && userNorm.selectRegion.length > 0) {
    merged.selectRegion = userNorm.selectRegion;
  }
  if (Array.isArray(userNorm.school) && userNorm.school.length > 0) {
    merged.school = userNorm.school;
  }
  if (Array.isArray(userNorm.fieldOfStudy) && userNorm.fieldOfStudy.length > 0) {
    merged.fieldOfStudy = userNorm.fieldOfStudy;
  }
  if (Array.isArray(userNorm.degree) && userNorm.degree.length > 0) {
    merged.degree = userNorm.degree;
  }
  if (Array.isArray(userNorm.certifications) && userNorm.certifications.length > 0) {
    merged.certifications = userNorm.certifications;
  }
  if (Array.isArray(userNorm.currentCompany) && userNorm.currentCompany.length > 0) {
    merged.currentCompany = userNorm.currentCompany;
  }
  if (Array.isArray(userNorm.pastCompany) && userNorm.pastCompany.length > 0) {
    merged.pastCompany = userNorm.pastCompany;
  }
  if (Array.isArray(userNorm.pastTitle) && userNorm.pastTitle.length > 0) {
    merged.pastTitle = userNorm.pastTitle;
  }
  for (const key of [
    "companyFocus",
    "yearsAtCompany",
    "fundingStage",
    "totalFundingRaised",
    "recentlyFunded",
    "languages",
  ]) {
    if (Array.isArray(userNorm[key]) && userNorm[key].length > 0) {
      merged[key] = userNorm[key];
    }
  }
  if (userNorm.targetCompanyScope) {
    merged.targetCompanyScope = userNorm.targetCompanyScope;
  }
  merged.openToWork = userNorm.openToWork;
  merged.searchOtherRegions = userNorm.searchOtherRegions;
  if (String(userNorm.geoDistance || "").trim()) {
    merged.geoDistance = userNorm.geoDistance;
  }

  return normalizeFilterFormForUi(merged);
}

function filterFormForApi(form) {
  const normalized = normalizeFilterFormForUi(form);
  return normalized || undefined;
}

function ownerDisplayFromPopulatedUser(userIdField) {
  if (!userIdField || typeof userIdField !== "object") {
    return {
      userId: userIdField != null ? String(userIdField) : "",
      searchedByName: "",
      searchedByEmail: "",
    };
  }
  return {
    userId: userIdField._id != null ? String(userIdField._id) : "",
    searchedByName:
      typeof userIdField.fullName === "string" ? userIdField.fullName.trim() : "",
    searchedByEmail:
      typeof userIdField.email === "string" ? userIdField.email.trim() : "",
  };
}

function serializeSourcingSessionListItem(d, storedCountBySession = {}) {
  const sid =
    typeof d.futureJobsSessionId === "string" ? d.futureJobsSessionId.trim() : "";
  const storedCount = sid ? storedCountBySession[sid] : undefined;
  const totalDocs =
    typeof storedCount === "number"
      ? storedCount
      : typeof d.totalDocs === "number"
        ? d.totalDocs
        : null;
  const owner = ownerDisplayFromPopulatedUser(d.userId);
  const promptLabel =
    (typeof d.prompt === "string" && d.prompt.trim()) ||
    (typeof d.sessionTitle === "string" && d.sessionTitle.trim()) ||
    "Untitled search";

  return {
    id: d._id.toString(),
    futureJobsSessionId: d.futureJobsSessionId,
    userId: owner.userId,
    searchedByName: owner.searchedByName,
    searchedByEmail: owner.searchedByEmail,
    prompt: d.prompt,
    sessionTitle: d.sessionTitle,
    usingSessionOverride: d.usingSessionOverride,
    futureJobsStatus: d.futureJobsStatus,
    totalDocs,
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
    filterForm: filterFormForApi(d.filterForm) ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    label: owner.searchedByName
      ? `${owner.searchedByName}: ${promptLabel}`
      : promptLabel,
  };
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

function canFetchMoreFromFjSourcing(sourcing) {
  if (!sourcing || typeof sourcing !== "object") return true;
  const newCount = sourcing.newProfilesCount;
  if (typeof newCount === "number" && newCount <= 0) return false;
  return true;
}

function buildProfilesResWithDocs(baseRes, allDocs) {
  const d = baseRes?.data && typeof baseRes.data === "object" ? baseRes.data : {};
  const count = allDocs.length;
  return {
    ...baseRes,
    data: {
      ...d,
      docs: allDocs,
      totalDocs: count,
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

/**
 * Load session profiles from Future Jobs (first page only — max 200).
 * @param {string} sessionId
 * @param {object} [pollOptions]
 * @param {{ userId?: string, onPoll?: Function }} [emitOpts]
 */
async function fetchAllSessionProfilesFromFj(
  sessionId,
  pollOptions = {},
  emitOpts = {}
) {
  const allDocs = [];
  const seen = new Set();
  let lastRes = null;
  let page = 1;
  const userId = emitOpts.userId ? String(emitOpts.userId) : "";
  const externalOnPoll =
    typeof emitOpts.onPoll === "function" ? emitOpts.onPoll : null;
  let lastEmittedCount = -1;

  const pushPoll = (partial) => {
    const docs = Array.isArray(partial.docs) ? partial.docs : allDocs;
    const cappedDocs = docs.slice(0, PROFILE_FETCH_PAGE_LIMIT);
    const isDone = Boolean(partial.done);
    // Skip duplicate socket frames (same count) so the FE does not remount the grid.
    if (!isDone && cappedDocs.length <= lastEmittedCount) {
      return;
    }
    lastEmittedCount = cappedDocs.length;

    const candidates = [];
    for (const doc of cappedDocs) {
      const row = mapFjDocToCandidate(doc);
      if (row) candidates.push(row);
    }
    const payload = {
      sessionId: String(sessionId),
      attempt: typeof partial.attempt === "number" ? partial.attempt : page,
      docs: cappedDocs,
      candidates,
      totalDocs: cappedDocs.length,
      candidateCount: candidates.length,
      polling: isDone ? false : true,
      done: isDone,
      status: isDone ? true : false,
    };
    if (userId) emitCandidateSearchPoll(userId, payload);
    if (externalOnPoll) {
      try {
        externalOnPoll(payload);
      } catch {
        /* ignore */
      }
    }
  };

  while (page <= PROFILE_FETCH_MAX_PAGES) {
    const profilesRes =
      page === 1
        ? await getSourcingSessionProfilesWhenReady(String(sessionId), {
            page: 1,
            limit: PROFILE_FETCH_PAGE_LIMIT,
            ...pollOptions,
            onPoll: (p) => {
              const pollDocs =
                allDocs.length > 0
                  ? allDocs
                  : Array.isArray(p.docs)
                    ? p.docs
                    : [];
              pushPoll({
                attempt: p.attempt,
                docs: pollDocs.slice(0, PROFILE_FETCH_PAGE_LIMIT),
                totalDocs: Math.min(
                  PROFILE_FETCH_PAGE_LIMIT,
                  typeof p.totalDocs === "number" ? p.totalDocs : pollDocs.length
                ),
                done: false,
              });
            },
          })
        : await getSourcingSessionProfiles(String(sessionId), {
            page,
            limit: PROFILE_FETCH_PAGE_LIMIT,
          });

    lastRes = profilesRes;
    const docs = profilesRes?.data?.docs;
    if (Array.isArray(docs)) {
      for (const doc of docs) {
        if (allDocs.length >= PROFILE_FETCH_PAGE_LIMIT) break;
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

    pushPoll({
      attempt: page,
      docs: allDocs,
      totalDocs: allDocs.length,
      done: false,
    });

    // Initial search: single page only (max 200).
    break;
  }

  const mergedRes = buildProfilesResWithDocs(lastRes || {}, allDocs);
  const mapped = mapProfilesResToLists(mergedRes);
  pushPoll({
    attempt: page,
    docs: allDocs,
    totalDocs: allDocs.length,
    done: true,
  });
  return mapped;
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
  filterForm = null,
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
        totalDocs: Array.isArray(candidates)
          ? candidates.length
          : profilesPagination != null &&
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
        filterForm:
          filterForm && typeof filterForm === "object" && !Array.isArray(filterForm)
            ? filterForm
            : null,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return doc?._id?.toString() ?? null;
}

/** Persisted profile count in our DB (includes fetch-more), used for search history Results column. */
async function syncSourcingSessionStoredCount(futureJobsSessionId) {
  const sid = futureJobsSessionId != null ? String(futureJobsSessionId).trim() : "";
  if (!sid) return 0;
  const count = await SourcedCandidateDetail.countDocuments({ sourcingSessionId: sid });
  await SourcingSession.updateOne(
    { futureJobsSessionId: sid },
    { $set: { totalDocs: count } }
  );
  return count;
}

async function storedProfileCountBySessionIds(sessionIds, scopeFilter = {}) {
  const ids = [...new Set(sessionIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const match = { ...scopeFilter, sourcingSessionId: { $in: ids } };
  const rows = await SourcedCandidateDetail.aggregate([
    { $match: match },
    { $group: { _id: "$sourcingSessionId", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

async function fetchProfilesForSession({
  userId,
  sessionId,
  sourcingMeta,
  sessionMeta,
  loggerHandler,
  waitBeforeFetchMs = 0,
}) {
  // First fetch only (HTTP apply response). No socket emits here.
  if (waitBeforeFetchMs > 0) {
    logApi(loggerHandler, "waiting after session create before profiles fetch", {
      sessionId: String(sessionId),
      waitMs: waitBeforeFetchMs,
    });
    await sleep(waitBeforeFetchMs);
  }

  const profilesRes = await getSourcingSessionProfiles(String(sessionId), {
    page: 1,
    limit: PROFILE_FETCH_PAGE_LIMIT,
  });

  const rawDocs = Array.isArray(profilesRes?.data?.docs)
    ? profilesRes.data.docs
    : [];
  const cappedDocs = rawDocs.slice(0, PROFILE_FETCH_PAGE_LIMIT);
  const mapped = mapProfilesResToLists(
    buildProfilesResWithDocs(profilesRes || {}, cappedDocs)
  );

  await persistCandidateDetails({
    userId,
    sourcingSessionId: String(sessionId),
    profilesRes: mapped.futureJobsProfiles,
    loggerHandler,
  });

  await syncSourcingSessionStoredCount(String(sessionId));

  return mapped;
}

function shouldContinueProfilePolling({ candidates, docs }) {
  const byCandidates = Array.isArray(candidates) ? candidates.length : 0;
  const byDocs = Array.isArray(docs) ? docs.length : 0;
  const count = Math.max(byCandidates, byDocs);
  // Keep socket + FE live-poll until we have a full first page (max 200).
  return count < PROFILE_FETCH_PAGE_LIMIT;
}

/**
 * Card-sized doc for socket — full FJ docs are too large and often never arrive on the FE.
 */
function slimDocsForSocketPoll(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.slice(0, PROFILE_FETCH_PAGE_LIMIT).map((doc) => {
    const profile = doc?.profile && typeof doc.profile === "object" ? doc.profile : {};
    const analysis =
      doc?.profileAnalysis && typeof doc.profileAnalysis === "object"
        ? doc.profileAnalysis
        : {};
    const highlights = Array.isArray(analysis.highlights)
      ? analysis.highlights.slice(0, 6)
      : [];
    const employers = Array.isArray(profile.current_employers_object)
      ? profile.current_employers_object.slice(0, 1)
      : [];
    return {
      _id: doc?._id,
      finalScore: doc?.finalScore,
      skillTieBreaker: doc?.skillTieBreaker,
      profileAnalysis: {
        highlights,
        recommendation:
          typeof analysis.recommendation === "string"
            ? analysis.recommendation.slice(0, 400)
            : undefined,
      },
      profile: {
        name: profile.name,
        linkedin_profile_url: profile.linkedin_profile_url,
        profile_picture_permalink: profile.profile_picture_permalink,
        region: profile.region,
        years_of_experience_raw: profile.years_of_experience_raw,
        open_to_cards: profile.open_to_cards,
        skills: Array.isArray(profile.skills) ? profile.skills.slice(0, 12) : [],
        current_employers_object: employers,
      },
    };
  });
}

/**
 * After HTTP apply returns the first fetch, continue waiting via socket polls only.
 *
 * - Up to 30 polls (every 3s)
 * - Every poll result is emitted (slim docs) over the socket
 * - FE merges/appends; stop early only when count reaches 200
 */
async function continueProfilePollingViaSocket({
  userId,
  sessionId,
  loggerHandler,
  initialDocs = [],
}) {
  const sid = String(sessionId);
  const uid = String(userId || "");
  if (!uid || !sid) return;

  const INTERVAL_MS = 3000;
  const MAX_POLLS = 30;

  const seed = Array.isArray(initialDocs) ? initialDocs : [];
  let latestDocs = seed.slice(0, PROFILE_FETCH_PAGE_LIMIT);

  const emitSnapshot = (docs, { done, attempt }) => {
    const capped = Array.isArray(docs) ? docs.slice(0, PROFILE_FETCH_PAGE_LIMIT) : [];
    const slimDocs = slimDocsForSocketPoll(capped);
    const candidates = [];
    for (const doc of capped) {
      const row = mapFjDocToCandidate(doc);
      if (row) candidates.push(row);
    }
    const sent = emitCandidateSearchPoll(uid, {
      sessionId: sid,
      attempt,
      docs: slimDocs,
      candidates,
      totalDocs: capped.length,
      candidateCount: candidates.length,
      polling: !done,
      done: Boolean(done),
      status: Boolean(done),
    });
    // Always visible in the Backend terminal so we can confirm emits.
    console.log(
      `[realtime] candidates.search.poll session=${sid} attempt=${attempt} count=${candidates.length} done=${Boolean(done)} socketsReached=${sent}`
    );
    logApi(loggerHandler, "socket poll emit", {
      userId: uid,
      sessionId: sid,
      attempt,
      candidateCount: candidates.length,
      done: Boolean(done),
      socketsReached: sent,
    });
    return sent;
  };

  logApi(loggerHandler, "socket polling started", {
    userId: uid,
    sessionId: sid,
    alreadyHave: latestDocs.length,
    maxPolls: MAX_POLLS,
  });
  console.log(
    `[realtime] socket polling started session=${sid} alreadyHave=${latestDocs.length}`
  );

  try {
    for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
      if (latestDocs.length >= PROFILE_FETCH_PAGE_LIMIT) break;

      // First attempt immediately; then wait between polls.
      if (attempt > 1) await sleep(INTERVAL_MS);

      const profilesRes = await getSourcingSessionProfiles(sid, {
        page: 1,
        limit: PROFILE_FETCH_PAGE_LIMIT,
        pollAttempt: attempt,
      });
      const rawDocs = Array.isArray(profilesRes?.data?.docs)
        ? profilesRes.data.docs.slice(0, PROFILE_FETCH_PAGE_LIMIT)
        : [];

      latestDocs = rawDocs;
      emitSnapshot(rawDocs, { done: false, attempt });

      if (latestDocs.length >= PROFILE_FETCH_PAGE_LIMIT) break;
    }

    const mapped = mapProfilesResToLists(
      buildProfilesResWithDocs({}, latestDocs.slice(0, PROFILE_FETCH_PAGE_LIMIT))
    );

    await persistCandidateDetails({
      userId: uid,
      sourcingSessionId: sid,
      profilesRes: mapped.futureJobsProfiles,
      loggerHandler,
    });
    await syncSourcingSessionStoredCount(sid);

    // Final frame includes slim docs so FE can merge even if prior frames were dropped.
    emitSnapshot(latestDocs, { done: true, attempt: MAX_POLLS });

    console.log(
      `[realtime] socket polling done session=${sid} candidateCount=${latestDocs.length}`
    );

    logApi(loggerHandler, "socket polling done", {
      userId: uid,
      sessionId: sid,
      candidateCount: latestDocs.length,
    });
  } catch (err) {
    logApi(loggerHandler, "socket polling failed", {
      userId: uid,
      sessionId: sid,
      message: err?.message,
    });
    emitCandidateSearchPoll(uid, {
      sessionId: sid,
      docs: slimDocsForSocketPoll(latestDocs),
      candidates: [],
      totalDocs: latestDocs.length,
      candidateCount: latestDocs.length,
      polling: false,
      done: true,
      status: true,
    });
  }
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
      typeof req.body?.userText === "string"
        ? req.body.userText
        : typeof req.body?.prompt === "string"
          ? req.body.prompt
          : "";

    if (!userText || !String(userText).trim()) {
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

    const futureJobs = await runCostlyFutureJobsAction(
      `annotate:${userId || "anonymous"}:${requestHash({ userText, linkedin_profile_url })}`,
      () =>
        getSourcingSessionAnnotation({
          userText,
          linkedin_profile_url,
        })
    );

    const annotationData =
      futureJobs?.data && typeof futureJobs.data === "object" ? futureJobs.data : {};
    const filterForm = enrichFilterFormSkillsFromPrompt(
      filterFormFromAnnotation(annotationData),
      userText
    );

    logApi("candidates/search/annotate", "success", {
      userId,
      fieldCount: Object.keys(annotationData).length,
      futureJobsStatus: futureJobs?.status,
      futureJobsMessage:
        typeof futureJobs?.message === "string" ? futureJobs.message : "",
      futureJobsPreview: safeJsonPreview(futureJobs, 1200),
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
      code: error.code,
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
      typeof req.body?.prompt === "string" ? req.body.prompt : "";

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        message: "prompt is required",
      });
    }

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

    const futureJobs = await runCostlyFutureJobsAction(
      `create:${userId || "anonymous"}:${requestHash({ prompt, payload })}`,
      () => createSourcingSession(payload)
    );
    const sessionId = sessionIdFromFjCreateResponse(futureJobs);

    if (isFjSessionPending(futureJobs)) {
      const message = fjSessionPendingMessage(futureJobs);
      logApi("candidates/search/create", "fj session pending (207)", {
        userId,
        sessionId: sessionId || undefined,
        message,
      });
      return res.status(200).json({
        success: false,
        message,
        sessionPending: true,
        fjStatusCode: 207,
        sessionId: sessionId || undefined,
        futureJobs,
      });
    }

    if (sessionId === "") {
      return res.status(502).json({
        success: false,
        message: "Search completed but no sourcing session was returned.",
        futureJobs,
      });
    }

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
        filterForm,
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
      code: error.code,
      message: error.message || "Failed to create search session",
      details: error.details,
    });
  }
};

/**
 * POST /api/candidates/search/apply
 * Create sourcing session from prompt + filter form, then fetch profiles.
 * When sessionId is provided, PATCH the existing Future Jobs session instead of creating a new one.
 */
const applySearchFilters = async (req, res) => {
  const userId = req.auth?.userId;
  const fjTraceId = `fj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt : "";
    if (!prompt || !String(prompt).trim()) {
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
    const limit = clampInt(req.body?.limit, 1, PROFILE_FETCH_PAGE_LIMIT, 20);
    const existingSessionId =
      typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";

    const payload = buildSessionPayloadFromPromptAndFilter(prompt, filterForm);
    const isSessionUpdate = Boolean(existingSessionId);

    try {
      await assertQuotaAvailableByUserId(userId, "candidateSearches");
    } catch (quotaErr) {
      if (respondIfQuotaExceeded(res, quotaErr)) return;
      throw quotaErr;
    }

    if (isSessionUpdate) {
      const owned = await findSessionInScope(userId, existingSessionId);

      if (!owned) {
        return res.status(403).json({
          success: false,
          message:
            "This sourcing session was not found for your account, or it was created before history was enabled.",
        });
      }
    }

    logApi("candidates/search/apply", "incoming", {
      userId,
      promptLength: prompt.length,
      sessionId: existingSessionId || undefined,
      sessionUpdated: isSessionUpdate,
      traceId: fjTraceId,
      payloadPreview: safeJsonPreview(payload),
    });

    try {
      console.log(
        `[${new Date().toISOString()}] [api:candidates/search/apply] FJ payload exact JSON (traceId=${fjTraceId}):\n${JSON.stringify(payload, null, 2)}`
      );
    } catch {
      console.log(
        `[${new Date().toISOString()}] [api:candidates/search/apply] FJ payload unserializable (traceId=${fjTraceId})`
      );
    }

    let futureJobs = await runCostlyFutureJobsAction(
      `apply:${userId}:${existingSessionId || "new"}:${requestHash({
        prompt,
        payload,
        page,
        limit,
      })}`,
      () =>
        isSessionUpdate
          ? updateSourcingSession(existingSessionId, payload, {
              traceId: fjTraceId,
            })
          : createSourcingSession(payload, { traceId: fjTraceId })
    );

    console.log("futureJobs-apply-", futureJobs);
    let sessionId = sessionIdFromFjCreateResponse(futureJobs, existingSessionId);
    let activeFilterForm = filterForm;
    let activePayload = payload;
    let regionExpandFallbackUsed = false;
    const regionExpandGeosTried = [];

    // FJ 207 = no matches / search failed — widen geo: 60_km then 120_km.
    while (isFjSessionPending(futureJobs)) {
      const nextGeo = nextRegionExpandGeoDistance(activeFilterForm);
      if (!nextGeo) break;

      const pendingMessage = fjSessionPendingMessage(futureJobs);
      activeFilterForm = expandFilterFormForRegionGeo(activeFilterForm, nextGeo);
      activePayload = buildSessionPayloadFromPromptAndFilter(prompt, activeFilterForm);
      regionExpandFallbackUsed = true;
      regionExpandGeosTried.push(nextGeo);

      logApi("candidates/search/apply", "207 no-match — region expand fallback", {
        userId,
        previousSessionId: sessionId || undefined,
        message: pendingMessage,
        searchOtherRegions: true,
        geoDistance: nextGeo,
        geosTried: regionExpandGeosTried,
        traceId: fjTraceId,
      });

      try {
        console.log(
          `[${new Date().toISOString()}] [api:candidates/search/apply] 207 fallback (${nextGeo}) FJ payload (traceId=${fjTraceId}):\n${JSON.stringify(activePayload, null, 2)}`
        );
      } catch {
        /* ignore */
      }

      try {
        const fallbackFj = await runCostlyFutureJobsAction(
          `apply-fallback-207:${nextGeo}:${userId}:${requestHash({
            prompt,
            payload: activePayload,
          })}`,
          () =>
            createSourcingSession(activePayload, {
              traceId: `${fjTraceId}-fallback-207-${nextGeo}`,
            })
        );
        futureJobs = fallbackFj;
        sessionId = sessionIdFromFjCreateResponse(fallbackFj);
        logApi("candidates/search/apply", "207 fallback create done", {
          userId,
          sessionId: sessionId || undefined,
          geoDistance: nextGeo,
          fjStatusCode: fallbackFj?.statusCode,
          stillPending: isFjSessionPending(fallbackFj),
        });
      } catch (fallbackErr) {
        logApi("candidates/search/apply", "207 fallback create failed", {
          userId,
          geoDistance: nextGeo,
          message: fallbackErr?.message,
        });
        break;
      }
    }

    if (isFjSessionPending(futureJobs)) {
      const message = fjSessionPendingMessage(futureJobs);
      logApi("candidates/search/apply", "fj session pending (207)", {
        userId,
        sessionId: sessionId || undefined,
        sessionUpdated: isSessionUpdate,
        regionExpandFallbackUsed,
        geosTried: regionExpandGeosTried,
        message,
      });

      const responseFilterForm = filterFormFromCreateResponse(
        futureJobs,
        activePayload
      );
      const savedFilterFormPending = mergePersistedFilterForm(
        activeFilterForm,
        responseFilterForm
      );
      if (sessionId) {
        try {
          await persistSourcingSessionRow({
            userId,
            sessionId: String(sessionId),
            prompt,
            payload: activePayload,
            usingSessionOverride: false,
            futureJobs,
            profilesPagination: null,
            candidates: [],
            profilesFetchError: message,
            filterForm: savedFilterFormPending,
          });
        } catch (persistErr) {
          logApi("candidates/search/apply", "persist failed (207)", {
            message: persistErr?.message,
          });
        }
      }

      return res.status(200).json({
        success: false,
        message,
        sessionPending: true,
        fjStatusCode: 207,
        sessionId: sessionId || undefined,
        sessionUpdated: isSessionUpdate,
        filterForm: savedFilterFormPending,
        regionExpandFallbackUsed: regionExpandFallbackUsed || undefined,
        regionExpandGeosTried:
          regionExpandGeosTried.length > 0 ? regionExpandGeosTried : undefined,
        futureJobs,
      });
    }

    if (sessionId === "") {
      return res.status(502).json({
        success: false,
        message: "Search completed but no sourcing session was returned.",
        futureJobs,
      });
    }

    let sourcingMeta = futureJobs?.data?.sourcing;
    let sessionMeta = futureJobs?.data?.session;
    let responseFilterForm = filterFormFromCreateResponse(futureJobs, activePayload);
    let savedFilterForm = mergePersistedFilterForm(activeFilterForm, responseFilterForm);

    let profilesFetchError = null;
    let candidates = [];
    let profilesPagination = null;
    let futureJobsProfiles = null;

    try {
      const mapped = await fetchProfilesForSession({
        userId,
        sessionId: String(sessionId),
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

    // Empty after last poll → widen geo: 60_km then 120_km.
    while (
      !profilesFetchError &&
      candidates.length === 0 &&
      nextRegionExpandGeoDistance(activeFilterForm)
    ) {
      const nextGeo = nextRegionExpandGeoDistance(activeFilterForm);
      activeFilterForm = expandFilterFormForRegionGeo(activeFilterForm, nextGeo);
      activePayload = buildSessionPayloadFromPromptAndFilter(prompt, activeFilterForm);
      regionExpandFallbackUsed = true;
      regionExpandGeosTried.push(nextGeo);

      logApi("candidates/search/apply", "empty poll — region expand fallback", {
        userId,
        previousSessionId: String(sessionId),
        searchOtherRegions: true,
        geoDistance: nextGeo,
        geosTried: regionExpandGeosTried,
        traceId: fjTraceId,
      });

      try {
        console.log(
          `[${new Date().toISOString()}] [api:candidates/search/apply] empty-poll fallback (${nextGeo}) FJ payload (traceId=${fjTraceId}):\n${JSON.stringify(activePayload, null, 2)}`
        );
      } catch {
        /* ignore */
      }

      try {
        const fallbackFj = await runCostlyFutureJobsAction(
          `apply-fallback:${nextGeo}:${userId}:${requestHash({
            prompt,
            payload: activePayload,
          })}`,
          () =>
            createSourcingSession(activePayload, {
              traceId: `${fjTraceId}-fallback-${nextGeo}`,
            })
        );

        if (isFjSessionPending(fallbackFj)) {
          logApi("candidates/search/apply", "empty-poll fallback pending (207)", {
            userId,
            geoDistance: nextGeo,
            message: fjSessionPendingMessage(fallbackFj),
          });
          futureJobs = fallbackFj;
          sessionId = sessionIdFromFjCreateResponse(fallbackFj) || sessionId;
          // Continue loop to try next geo (e.g. 120_km) if available.
          continue;
        }

        const fallbackSessionId = sessionIdFromFjCreateResponse(fallbackFj);
        if (!fallbackSessionId) break;

        futureJobs = fallbackFj;
        sessionId = fallbackSessionId;
        sourcingMeta = futureJobs?.data?.sourcing;
        sessionMeta = futureJobs?.data?.session;
        responseFilterForm = filterFormFromCreateResponse(futureJobs, activePayload);
        savedFilterForm = mergePersistedFilterForm(
          activeFilterForm,
          responseFilterForm
        );

        const mapped = await fetchProfilesForSession({
          userId,
          sessionId: String(sessionId),
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
        profilesFetchError = null;

        logApi("candidates/search/apply", "empty-poll fallback profiles", {
          userId,
          sessionId: String(sessionId),
          geoDistance: nextGeo,
          candidateCount: candidates.length,
        });
      } catch (fallbackErr) {
        logApi("candidates/search/apply", "empty-poll fallback failed", {
          userId,
          geoDistance: nextGeo,
          message: fallbackErr?.message,
        });
        break;
      }
    }

    // If empty-poll fallbacks ended on a 207, surface that to the client.
    if (
      regionExpandFallbackUsed &&
      candidates.length === 0 &&
      isFjSessionPending(futureJobs)
    ) {
      const message = fjSessionPendingMessage(futureJobs);
      const savedFilterFormPending = mergePersistedFilterForm(
        activeFilterForm,
        filterFormFromCreateResponse(futureJobs, activePayload)
      );
      if (sessionId) {
        try {
          await persistSourcingSessionRow({
            userId,
            sessionId: String(sessionId),
            prompt,
            payload: activePayload,
            usingSessionOverride: false,
            futureJobs,
            profilesPagination: null,
            candidates: [],
            profilesFetchError: message,
            filterForm: savedFilterFormPending,
          });
        } catch (persistErr) {
          logApi("candidates/search/apply", "persist failed (207 after empty-poll fallback)", {
            message: persistErr?.message,
          });
        }
      }
      return res.status(200).json({
        success: false,
        message,
        sessionPending: true,
        fjStatusCode: 207,
        sessionId: sessionId || undefined,
        sessionUpdated: isSessionUpdate,
        filterForm: savedFilterFormPending,
        regionExpandFallbackUsed: true,
        regionExpandGeosTried:
          regionExpandGeosTried.length > 0 ? regionExpandGeosTried : undefined,
        futureJobs,
      });
    }

    savedFilterForm = mergePersistedFilterForm(activeFilterForm, responseFilterForm);

    let savedSessionId = null;
    try {
      savedSessionId = await persistSourcingSessionRow({
        userId,
        sessionId: String(sessionId),
        prompt,
        payload: activePayload,
        usingSessionOverride: false,
        futureJobs,
        profilesPagination,
        candidates,
        profilesFetchError,
        filterForm: savedFilterForm,
      });
    } catch (persistErr) {
      logApi("candidates/search/apply", "persist failed", {
        message: persistErr?.message,
      });
    }

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      await incrementUserUsage(String(userId), "candidateSearches");
    }

    const pollingContinues =
      !profilesFetchError &&
      shouldContinueProfilePolling({
        candidates,
        docs: Array.isArray(futureJobsProfiles?.data?.docs)
          ? futureJobsProfiles.data.docs
          : [],
      });

    logApi("candidates/search/apply", "success", {
      userId,
      sessionId: String(sessionId),
      candidateCount: candidates.length,
      sessionUpdated: isSessionUpdate,
      regionExpandFallbackUsed,
      geosTried: regionExpandGeosTried,
      pollingContinues,
    });

    const displayedCount = candidates.length;
    const profilesPaginationAligned = profilesPagination
      ? {
          ...profilesPagination,
          totalDocs: displayedCount,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        }
      : {
          totalDocs: displayedCount,
          page: 1,
          limit: displayedCount || PROFILE_FETCH_PAGE_LIMIT,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
        };

    if (pollingContinues) {
      const initialDocs = Array.isArray(futureJobsProfiles?.data?.docs)
        ? futureJobsProfiles.data.docs
        : [];
      void continueProfilePollingViaSocket({
        userId,
        sessionId: String(sessionId),
        loggerHandler: "candidates/search/apply",
        initialDocs,
      });
    }

    return res.status(200).json({
      success: true,
      prompt,
      sessionId: String(sessionId),
      sessionUpdated: isSessionUpdate,
      page: 1,
      limit: displayedCount || limit,
      canFetchMore: canFetchMoreFromFjSourcing(sourcingMeta),
      filterForm: savedFilterForm,
      sessionPayload: sessionMeta ?? null,
      candidates,
      profilesPagination: profilesPaginationAligned,
      futureJobsProfiles: futureJobsProfiles ?? undefined,
      profilesFetchError: profilesFetchError ?? undefined,
      /** FE: show badge loader; socket polls until done/status true */
      polling: pollingContinues,
      regionExpandFallbackUsed: regionExpandFallbackUsed || undefined,
      regionExpandGeosTried:
        regionExpandGeosTried.length > 0 ? regionExpandGeosTried : undefined,
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
      traceId: fjTraceId,
      fjTraceHint:
        "Search logs for [outbound:futurejobs] CALL SUMMARY with this traceId",
    });
    return res.status(status).json({
      success: false,
      code: error.code,
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
      typeof req.body?.prompt === "string" ? req.body.prompt : "";

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        message: "prompt is required",
      });
    }

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
    const limit = clampInt(req.body?.limit, 1, PROFILE_FETCH_PAGE_LIMIT, 20);

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      try {
        await assertQuotaAvailableByUserId(userId, "candidateSearches");
      } catch (quotaErr) {
        if (respondIfQuotaExceeded(res, quotaErr)) return;
        throw quotaErr;
      }
    }

    const futureJobs = await runCostlyFutureJobsAction(
      `search:${userId || "anonymous"}:${requestHash({ prompt, payload, page, limit })}`,
      () => createSourcingSession(payload)
    );

    const sessionId = sessionIdFromFjCreateResponse(futureJobs);
    const candidates = [];
    let profilesPagination = null;
    let profilesFetchError = null;
    /** Full GET …/profiles JSON (statusCode, data.docs, etc.) for browser / clients */
    let futureJobsProfiles = null;

    logApi("candidates/search", "sourcing session created", {
      userId,
      futureJobsStatus: futureJobs?.status,
      sessionId: sessionId || null,
      fjStatusCode: futureJobs?.statusCode,
      hasSession: Boolean(sessionId),
    });

    if (isFjSessionPending(futureJobs)) {
      const message = fjSessionPendingMessage(futureJobs);
      logApi("candidates/search", "fj session pending (207)", {
        userId,
        sessionId: sessionId || undefined,
        message,
      });
      return res.status(200).json({
        success: false,
        message,
        sessionPending: true,
        fjStatusCode: 207,
        sessionId: sessionId || undefined,
        candidates: [],
        futureJobs,
      });
    }

    if (sessionId === "") {
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
        const responseFilterForm = filterFormFromCreateResponse(futureJobs, payload);
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
          filterForm:
            responseFilterForm &&
            typeof responseFilterForm === "object" &&
            !Array.isArray(responseFilterForm)
              ? responseFilterForm
              : null,
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

function detailPayloadFromStoredRawDoc(rawDoc, candidateId) {
  if (!rawDoc || typeof rawDoc !== "object") return null;
  const doc = rawDoc;
  const profile =
    doc.profile && typeof doc.profile === "object" ? doc.profile : null;
  const cid =
    doc._id != null && String(doc._id).trim() !== ""
      ? String(doc._id).trim()
      : candidateId;
  if (!profile) return null;
  return {
    candidate: {
      ...profile,
      _id: profile._id != null ? profile._id : cid,
    },
    finalScore: typeof doc.finalScore === "number" ? doc.finalScore : undefined,
    profileAnalysis:
      doc.profileAnalysis && typeof doc.profileAnalysis === "object"
        ? doc.profileAnalysis
        : undefined,
  };
}

/** Normalize FJ details `data` so FE always receives `{ candidate, ... }`. */
function normalizeFjCandidateDetailData(data) {
  if (!data || typeof data !== "object") return null;
  if (data.candidate && typeof data.candidate === "object") return data;
  if (data.profile && typeof data.profile === "object") {
    return {
      candidate: data.profile,
      finalScore:
        typeof data.finalScore === "number" ? data.finalScore : undefined,
      profileAnalysis:
        data.profileAnalysis && typeof data.profileAnalysis === "object"
          ? data.profileAnalysis
          : undefined,
    };
  }
  if (
    Array.isArray(data.current_employers) ||
    Array.isArray(data.current_employers_object) ||
    Array.isArray(data.past_employers) ||
    Array.isArray(data.all_employers)
  ) {
    return { candidate: data };
  }
  return data;
}

async function findOwnedSourcedCandidateDetail(
  userId,
  candidateId,
  { sessionId = "", linkedinUrl = "" } = {}
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const baseSelect = "_id sourcingSessionId candidateId linkedinProfileUrl rawDoc";

  if (candidateId) {
    const byId = await SourcedCandidateDetail.findOne({
      userId: uid,
      candidateId,
    })
      .select(baseSelect)
      .lean();
    if (byId) return byId;
  }

  const session = typeof sessionId === "string" ? sessionId.trim() : "";
  const linkedin = normalizeLinkedinProfileUrl(
    typeof linkedinUrl === "string" ? linkedinUrl : ""
  );

  if (session && linkedin) {
    const byLinkedIn = await SourcedCandidateDetail.findOne({
      userId: uid,
      sourcingSessionId: session,
      linkedinProfileUrl: linkedin,
    })
      .select(baseSelect)
      .lean();
    if (byLinkedIn) return byLinkedIn;
  }

  if (session && candidateId) {
    const bySession = await SourcedCandidateDetail.findOne({
      userId: uid,
      sourcingSessionId: session,
      candidateId,
    })
      .select(baseSelect)
      .lean();
    if (bySession) return bySession;
  }

  return null;
}

function alternateFjDetailCandidateIds(candidateId, owned) {
  const ids = [];
  const primary = String(candidateId || "").trim();
  if (primary) ids.push(primary);

  const storedDocId =
    owned?.rawDoc?._id != null ? String(owned.rawDoc._id).trim() : "";
  if (storedDocId && storedDocId !== primary) ids.push(storedDocId);

  const profileId =
    owned?.rawDoc?.profile?._id != null
      ? String(owned.rawDoc.profile._id).trim()
      : "";
  if (profileId && profileId !== primary && profileId !== storedDocId) {
    ids.push(profileId);
  }

  return ids;
}

/**
 * GET /api/candidates/candidate/:candidateId/details
 * Future Jobs full candidate profile (session profiles list doc._id).
 */
const getSessionCandidateDetails = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const candidateId =
      req.params.candidateId != null
        ? String(req.params.candidateId).trim()
        : "";
    if (!candidateId) {
      return res.status(400).json({
        success: false,
        message: "candidateId is required",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sessionIdFromQuery =
      typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
    const linkedinFromQuery =
      typeof req.query.linkedinUrl === "string" ? req.query.linkedinUrl.trim() : "";

    const owned = await findOwnedSourcedCandidateDetail(userId, candidateId, {
      sessionId: sessionIdFromQuery,
      linkedinUrl: linkedinFromQuery,
    });

    let sessionAllowed = Boolean(owned);
    const effectiveSessionId =
      owned?.sourcingSessionId || sessionIdFromQuery || "";
    if (!sessionAllowed && sessionIdFromQuery) {
      const sess = await findSessionInScope(userId, sessionIdFromQuery);
      sessionAllowed = Boolean(sess);
    }

    if (!sessionAllowed) {
      return res.status(403).json({
        success: false,
        message:
          "This candidate was not found for your account. Open the session from search history or run a new search.",
      });
    }

    logApi("candidates/candidate/details", "incoming", {
      userId,
      candidateId,
      sourcingSessionId: effectiveSessionId || undefined,
      hasStored: Boolean(owned?.rawDoc),
    });

    const storedDetail = detailPayloadFromStoredRawDoc(owned?.rawDoc, candidateId);
    const idsToTry = alternateFjDetailCandidateIds(candidateId, owned);

    let futureJobs = null;
    let detail = null;
    let lastFjError = null;

    for (const fjId of idsToTry) {
      try {
        futureJobs = await getSourcingSessionCandidateDetails(fjId);
        detail = normalizeFjCandidateDetailData(
          futureJobs?.data && typeof futureJobs.data === "object"
            ? futureJobs.data
            : null
        );
        if (detail) break;
      } catch (err) {
        lastFjError = err;
        // Upstream helpers map HTTP failures to statusCode 502; real FJ HTTP
        // status lives on fjHttpStatus. Keep trying alternate ids on 404 only.
        const fjHttp = Number(err?.fjHttpStatus || err?.statusCode || 0);
        if (fjHttp !== 404) break;
      }
    }

    if (detail) {
      logApi("candidates/candidate/details", "success", {
        userId,
        candidateId,
        hasCandidate: Boolean(detail?.candidate),
        source: "futurejobs",
      });
      return res.status(200).json({
        success: true,
        candidateId,
        detail,
        futureJobs,
      });
    }

    if (storedDetail) {
      logApi("candidates/candidate/details", "success", {
        userId,
        candidateId,
        hasCandidate: Boolean(storedDetail?.candidate),
        source: "stored",
        fjMessage: lastFjError?.message,
      });
      return res.status(200).json({
        success: true,
        candidateId,
        detail: storedDetail,
        fromStored: true,
        futureJobsError:
          lastFjError?.message || "Could not refresh profile from Future Jobs",
      });
    }

    if (lastFjError) {
      throw lastFjError;
    }

    return res.status(502).json({
      success: false,
      message: "Failed to load candidate details",
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/candidate/details", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load candidate details",
      details: error.details,
    });
  }
};

/**
 * GET /api/candidates/session/:sessionId/profiles
 * Prefer persisted candidates (includes fetch-more totals). Fall back to Future Jobs
 * first page only when nothing is stored yet.
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

    const owned = await findSessionInScope(userId, sessionId);

    if (!owned) {
      return res.status(403).json({
        success: false,
        message:
          "This sourcing session was not found for your account, or it was created before history was enabled.",
      });
    }

    logApi("candidates/session/profiles", "incoming", {
      userId,
      sessionId,
    });

    const scopeFilter =
      (await userIdFilterForActor(userId)) || {
        userId: new mongoose.Types.ObjectId(userId),
      };
    const storedFilter = {
      sourcingSessionId: sessionId,
    };
    // Session access already checked via findSessionInScope — load all stored rows for it.
    const storedCount = await SourcedCandidateDetail.countDocuments(storedFilter);

    if (storedCount > 0) {
      const storedRows = await SourcedCandidateDetail.find(storedFilter)
        .sort({ createdAt: 1, _id: 1 })
        .limit(STORED_CANDIDATES_ALL_LIMIT)
        .lean();
      const storedDocs = storedRows
        .map((r) => r?.rawDoc)
        .filter((d) => d && typeof d === "object");

      if (storedDocs.length > 0) {
        const mapped = mapProfilesResToLists(
          buildProfilesResWithDocs({}, storedDocs)
        );
        const displayedCount = mapped.candidates.length;

        logApi("candidates/session/profiles", "success (stored)", {
          userId,
          sessionId,
          storedCount,
          docCount: displayedCount,
          scopeUserIds: scopeFilter.userId,
        });

        return res.status(200).json({
          success: true,
          sessionId,
          prompt: typeof owned.prompt === "string" ? owned.prompt : "",
          page: 1,
          limit: displayedCount,
          canFetchMore: true,
          storedProfileCount: storedCount,
          candidates: mapped.candidates,
          profilesPagination: {
            totalDocs: Math.max(storedCount, displayedCount),
            page: 1,
            limit: displayedCount || PROFILE_FETCH_PAGE_LIMIT,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: null,
            prevPage: null,
          },
          filterForm: filterFormForApi(owned?.filterForm),
          futureJobsProfiles: mapped.futureJobsProfiles,
          fromStored: true,
        });
      }
    }

    const expectedFromSession =
      typeof owned?.totalDocs === "number" && owned.totalDocs > 0
        ? owned.totalDocs
        : 1;

    const mapped = await fetchAllSessionProfilesFromFj(sessionId, {
      expectedProfileCount: expectedFromSession,
      profileMatchingStatus: "processing",
    });

    await persistCandidateDetails({
      userId,
      sourcingSessionId: sessionId,
      profilesRes: mapped.futureJobsProfiles,
      loggerHandler: "candidates/session/profiles",
    });

    const displayedCount = mapped.candidates.length;

    logApi("candidates/session/profiles", "success", {
      userId,
      sessionId,
      docCount: displayedCount,
      candidatesMapped: displayedCount,
    });

    return res.status(200).json({
      success: true,
      sessionId,
      prompt: typeof owned.prompt === "string" ? owned.prompt : "",
      page: 1,
      limit: displayedCount,
      canFetchMore: true,
      candidates: mapped.candidates,
      profilesPagination: {
        totalDocs: displayedCount,
        page: 1,
        limit: displayedCount || PROFILE_FETCH_PAGE_LIMIT,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null,
      },
      filterForm: filterFormForApi(owned?.filterForm),
      futureJobsProfiles: mapped.futureJobsProfiles,
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
      code: error.code,
      message: error.message || "Failed to load session profiles",
      details: error.details,
    });
  }
};

/**
 * POST /api/candidates/session/:sessionId/fetch-more
 * Future Jobs fetch-more, then load all profiles and return new docs for the UI to merge.
 */
const fetchMoreSessionProfiles = async (req, res) => {
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

    const owned = await findSessionInScope(userId, sessionId);

    if (!owned) {
      return res.status(403).json({
        success: false,
        message:
          "This sourcing session was not found for your account, or it was created before history was enabled.",
      });
    }

    try {
      await assertQuotaAvailableByUserId(userId, "candidateSearches");
    } catch (quotaErr) {
      if (respondIfQuotaExceeded(res, quotaErr)) return;
      throw quotaErr;
    }

    logApi("candidates/session/fetch-more", "incoming", { userId, sessionId });

    const { fetchMoreResult, mapped, sourcingMeta } = await runCostlyFutureJobsAction(
      `fetch-more:${userId}:${sessionId}`,
      async () => {
        const result = await fetchMoreSourcingSession(sessionId, {});
        const nextSourcingMeta =
          result?.data?.sourcing && typeof result.data.sourcing === "object"
            ? result.data.sourcing
            : {};
        const sessionMeta =
          result?.data?.session && typeof result.data.session === "object"
            ? result.data.session
            : {};
        const nextMapped = await fetchAllSessionProfilesFromFj(sessionId, {
          expectedProfileCount:
            typeof nextSourcingMeta.total_display_count === "number"
              ? nextSourcingMeta.total_display_count
              : typeof nextSourcingMeta.newProfilesCount === "number"
                ? nextSourcingMeta.newProfilesCount
                : null,
          profileMatchingStatus:
            typeof nextSourcingMeta.profileMatchingStatus === "string"
              ? nextSourcingMeta.profileMatchingStatus
              : typeof sessionMeta.profileMatchingStatus === "string"
                ? sessionMeta.profileMatchingStatus
                : "processing",
        });

        return {
          fetchMoreResult: result,
          mapped: nextMapped,
          sourcingMeta: nextSourcingMeta,
        };
      }
    );

    await persistCandidateDetails({
      userId,
      sourcingSessionId: sessionId,
      profilesRes: mapped.futureJobsProfiles,
      loggerHandler: "candidates/session/fetch-more",
    });

    const storedCount = await syncSourcingSessionStoredCount(sessionId);

    // Future Jobs fetch-more often returns only the new batch. Rebuild the response
    // from our DB so clients get existing + newly fetched profiles together.
    const storedRows = await SourcedCandidateDetail.find({
      sourcingSessionId: sessionId,
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(STORED_CANDIDATES_ALL_LIMIT)
      .lean();
    const storedDocs = storedRows
      .map((r) => r?.rawDoc)
      .filter((d) => d && typeof d === "object");
    const fjDocs = Array.isArray(mapped.futureJobsProfiles?.data?.docs)
      ? mapped.futureJobsProfiles.data.docs
      : [];
    const mergedDocs = [];
    const seenDocKeys = new Set();
    for (const doc of [...storedDocs, ...fjDocs]) {
      if (mergedDocs.length >= STORED_CANDIDATES_ALL_LIMIT) break;
      const id = doc?._id != null ? String(doc._id).trim() : "";
      const linkedin = String(doc?.profile?.linkedin_profile_url || "")
        .trim()
        .toLowerCase();
      const key = id || (linkedin ? `li:${linkedin}` : "");
      if (key) {
        if (seenDocKeys.has(key)) continue;
        seenDocKeys.add(key);
      }
      mergedDocs.push(doc);
    }
    const responseMapped = mapProfilesResToLists(
      buildProfilesResWithDocs(mapped.futureJobsProfiles || {}, mergedDocs)
    );

    const docs = responseMapped.futureJobsProfiles?.data?.docs;
    const docCount = Array.isArray(docs) ? docs.length : 0;
    const canFetchMore = canFetchMoreFromFjSourcing(sourcingMeta);

    await incrementUserUsage(String(userId), "candidateSearches");

    logApi("candidates/session/fetch-more", "success", {
      userId,
      sessionId,
      docCount,
      storedCount,
      canFetchMore,
    });

    return res.status(200).json({
      success: true,
      sessionId,
      canFetchMore,
      storedProfileCount: Math.max(storedCount, docCount),
      fetchMoreResult,
      candidates: responseMapped.candidates,
      profilesPagination: {
        totalDocs: Math.max(storedCount, docCount),
        page: 1,
        limit: Math.max(storedCount, docCount) || PROFILE_FETCH_PAGE_LIMIT,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
      futureJobsProfiles: responseMapped.futureJobsProfiles,
    });
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    const status = error.statusCode || 500;
    logApi("candidates/session/fetch-more", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to fetch more profiles",
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

    const owned = await findSessionInScope(userId, sessionId);

    if (!owned) {
      return res.status(403).json({
        success: false,
        message:
          "This sourcing session was not found for your account, or it was created before history was enabled.",
      });
    }

    if (parseQueryBool(req.query.metaOnly, false)) {
      return res.status(200).json({
        success: true,
        sessionId,
        prompt: typeof owned.prompt === "string" ? owned.prompt : "",
        sessionTitle: typeof owned.sessionTitle === "string" ? owned.sessionTitle : "",
        filterForm: filterFormForApi(owned?.filterForm),
      });
    }

    const loadAll = parseQueryBool(req.query.all, false);
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = loadAll
      ? STORED_CANDIDATES_ALL_LIMIT
      : clampInt(req.query.limit, 1, 100, 20);
    const skip = loadAll ? 0 : (page - 1) * limit;

    // Access already gated by findSessionInScope — include every stored profile for this session.
    const filter = {
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

    const displayedCount = detailedDocs.length;

    return res.status(200).json({
      success: true,
      sessionId,
      page: loadAll ? 1 : page,
      limit: loadAll ? displayedCount : limit,
      canFetchMore: true,
      detailedDocs,
      candidates,
      profilesPagination: loadAll
        ? {
            totalDocs,
            page: 1,
            limit: displayedCount || limit,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: null,
            prevPage: null,
          }
        : profilesPagination,
      filterForm: filterFormForApi(owned?.filterForm),
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

    const scopeFilter =
      (await userIdFilterForActor(userId)) || {
        userId: new mongoose.Types.ObjectId(userId),
      };
    const baseFilter = { ...scopeFilter };
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
 * Admin: sourcing sessions (optional userId, from/to dates).
 */
const listSourcingSessionsAdmin = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 1, 200, 50);
    const userFilter =
      req.query.userId != null && String(req.query.userId).trim() !== ""
        ? String(req.query.userId).trim()
        : "";
    const fromDate = parseAdminDateFilter(req.query.from, "start");
    const toDate = parseAdminDateFilter(req.query.to, "end");

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range: from must be on or before to",
      });
    }

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

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
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
      from: fromDate ? fromDate.toISOString() : undefined,
      to: toDate ? toDate.toISOString() : undefined,
    });

    const storedCountScope = {};
    if (userFilter) {
      storedCountScope.userId = new mongoose.Types.ObjectId(userFilter);
    }

    const storedCountBySession = await storedProfileCountBySessionIds(
      docs.map((d) => d.futureJobsSessionId),
      storedCountScope
    );

    return res.status(200).json({
      success: true,
      sessions: docs.map((d) => serializeSourcingSessionListItem(d, storedCountBySession)),
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
 * POST /api/candidates/claim-public-search
 * Body: { futureJobsSessionId, prompt?, filterForm? }
 * Links a landing-page public search session to the authenticated user.
 */
const claimPublicSearch = async (req, res) => {
  const userId = req.auth?.userId;

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const futureJobsSessionId = String(req.body?.futureJobsSessionId || "").trim();
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const filterForm =
      req.body?.filterForm && typeof req.body.filterForm === "object"
        ? req.body.filterForm
        : null;

    if (!futureJobsSessionId) {
      return res.status(400).json({
        success: false,
        message: "futureJobsSessionId is required",
      });
    }

    const existing = await SourcingSession.findOne({ futureJobsSessionId }).lean();
    if (existing) {
      if (String(existing.userId) !== String(userId)) {
        return res.status(409).json({
          success: false,
          message: "This search is already linked to another account.",
        });
      }
      return res.status(200).json({
        success: true,
        futureJobsSessionId,
        alreadyClaimed: true,
        savedSessionId: String(existing._id),
      });
    }

    const { buildApplyPayload } = require("../services/publicCandidateSearchService");

    let payload = { sessionTitle: prompt };
    let resolvedFilterForm = filterForm;
    if (prompt && filterForm) {
      try {
        const built = buildApplyPayload(prompt, filterForm);
        payload = built.payload;
        resolvedFilterForm = built.filterForm;
      } catch (buildErr) {
        logApi("candidates/claim-public-search", "build payload skipped", {
          userId,
          futureJobsSessionId,
          message: buildErr?.message,
        });
      }
    }

    logApi("candidates/claim-public-search", "fetch profiles", {
      userId,
      futureJobsSessionId,
    });

    const mapped = await fetchAllSessionProfilesFromFj(futureJobsSessionId);
    const { candidates, profilesPagination, futureJobsProfiles } = mapped;

    let profilesFetchError = null;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      profilesFetchError =
        typeof futureJobsProfiles?.message === "string"
          ? futureJobsProfiles.message
          : "No profiles loaded for this session yet.";
    }

    const savedSessionId = await persistSourcingSessionRow({
      userId,
      sessionId: futureJobsSessionId,
      prompt,
      payload,
      usingSessionOverride: false,
      futureJobs: null,
      profilesPagination,
      candidates: Array.isArray(candidates) ? candidates : [],
      profilesFetchError,
      filterForm: resolvedFilterForm,
    });

    if (futureJobsProfiles) {
      await persistCandidateDetails({
        userId,
        sourcingSessionId: futureJobsSessionId,
        profilesRes: futureJobsProfiles,
        loggerHandler: "candidates/claim-public-search",
      });
    }

    logApi("candidates/claim-public-search", "success", {
      userId,
      futureJobsSessionId,
      savedSessionId,
      candidateCount: Array.isArray(candidates) ? candidates.length : 0,
    });

    return res.status(200).json({
      success: true,
      futureJobsSessionId,
      savedSessionId: savedSessionId ?? undefined,
      candidateCount: Array.isArray(candidates) ? candidates.length : 0,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/claim-public-search", "error", {
      userId,
      status,
      message: error.message,
      detailsPreview: error.details
        ? safeJsonPreview(error.details, 500)
        : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to claim public search",
      details: error.details,
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

    const scopeFilter =
      (await userIdFilterForActor(userId)) || {
        userId: new mongoose.Types.ObjectId(userId),
      };
    const docs = await SourcingSession.find(scopeFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "fullName email")
      .lean();

    const storedCountBySession = await storedProfileCountBySessionIds(
      docs.map((d) => d.futureJobsSessionId),
      scopeFilter
    );

    logApi("candidates/sessions", "list", {
      userId,
      count: docs.length,
      limit,
    });

    return res.status(200).json({
      success: true,
      sessions: docs.map((d) => serializeSourcingSessionListItem(d, storedCountBySession)),
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
    const scopeFilter =
      (await userIdFilterForActor(userId)) || {
        userId: new mongoose.Types.ObjectId(userId),
      };
    const docs = await SourcingSession.find(scopeFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const storedCountBySession = await storedProfileCountBySessionIds(
      docs.map((d) => d.futureJobsSessionId),
      scopeFilter
    );

    const searches = docs
      .map((d) => {
        const sid =
          typeof d.futureJobsSessionId === "string" ? d.futureJobsSessionId.trim() : "";
        const storedCount = sid ? storedCountBySession[sid] : undefined;
        const totalDocs =
          typeof storedCount === "number"
            ? storedCount
            : typeof d.totalDocs === "number"
              ? d.totalDocs
              : null;
        return {
          id: d._id.toString(),
          futureJobsSessionId: sid,
          text:
            typeof d.prompt === "string" && d.prompt.trim()
              ? d.prompt.trim()
              : typeof d.sessionTitle === "string" && d.sessionTitle.trim()
                ? d.sessionTitle.trim()
                : "",
          totalDocs,
          createdAt: d.createdAt,
        };
      })
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
    const owned = await findSessionInScope(userId, sourcingSessionId);
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
 * POST /api/candidates/revealed-contacts/lookup
 * Body: { linkedinUrls: string[] }
 * Returns contacts already unlocked for this user (no external API, no credits).
 */
const lookupRevealedContactsHandler = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const linkedinUrls = Array.isArray(req.body?.linkedinUrls)
      ? req.body.linkedinUrls
      : [];

    const contacts = await lookupUserRevealedContacts(userId, linkedinUrls);

    return res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load revealed contacts",
    });
  }
};

/**
 * POST /api/candidates/reveal-contacts/bulk
 * Body: {
 *   items: { sourcingSessionId, linkedin_profile_url }[],
 *   revealTypes?: ("EMAIL"|"PHONE")[]
 * }
 */
const bulkRevealContactsHandler = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const revealTypes = Array.isArray(req.body?.revealTypes)
      ? req.body.revealTypes
          .map((t) => String(t || "").trim().toUpperCase())
          .filter((t) => t === "EMAIL" || t === "PHONE")
      : ["EMAIL", "PHONE"];

    const preflightOnly = Boolean(req.body?.preflightOnly);

    if (preflightOnly) {
      // Credit check only — FE sends totals, not the full candidate payload.
      const emailNeeded = Math.min(
        2000,
        Math.max(0, Math.floor(Number(req.body?.emailNeeded) || 0))
      );
      const phoneNeeded = Math.min(
        2000,
        Math.max(0, Math.floor(Number(req.body?.phoneNeeded) || 0))
      );
      try {
        if (emailNeeded > 0) {
          await assertQuotaAvailableByUserId(userId, "emailUnveils", emailNeeded);
        }
        if (phoneNeeded > 0) {
          await assertQuotaAvailableByUserId(userId, "mobileUnveils", phoneNeeded);
        }
        return res.status(200).json({
          success: true,
          ready: true,
          emailNeeded,
          phoneNeeded,
        });
      } catch (error) {
        if (respondIfQuotaExceeded(res, error)) {
          return;
        }
        throw error;
      }
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items array is required",
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 candidates per bulk reveal",
      });
    }

    const { runBulkRevealItems } = require("../services/bulkRevealService");
    let results;
    try {
      results = await runBulkRevealItems(userId, items, revealTypes);
    } catch (error) {
      if (respondIfQuotaExceeded(res, error)) {
        return;
      }
      throw error;
    }

    logApi("candidates/reveal-contacts/bulk", "success", {
      userId,
      count: results.length,
    });

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    if (respondIfQuotaExceeded(res, error)) return;
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Bulk reveal failed",
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

async function buildSavedListMongoFilter(userId, listFilter) {
  const scope =
    (await userIdFilterForActor(userId)) || {
      userId: new mongoose.Types.ObjectId(userId),
    };
  const filter = { ...scope };
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

    const scopeFilter =
      (await userIdFilterForActor(userId)) || {
        userId: new mongoose.Types.ObjectId(userId),
      };

    if (parseQueryBool(req.query.keysOnly, false)) {
      const rows = await SavedCandidate.find(scopeFilter)
        .select("candidateId sourcingSessionId linkedinProfileUrl name saveListId")
        .lean();

      return res.status(200).json({
        success: true,
        keyRows: rows.map((r) => ({
          candidateId: r.candidateId || "",
          sourcingSessionId: r.sourcingSessionId || "",
          linkedin_profile_url: r.linkedinProfileUrl || "",
          name: r.name || "",
          saveListId: r.saveListId ? r.saveListId.toString() : "",
        })),
      });
    }

    const listFilter = String(
      req.query.listFilter ?? req.query.list ?? "__all__"
    ).trim();
    const page = clampInt(req.query.page, 1, 100000, 1);
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const skip = (page - 1) * limit;
    const filter = await buildSavedListMongoFilter(userId, listFilter);

    const [totalSavedCount, totalDocs, rows] = await Promise.all([
      SavedCandidate.countDocuments(scopeFilter),
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

    // Save-to-list only categorizes search results — no unlock/unveil credits.
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
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

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
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save candidate",
    });
  }
};

const BULK_SAVE_MAX = 300;
const BULK_SAVE_CHUNK = 50;

/**
 * POST /api/candidates/saved/bulk
 * Body: { candidates: Array<{...}>, saveListId?: string }
 * One round-trip for large multi-select saves — avoids UI + event-loop stalls.
 */
const bulkSaveCandidates = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const rawItems = Array.isArray(req.body?.candidates) ? req.body.candidates : [];
    if (rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "candidates array is required",
      });
    }
    if (rawItems.length > BULK_SAVE_MAX) {
      return res.status(400).json({
        success: false,
        message: `You can save at most ${BULK_SAVE_MAX} candidates at once`,
      });
    }

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

    const uid = new mongoose.Types.ObjectId(userId);
    const normalized = [];
    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue;
      const candidateId = String(item.candidateId || "").trim();
      const sourcingSessionId = String(item.sourcingSessionId || "").trim();
      const linkedinProfileUrl = String(item.linkedin_profile_url || "").trim();
      if (!candidateId && !linkedinProfileUrl) continue;
      normalized.push({
        candidateId,
        sourcingSessionId,
        linkedinProfileUrl,
        name: String(item.name || "").trim(),
        role: String(item.role || "").trim(),
        currentCompany: String(item.currentCompany || "").trim(),
        location: String(item.location || "").trim(),
        experience: String(item.experience || "").trim(),
        finalScore: typeof item.finalScore === "number" ? item.finalScore : null,
        highlights: Array.isArray(item.highlights)
          ? item.highlights
              .map((x) => String(x || "").trim())
              .filter((x) => x !== "")
              .slice(0, 20)
          : [],
        recommendation: String(item.recommendation || "").trim(),
        status: String(item.status || "Saved").trim() || "Saved",
      });
    }

    if (normalized.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid candidates to save",
      });
    }

    const orClauses = [];
    for (const row of normalized) {
      if (row.candidateId) {
        orClauses.push({
          userId: uid,
          sourcingSessionId: row.sourcingSessionId,
          candidateId: row.candidateId,
        });
      } else if (row.linkedinProfileUrl) {
        orClauses.push({
          userId: uid,
          sourcingSessionId: row.sourcingSessionId,
          linkedinProfileUrl: row.linkedinProfileUrl,
        });
      }
    }

    const existingRows =
      orClauses.length > 0
        ? await SavedCandidate.find({ $or: orClauses })
            .select("candidateId sourcingSessionId linkedinProfileUrl saveListId")
            .lean()
        : [];

    const existingByIdentity = new Map();
    for (const row of existingRows) {
      const sid = String(row.sourcingSessionId || "");
      if (row.candidateId) {
        existingByIdentity.set(`id:${sid}:${row.candidateId}`, row);
      }
      if (row.linkedinProfileUrl) {
        existingByIdentity.set(`li:${sid}:${row.linkedinProfileUrl}`, row);
      }
    }

    let newCount = 0;
    let moveCount = 0;
    let sameCount = 0;
    const ops = [];
    const targetListKey = saveListIdToSet ? saveListIdToSet.toString() : "";

    for (const row of normalized) {
      const sid = row.sourcingSessionId;
      const existing =
        (row.candidateId && existingByIdentity.get(`id:${sid}:${row.candidateId}`)) ||
        (row.linkedinProfileUrl &&
          existingByIdentity.get(`li:${sid}:${row.linkedinProfileUrl}`)) ||
        null;

      if (existing) {
        const currentList = existing.saveListId ? existing.saveListId.toString() : "";
        if (currentList === targetListKey) {
          sameCount += 1;
          continue;
        }
        moveCount += 1;
      } else {
        newCount += 1;
      }

      const filter = row.candidateId
        ? { userId: uid, sourcingSessionId: sid, candidateId: row.candidateId }
        : {
            userId: uid,
            sourcingSessionId: sid,
            linkedinProfileUrl: row.linkedinProfileUrl,
          };

      ops.push({
        updateOne: {
          filter,
          update: {
            $set: {
              userId: uid,
              sourcingSessionId: sid,
              candidateId: row.candidateId,
              linkedinProfileUrl: row.linkedinProfileUrl,
              name: row.name,
              role: row.role,
              currentCompany: row.currentCompany,
              location: row.location,
              experience: row.experience,
              finalScore: row.finalScore,
              highlights: row.highlights,
              recommendation: row.recommendation,
              status: row.status,
              saveListId: saveListIdToSet,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      return res.status(200).json({
        success: true,
        saved: 0,
        moved: 0,
        alreadyOnList: sameCount,
        processed: 0,
        saveListId: targetListKey,
      });
    }

    // Save-to-list only categorizes search results — no unlock/unveil credits.
    for (let i = 0; i < ops.length; i += BULK_SAVE_CHUNK) {
      const chunk = ops.slice(i, i + BULK_SAVE_CHUNK);
      await SavedCandidate.bulkWrite(chunk, { ordered: false });
      // Yield so other HTTP / socket work can run during large saves.
      await new Promise((resolve) => setImmediate(resolve));
    }

    return res.status(200).json({
      success: true,
      saved: newCount,
      moved: moveCount,
      alreadyOnList: sameCount,
      processed: ops.length,
      saveListId: targetListKey,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save candidates",
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

/**
 * Normalize Future Jobs autocomplete payloads into a flat string list.
 * Accepts string arrays or objects with value/label/name/text/region.
 */
function normalizeFilterAutocompleteSuggestions(payload) {
  const root =
    payload?.data !== undefined
      ? payload.data
      : payload?.suggestions !== undefined
        ? payload.suggestions
        : payload;

  const list = Array.isArray(root)
    ? root
    : Array.isArray(root?.list)
      ? root.list
      : Array.isArray(root?.suggestions)
        ? root.suggestions
        : Array.isArray(root?.results)
          ? root.results
          : Array.isArray(root?.items)
            ? root.items
            : Array.isArray(root?.docs)
              ? root.docs
              : [];

  const out = [];
  const seen = new Set();
  for (const item of list) {
    let value = "";
    if (typeof item === "string") {
      value = item.trim();
    } else if (item && typeof item === "object") {
      value = String(
        item.value ??
          item.label ??
          item.name ??
          item.text ??
          item.region ??
          item.query ??
          ""
      ).trim();
    }
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * GET /api/candidates/filters/autocomplete
 * Proxy Future Jobs filter autocomplete (region, etc.). API key stays on the server.
 */
const filterAutocomplete = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    const filterType = String(
      req.query?.filter_type || req.query?.filterType || "region"
    ).trim() || "region";
    const query = String(req.query?.query || req.query?.q || "").trim();
    const limit = Number(req.query?.limit) || 10;

    if (query.length < 3) {
      return res.status(400).json({
        success: false,
        message: "query must be at least 3 characters",
      });
    }

    logApi("candidates/filters/autocomplete", "incoming", {
      userId,
      filterType,
      queryLength: query.length,
      limit,
    });

    const futureJobs = await getFilterAutocomplete({
      filterType,
      query,
      limit,
    });

    const suggestions = normalizeFilterAutocompleteSuggestions(futureJobs);

    logApi("candidates/filters/autocomplete", "success", {
      userId,
      filterType,
      suggestionCount: suggestions.length,
    });

    return res.status(200).json({
      success: true,
      filterType,
      query,
      suggestions,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/filters/autocomplete", "error", {
      userId,
      status,
      message: error.message,
    });
    return res.status(status).json({
      success: false,
      code: error.code,
      message: error.message || "Failed to autocomplete filter",
      details: error.details,
    });
  }
};

module.exports = {
  searchCandidates,
  annotateSearchPrompt,
  createSearchSession,
  applySearchFilters,
  claimPublicSearch,
  getSessionCandidateDetails,
  loadSessionProfiles,
  fetchMoreSessionProfiles,
  loadStoredSessionCandidates,
  listAllSourcedCandidates,
  listAllSourcedCandidatesAdmin,
  listSourcingSessionsAdmin,
  listSourcingSessions,
  listRecentSearches,
  revealCandidateContact,
  lookupRevealedContactsHandler,
  bulkRevealContactsHandler,
  listSaveLists,
  createSaveList,
  deleteSaveList,
  listSavedCandidates,
  saveCandidate,
  bulkSaveCandidates,
  unsaveCandidate,
  filterAutocomplete,
};
