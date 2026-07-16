"use client";

import { useEffect } from "react";

import { isAuthTokenExpired } from "@/lib/auth";
import {
  forceSessionExpiredLogout,
  isExpiredTokenResponse,
} from "@/lib/sessionLogout";

const FETCH_PATCH_FLAG = "__huntloAuthFetchPatched";
/** Periodic check only — never schedule a multi-day setTimeout (overflow fires early). */
const EXPIRY_POLL_MS = 60_000;

function isAuthPublicPath(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

function isAuthPublicApiUrl(input: RequestInfo | URL): boolean {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : String((input as Request).url || "");
  try {
    const path = new URL(raw, window.location.origin).pathname;
    return (
      path.includes("/api/users/login") ||
      path.includes("/api/users/signup") ||
      path.includes("/api/users/register") ||
      path.includes("/api/users/logout") ||
      path.includes("/api/users/forgot-password") ||
      path.includes("/api/users/reset-password")
    );
  } catch {
    return (
      raw.includes("/api/users/login") ||
      raw.includes("/api/users/signup") ||
      raw.includes("/api/users/logout")
    );
  }
}

function checkAndLogoutIfExpired() {
  if (typeof window === "undefined") return;
  if (isAuthPublicPath(window.location.pathname || "")) return;

  const raw = localStorage.getItem("authUser");
  if (!raw) return;

  let token = "";
  try {
    token = String((JSON.parse(raw) as { token?: string }).token || "");
  } catch {
    forceSessionExpiredLogout();
    return;
  }

  if (!token || isAuthTokenExpired(token)) {
    forceSessionExpiredLogout();
  }
}

/**
 * Auto sign-out when the auth JWT expires, and when APIs return TOKEN_EXPIRED.
 * Uses polling + focus checks — not a long setTimeout (those overflow and fire early).
 */
export function AuthSessionGuard() {
  useEffect(() => {
    checkAndLogoutIfExpired();

    const pollId = window.setInterval(() => {
      checkAndLogoutIfExpired();
    }, EXPIRY_POLL_MS);

    const onFocus = () => checkAndLogoutIfExpired();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAndLogoutIfExpired();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "authUser") {
        checkAndLogoutIfExpired();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);

    const win = window as Window & { [FETCH_PATCH_FLAG]?: boolean };
    if (!win[FETCH_PATCH_FLAG]) {
      win[FETCH_PATCH_FLAG] = true;
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const [input] = args;
        const response = await originalFetch(...args);

        if (response.status !== 401) return response;
        if (isAuthPublicPath(window.location.pathname || "")) return response;
        if (isAuthPublicApiUrl(input)) return response;

        try {
          const clone = response.clone();
          const data = await clone.json().catch(() => null);
          if (isExpiredTokenResponse(response, data)) {
            forceSessionExpiredLogout();
          }
        } catch {
          /* ignore parse errors */
        }

        return response;
      };
    }

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
