export const FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE =
  "We couldn't complete the search right now. Please try again shortly.";

export const FUTURE_JOBS_UPSTREAM_ERROR_CODE = "FUTURE_JOBS_UPSTREAM_ERROR";

export type ApiErrorInfo = {
  message: string;
  isQuotaExceeded: boolean;
  isFutureJobsUpstream: boolean;
};

function apiErrorBody(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export function parseApiError(
  res: Response,
  data: unknown,
  fallback = "Request failed"
): ApiErrorInfo {
  const body = apiErrorBody(data);
  const details =
    body.details && typeof body.details === "object"
      ? (body.details as Record<string, unknown>)
      : null;
  const detailsMessage =
    details && typeof details.message === "string" ? details.message.trim() : "";

  const isFutureJobsUpstream = isFutureJobsUpstreamApiError(res, data);

  const message = isFutureJobsUpstream
    ? FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE
    : typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : detailsMessage
        ? detailsMessage
        : res.status === 404
          ? "Not found"
          : fallback;

  const isQuotaExceeded =
    body.code === "QUOTA_EXCEEDED" ||
    body.code === "OUTREACH_CREDITS_EXCEEDED" ||
    (res.status === 403 &&
      (/plan quota|quota exceeded/i.test(message) ||
        /no credits for (email|whatsapp)/i.test(message) ||
        /(email|mobile|phone) unveil/i.test(message)));

  return { message, isQuotaExceeded, isFutureJobsUpstream };
}

export function isFutureJobsUpstreamApiError(res: Response, data: unknown): boolean {
  const body = apiErrorBody(data);
  if (body.code === FUTURE_JOBS_UPSTREAM_ERROR_CODE) return true;

  const message = typeof body.message === "string" ? body.message : "";
  return (
    [502, 503, 504].includes(res.status) &&
    (message === FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE || /future jobs/i.test(message))
  );
}

export function isFutureJobsUpstreamThrown(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? (err as { code?: unknown }).code : undefined;
  if (code === FUTURE_JOBS_UPSTREAM_ERROR_CODE) return true;
  const message = err instanceof Error ? err.message : "";
  return message === FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE;
}

export function quotaExceededTitle(): string {
  return "Plan limit reached";
}

export type UserActionAlertState = {
  open: boolean;
  message: string;
  isQuotaExceeded: boolean;
};

export const CLOSED_USER_ACTION_ALERT: UserActionAlertState = {
  open: false,
  message: "",
  isQuotaExceeded: false,
};

export function quotaAlertFromMessage(message: string): UserActionAlertState | null {
  const trimmed = message.trim();
  if (
    !trimmed ||
    (!/plan quota|quota exceeded/i.test(trimmed) &&
      !/no credits for (email|whatsapp)/i.test(trimmed) &&
      !/(email|mobile|phone) unveil/i.test(trimmed))
  ) {
    return null;
  }
  return { open: true, message: trimmed, isQuotaExceeded: true };
}
