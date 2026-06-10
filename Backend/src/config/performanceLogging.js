const { AsyncLocalStorage } = require("async_hooks");
const mongoose = require("mongoose");
const { logDbQuery } = require("../utils/logger");

const requestContext = new AsyncLocalStorage();

const LOG_ALL_DB_QUERIES = String(process.env.DB_QUERY_LOG || "").trim() === "1";
const SLOW_QUERY_MS = Math.max(0, Number(process.env.DB_SLOW_QUERY_MS) || 100);

function getRequestStore() {
  return requestContext.getStore();
}

function recordDbQuery(collection, operation, durationMs) {
  const roundedMs = Math.round(durationMs * 100) / 100;
  const store = getRequestStore();
  if (store) {
    store.dbQueryCount += 1;
    store.dbTotalMs += roundedMs;
  }

  const slow = roundedMs >= SLOW_QUERY_MS;
  if (!LOG_ALL_DB_QUERIES && !slow) return;

  logDbQuery({
    collection,
    operation,
    durationMs: roundedMs,
    slow,
    requestId: store?.requestId,
  });
}

function elapsedMs(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function patchExec(Prototype, operationLabel) {
  const originalExec = Prototype.exec;
  if (typeof originalExec !== "function") return;

  Prototype.exec = async function patchedExec(...args) {
    const start = process.hrtime.bigint();
    try {
      return await originalExec.apply(this, args);
    } finally {
      const collection =
        this.model?.collection?.name ||
        this.mongooseCollection?.name ||
        this._model?.collection?.name ||
        "?";
      const operation = this.op || operationLabel;
      recordDbQuery(collection, operation, elapsedMs(start));
    }
  };
}

function enableMongooseQueryLogging() {
  patchExec(mongoose.Query.prototype, "query");
  patchExec(mongoose.Aggregate.prototype, "aggregate");

  mongoose.plugin((schema) => {
    schema.pre("save", function saveTimingPre() {
      this._saveStart = process.hrtime.bigint();
    });
    schema.post("save", function saveTimingPost() {
      if (!this._saveStart) return;
      const collection = this.collection?.name || schema.options.collection || "?";
      recordDbQuery(collection, "save", elapsedMs(this._saveStart));
    });
  });
}

enableMongooseQueryLogging();

module.exports = {
  requestContext,
  getRequestStore,
};
