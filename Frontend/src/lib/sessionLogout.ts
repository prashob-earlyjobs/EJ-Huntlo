import { authHeaders, getStoredAuth } from "@/lib/auth";
import { realtimeClient } from "@/lib/realtime/client";

export const BLOCKED_ACCOUNT_MESSAGE =
  "Your account has been blocked. Contact your team owner or support.";

export function isBlockedAccountResponse(res: Response, data: unknown): boolean {
  const body =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return res.status === 403 && body.code === "ACCOUNT_BLOCKED";
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
  localStorage.removeItem("authUser");
  if (navigate) {
    navigate("/login");
  } else if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
