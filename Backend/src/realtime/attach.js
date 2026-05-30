const { WebSocketServer } = require("ws");
const { verifyToken } = require("../utils/jwt");
const config = require("./config");
const hub = require("./hub");

function parseTokenFromRequest(req) {
  try {
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);
    const token = url.searchParams.get("token");
    return token && String(token).trim() ? String(token).trim() : "";
  } catch {
    return "";
  }
}

function attachRealtimeServer(httpServer) {
  if (!config.enabled) {
    console.log("[realtime] disabled (REALTIME_ENABLED=false)");
    return null;
  }

  const wss = new WebSocketServer({
    server: httpServer,
    path: config.path,
  });

  wss.on("connection", (ws, req) => {
    const token = parseTokenFromRequest(req);
    if (!token) {
      ws.close(4401, "token required");
      return;
    }

    let userId;
    try {
      const decoded = verifyToken(token);
      userId = decoded.sub;
    } catch {
      ws.close(4401, "invalid token");
      return;
    }

    if (!userId) {
      ws.close(4401, "invalid token");
      return;
    }

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    hub.addConnection(userId, ws);
    hub.welcomeConnection(userId, ws);

    ws.on("close", () => {
      hub.removeConnection(userId, ws);
    });
  });

  hub.startHeartbeat(wss);

  console.log(`[realtime] WebSocket listening on path ${config.path}`);
  return wss;
}

module.exports = { attachRealtimeServer };
