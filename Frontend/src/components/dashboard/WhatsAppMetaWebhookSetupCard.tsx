"use client";

import { useCallback, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { MetaWebhookSetupPayload } from "@/lib/whatsappMetaWebhookSetup";
import { dashboardInputClass, dashboardLabelClass } from "@/lib/dashboardStyles";

type Props = {
  setup: MetaWebhookSetupPayload | null;
  loading?: boolean;
  compact?: boolean;
};

async function copyText(value: string) {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      type="button"
      className="dashboard-btn-secondary shrink-0 px-2.5 py-1.5 text-xs"
      onClick={() => void handleCopy()}
      disabled={!value}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <>
          <MaterialIcon name="check" className="text-sm text-emerald-600" />
          Copied
        </>
      ) : (
        <>
          <MaterialIcon name="content_copy" className="text-sm" />
          Copy
        </>
      )}
    </button>
  );
}

export function WhatsAppMetaWebhookSetupCard({ setup, loading, compact }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
        Loading webhook setup…
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Could not load webhook settings. Try again or contact support.
      </div>
    );
  }

  const fieldsLabel = setup.subscribeFields.join(", ");

  return (
    <div
      className={`rounded-xl border border-[#128c7e]/25 bg-[#f0f7f4]/80 ${
        compact ? "p-3" : "p-4"
      } space-y-3`}
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">Meta webhook (required for replies)</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{setup.instructions}</p>
      </div>

      {!setup.verifyTokenConfigured ? (
        <p className="dashboard-alert-error text-xs" role="alert">
          Huntlo has not set <code className="text-[11px]">META_WEBHOOK_VERIFY_TOKEN</code> on this
          server. Ask your administrator before connecting — inbound replies will not work.
        </p>
      ) : null}

      {!setup.callbackUrl ? (
        <p className="text-xs text-amber-800" role="status">
          Set <code className="text-[11px]">PUBLIC_API_BASE_URL</code> on the API server so Huntlo
          can show the correct callback URL, or use your API host +{" "}
          <code className="text-[11px]">{setup.callbackPath}</code>.
        </p>
      ) : null}

      <div className="space-y-3">
        <div>
          <span className={dashboardLabelClass}>Callback URL</span>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              readOnly
              className={`min-w-0 flex-1 ${dashboardInputClass} text-xs`}
              value={setup.callbackUrl}
              aria-label="Meta webhook callback URL"
            />
            <CopyButton value={setup.callbackUrl} label="callback URL" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Meta for Developers → WhatsApp → Configuration → Webhook → Edit.
          </p>
        </div>

        <div>
          <span className={dashboardLabelClass}>Verify token</span>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              readOnly
              className={`min-w-0 flex-1 ${dashboardInputClass} font-mono text-xs`}
              value={setup.verifyTokenConfigured ? setup.verifyToken : "—"}
              aria-label="Meta webhook verify token"
            />
            <CopyButton
              value={setup.verifyToken}
              label="verify token"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Paste the same verify token in Meta when subscribing the webhook.
          </p>
        </div>

        <p className="text-xs text-slate-600">
          Subscribe to webhook fields: <span className="font-medium">{fieldsLabel}</span>
        </p>
        <p className="text-xs text-slate-600">
          Approved template names in your WhatsApp sequence must match templates in your Meta
          Business account (e.g. <span className="font-mono">profile_review_reminder_v1</span>).
        </p>
      </div>
    </div>
  );
}
