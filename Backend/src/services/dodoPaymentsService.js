const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://dev.huntlo.online",
  "https://huntlo.online",
  "https://www.huntlo.online",
  "https://www.huntlo.ai",
  "https://huntlo.ai",
];

function getDodoConfig() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim() || "";
  const webhookSecret =
    process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() ||
    process.env.DODO_WEBHOOK_SECRET?.trim() ||
    "";
  const envRaw = (process.env.DODO_PAYMENTS_ENVIRONMENT || process.env.DODO_PAYMENTS_MODE || "")
    .trim()
    .toLowerCase();
  const testMode =
    envRaw === "test_mode" ||
    envRaw === "test" ||
    envRaw === "sandbox" ||
    process.env.DODO_PAYMENTS_TEST === "true";
  const liveMode = envRaw === "live_mode" || envRaw === "live" || envRaw === "production";

  const environment = liveMode && !testMode ? "live" : "test";
  const baseUrl =
    environment === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

  return {
    apiKey,
    webhookSecret,
    environment,
    baseUrl,
    enabled: Boolean(apiKey),
  };
}

function getFrontendBaseUrl() {
  const explicit = process.env.FRONTEND_URL?.trim() || process.env.PUBLIC_FRONTEND_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const cors = process.env.CORS_ORIGINS;
  if (cors && String(cors).trim()) {
    const first = String(cors).split(",")[0]?.trim();
    if (first) return first.replace(/\/$/, "");
  }

  return DEFAULT_CORS_ORIGINS[0];
}

function getDodoProductId(planId) {
  const id = String(planId || "").trim().toLowerCase();
  if (id === "starter") {
    return process.env.DODO_PRODUCT_ID_STARTER?.trim() || "";
  }
  if (id === "growth") {
    return process.env.DODO_PRODUCT_ID_GROWTH?.trim() || "";
  }
  return "";
}

async function dodoApiRequest(path, { method = "GET", body } = {}) {
  const { apiKey, baseUrl, enabled } = getDodoConfig();
  if (!enabled) {
    const err = new Error("Dodo Payments is not configured");
    err.code = "DODO_NOT_CONFIGURED";
    throw err;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Dodo API error (${res.status})`;
    const err = new Error(message);
    err.code = "DODO_API_ERROR";
    err.statusCode = res.status >= 400 && res.status < 600 ? res.status : 502;
    err.dodoResponse = data;
    throw err;
  }

  return data;
}

async function createCheckoutSession(payload) {
  return dodoApiRequest("/checkouts", { method: "POST", body: payload });
}

async function fetchPayment(paymentId) {
  const id = String(paymentId || "").trim();
  if (!id) return null;
  try {
    return await dodoApiRequest(`/payments/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

module.exports = {
  getDodoConfig,
  getFrontendBaseUrl,
  getDodoProductId,
  createCheckoutSession,
  fetchPayment,
};
