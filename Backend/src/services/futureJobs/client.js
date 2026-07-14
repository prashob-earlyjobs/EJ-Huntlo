const { getFutureJobsConfig } = require("./config");
const {
  createFutureJobsUpstreamError,
  throwIfFjHttpNotOk,
} = require("./errors");
const {
  logOutbound,
  safeJsonPreview,
  payloadForSupportLog,
  logFutureJobsExchange,
} = require("../../utils/logger");

/**
 * Perform one Future Jobs HTTP call and emit a single support log with request + response.
 */
async function futureJobsHttpRequest({
  method,
  url,
  body,
  apiKey,
  fjOperation,
  traceId,
  defaultErrorPrefix = "Future Jobs API",
}) {
  const authHeaders = buildFjAuthHeaders(apiKey);
  const hasBody = body !== undefined && body !== null;
  const started = Date.now();

  let res;
  let text = "";
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
    text = await res.text();
  } catch (networkErr) {
    const elapsedMs = Date.now() - started;
    logFutureJobsExchange({
      traceId,
      fjOperation,
      method,
      url,
      elapsedMs,
      ok: false,
      networkError: networkErr?.message || String(networkErr),
      requestBody: payloadForSupportLog(hasBody ? body : undefined),
      responseBody: null,
    });
    throw createFutureJobsUpstreamError({
      details: { networkError: networkErr?.message || String(networkErr) },
      fjHttpStatus: 0,
      fjOperation,
      statusCode: 503,
    });
  }

  const elapsedMs = Date.now() - started;
  let data;
  let parseError = false;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    parseError = true;
    data = { raw: text, parseError: true };
  }

  logFutureJobsExchange({
    traceId,
    fjOperation,
    method,
    url,
    elapsedMs,
    httpStatus: res.status,
    ok: res.ok,
    responseParseError: parseError,
    requestBody: payloadForSupportLog(hasBody ? body : undefined),
    responseBody: payloadForSupportLog(
      parseError ? { parseError: true, raw: text } : data,
    ),
  });

  throwIfFjHttpNotOk(res, data, {
    label: `${fjOperation || defaultErrorPrefix} HTTP ${res.status}`,
    fjOperation,
  });

  return data;
}

const inFlightFutureJobsRequests = new Map();

function dedupeKey(method, url, body = "") {
  return `${method.toUpperCase()} ${url} ${typeof body === "string" ? body : JSON.stringify(body || "")}`;
}

async function futureJobsFetch(url, options = {}, dedupe = false) {
  const method = options.method || "GET";
  const key = dedupe ? dedupeKey(method, url, options.body || "") : "";
  if (key && inFlightFutureJobsRequests.has(key)) {
    logOutbound("futurejobs", "deduped in-flight request", { method, url });
    return inFlightFutureJobsRequests.get(key);
  }

  if (!key) return fetch(url, options);

  const promise = fetch(url, options).then(async (res) => {
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      text: async () => text,
    };
  });

  inFlightFutureJobsRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightFutureJobsRequests.delete(key);
  }
}

function assertFutureJobsApiKey(apiKey) {
  if (!apiKey) {
    throw createFutureJobsUpstreamError({
      details: { reason: "FUTURE_JOBS_API_KEY is not configured in environment" },
      fjHttpStatus: 503,
      statusCode: 503,
    });
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
const createSourcingSession = async (body, opts = {}) => {
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

  return futureJobsHttpRequest({
    method: "POST",
    url,
    body,
    apiKey,
    traceId: opts.traceId,
    fjOperation: "POST /wl/sourcing-session",
    defaultErrorPrefix: "Future Jobs API",
  });
};

/**
 * Future Jobs uses statusCode 207 when create/update is accepted but matching is not ready yet.
 * Callers must not run profiles fetch (or other follow-up FJ calls) in this case.
 */
function isFjSessionPending(data) {
  if (!data || typeof data !== "object") return false;
  return Number(data.statusCode) === 207;
}

function fjSessionPendingMessage(data) {
  const sourcingError =
    typeof data?.data?.sourcingError === "string" ? data.data.sourcingError.trim() : "";
  if (sourcingError) return sourcingError;

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  return "Sourcing session is still being prepared. Please try again in a moment.";
}

/**
 * PATCH /wl/sourcing-session/update-session/:sessionId — update session filters/queries and re-run search.
 * @param {string} sessionId
 * @param {object} body — session fields (queries, jdDetail, sessionTitle, nuances, …)
 */
const updateSourcingSession = async (sessionId, body, opts = {}) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound("futurejobs", "updateSourcingSession aborted — missing API key", {});
    throw e;
  }

  const sid = String(sessionId || "").trim();
  if (!sid) {
    const err = new Error("sessionId is required");
    err.statusCode = 400;
    throw err;
  }

  const url = `${baseUrl}/wl/sourcing-session/update-session/${encodeURIComponent(sid)}`;

  return futureJobsHttpRequest({
    method: "PATCH",
    url,
    body,
    apiKey,
    traceId: opts.traceId,
    fjOperation: "PATCH /wl/sourcing-session/update-session/:id",
    defaultErrorPrefix: "Future Jobs update session",
  });
};

/**
 * GET /wl/sourcing-session/candidate/:candidateId/details — full candidate profile.
 * @param {string} candidateId — session profiles list doc._id
 */
const getSourcingSessionCandidateDetails = async (candidateId) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "getSourcingSessionCandidateDetails aborted — missing API key",
      {},
    );
    throw e;
  }

  const cid = String(candidateId || "").trim();
  if (!cid) {
    const err = new Error("candidateId is required");
    err.statusCode = 400;
    throw err;
  }

  const url = `${baseUrl}/wl/sourcing-session/candidate/${encodeURIComponent(cid)}/details`;
  const authHeaders = buildFjAuthHeaders(apiKey);

  logOutbound("futurejobs", "request GET …/sourcing-session/candidate/:id/details", {
    url,
    candidateId: cid,
  });

  const started = Date.now();
  const res = await futureJobsFetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "candidate details response error",
    extra: { elapsedMs, candidateId: cid },
  });

  logOutbound("futurejobs", "candidate details response ok", {
    httpStatus: res.status,
    elapsedMs,
    candidateId: cid,
    fjStatusCode: data.statusCode,
    fjStatus: data.status,
  });

  return data;
};

/**
 * GET /wl/sourcing-session/:sessionId/profiles — paginated profiles for a session.
 * @param {string} sessionId
 * @param {{ page?: number, limit?: number, pollAttempt?: number }} [opts]
 * @returns {Promise<object>} Parsed JSON response body
 */
const getSourcingSessionProfiles = async (
  sessionId,
  { page = 1, limit = 20, pollAttempt } = {},
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
    limit: String(Math.min(200, Math.max(1, Math.floor(Number(limit)) || 20))),
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

  const res = await futureJobsFetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "profiles response error",
    extra: { elapsedMs },
  });

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
 * @param {{ page?: number, limit?: number, maxWaitMs?: number, intervalMs?: number, expectedProfileCount?: number|null, profileMatchingStatus?: string|null, onPoll?: Function }} [opts]
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
    onPoll = null,
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

  const notifyPoll = (payload) => {
    if (typeof onPoll !== "function") return;
    try {
      onPoll(payload);
    } catch {
      /* ignore listener errors */
    }
  };

  if (!shouldPoll) {
    const res = await getSourcingSessionProfiles(sessionId, {
      page,
      limit,
      pollAttempt: 1,
    });
    notifyPoll({
      sessionId,
      attempt: 1,
      docs: Array.isArray(res?.data?.docs) ? res.data.docs : [],
      totalDocs: profilesResponseTotalDocs(res),
      done: false,
      polling: true,
    });
    return res;
  }

  const started = Date.now();
  let attempt = 0;
  let lastRes = null;

  while (Date.now() - started <= maxWaitMs) {
    attempt += 1;
    lastRes = await getSourcingSessionProfiles(sessionId, {
      page,
      limit,
      pollAttempt: attempt,
    });
    const docCount = profilesResponseDocCount(lastRes);
    const totalDocs = profilesResponseTotalDocs(lastRes);
    const docs = Array.isArray(lastRes?.data?.docs) ? lastRes.data.docs : [];

    notifyPoll({
      sessionId,
      attempt,
      docs,
      totalDocs: totalDocs || docCount,
      done: false,
      polling: true,
    });

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
    (await getSourcingSessionProfiles(sessionId, {
      page,
      limit,
      pollAttempt: attempt + 1,
    }))
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

  const res = await futureJobsFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "fetch-more response error",
    extra: { elapsedMs },
  });

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
  const res = await futureJobsFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "reveal contact response error",
    extra: { elapsedMs },
  });

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

  const res = await futureJobsFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "scout-people lookup response error",
    extra: { elapsedMs },
  });

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
  const res = await futureJobsFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body,
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "scout reveal-contacts response error",
    extra: { elapsedMs },
  });

  logOutbound("futurejobs", "scout reveal-contacts response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    message: data.message,
    revealType: type,
  });

  return data;
};

/**
 * POST /wl/sourcing-session/get-annotation — parse JD text into suggested sourcing filters.
 * @param {{ userText: string, linkedin_profile_url?: string }} body
 */
const getSourcingSessionAnnotation = async (body) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound(
      "futurejobs",
      "getSourcingSessionAnnotation aborted — missing API key",
      {},
    );
    throw e;
  }

  const userText = typeof body?.userText === "string" ? body.userText : "";
  if (!userText || !String(userText).trim()) {
    const err = new Error("userText is required for get-annotation");
    err.statusCode = 400;
    throw err;
  }

  const payload = {
    userText,
    linkedin_profile_url:
      typeof body?.linkedin_profile_url === "string" ? body.linkedin_profile_url : "",
  };

  const url = `${baseUrl}/wl/sourcing-session/get-annotation`;
  const authHeaders = buildFjAuthHeaders(apiKey);

  logOutbound("futurejobs", "request POST /wl/sourcing-session/get-annotation", {
    url,
    userTextLength: userText.length,
    bodyPreview: safeJsonPreview(payload),
  });

  const started = Date.now();
  const res = await futureJobsFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  }, true);

  const elapsedMs = Date.now() - started;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text, parseError: true };
  }

  throwIfFjHttpNotOk(res, data, {
    label: "get-annotation response error",
    extra: { elapsedMs },
  });

  logOutbound("futurejobs", "get-annotation response ok", {
    httpStatus: res.status,
    elapsedMs,
    status: data.status,
    statusCode: data.statusCode,
    fieldCount:
      data?.data && typeof data.data === "object"
        ? Object.keys(data.data).length
        : 0,
  });

  return data;
};

/**
 * GET /wl/sourcing-session/filters/autocomplete — suggest filter values (e.g. region).
 * @param {{ filterType?: string, query: string, limit?: number }} params
 */
const getFilterAutocomplete = async (
  { filterType = "region", query, limit = 10 } = {},
  opts = {},
) => {
  const { baseUrl, apiKey } = getFutureJobsConfig();

  try {
    assertFutureJobsApiKey(apiKey);
  } catch (e) {
    logOutbound("futurejobs", "getFilterAutocomplete aborted — missing API key", {});
    throw e;
  }

  const q = String(query || "").trim();
  if (!q) {
    const err = new Error("query is required");
    err.statusCode = 400;
    throw err;
  }

  const cappedLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const params = new URLSearchParams({
    filter_type: String(filterType || "region").trim() || "region",
    query: q,
    limit: String(cappedLimit),
  });
  const url = `${baseUrl}/wl/sourcing-session/filters/autocomplete?${params}`;

  return futureJobsHttpRequest({
    method: "GET",
    url,
    apiKey,
    traceId: opts.traceId,
    fjOperation: "GET /wl/sourcing-session/filters/autocomplete",
    defaultErrorPrefix: "Future Jobs autocomplete",
  });
};

module.exports = {
  createSourcingSession,
  updateSourcingSession,
  isFjSessionPending,
  fjSessionPendingMessage,
  getSourcingSessionCandidateDetails,
  getSourcingSessionProfiles,
  getSourcingSessionProfilesWhenReady,
  fetchMoreSourcingSession,
  revealSourcingSessionContact,
  scoutPeopleLookup,
  scoutPeopleRevealContact,
  getSourcingSessionAnnotation,
  getFilterAutocomplete,
};
