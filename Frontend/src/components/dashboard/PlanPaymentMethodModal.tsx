"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  createDodoPlanCheckout,
  createRazorpayPlanOrder,
  fetchDodoConfig,
  fetchRazorpayConfig,
  verifyRazorpayPlanPayment,
} from "@/lib/billingApi";
import { getStoredAuth } from "@/lib/auth";
import {
  PLAN_PAYMENT_PROVIDERS,
  planPaymentAmountDisplay,
  planPaymentCurrencyLabel,
  resolveTierBillingCurrency,
  type PlanPaymentProviderId,
} from "@/lib/planPayment";
import {
  openRazorpayCheckout,
  RazorpayCheckoutDismissedError,
} from "@/lib/razorpayCheckout";
import type { PricingTier } from "@/lib/pricingPlans";

type Props = {
  open: boolean;
  tier: PricingTier;
  isUpgrade: boolean;
  onClose: () => void;
  onPaymentSuccess?: (message: string) => void;
};

function RazorpayMark() {
  return (
    <svg viewBox="0 0 48 48" className="dashboard-plan-pay-provider-mark" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#072654" />
      <path
        d="M14 30V18h5.2c3.4 0 5.6 1.8 5.6 4.8 0 2.2-1.2 3.8-3.1 4.5L26 30h-3.1l-3.8-5.6H17.2V30H14zm3.2-8.4h1.9c1.6 0 2.5-.8 2.5-2.1s-.9-2-2.5-2h-1.9v4.1zM28.2 30V18h6.1c3.8 0 6.3 2.4 6.3 6s-2.5 6-6.3 6h-2.9v4h-3.2zm3.2-6.8h2.7c2 0 3.1-1 3.1-2.8s-1.1-2.8-3.1-2.8h-2.7v5.6z"
        fill="#fff"
      />
    </svg>
  );
}

function DodoMark() {
  return (
    <svg viewBox="0 0 48 48" className="dashboard-plan-pay-provider-mark" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#1a1625" />
      <circle cx="24" cy="24" r="10" fill="#7c5cff" />
      <path
        d="M20 24c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"
        fill="#fff"
        opacity="0.9"
      />
      <circle cx="28" cy="22" r="1.5" fill="#fff" />
    </svg>
  );
}

function ProviderMark({ id }: { id: PlanPaymentProviderId }) {
  if (id === "razorpay") return <RazorpayMark />;
  return <DodoMark />;
}

export function PlanPaymentMethodModal({
  open,
  tier,
  isUpgrade,
  onClose,
  onPaymentSuccess,
}: Props) {
  const currency = resolveTierBillingCurrency(tier);
  const defaultProvider: PlanPaymentProviderId | null =
    currency === "usd" ? "dodo" : currency === "inr" ? "razorpay" : null;
  const [mounted, setMounted] = useState(false);
  const [provider, setProvider] = useState<PlanPaymentProviderId | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState<boolean | null>(null);
  const [dodoEnabled, setDodoEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadProviderStatus = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setRazorpayEnabled(false);
      setDodoEnabled(false);
      return;
    }
    const [razorpayResult, dodoResult] = await Promise.allSettled([
      fetchRazorpayConfig(auth.token),
      fetchDodoConfig(auth.token),
    ]);
    setRazorpayEnabled(
      razorpayResult.status === "fulfilled" && Boolean(razorpayResult.value.razorpay?.enabled)
    );
    setDodoEnabled(
      dodoResult.status === "fulfilled" && Boolean(dodoResult.value.dodo?.enabled)
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    setProvider(defaultProvider);
    setNotice(null);
    setProcessing(false);
    void loadProviderStatus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !processing) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, processing, loadProviderStatus, defaultProvider]);

  if (!open || !mounted || !currency) return null;

  const amountLabel = planPaymentAmountDisplay(tier);
  const actionLabel = isUpgrade ? "Upgrade" : "Subscribe";
  const planId = tier.id?.trim().toLowerCase() || "";

  const handleRazorpayCheckout = async () => {
    if (currency !== "inr") {
      setNotice({
        tone: "error",
        text: "Razorpay supports INR only. Switch billing currency to INR or choose Dodo for USD.",
      });
      return;
    }

    if (razorpayEnabled === false) {
      setNotice({
        tone: "error",
        text: "Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setNotice({ tone: "error", text: "Please sign in again to continue." });
      return;
    }

    setProcessing(true);
    setNotice(null);

    try {
      const orderRes = await createRazorpayPlanOrder(auth.token, planId, currency);
      const payment = await openRazorpayCheckout({
        checkout: orderRes.checkout,
        prefill: orderRes.prefill,
      });

      const verifyRes = await verifyRazorpayPlanPayment(auth.token, payment);
      const successMessage =
        verifyRes.message ||
        `Your ${tier.name} plan is now active.`;

      setNotice({ tone: "success", text: successMessage });
      onPaymentSuccess?.(successMessage);

      window.setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      if (err instanceof RazorpayCheckoutDismissedError) {
        setNotice({ tone: "info", text: "Checkout cancelled." });
      } else {
        setNotice({
          tone: "error",
          text: err instanceof Error ? err.message : "Payment could not be completed.",
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDodoCheckout = async () => {
    if (currency !== "usd") {
      setNotice({
        tone: "error",
        text: "Dodo supports USD/global checkout. Switch billing currency to USD or use Razorpay for INR.",
      });
      return;
    }

    if (dodoEnabled === false) {
      setNotice({
        tone: "error",
        text: "Dodo Payments is not configured. Add DODO_PAYMENTS_API_KEY and product IDs on the server.",
      });
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setNotice({ tone: "error", text: "Please sign in again to continue." });
      return;
    }

    setProcessing(true);
    setNotice(null);

    try {
      const session = await createDodoPlanCheckout(auth.token, planId, currency);
      onClose();
      window.location.href = session.checkout.checkoutUrl;
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Could not start Dodo checkout.",
      });
      setProcessing(false);
    }
  };

  const handleContinue = async () => {
    if (!provider || processing) return;

    if (provider === "dodo") {
      await handleDodoCheckout();
      return;
    }

    await handleRazorpayCheckout();
  };

  const noticeClass =
    notice?.tone === "error"
      ? "dashboard-plan-pay-modal-notice dashboard-plan-pay-modal-notice--error"
      : notice?.tone === "success"
        ? "dashboard-plan-pay-modal-notice dashboard-plan-pay-modal-notice--success"
        : "dashboard-plan-pay-modal-notice";

  const providerOptions = PLAN_PAYMENT_PROVIDERS.filter((option) =>
    currency === "inr" ? option.id === "razorpay" : option.id === "dodo"
  );

  return createPortal(
    <div
      className="dashboard-modal-overlay z-[140] py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-payment-modal-title"
    >
      <button
        type="button"
        className="dashboard-confirm-modal-backdrop"
        aria-label="Close"
        onClick={processing ? undefined : onClose}
        disabled={processing}
      />
      <div className="dashboard-modal dashboard-plan-pay-modal mx-auto w-full max-w-md overflow-hidden p-0">
        <header className="dashboard-plan-pay-modal-header">
          <div>
            <p className="dashboard-plan-pay-modal-eyebrow">{actionLabel} plan</p>
            <h2 id="plan-payment-modal-title" className="dashboard-plan-pay-modal-title">
              Choose payment method
            </h2>
            <p className="dashboard-plan-pay-modal-summary">
              <span className="font-semibold text-[var(--dash-on-surface)]">{tier.name}</span>
              <span className="text-[var(--dash-on-surface-variant)]"> · </span>
              <span className="tabular-nums">{amountLabel}</span>
              <span className="text-[var(--dash-on-surface-variant)]">
                {" "}
                ({planPaymentCurrencyLabel(currency)})
              </span>
            </p>
          </div>
          <button
            type="button"
            className="dashboard-plan-pay-modal-close"
            onClick={onClose}
            disabled={processing}
            aria-label="Close"
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </header>

        <div className="dashboard-plan-pay-modal-body">
          <p className="dashboard-plan-pay-modal-hint">
            Select how you would like to pay. Razorpay opens a secure checkout for cards, UPI, and
            netbanking.
          </p>

          {razorpayEnabled === false && currency === "inr" ? (
            <p className="dashboard-plan-pay-modal-notice dashboard-plan-pay-modal-notice--error">
              <MaterialIcon name="warning" className="shrink-0 text-base" />
              Razorpay is not configured. Contact your administrator.
            </p>
          ) : null}

          {dodoEnabled === false && currency === "usd" ? (
            <p className="dashboard-plan-pay-modal-notice dashboard-plan-pay-modal-notice--error">
              <MaterialIcon name="warning" className="shrink-0 text-base" />
              Dodo Payments is not configured. Contact your administrator.
            </p>
          ) : null}

          <ul className="dashboard-plan-pay-provider-list" role="listbox" aria-label="Payment providers">
            {providerOptions.map((option) => {
              const selected = provider === option.id;
              const disabledOption =
                processing ||
                (option.id === "razorpay" && currency === "inr" && razorpayEnabled === false) ||
                (option.id === "dodo" && currency === "usd" && dodoEnabled === false);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={disabledOption}
                    className={`dashboard-plan-pay-provider-card${
                      selected ? " dashboard-plan-pay-provider-card--selected" : ""
                    }`}
                    onClick={() => {
                      setProvider(option.id);
                      setNotice(null);
                    }}
                  >
                    <ProviderMark id={option.id} />
                    <span className="dashboard-plan-pay-provider-text">
                      <span className="dashboard-plan-pay-provider-name">{option.name}</span>
                      <span className="dashboard-plan-pay-provider-desc">{option.description}</span>
                      <span className="dashboard-plan-pay-provider-hint">{option.hint}</span>
                    </span>
                    <span
                      className={`dashboard-plan-pay-provider-check${
                        selected ? " dashboard-plan-pay-provider-check--on" : ""
                      }`}
                      aria-hidden
                    >
                      <MaterialIcon name={selected ? "check_circle" : "radio_button_unchecked"} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {notice ? (
            <p className={noticeClass} role="status">
              <MaterialIcon
                name={
                  notice.tone === "error"
                    ? "error"
                    : notice.tone === "success"
                      ? "check_circle"
                      : "info"
                }
                className="shrink-0 text-base"
              />
              {notice.text}
            </p>
          ) : null}
        </div>

        <footer className="dashboard-plan-pay-modal-footer">
          <button
            type="button"
            className="dashboard-btn-secondary"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dashboard-btn-primary"
            disabled={!provider || processing}
            onClick={() => void handleContinue()}
          >
            {processing ? (
              <>
                <MaterialIcon name="progress_activity" className="text-base animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <MaterialIcon name="arrow_forward" className="text-base" />
                Continue to checkout
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
