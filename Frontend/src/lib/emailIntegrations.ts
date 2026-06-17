import { authHeaders } from "@/lib/auth";

export type EmailIntegrationRow = {
  id: string;
  provider: string;
  integration: string;
  providerLabel: string;
  senderName: string;
  email: string;
  status: string;
  isDefaultEmail?: boolean;
};

export const MULTI_ACCOUNT_MAIL_PROVIDERS = new Set([
  "gmail",
  "outlook",
  "zoho_mail",
  "custom_mail",
]);

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
}

export function isMultiAccountMailProvider(provider: string) {
  return MULTI_ACCOUNT_MAIL_PROVIDERS.has(provider);
}

export type CampaignEmailSenderOption = {
  id: string;
  provider: string;
  email: string;
  displayName: string;
  isDefaultEmail?: boolean;
};

export function toCampaignEmailSenderOption(row: EmailIntegrationRow): CampaignEmailSenderOption {
  return {
    id: row.id,
    provider: row.provider,
    email: row.email?.trim() || "",
    displayName: row.senderName?.trim() || "",
    isDefaultEmail: Boolean(row.isDefaultEmail),
  };
}

export function formatEmailSenderLabel(row: EmailIntegrationRow) {
  const email = row.email?.trim();
  const name = row.senderName?.trim();
  if (name && email) return `${name} <${email}>`;
  return email || name || row.integration || "Email account";
}

export async function setDefaultEmailIntegration(
  token: string,
  integrationId: string
): Promise<EmailIntegrationRow> {
  const res = await fetch(
    `${apiBase()}/api/integrations/integration/${integrationId}/default`,
    {
      method: "PATCH",
      headers: authHeaders(token),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to set default sender"
    );
  }
  return data.integration as EmailIntegrationRow;
}

export async function disconnectEmailIntegrationById(
  token: string,
  integrationId: string
): Promise<void> {
  const res = await fetch(`${apiBase()}/api/integrations/integration/${integrationId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to disconnect integration"
    );
  }
}

export async function testEmailIntegration(
  token: string,
  provider: string,
  integrationId: string
): Promise<string> {
  const path =
    provider === "outlook"
      ? "outlook/test"
      : provider === "zoho_mail"
        ? "zoho_mail/test"
        : provider === "custom_mail"
          ? "custom_mail/test"
          : "";
  if (!path) {
    throw new Error("Test is not available for this provider.");
  }
  const res = await fetch(`${apiBase()}/api/integrations/${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ integrationId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to send test email");
  }
  return typeof data.message === "string" ? data.message : "Test email sent.";
}
