import { authHeaders } from "@/lib/auth";

export type ZohoDataCenter = "com" | "eu" | "in" | "com.au" | "jp" | "ca" | "sa";

export const ZOHO_DATA_CENTER_OPTIONS: { id: ZohoDataCenter; label: string }[] = [
  { id: "com", label: "United States (.com)" },
  { id: "eu", label: "Europe (.eu)" },
  { id: "in", label: "India (.in)" },
  { id: "com.au", label: "Australia (.com.au)" },
  { id: "jp", label: "Japan (.jp)" },
  { id: "ca", label: "Canada (.ca)" },
  { id: "sa", label: "Saudi Arabia (.sa)" },
];

export type ZohoMailStatusPayload = {
  connected: boolean;
  configured: boolean;
  oauthConfigured?: boolean;
  email?: string;
  zohoAuthMode?: string;
  zohoDataCenter?: string;
};

export type ZohoOAuthUrlPayload = {
  authorizeUrl: string;
  dataCenter: ZohoDataCenter;
  redirectUri: string;
};

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
}

export async function fetchZohoMailStatus(token: string): Promise<ZohoMailStatusPayload | null> {
  const res = await fetch(`${apiBase()}/api/integrations/zoho_mail/status`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) return null;
  return data as ZohoMailStatusPayload;
}

export async function fetchZohoMailOAuthUrl(
  token: string,
  dataCenter: ZohoDataCenter
): Promise<ZohoOAuthUrlPayload | null> {
  const res = await fetch(
    `${apiBase()}/api/integrations/zoho_mail/oauth-url?dataCenter=${encodeURIComponent(dataCenter)}`,
    { headers: authHeaders(token) }
  );
  const data = await res.json();
  if (!res.ok || !data.success || typeof data.authorizeUrl !== "string") {
    return null;
  }
  return {
    authorizeUrl: data.authorizeUrl,
    dataCenter: (data.dataCenter || dataCenter) as ZohoDataCenter,
    redirectUri: String(data.redirectUri || ""),
  };
}

export function persistZohoOAuthContext(dataCenter: ZohoDataCenter) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("ejhunter_zoho_oauth_dc", dataCenter);
  } catch {
    // ignore
  }
}

export function readZohoOAuthContext(): ZohoDataCenter {
  if (typeof window === "undefined") return "com";
  try {
    const raw = window.sessionStorage.getItem("ejhunter_zoho_oauth_dc");
    if (raw && ZOHO_DATA_CENTER_OPTIONS.some((opt) => opt.id === raw)) {
      return raw as ZohoDataCenter;
    }
  } catch {
    // ignore
  }
  return "com";
}

export function clearZohoOAuthContext() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem("ejhunter_zoho_oauth_dc");
  } catch {
    // ignore
  }
}

/** Prefer Zoho callback `location` over the data center picked in the modal. */
export function resolveZohoCallbackDataCenter(
  location: string | null,
  fallback: ZohoDataCenter
): ZohoDataCenter {
  const raw = String(location || "").trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "au") return "com.au";
  if (ZOHO_DATA_CENTER_OPTIONS.some((opt) => opt.id === raw)) {
    return raw as ZohoDataCenter;
  }
  if (raw === "us" || raw === "com") return "com";
  return fallback;
}
