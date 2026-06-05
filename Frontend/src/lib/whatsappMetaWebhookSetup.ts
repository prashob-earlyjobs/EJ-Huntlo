import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type MetaWebhookSetupPayload = {
  callbackUrl: string;
  callbackPath: string;
  verifyTokenConfigured: boolean;
  verifyToken: string;
  subscribeFields: string[];
  instructions: string;
};

export type MetaWebhookSetupResponse = {
  success: boolean;
  requiresMetaWebhookSetup?: boolean;
  metaWebhookSetup?: MetaWebhookSetupPayload;
  message?: string;
};

export async function fetchWhatsAppMetaWebhookSetup(
  token: string
): Promise<MetaWebhookSetupPayload | null> {
  const res = await fetch(`${apiBase()}/api/integrations/whatsapp/meta-webhook-setup`, {
    headers: authHeaders(token),
  });
  const data = (await res.json()) as MetaWebhookSetupResponse;
  if (!res.ok || !data.success || !data.metaWebhookSetup) {
    return null;
  }
  return data.metaWebhookSetup;
}

export function fallbackWebhookSetupFromApiBase(): MetaWebhookSetupPayload {
  const base = apiBase().replace(/\/$/, "");
  return {
    callbackUrl: `${base}/api/integrations/whatsapp/meta/webhook`,
    callbackPath: "/api/integrations/whatsapp/meta/webhook",
    verifyTokenConfigured: false,
    verifyToken: "",
    subscribeFields: ["messages"],
    instructions:
      "In Meta for Developers → your app → WhatsApp → Configuration, set the callback URL and verify token below, then subscribe to the messages field.",
  };
}
