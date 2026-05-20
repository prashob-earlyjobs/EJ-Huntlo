export type ApiErrorInfo = {
  message: string;
  isQuotaExceeded: boolean;
};

export function parseApiError(
  res: Response,
  data: unknown,
  fallback = "Request failed"
): ApiErrorInfo {
  const body =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : res.status === 404
        ? "Not found"
        : fallback;

  const isQuotaExceeded =
    body.code === "QUOTA_EXCEEDED" ||
    (res.status === 403 &&
      /plan quota|quota exceeded/i.test(message));

  return { message, isQuotaExceeded };
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
  if (!trimmed || !/plan quota|quota exceeded/i.test(trimmed)) {
    return null;
  }
  return { open: true, message: trimmed, isQuotaExceeded: true };
}
