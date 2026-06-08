const { logOutbound } = require("../../utils/logger");

const FUTURE_JOBS_UPSTREAM_USER_MESSAGE =
  "We couldn't complete the search right now. Please try again shortly.";

const FUTURE_JOBS_UPSTREAM_ERROR_CODE = "FUTURE_JOBS_UPSTREAM_ERROR";

function createFutureJobsUpstreamError({
  details = null,
  fjHttpStatus = 502,
  fjOperation,
  statusCode = 502,
} = {}) {
  const err = new Error(FUTURE_JOBS_UPSTREAM_USER_MESSAGE);
  err.statusCode = statusCode;
  err.code = FUTURE_JOBS_UPSTREAM_ERROR_CODE;
  err.details = details;
  err.fjHttpStatus = fjHttpStatus;
  if (fjOperation) err.fjOperation = fjOperation;
  return err;
}

function throwIfFjHttpNotOk(res, data, logContext = {}) {
  if (!res || res.ok) return;

  logOutbound("futurejobs", logContext.label || "response error", {
    httpStatus: res.status,
    ...(logContext.extra || {}),
    fjMessage: data?.message || data?.status || data?.error,
    responseBody: data,
  });

  throw createFutureJobsUpstreamError({
    details: data,
    fjHttpStatus: res.status,
    fjOperation: logContext.fjOperation,
    statusCode: 502,
  });
}

module.exports = {
  FUTURE_JOBS_UPSTREAM_USER_MESSAGE,
  FUTURE_JOBS_UPSTREAM_ERROR_CODE,
  createFutureJobsUpstreamError,
  throwIfFjHttpNotOk,
};
