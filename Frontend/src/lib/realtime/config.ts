/** WebSocket realtime settings (mirrors Backend/src/realtime/config.js) */

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const wsPath = process.env.NEXT_PUBLIC_REALTIME_WS_PATH || "/ws";

const realtimeEnabled =
  String(process.env.NEXT_PUBLIC_REALTIME_ENABLED ?? "true").toLowerCase() !== "false";

/** Build ws:// or wss:// URL for the API host + path */
export function buildRealtimeWsUrl(token: string): string {
  const base = apiBase().replace(/\/$/, "");
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = wsPath.startsWith("/") ? wsPath : `/${wsPath}`;
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

export const realtimeConfig = {
  enabled: realtimeEnabled,
  path: wsPath,
  reconnectMinMs: 2_000,
  reconnectMaxMs: 30_000,
} as const;
