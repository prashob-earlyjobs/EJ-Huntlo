/** Meta WhatsApp Cloud API (Graph) — server defaults. */

function getMetaGraphApiVersion() {
  const raw = String(process.env.META_GRAPH_API_VERSION || "v21.0").trim();
  return raw.startsWith("v") ? raw : `v${raw}`;
}

function getMetaGraphBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}

module.exports = {
  getMetaGraphApiVersion,
  getMetaGraphBaseUrl,
};
