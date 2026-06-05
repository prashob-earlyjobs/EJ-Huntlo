import type { RazorpayCheckoutPayload, RazorpayPrefill } from "@/lib/billingApi";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: RazorpayPrefill;
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
        existing.addEventListener("error", () => resolve(false));
        return;
      }
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve(Boolean(window.Razorpay));
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

export class RazorpayCheckoutDismissedError extends Error {
  constructor() {
    super("Checkout closed");
    this.name = "RazorpayCheckoutDismissedError";
  }
}

export async function openRazorpayCheckout(options: {
  checkout: RazorpayCheckoutPayload;
  prefill: RazorpayPrefill;
}): Promise<RazorpayHandlerResponse> {
  const loaded = await loadRazorpayCheckoutScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Could not load Razorpay checkout");
  }

  const { checkout, prefill } = options;

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: checkout.keyId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: "Huntlo",
      description: `${checkout.planName} plan — monthly subscription`,
      order_id: checkout.razorpayOrderId,
      prefill: {
        name: prefill.name,
        email: prefill.email,
        contact: prefill.contact,
      },
      theme: { color: "#0050cb" },
      handler(response) {
        resolve(response);
      },
      modal: {
        ondismiss() {
          reject(new RazorpayCheckoutDismissedError());
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      const description =
        response?.error?.description || "Payment failed. Please try again.";
      reject(new Error(description));
    });

    rzp.open();
  });
}
