export type StoredAuth = {
  id: string;
  fullName: string;
  companyName: string;
  mobile: string;
  location?: string;
  email: string;
  role: "user" | "admin";
  credits?: number;
  passwordChangedAt?: string;
  token: string;
  createdAt?: string;
  updatedAt?: string;
};

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
