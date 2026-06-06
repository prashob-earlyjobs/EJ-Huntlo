"use client";

import { useCallback, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { GupshupWebhookSetupPayload } from "@/lib/whatsappGupshupWebhookSetup";
import { dashboardLabelClass } from "@/lib/dashboardStyles";

type Props = {
  setup: GupshupWebhookSetupPayload | null;
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

function UrlRow({ label, url }: { label: string; url: string }) {
  if (!url) return null;
  return (
    <div className="space-y-1">
      <p className={dashboardLabelClass}>{label}</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800">
          {url}
        </code>
        <CopyButton value={url} label={label} />
      </div>
    </div>
  );
}

export function WhatsAppGupshupWebhookSetupCard({ setup, compact }: Props) {
  if (!setup?.incomingCallbackUrl && !setup?.deliveryReportCallbackUrl) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/80 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-sm font-semibold text-slate-900">Gupshup webhook URLs</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        {setup.instructions ||
          "Configure these in Gupshup Console (EarlyJobs Portal style)."}
      </p>
      <div className={`mt-3 space-y-3 ${compact ? "" : "mt-4"}`}>
        <UrlRow label="Incoming messages" url={setup.incomingCallbackUrl} />
        <UrlRow label="Delivery reports (GET/POST)" url={setup.deliveryReportCallbackUrl} />
        <UrlRow label="Simple status (optional)" url={setup.statusCallbackUrl} />
      </div>
    </div>
  );
}
