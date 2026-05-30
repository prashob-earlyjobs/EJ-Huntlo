/**
 * WebSocket realtime settings (separate from HTTP routes).
 * Set REALTIME_ENABLED=false to disable entirely.
 */
const config = {
  enabled: String(process.env.REALTIME_ENABLED ?? "true").toLowerCase() !== "false",
  /** WebSocket path on the same host/port as the API */
  path: process.env.REALTIME_WS_PATH || "/ws",
  /** Server ping interval (ms) */
  pingIntervalMs: Math.max(10_000, Number(process.env.REALTIME_PING_MS) || 30_000),
};

module.exports = config;
