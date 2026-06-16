"use client";

import { useCallback, useState } from "react";

import {
  CLOSED_USER_ACTION_ALERT,
  FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE,
  isFutureJobsUpstreamApiError,
  isFutureJobsUpstreamThrown,
  isNoProfilesSearchError,
  parseApiError,
  quotaAlertFromMessage,
  type UserActionAlertState,
} from "@/lib/apiErrors";

export function useUserActionAlert() {
  const [alert, setAlert] = useState<UserActionAlertState>(CLOSED_USER_ACTION_ALERT);

  const close = useCallback(() => {
    setAlert((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  const showQuota = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setAlert({ open: true, message: trimmed, isQuotaExceeded: true });
  }, []);

  const showFutureJobsUpstream = useCallback(() => {
    setAlert({
      open: true,
      message: FUTURE_JOBS_UPSTREAM_ERROR_MESSAGE,
      isQuotaExceeded: false,
    });
  }, []);

  const showError = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setAlert({
      open: true,
      message: trimmed,
      isQuotaExceeded: false,
      action: isNoProfilesSearchError(trimmed) ? "searchAgain" : null,
    });
  }, []);

  const fromApi = useCallback(
    (res: Response, data: unknown, fallback: string): boolean => {
      const info = parseApiError(res, data, fallback);
      if (!info.isQuotaExceeded) return false;
      showQuota(info.message);
      return true;
    },
    [showQuota]
  );

  const apiMessage = useCallback((res: Response, data: unknown, fallback: string) => {
    return parseApiError(res, data, fallback).message;
  }, []);

  const fromFutureJobsApi = useCallback(
    (res: Response, data: unknown): boolean => {
      if (!isFutureJobsUpstreamApiError(res, data)) return false;
      showFutureJobsUpstream();
      return true;
    },
    [showFutureJobsUpstream]
  );

  const fromThrown = useCallback((err: unknown): boolean => {
    if (isFutureJobsUpstreamThrown(err)) {
      showFutureJobsUpstream();
      return true;
    }
    const message = err instanceof Error ? err.message : "";
    const state = quotaAlertFromMessage(message);
    if (!state) return false;
    setAlert(state);
    return true;
  }, [showFutureJobsUpstream]);

  return {
    alert,
    close,
    showQuota,
    showFutureJobsUpstream,
    showError,
    fromApi,
    fromFutureJobsApi,
    apiMessage,
    fromThrown,
  };
}
