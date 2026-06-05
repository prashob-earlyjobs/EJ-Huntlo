const { getRazorpayConfig } = require("../services/razorpayService");
const { getDodoConfig } = require("../services/dodoPaymentsService");
const {
  verifyAndParseWebhook,
  processDodoWebhookEvent,
} = require("../services/dodoWebhookService");
const {
  createRazorpayPlanOrder,
  verifyRazorpayPlanPayment,
  createDodoPlanCheckout,
  completeDodoPlanPayment,
} = require("../services/planPaymentService");

function mapBillingError(res, error) {
  const status = error.statusCode || 500;
  const code = error.code || "BILLING_ERROR";
  return res.status(status).json({
    success: false,
    code,
    message: error.message || "Billing request failed",
  });
}

const getRazorpayConfigHandler = async (req, res) => {
  try {
    const { keyId, enabled } = getRazorpayConfig();
    return res.status(200).json({
      success: true,
      razorpay: {
        enabled,
        keyId: enabled ? keyId : "",
      },
    });
  } catch (error) {
    return mapBillingError(res, error);
  }
};

const createRazorpayOrderHandler = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { planId, currency } = req.body || {};

    if (!planId || !String(planId).trim()) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const result = await createRazorpayPlanOrder(userId, {
      planId: String(planId).trim(),
      currency: currency || "inr",
    });

    return res.status(201).json({
      success: true,
      message: "Order created",
      checkout: result.checkout,
      prefill: result.prefill,
      orderId: result.order._id,
    });
  } catch (error) {
    return mapBillingError(res, error);
  }
};

const verifyRazorpayPaymentHandler = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body || {};

    const result = await verifyRazorpayPlanPayment(userId, {
      razorpayOrderId: razorpay_order_id || razorpayOrderId,
      razorpayPaymentId: razorpay_payment_id || razorpayPaymentId,
      signature: razorpay_signature || razorpaySignature,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyPaid
        ? "Payment already recorded"
        : "Payment verified and plan activated",
      alreadyPaid: result.alreadyPaid,
      plan: result.plan,
      order: {
        id: result.order._id,
        planId: result.order.planId,
        status: result.order.status,
        paidAt: result.order.paidAt,
      },
    });
  } catch (error) {
    return mapBillingError(res, error);
  }
};

const getDodoConfigHandler = async (req, res) => {
  try {
    const { enabled, environment } = getDodoConfig();
    return res.status(200).json({
      success: true,
      dodo: {
        enabled,
        environment,
      },
    });
  } catch (error) {
    return mapBillingError(res, error);
  }
};

const createDodoCheckoutHandler = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { planId, currency } = req.body || {};

    if (!planId || !String(planId).trim()) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const result = await createDodoPlanCheckout(userId, {
      planId: String(planId).trim(),
      currency: currency || "usd",
    });

    return res.status(201).json({
      success: true,
      message: "Checkout session created",
      checkout: result.checkout,
      orderId: result.order._id,
    });
  } catch (error) {
    return mapBillingError(res, error);
  }
};

const completeDodoPaymentHandler = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { orderId, huntloOrderId, paymentId, payment_id, status } = req.body || {};

    const result = await completeDodoPlanPayment(userId, {
      huntloOrderId: huntloOrderId || orderId,
      paymentId: payment_id || paymentId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyPaid
        ? "Payment already recorded"
        : "Payment confirmed and plan activated",
      alreadyPaid: result.alreadyPaid,
      plan: result.plan,
      order: {
        id: result.order._id,
        planId: result.order.planId,
        status: result.order.status,
        paidAt: result.order.paidAt,
      },
    });
  } catch (error) {
    return mapBillingError(res, error);
  }
};

const handleDodoWebhook = async (req, res) => {
  try {
    const rawBody = req.body;
    if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
      return res.status(400).json({ success: false, message: "Empty webhook body" });
    }

    const event = verifyAndParseWebhook(rawBody, req.headers);
    await processDodoWebhookEvent(event);

    return res.status(200).json({ received: true });
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: error.message || "Webhook processing failed",
    });
  }
};

module.exports = {
  getRazorpayConfigHandler,
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
  getDodoConfigHandler,
  createDodoCheckoutHandler,
  completeDodoPaymentHandler,
  handleDodoWebhook,
};
