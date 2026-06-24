const { requestContext } = require("../config/performanceLogging");
// const { logRequestTiming } = require("../utils/logger");

const ENABLED = String(process.env.API_TIMING_LOG || "1").trim() !== "0";

function requestTiming(req, res, next) {
  if (!ENABLED) return next();

  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const store = { requestId, dbQueryCount: 0, dbTotalMs: 0 };

  // res.on("finish", () => {
  //   const durationMs = Math.round((Number(process.hrtime.bigint() - start) / 1e6) * 100) / 100;
  //   const dbTotalMs = Math.round(store.dbTotalMs * 100) / 100;
  //   logRequestTiming({
  //     requestId,
  //     method: req.method,
  //     path: req.originalUrl || req.url,
  //     status: res.statusCode,
  //     durationMs,
  //     dbQueryCount: store.dbQueryCount,
  //     dbTotalMs,
  //   });
  // });

  requestContext.run(store, next);
}

module.exports = requestTiming;
