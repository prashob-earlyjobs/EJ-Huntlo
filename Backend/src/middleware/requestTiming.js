const { requestContext } = require("../config/performanceLogging");
const { timingEnabled } = require("../utils/timingLog");

function requestTiming(req, res, next) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const store = { requestId, dbQueryCount: 0, dbTotalMs: 0 };
  const start = Date.now();

  if (timingEnabled) {
    res.on("finish", () => {
      console.log(
        `[API] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
      );
    });
  }

  requestContext.run(store, next);
}

module.exports = requestTiming;
