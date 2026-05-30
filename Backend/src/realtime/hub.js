const { EVENTS } = require("./events");
const config = require("./config");

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const connectionsByUser = new Map();

let heartbeatTimer = null;

function addConnection(userId, ws) {
  const key = String(userId);
  if (!connectionsByUser.has(key)) {
    connectionsByUser.set(key, new Set());
  }
  connectionsByUser.get(key).add(ws);
}

function removeConnection(userId, ws) {
  const key = String(userId);
  const set = connectionsByUser.get(key);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) connectionsByUser.delete(key);
}

function send(ws, event, data) {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify({ event, data }));
}

function emitToUser(userId, event, data) {
  const set = connectionsByUser.get(String(userId));
  if (!set || set.size === 0) return 0;
  let sent = 0;
  for (const ws of set) {
    try {
      send(ws, event, data);
      sent += 1;
    } catch {
      /* ignore broken socket */
    }
  }
  return sent;
}

function startHeartbeat(wss) {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, config.pingIntervalMs);
  if (typeof heartbeatTimer.unref === "function") {
    heartbeatTimer.unref();
  }
}

function welcomeConnection(userId, ws) {
  send(ws, EVENTS.CONNECTED, { userId: String(userId) });
}

module.exports = {
  addConnection,
  removeConnection,
  emitToUser,
  startHeartbeat,
  welcomeConnection,
};
