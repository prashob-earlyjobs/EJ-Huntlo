export type StoredAuth = {
  id: string;
  fullName: string;
  companyName: string;
  mobile: string;
  location?: string;
  profilePhotoUrl?: string;
  email: string;
  role: "user" | "admin";
  credits?: number;
  onboardingCompleted?: boolean;
  organizationId?: string | null;
  accountRole?: "owner" | "member" | null;
  ownerUserId?: string | null;
  memberStatus?: string;
  memberPermission?: string;
  passwordChangedAt?: string;
  token: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Read JWT `exp` (seconds) without verifying signature — used for client-side expiry UX. */
export function getJwtExpiryMs(token: string): number | null {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    const expSec = Number(json.exp);
    if (!Number.isFinite(expSec) || expSec <= 0) return null;
    return expSec * 1000;
  } catch {
    return null;
  }
}

export function isAuthTokenExpired(token: string, skewMs = 5_000): boolean {
  const expMs = getJwtExpiryMs(token);
  if (expMs == null) return false;
  return Date.now() >= expMs - skewMs;
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authUser");
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("authUser");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.email) {
      localStorage.removeItem("authUser");
      return null;
    }
    if (isAuthTokenExpired(parsed.token)) {
      localStorage.removeItem("authUser");
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem("authUser");
    return null;
  }
}

export function authHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
