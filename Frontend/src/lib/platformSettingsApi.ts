import { authHeaders } from "@/lib/auth";
import type { AdminMessagingChannel } from "@/components/admin/AdminMessagingChannelSettings";

export type PlatformSettingsPayload = {
  messagingChannel: AdminMessagingChannel;
  updatedAt: string | null;
};

function parseMessagingChannel(value: unknown): AdminMessagingChannel | null {
  if (value === "huntlo_meta" || value === "gupshup") return value;
  return null;
}

function parseSettingsPayload(data: unknown): PlatformSettingsPayload | null {
  if (!data || typeof data !== "object") return null;
  const settings = (data as { settings?: unknown }).settings;
  if (!settings || typeof settings !== "object") return null;
  const channel = parseMessagingChannel(
    (settings as { messagingChannel?: unknown }).messagingChannel
  );
  if (!channel) return null;
  const updatedAtRaw = (settings as { updatedAt?: unknown }).updatedAt;
  const updatedAt =
    typeof updatedAtRaw === "string" && updatedAtRaw.trim() !== "" ? updatedAtRaw : null;
  return { messagingChannel: channel, updatedAt };
}

export async function fetchPlatformSettings(
  apiBase: string,
  token: string
): Promise<PlatformSettingsPayload> {
  const res = await fetch(`${apiBase}/api/platform-settings`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  const parsed = parseSettingsPayload(data);
  if (!res.ok || !data.success || !parsed) {
    const message =
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Could not load platform settings";
    throw new Error(message);
  }
  return parsed;
}

export async function updatePlatformSettings(
  apiBase: string,
  token: string,
  messagingChannel: AdminMessagingChannel
): Promise<PlatformSettingsPayload> {
  const res = await fetch(`${apiBase}/api/platform-settings`, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messagingChannel }),
  });
  const data = await res.json().catch(() => ({}));
  const parsed = parseSettingsPayload(data);
  if (!res.ok || !data.success || !parsed) {
    const message =
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Could not save platform settings";
    throw new Error(message);
  }
  return parsed;
}
