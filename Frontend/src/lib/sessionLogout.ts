import { authHeaders, clearStoredAuth, getStoredAuth } from "@/lib/auth";
import { realtimeClient } from "@/lib/realtime/client";

export const BLOCKED_ACCOUNT_MESSAGE =
  "Your account has been blocked. Contact your team owner or support.";

export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";

export function isBlockedAccountResponse(res: Response, data: unknown): boolean {
  const body =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return res.status === 403 && body.code === "ACCOUNT_BLOCKED";
}

export function isExpiredTokenResponse(res: Response, data?: unknown): boolean {
  if (res.status !== 401) return false;
  const body =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  // Only treat explicit JWT expiry/invalid codes from our auth middleware.
  return body.code === "TOKEN_EXPIRED" || body.code === "TOKEN_INVALID";
}

export function isBlockedMemberStatus(status: unknown): boolean {
  return String(status ?? "").toLowerCase() === "blocked";
}

export async function performLogout(navigate?: (path: string) => void) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const auth = getStoredAuth();
  try {
    if (auth?.token) {
      await fetch(`${apiBase}/api/users/logout`, {
        method: "POST",
        headers: authHeaders(auth.token),
      });
    }
  } catch {
    /* ignore */
  }
  realtimeClient.disconnectSession();
  clearStoredAuth();
  if (navigate) {
    navigate("/login");
  } else if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

/** Clear local session and redirect to login (used when JWT is already expired). */
export function forceSessionExpiredLogout(reason = SESSION_EXPIRED_MESSAGE) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  // Never hard-refresh auth pages (login flow must stay stable).
  if (
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password")
  ) {
    clearStoredAuth();
    return;
  }
  clearStoredAuth();
  const next = encodeURIComponent(`${path}${window.location.search || ""}`);
  window.location.replace(
    `/login?reason=session_expired&next=${next}&message=${encodeURIComponent(reason)}`
  );
}
