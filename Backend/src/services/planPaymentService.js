const PlanPaymentOrder = require("../models/PlanPaymentOrder");
const {
  getPlanPaymentAmount,
  canPurchasePlan,
} = require("../constants/planPaymentPricing");
const {
  getRazorpayConfig,
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchRazorpayPayment,
} = require("./razorpayService");
const {
  applyPlanToBillingUser,
  resolveBillingContext,
} = require("./planSubscriptionService");
const { getUserPlanSummary } = require("./planQuotas");
const {
  getDodoConfig,
  getDodoProductId,
  getFrontendBaseUrl,
  buildDodoCheckoutCustomer,
  createCheckoutSession,
  fetchPayment,
} = require("./dodoPaymentsService");

function buildReceipt(planId) {
  const stamp = Date.now().toString(36);
  return `h_${String(planId).slice(0, 10)}_${stamp}`.slice(0, 40);
}

function isDodoSuccessStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "succeeded" || s === "active" || s === "paid" || s === "success";
}

async function assertCanPurchase(actorUserId, { planId, currency }) {
  const { actor, billingUser } = await resolveBillingContext(actorUserId);

  const currentPlanId =
    typeof billingUser.planId === "string" && billingUser.planId.trim()
      ? billingUser.planId.trim()
      : "trial";

  const purchaseCheck = canPurchasePlan(currentPlanId, planId);
  if (!purchaseCheck.ok) {
    const err = new Error(purchaseCheck.message);
    err.code = "PLAN_PURCHASE_NOT_ALLOWED";
    err.statusCode = 400;
    throw err;
  }

  const cur = String(currency || "inr").trim().toLowerCase();
  const pricing = getPlanPaymentAmount(planId, cur);
  if (!pricing) {
    const err = new Error("Invalid plan pricing");
    err.code = "INVALID_PLAN";
    err.statusCode = 400;
    throw err;
  }

  return { actor, billingUser, pricing, currentPlanId };
}

async function markOrderPaidAndActivatePlan(orderDoc, { paymentRef, performedByUserId }) {
  if (orderDoc.status === "paid") {
    const actor = await require("../models/User").findById(performedByUserId || orderDoc.userId);
    const plan = actor ? await getUserPlanSummary(actor) : null;
    return { alreadyPaid: true, order: orderDoc, plan };
  }

  orderDoc.status = "paid";
  orderDoc.paidAt = new Date();
  if (paymentRef) {
    if (orderDoc.provider === "dodo") {
      orderDoc.dodoPaymentId = paymentRef;
    } else {
      orderDoc.razorpayPaymentId = paymentRef;
    }
  }
  await orderDoc.save();

  await applyPlanToBillingUser({
    billingUserId: orderDoc.billingUserId,
    planId: orderDoc.planId,
    performedByUserId: performedByUserId || orderDoc.userId,
  });

  const actor = await require("../models/User").findById(performedByUserId || orderDoc.userId);
  const plan = actor ? await getUserPlanSummary(actor) : null;

  return { alreadyPaid: false, order: orderDoc, plan };
}

async function createRazorpayPlanOrder(actorUserId, { planId, currency }) {
  const cur = String(currency || "inr").trim().toLowerCase();
  if (cur !== "inr") {
    const err = new Error("Razorpay checkout supports INR only. Use Dodo for USD.");
    err.code = "RAZORPAY_INR_ONLY";
    err.statusCode = 400;
    throw err;
  }

  const { enabled, keyId } = getRazorpayConfig();
  if (!enabled) {
    const err = new Error("Razorpay is not configured on the server");
    err.code = "RAZORPAY_NOT_CONFIGURED";
    err.statusCode = 503;
    throw err;
  }

  const { actor, billingUser, pricing } = await assertCanPurchase(actorUserId, {
    planId,
    currency: "inr",
  });

  const receipt = buildReceipt(planId);
  const razorpayOrder = await createRazorpayOrder({
    amountPaise: pricing.amount,
    currency: pricing.currency,
    receipt,
    notes: {
      planId: String(planId).trim().toLowerCase(),
      userId: String(actor._id),
      billingUserId: String(billingUser._id),
    },
  });

  const orderDoc = await PlanPaymentOrder.create({
    userId: actor._id,
    billingUserId: billingUser._id,
    planId: String(planId).trim().toLowerCase(),
    provider: "razorpay",
    amount: pricing.amount,
    currency: pricing.currency,
    status: "created",
    razorpayOrderId: razorpayOrder.id,
    receipt,
  });

  return {
    order: orderDoc,
    checkout: {
      keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: pricing.amount,
      currency: pricing.currency,
      planId: orderDoc.planId,
      planName: orderDoc.planId.charAt(0).toUpperCase() + orderDoc.planId.slice(1),
      billingAppliesToTeam: actor._id.toString() !== billingUser._id.toString(),
    },
    prefill: {
      name: actor.fullName || "",
      email: actor.email || "",
      contact: actor.mobile || "",
    },
  };
}

async function verifyRazorpayPlanPayment(actorUserId, { razorpayOrderId, razorpayPaymentId, signature }) {
  const { actor, billingUser } = await resolveBillingContext(actorUserId);

  const orderId = String(razorpayOrderId || "").trim();
  const paymentId = String(razorpayPaymentId || "").trim();
  const sig = String(signature || "").trim();

  if (!orderId || !paymentId || !sig) {
    const err = new Error("Missing payment verification fields");
    err.code = "INVALID_PAYMENT_PAYLOAD";
    err.statusCode = 400;
    throw err;
  }

  if (!verifyPaymentSignature({ orderId, paymentId, signature: sig })) {
    const err = new Error("Payment signature verification failed");
    err.code = "INVALID_SIGNATURE";
    err.statusCode = 400;
    throw err;
  }

  const orderDoc = await PlanPaymentOrder.findOne({ razorpayOrderId: orderId, provider: "razorpay" });
  if (!orderDoc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (orderDoc.billingUserId.toString() !== billingUser._id.toString()) {
    const err = new Error("Order does not belong to this account");
    err.code = "ORDER_FORBIDDEN";
    err.statusCode = 403;
    throw err;
  }

  if (orderDoc.status === "paid") {
    const plan = await getUserPlanSummary(actor);
    return { alreadyPaid: true, order: orderDoc, plan };
  }

  let payment;
  try {
    payment = await fetchRazorpayPayment(paymentId);
  } catch {
    const err = new Error("Could not verify payment with Razorpay");
    err.code = "RAZORPAY_FETCH_FAILED";
    err.statusCode = 502;
    throw err;
  }

  if (payment.order_id !== orderId) {
    const err = new Error("Payment does not match order");
    err.code = "PAYMENT_ORDER_MISMATCH";
    err.statusCode = 400;
    throw err;
  }

  if (payment.status !== "captured" && payment.status !== "authorized") {
    const err = new Error(`Payment not completed (status: ${payment.status})`);
    err.code = "PAYMENT_NOT_CAPTURED";
    err.statusCode = 400;
    throw err;
  }

  const paidAmount = Number(payment.amount);
  if (!Number.isFinite(paidAmount) || paidAmount !== orderDoc.amount) {
    const err = new Error("Payment amount mismatch");
    err.code = "AMOUNT_MISMATCH";
    err.statusCode = 400;
    throw err;
  }

  orderDoc.razorpayPaymentId = paymentId;
  orderDoc.razorpaySignature = sig;
  await orderDoc.save();

  return markOrderPaidAndActivatePlan(orderDoc, {
    paymentRef: paymentId,
    performedByUserId: actor._id,
  });
}

async function createDodoPlanCheckout(actorUserId, { planId, currency }) {
  const { enabled } = getDodoConfig();
  if (!enabled) {
    const err = new Error("Dodo Payments is not configured on the server");
    err.code = "DODO_NOT_CONFIGURED";
    err.statusCode = 503;
    throw err;
  }

  const productId = getDodoProductId(planId);
  if (!productId) {
    const err = new Error(
      `Dodo product ID is not configured for plan "${planId}". Set DODO_PRODUCT_ID_STARTER / DODO_PRODUCT_ID_GROWTH.`
    );
    err.code = "DODO_PRODUCT_NOT_CONFIGURED";
    err.statusCode = 503;
    throw err;
  }

  const cur = String(currency || "usd").trim().toLowerCase();
  if (cur === "inr") {
    const err = new Error("Use Razorpay for INR checkout. Dodo is configured for USD/global billing.");
    err.code = "DODO_USD_ONLY";
    err.statusCode = 400;
    throw err;
  }

  const { actor, billingUser, pricing } = await assertCanPurchase(actorUserId, {
    planId,
    currency: "usd",
  });

  const orderDoc = await PlanPaymentOrder.create({
    userId: actor._id,
    billingUserId: billingUser._id,
    planId: String(planId).trim().toLowerCase(),
    provider: "dodo",
    amount: pricing.amount,
    currency: pricing.currency,
    status: "created",
    receipt: buildReceipt(planId),
  });

  const frontendBase = getFrontendBaseUrl();
  const returnUrl = `${frontendBase}/dashboard/plans?billing_return=dodo&order=${orderDoc._id.toString()}`;
  const cancelUrl = `${frontendBase}/dashboard/plans?billing_cancel=dodo`;

  const billingCurrency = pricing.currency === "USD" ? "USD" : pricing.currency;

  const session = await createCheckoutSession({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: buildDodoCheckoutCustomer(actor),
    billing_currency: billingCurrency,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    metadata: {
      huntlo_order_id: orderDoc._id.toString(),
      plan_id: orderDoc.planId,
      user_id: actor._id.toString(),
      billing_user_id: billingUser._id.toString(),
    },
    feature_flags: {
      redirect_immediately: true,
    },
  });

  const checkoutUrl = session?.checkout_url || session?.checkoutUrl;
  const sessionId = session?.session_id || session?.sessionId;

  if (!checkoutUrl || !sessionId) {
    const err = new Error("Dodo checkout session did not return a checkout URL");
    err.code = "DODO_SESSION_INVALID";
    err.statusCode = 502;
    throw err;
  }

  orderDoc.dodoSessionId = String(sessionId);
  await orderDoc.save();

  return {
    order: orderDoc,
    checkout: {
      checkoutUrl,
      sessionId: String(sessionId),
      planId: orderDoc.planId,
      planName: orderDoc.planId.charAt(0).toUpperCase() + orderDoc.planId.slice(1),
      amount: pricing.amount,
      currency: pricing.currency,
      returnUrl,
      billingAppliesToTeam: actor._id.toString() !== billingUser._id.toString(),
    },
  };
}

async function fulfillPlanPaymentOrderFromDodo({
  huntloOrderId,
  dodoPaymentId,
  dodoSessionId,
  status,
}) {
  if (!isDodoSuccessStatus(status)) {
    return { handled: false, reason: "non_success_status", status };
  }

  let orderDoc = null;
  const orderId = String(huntloOrderId || "").trim();
  if (orderId) {
    orderDoc = await PlanPaymentOrder.findById(orderId);
  }
  if (!orderDoc && dodoSessionId) {
    orderDoc = await PlanPaymentOrder.findOne({
      dodoSessionId: String(dodoSessionId).trim(),
      provider: "dodo",
    });
  }
  if (!orderDoc && dodoPaymentId) {
    orderDoc = await PlanPaymentOrder.findOne({
      dodoPaymentId: String(dodoPaymentId).trim(),
      provider: "dodo",
    });
  }

  if (!orderDoc) {
    const err = new Error("Payment order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (dodoPaymentId && !orderDoc.dodoPaymentId) {
    orderDoc.dodoPaymentId = String(dodoPaymentId).trim();
    await orderDoc.save();
  }

  return markOrderPaidAndActivatePlan(orderDoc, {
    paymentRef: orderDoc.dodoPaymentId || dodoPaymentId,
    performedByUserId: orderDoc.userId,
  });
}

async function completeDodoPlanPayment(actorUserId, { huntloOrderId, paymentId, status }) {
  const { actor, billingUser } = await resolveBillingContext(actorUserId);

  const orderId = String(huntloOrderId || "").trim();
  const payId = String(paymentId || "").trim();
  const payStatus = String(status || "").trim();

  if (!orderId) {
    const err = new Error("order id is required");
    err.code = "INVALID_PAYLOAD";
    err.statusCode = 400;
    throw err;
  }

  if (!isDodoSuccessStatus(payStatus)) {
    const err = new Error(`Payment was not successful (status: ${payStatus || "unknown"})`);
    err.code = "PAYMENT_NOT_SUCCEEDED";
    err.statusCode = 400;
    throw err;
  }

  const orderDoc = await PlanPaymentOrder.findOne({
    _id: orderId,
    provider: "dodo",
  });

  if (!orderDoc) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  if (orderDoc.billingUserId.toString() !== billingUser._id.toString()) {
    const err = new Error("Order does not belong to this account");
    err.code = "ORDER_FORBIDDEN";
    err.statusCode = 403;
    throw err;
  }

  if (payId) {
    orderDoc.dodoPaymentId = payId;
    await orderDoc.save();

    const remote = await fetchPayment(payId);
    const remoteStatus = remote?.status || remote?.payment_status;
    if (remoteStatus && !isDodoSuccessStatus(remoteStatus)) {
      const err = new Error(`Payment not confirmed with Dodo (status: ${remoteStatus})`);
      err.code = "PAYMENT_NOT_CAPTURED";
      err.statusCode = 400;
      throw err;
    }
  }

  const result = await fulfillPlanPaymentOrderFromDodo({
    huntloOrderId: orderId,
    dodoPaymentId: payId,
    dodoSessionId: orderDoc.dodoSessionId,
    status: payStatus,
  });

  const plan = await getUserPlanSummary(actor);
  return { ...result, plan };
}

module.exports = {
  createRazorpayPlanOrder,
  verifyRazorpayPlanPayment,
  createDodoPlanCheckout,
  completeDodoPlanPayment,
  fulfillPlanPaymentOrderFromDodo,
};
