"use client";

import { useEffect, useRef } from "react";

import { completeDodoPlanPayment } from "@/lib/billingApi";
import { getStoredAuth } from "@/lib/auth";
import { pathForDashboardTab } from "@/lib/dashboardRoutes";

type Options = {
  enabled?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function clearBillingQueryParams() {
  const url = new URL(window.location.href);
  [
    "billing_return",
    "billing_cancel",
    "order",
    "payment_id",
    "subscription_id",
    "status",
    "email",
    "license_key",
  ].forEach((key) => url.searchParams.delete(key));
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

/**
 * After Dodo redirect: /dashboard/plans?billing_return=dodo&order=...&payment_id=...&status=succeeded
 */
export function useDodoPaymentReturn({ enabled = true, onSuccess, onError }: Options = {}) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (!enabled || handledRef.current || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const billingReturn = params.get("billing_return");
    const billingCancel = params.get("billing_cancel");

    if (billingCancel === "dodo") {
      handledRef.current = true;
      clearBillingQueryParams();
      onError?.("Checkout cancelled.");
      return;
    }

    if (billingReturn !== "dodo") return;

    const orderId = params.get("order")?.trim() || "";
    const paymentId = params.get("payment_id")?.trim() || "";
    const status = params.get("status")?.trim() || "";

    if (!orderId) {
      handledRef.current = true;
      clearBillingQueryParams();
      onError?.("Missing order reference from payment return.");
      return;
    }

    handledRef.current = true;

    const auth = getStoredAuth();
    if (!auth?.token) {
      clearBillingQueryParams();
      onError?.("Please sign in to confirm your payment.");
      return;
    }

    (async () => {
      try {
        const result = await completeDodoPlanPayment(auth.token, {
          orderId,
          paymentId: paymentId || undefined,
          status: status || "succeeded",
        });
        onSuccess?.(result.message || "Your plan is now active.");
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : "Could not confirm Dodo payment."
        );
      } finally {
        clearBillingQueryParams();
      }
    })();
  }, [enabled, onSuccess, onError]);
}
