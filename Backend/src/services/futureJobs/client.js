const { getFutureJobsConfig } = require("./config");
const { logOutbound, safeJsonPreview } = require("../../utils/logger");

function assertFutureJobsApiKey(apiKey) {
  if (!apiKey) {
    const err = new Error(
      "FUTURE_JOBS_API_KEY is not configured in environment",
    );
    err.statusCode = 503;
    throw err;
  }
}

/** Same auth as POST /wl/sourcing-session */
function buildFjAuthHeaders(apiKey) {
  const authHeaders =
    process.env.FUTURE_JOBS_AUTH_STYLE === "bearer"
      ? { Authorization: `Bearer ${apiKey}` }
      : process.env.FUTURE_JOBS_AUTH_STYLE === "x-api-key"
        ? { "X-Api-Key": apiKey }
        : { "x-fj-api-key": apiKey };

  return authHeaders;
}

function fjAuthStyleLabel() {
  return process.env.FUTURE_JOBS_AUTH_STYLE === "bearer"
    ? "bearer"
    : process.env.FUTURE_JOBS_AUTH_STYLE === "x-api-key"
      ? "x-api-key"
      : "x-fj-api-key";
}

/**
 * POST /wl/sourcing-session — create sourcing session on Future Jobs API.
 * @param {object} body — full JSON body (sessionTitle, jdDetail, queries, …)
 * @returns {Promise<object>} Parsed JSON response body
 */
const createSourcingSession = async (body) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "createSourcingSession aborted — missing API key",
      {},
    );
    throw e;
  }

  const url = `${baseUrl}/wl/sourcing-session`;
  const authHeaders = buildFjAuthHeaders(apiKey);
  const authStyle = fjAuthStyleLabel();

  logOutbound("futurejobs", "request POST /wl/sourcing-session", {
    url,
    authStyle,
    apiKeyConfigured: Boolean(apiKey),
    sessionTitle: body?.sessionTitle,
    bodyPreview: safeJsonPreview(body),
  });

  const started = Date.now();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  if (!res.ok) {
    logOutbound("futurejobs", "response error", {
      httpStatus: res.status,
      elapsedMs,
      message: data.message || data.status || data.error,
      responseBody: data,
      responseBodyJson: JSON.stringify(data),
    });
    const msg =
      data.message ||
      data.status ||
      data.error ||
      `Future Jobs API HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = 502;
    err.details = data;
    throw err;
  }

  logOutbound("futurejobs", "response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    statusCode: data.statusCode,
    message: data.message,
    sessionId: data?.data?.session?._id,
    totalDisplayCount: data?.data?.sourcing?.total_display_count,
    responseBody: data,
    responseBodyJson: JSON.stringify(data),
  });

  return data;
};

/**
 * GET /wl/sourcing-session/:sessionId/profiles — paginated profiles for a session.
 * @param {string} sessionId
 * @param {{ page?: number, limit?: number }} [opts]
 * @returns {Promise<object>} Parsed JSON response body
 */
const getSourcingSessionProfiles = async (
  sessionId,
  { page = 1, limit = 20 } = {},
) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "getSourcingSessionProfiles aborted — missing API key",
      {},
    );
    throw e;
  }

  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required to fetch profiles");
    err.statusCode = 400;
    throw err;
  }

  const params = new URLSearchParams({
    page: String(Math.max(1, Math.floor(Number(page)) || 1)),
    limit: String(Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20))),
  });

  const url = `${baseUrl}/wl/sourcing-session/${encodeURIComponent(sessionId)}/profiles?${params}`;
  const authHeaders = buildFjAuthHeaders(apiKey);
  const authStyle = fjAuthStyleLabel();

  logOutbound("futurejobs", "request GET …/sourcing-session/:id/profiles", {
    url,
    authStyle,
    apiKeyConfigured: Boolean(apiKey),
    sessionId,
    page: params.get("page"),
    limit: params.get("limit"),
  });

  const started = Date.now();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  if (!res.ok) {
    logOutbound("futurejobs", "profiles response error", {
      httpStatus: res.status,
      elapsedMs,
      message: data.message || data.status || data.error,
      responseBody: data,
      responseBodyJson: JSON.stringify(data),
    });
    const msg =
      data.message ||
      data.status ||
      data.error ||
      `Future Jobs profiles HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = 502;
    err.details = data;
    throw err;
  }

  logOutbound("futurejobs", "profiles response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    docCount: Array.isArray(data?.data?.docs) ? data.data.docs.length : 0,
    totalDocs: data?.data?.totalDocs,
    page: data?.data?.page,
    responseBody: data,
    responseBodyJson: JSON.stringify(data),
  });

  return data;
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function profilesResponseDocCount(profilesRes) {
  const docs = profilesRes?.data?.docs;
  return Array.isArray(docs) ? docs.length : 0;
}

function profilesResponseTotalDocs(profilesRes) {
  const n = profilesRes?.data?.totalDocs;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Poll GET …/profiles until docs exist or timeout. Future Jobs often returns empty
 * docs immediately after session create while profileMatchingStatus is "processing".
 *
 * @param {string} sessionId
 * @param {{ page?: number, limit?: number, maxWaitMs?: number, intervalMs?: number, expectedProfileCount?: number|null, profileMatchingStatus?: string|null }} [opts]
 */
async function getSourcingSessionProfilesWhenReady(
  sessionId,
  {
    page = 1,
    limit = 20,
    maxWaitMs = 90000,
    intervalMs = 3000,
    expectedProfileCount = null,
    profileMatchingStatus = null,
  } = {},
) {
  const expected =
    typeof expectedProfileCount === "number" && Number.isFinite(expectedProfileCount)
      ? Math.max(0, Math.floor(expectedProfileCount))
      : null;
  const status =
    typeof profileMatchingStatus === "string"
      ? profileMatchingStatus.trim().toLowerCase()
      : "";
  const shouldPoll =
    expected > 0 ||
    status === "processing" ||
    status === "pending" ||
    status === "in_progress";

  if (!shouldPoll) {
    return getSourcingSessionProfiles(sessionId, { page, limit });
  }

  const started = Date.now();
  let attempt = 0;
  let lastRes = null;

  while (Date.now() - started <= maxWaitMs) {
    attempt += 1;
    lastRes = await getSourcingSessionProfiles(sessionId, { page, limit });
    const docCount = profilesResponseDocCount(lastRes);
    const totalDocs = profilesResponseTotalDocs(lastRes);

    if (docCount > 0 || totalDocs > 0) {
      logOutbound("futurejobs", "profiles ready after poll", {
        sessionId,
        attempt,
        waitedMs: Date.now() - started,
        docCount,
        totalDocs,
      });
      return lastRes;
    }

    if (Date.now() - started + intervalMs > maxWaitMs) {
      break;
    }

    logOutbound("futurejobs", "profiles empty — waiting for matching", {
      sessionId,
      attempt,
      waitedMs: Date.now() - started,
      expectedProfileCount: expected,
      profileMatchingStatus: status || undefined,
      nextPollInMs: intervalMs,
    });
    await sleep(intervalMs);
  }

  logOutbound("futurejobs", "profiles poll timeout — returning last response", {
    sessionId,
    attempt,
    waitedMs: Date.now() - started,
    expectedProfileCount: expected,
  });
  return (
    lastRes ||
    (await getSourcingSessionProfiles(sessionId, { page, limit }))
  );
}

/**
 * POST /wl/sourcing-session/:sessionId/fetch-more — ask Future Jobs to load more candidates into the session.
 * @param {string} sessionId
 * @param {object} [body] — defaults to {}
 * @returns {Promise<object>} Parsed JSON response body
 */
const fetchMoreSourcingSession = async (sessionId, body = {}) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "fetchMoreSourcingSession aborted — missing API key",
      {},
    );
    throw e;
  }

  if (!sessionId || typeof sessionId !== "string") {
    const err = new Error("sessionId is required for fetch-more");
    err.statusCode = 400;
    throw err;
  }

  const url = `${baseUrl}/wl/sourcing-session/${encodeURIComponent(sessionId)}/fetch-more`;
  const authHeaders = buildFjAuthHeaders(apiKey);
  const authStyle = fjAuthStyleLabel();
  const payload = body && typeof body === "object" ? body : {};

  logOutbound("futurejobs", "request POST …/sourcing-session/:id/fetch-more", {
    url,
    authStyle,
    sessionId,
    bodyPreview: safeJsonPreview(payload),
  });

  const started = Date.now();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  if (!res.ok) {
    logOutbound("futurejobs", "fetch-more response error", {
      httpStatus: res.status,
      elapsedMs,
      message: data.message || data.status || data.error,
      responseBody: data,
      responseBodyJson: JSON.stringify(data),
    });
    const msg =
      data.message ||
      data.status ||
      data.error ||
      `Future Jobs fetch-more HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = 502;
    err.details = data;
    throw err;
  }

  logOutbound("futurejobs", "fetch-more response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    message: data.message,
    responseBody: data,
    responseBodyJson: JSON.stringify(data),
  });

  return data;
};

/**
 * POST /wl/sourcing-session/contact/reveal?sourcingSessionId=&linkedin_profile_url=&revealType=
 * @param {string} sourcingSessionId
 * @param {string} linkedinProfileUrl
 * @param {"PHONE"|"EMAIL"} revealType
 * @returns {Promise<object>}
 */
const revealSourcingSessionContact = async (
  sourcingSessionId,
  linkedinProfileUrl,
  revealType,
) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "revealSourcingSessionContact aborted — missing API key",
      {},
    );
    throw e;
  }

  const sessionId = String(sourcingSessionId || "").trim();
  const profileUrl = String(linkedinProfileUrl || "").trim();
  const type = String(revealType || "").toUpperCase();
  if (!sessionId || !profileUrl || (type !== "PHONE" && type !== "EMAIL")) {
    const err = new Error(
      "sourcingSessionId, linkedin_profile_url and revealType (PHONE|EMAIL) are required",
    );
    err.statusCode = 400;
    throw err;
  }

  const params = new URLSearchParams({
    sourcingSessionId: sessionId,
    linkedin_profile_url: profileUrl,
    revealType: type,
  });
  const url = `${baseUrl}/wl/sourcing-session/contact/reveal?${params.toString()}`;
  const authHeaders = buildFjAuthHeaders(apiKey);

  logOutbound("futurejobs", "request POST …/sourcing-session/contact/reveal", {
    url,
    revealType: type,
    sourcingSessionId: sessionId,
  });

  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  if (!res.ok) {
    logOutbound("futurejobs", "reveal contact response error", {
      httpStatus: res.status,
      elapsedMs,
      message: data.message || data.status || data.error,
      bodyPreview: safeJsonPreview(data),
    });
    const msg =
      data.message ||
      data.status ||
      data.error ||
      `Future Jobs reveal contact HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = 502;
    err.details = data;
    throw err;
  }

  logOutbound("futurejobs", "reveal contact response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    message: data.message,
    revealType: type,
  });

  return data;
};

/**
 * POST /wl/scout-people/lookup
 * Body: { "email": "..." } OR { "linkedin_url": "..." }
 * @param {{ email?: string, linkedin_url?: string }} body
 * @returns {Promise<object>}
 */
const scoutPeopleLookup = async (body) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "scoutPeopleLookup aborted — missing API key",
      {},
    );
    throw e;
  }

  const payload =
    body && typeof body.email === "string" && body.email.trim()
      ? { email: body.email.trim() }
      : body &&
          typeof body.linkedin_url === "string" &&
          body.linkedin_url.trim()
        ? { linkedin_url: body.linkedin_url.trim() }
        : null;

  if (!payload) {
    const err = new Error("Provide email or linkedin_url");
    err.statusCode = 400;
    throw err;
  }

  const url = `${baseUrl}/wl/scout-people/lookup`;
  const authHeaders = buildFjAuthHeaders(apiKey);
  const authStyle = fjAuthStyleLabel();

  logOutbound("futurejobs", "request POST /wl/scout-people/lookup", {
    url,
    authStyle,
    keys: Object.keys(payload),
    bodyPreview: safeJsonPreview(payload),
  });

  const started = Date.now();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  if (!res.ok) {
    logOutbound("futurejobs", "scout-people lookup response error", {
      httpStatus: res.status,
      elapsedMs,
      message: data.message || data.status || data.error,
      responseBody: data,
      responseBodyJson: JSON.stringify(data),
    });
    const msg =
      data.message ||
      data.status ||
      data.error ||
      `Future Jobs scout-people lookup HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = 502;
    err.details = data;
    throw err;
  }

  logOutbound("futurejobs", "scout-people lookup response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    statusCode: data.statusCode,
    message: data.message,
    scoutId: data?.data?.scoutId,
    responseBody: data,
    responseBodyJson: JSON.stringify(data),
  });

  return data;
};

/**
 * POST /wl/scout-people/reveal-contacts
 * Body: { linkedin_profile_url, revealContactType: ["email"] | ["phone"] }
 * @param {string} linkedinProfileUrl
 * @param {"PHONE"|"EMAIL"} revealType
 * @returns {Promise<object>}
 */
const scoutPeopleRevealContact = async (linkedinProfileUrl, revealType) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "scoutPeopleRevealContact aborted — missing API key",
      {},
    );
    throw e;
  }

  const profileUrl = String(linkedinProfileUrl || "").trim();
  const type = String(revealType || "").toUpperCase();
  if (!profileUrl || (type !== "PHONE" && type !== "EMAIL")) {
    const err = new Error(
      "linkedin_profile_url and revealType (PHONE|EMAIL) are required",
    );
    err.statusCode = 400;
    throw err;
  }

  const revealContactType = type === "EMAIL" ? ["email"] : ["phone"];

  const url = `${baseUrl}/wl/scout-people/reveal-contacts`;
  const authHeaders = buildFjAuthHeaders(apiKey);

  const body = JSON.stringify({
    linkedin_profile_url: profileUrl,
    revealContactType,
  });

  logOutbound("futurejobs", "request POST /wl/scout-people/reveal-contacts", {
    url,
    revealContactType,
    linkedinProfileUrlLen: profileUrl.length,
  });

  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body,
  });

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  if (!res.ok) {
    logOutbound("futurejobs", "scout reveal-contacts response error", {
      httpStatus: res.status,
      elapsedMs,
      message: data.message || data.status || data.error,
      bodyPreview: safeJsonPreview(data),
    });
    const msg =
      data.message ||
      data.status ||
      data.error ||
      `Future Jobs scout reveal-contacts HTTP ${res.status}`;
    const err = new Error(msg);
    err.statusCode = 502;
    err.details = data;
    throw err;
  }

  logOutbound("futurejobs", "scout reveal-contacts response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    message: data.message,
    revealType: type,
  });

  return data;
};

module.exports = {
  createSourcingSession,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
};
