const crypto = require("crypto");
const {
  annotatePublicSearchPrompt,
  runPublicCandidateSearch,
} = require("../services/publicCandidateSearchService");
const { logApi, safeJsonPreview } = require("../utils/logger");
const { getClientIp } = require("../middleware/publicSearchRateLimit");

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
    const err = new Error("This search is already in progress. Please wait.");
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

/**
 * POST /api/public-candidates/annotate
 * Body: { prompt: string }
 * Mirrors dashboard /api/candidates/search/annotate (public, no auth).
 */
const publicAnnotateSearchPrompt = async (req, res) => {
  const clientIp = getClientIp(req);
  try {
    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    if (!prompt) {
      return res.status(400).json({ success: false, message: "prompt is required" });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        success: false,
        message: "prompt must be 500 characters or fewer",
      });
    }

    const dedupKey = `public-annotate:${clientIp}:${requestHash({ prompt })}`;
    const result = await runCostlyFutureJobsAction(dedupKey, () =>
      annotatePublicSearchPrompt(prompt, { clientIp })
    );

    return res.status(200).json({
      success: true,
      prompt,
      filterForm: result.filterForm,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("public-candidates/annotate", "error", {
      clientIp,
      status,
      message: error.message,
      detailsPreview: error.details ? safeJsonPreview(error.details, 500) : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to analyze search prompt",
      details: error.details,
    });
  }
};

/**
 * POST /api/public-candidates/search
 * Body: { prompt: string, filterForm?: object }
 * Mirrors dashboard annotate + apply (public, no auth).
 */
const publicSearchCandidates = async (req, res) => {
  const clientIp = getClientIp(req);

  try {
    const prompt =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

    if (!prompt) {
      return res.status(400).json({ success: false, message: "prompt is required" });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        success: false,
        message: "prompt must be 500 characters or fewer",
      });
    }

    const filterForm =
      req.body?.filterForm && typeof req.body.filterForm === "object"
        ? req.body.filterForm
        : undefined;

    logApi("public-candidates/search", "incoming", {
      clientIp,
      promptLength: prompt.length,
      hasFilterForm: Boolean(filterForm),
    });

    const dedupKey = `public-search:${clientIp}:${requestHash({
      prompt,
      filterForm: filterForm || null,
    })}`;

    const result = await runCostlyFutureJobsAction(dedupKey, () =>
      runPublicCandidateSearch({
        prompt,
        filterForm,
        clientIp,
      })
    );

    if (result.sessionPending) {
      return res.status(200).json({
        success: false,
        sessionPending: true,
        message: result.message,
        prompt: result.prompt,
        filterForm: result.filterForm,
        candidates: [],
        totalMatched: 0,
        displayedCount: 0,
      });
    }

    return res.status(200).json({
      success: true,
      futureJobsSessionId: result.futureJobsSessionId,
      sessionTitle: result.sessionTitle || "",
      prompt: result.prompt,
      filterForm: result.filterForm,
      totalMatched: result.totalMatched,
      displayedCount: result.displayedCount,
      candidates: result.candidates,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("public-candidates/search", "error", {
      clientIp,
      status,
      message: error.message,
      code: error.code,
      detailsPreview: error.details ? safeJsonPreview(error.details, 500) : undefined,
    });
    return res.status(status).json({
      success: false,
      code: error.code,
      message: error.message || "Public candidate search failed",
      details: error.details,
    });
  }
};

module.exports = {
  publicAnnotateSearchPrompt,
  publicSearchCandidates,
};
