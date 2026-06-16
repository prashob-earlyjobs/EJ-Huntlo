import { authHeaders } from "@/lib/auth";

export type OutlookStatusPayload = {
  connected: boolean;
  configured: boolean;
  oauthConfigured?: boolean;
  email?: string;
  senderName?: string;
};

export type OutlookOAuthUrlPayload = {
  authorizeUrl: string;
  redirectUri: string;
};

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
}

export async function fetchOutlookStatus(token: string): Promise<OutlookStatusPayload | null> {
  const res = await fetch(`${apiBase()}/api/integrations/outlook/status`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) return null;
  return data as OutlookStatusPayload;
}

export async function fetchOutlookOAuthUrl(token: string): Promise<OutlookOAuthUrlPayload | null> {
  const res = await fetch(`${apiBase()}/api/integrations/outlook/oauth-url`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success || typeof data.authorizeUrl !== "string") {
    return null;
  }
  return {
    authorizeUrl: data.authorizeUrl,
    redirectUri: String(data.redirectUri || ""),
  };
}
