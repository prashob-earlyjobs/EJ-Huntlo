import { authHeaders } from "@/lib/auth";

export type CustomMailSecurity = "tls" | "ssl" | "none";

export type CustomMailConnectPayload = {
  fromEmail: string;
  displayName?: string;
  smtpHost: string;
  smtpPort: string | number;
  security: CustomMailSecurity;
  username: string;
  password: string;
};

export type CustomMailStatusPayload = {
  connected: boolean;
  configured: boolean;
  email?: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: CustomMailSecurity;
};

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
}

export async function verifyCustomMailCredentials(
  token: string,
  payload: CustomMailConnectPayload
): Promise<{ verified: boolean; message: string }> {
  const res = await fetch(`${apiBase()}/api/integrations/custom_mail/verify`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "SMTP verification failed");
  }
  return {
    verified: Boolean(data.verified),
    message: String(data.message || "SMTP verified."),
  };
}

export async function connectCustomMail(
  token: string,
  payload: CustomMailConnectPayload
): Promise<{ integration: Record<string, unknown> }> {
  const res = await fetch(`${apiBase()}/api/integrations/custom_mail/connect`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to connect custom mail");
  }
  return { integration: data.integration as Record<string, unknown> };
}

export async function testCustomMailIntegration(token: string): Promise<string> {
  const res = await fetch(`${apiBase()}/api/integrations/custom_mail/test`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to send test email");
  }
  return typeof data.message === "string" ? data.message : "Test email sent.";
}
