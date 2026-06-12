"use client";

import { useEffect, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import { fetchOutlookOAuthUrl, fetchOutlookStatus } from "@/lib/outlookIntegrations";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
};

export function OutlookConnectModal({ open, busy, onClose }: Props) {
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setOauthLoading(false);
    setError("");
    setOauthConfigured(null);

    const auth = getStoredAuth();
    if (!auth?.token) return;
    void fetchOutlookStatus(auth.token).then((status) => {
      setOauthConfigured(status?.oauthConfigured ?? false);
    });
  }, [open]);

  const handleMicrosoftSignIn = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }

      const payload = await fetchOutlookOAuthUrl(auth.token);
      if (!payload?.authorizeUrl) {
        throw new Error(
          "Microsoft OAuth is not configured on this server. Contact your administrator."
        );
      }

      window.location.href = payload.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microsoft sign-in failed.");
      setOauthLoading(false);
    }
  };

  if (!open) return null;

  const working = busy || oauthLoading;

  return (
    <div
      className="dashboard-modal-overlay py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !working) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outlook-connect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className="dashboard-integration-icon dashboard-integration-icon--brand shrink-0"
              aria-hidden
            >
              <IntegrationBrandLogo provider="outlook" title="Outlook" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="outlook-connect-title" className="dashboard-section-title text-lg">
                Connect Outlook
              </h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Send and track candidate outreach from your Microsoft 365 or Outlook.com inbox.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
              onClick={onClose}
              disabled={working}
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
          <ul className="dashboard-integration-features">
            <li>Read and send mail on your behalf</li>
            <li>Sync replies into campaign threads</li>
            <li>Works with Microsoft 365 and Outlook.com</li>
          </ul>

          {oauthConfigured === false ? (
            <p className="dashboard-alert-error mt-4 text-sm" role="alert">
              Microsoft OAuth is not configured on this server. Ask an admin to set{" "}
              <code className="text-xs">MICROSOFT_CLIENT_ID</code> and{" "}
              <code className="text-xs">MICROSOFT_CLIENT_SECRET</code> in Backend/.env.
            </p>
          ) : (
            <button
              type="button"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0078D4] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#106ebe] disabled:opacity-60"
              disabled={working}
              onClick={() => void handleMicrosoftSignIn()}
            >
              {working ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Redirecting to Microsoft…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </button>
          )}

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            You will be redirected to Microsoft to sign in. Huntlo stores OAuth tokens securely
            and never sees your Microsoft password.
          </p>

          {error ? (
            <p className="dashboard-alert-error mt-4" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={onClose}
              disabled={working}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
