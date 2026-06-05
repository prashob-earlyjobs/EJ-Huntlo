const crypto = require("crypto");
const Razorpay = require("razorpay");

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  return {
    keyId,
    keySecret,
    enabled: Boolean(keyId && keySecret),
  };
}

function getRazorpayClient() {
  const { keyId, keySecret, enabled } = getRazorpayConfig();
  if (!enabled) {
    const err = new Error("Razorpay is not configured");
    err.code = "RAZORPAY_NOT_CONFIGURED";
    throw err;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret, enabled } = getRazorpayConfig();
  if (!enabled) return false;
  const oid = String(orderId || "").trim();
  const pid = String(paymentId || "").trim();
  const sig = String(signature || "").trim();
  if (!oid || !pid || !sig) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${oid}|${pid}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

async function createRazorpayOrder({ amountPaise, currency, receipt, notes }) {
  const client = getRazorpayClient();
  const order = await client.orders.create({
    amount: amountPaise,
    currency: currency || "INR",
    receipt: receipt.slice(0, 40),
    notes: notes || {},
  });
  return order;
}

async function fetchRazorpayPayment(paymentId) {
  const client = getRazorpayClient();
  return client.payments.fetch(paymentId);
}

module.exports = {
  getRazorpayConfig,
  getRazorpayClient,
  verifyPaymentSignature,
  createRazorpayOrder,
  fetchRazorpayPayment,
};
