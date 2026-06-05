import { authHeaders } from "@/lib/auth";
import type { PlanPaymentCurrency } from "@/lib/planPayment";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export type RazorpayCheckoutPayload = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  billingAppliesToTeam?: boolean;
};

export type RazorpayPrefill = {
  name: string;
  email: string;
  contact: string;
};

type ApiError = {
  success?: false;
  message?: string;
  code?: string;
};

async function parseApiJson<T>(res: Response): Promise<T & ApiError> {
  const data = (await res.json()) as T & ApiError;
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || "Request failed");
    (err as Error & { code?: string }).code = data.code;
    throw err;
  }
  return data;
}

export async function fetchRazorpayConfig(token: string) {
  const res = await fetch(`${apiBase()}/api/billing/razorpay/config`, {
    headers: authHeaders(token),
  });
  return parseApiJson<{
    success: true;
    razorpay: { enabled: boolean; keyId: string };
  }>(res);
}

export async function createRazorpayPlanOrder(
  token: string,
  planId: string,
  currency: PlanPaymentCurrency
) {
  const res = await fetch(`${apiBase()}/api/billing/razorpay/order`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ planId, currency }),
  });
  return parseApiJson<{
    success: true;
    checkout: RazorpayCheckoutPayload;
    prefill: RazorpayPrefill;
  }>(res);
}

export type RazorpayPaymentSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function verifyRazorpayPlanPayment(
  token: string,
  payment: RazorpayPaymentSuccess
) {
  const res = await fetch(`${apiBase()}/api/billing/razorpay/verify`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      razorpay_signature: payment.razorpay_signature,
    }),
  });
  return parseApiJson<{
    success: true;
    message: string;
    alreadyPaid?: boolean;
    plan?: unknown;
  }>(res);
}

export type DodoCheckoutPayload = {
  checkoutUrl: string;
  sessionId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  returnUrl: string;
  billingAppliesToTeam?: boolean;
};

export async function fetchDodoConfig(token: string) {
  const res = await fetch(`${apiBase()}/api/billing/dodo/config`, {
    headers: authHeaders(token),
  });
  return parseApiJson<{
    success: true;
    dodo: { enabled: boolean; environment: string };
  }>(res);
}

export async function createDodoPlanCheckout(
  token: string,
  planId: string,
  currency: PlanPaymentCurrency
) {
  const res = await fetch(`${apiBase()}/api/billing/dodo/checkout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ planId, currency }),
  });
  return parseApiJson<{
    success: true;
    checkout: DodoCheckoutPayload;
    orderId: string;
  }>(res);
}

export async function completeDodoPlanPayment(
  token: string,
  payload: {
    orderId: string;
    paymentId?: string;
    status: string;
  }
) {
  const res = await fetch(`${apiBase()}/api/billing/dodo/complete`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      orderId: payload.orderId,
      payment_id: payload.paymentId,
      status: payload.status,
    }),
  });
  return parseApiJson<{
    success: true;
    message: string;
    alreadyPaid?: boolean;
    plan?: unknown;
  }>(res);
}
