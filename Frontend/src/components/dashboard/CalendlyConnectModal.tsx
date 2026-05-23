"use client";

import { useCallback, useEffect, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";

export type CalendlyConnectFormValues = {
  personalAccessToken: string;
};

const EMPTY_FORM: CalendlyConnectFormValues = {
  personalAccessToken: "",
};

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: CalendlyConnectFormValues) => void;
};

const CALENDLY_PAT_URL = "https://calendly.com/integrations/api_webhooks";

export function CalendlyConnectModal({ open, busy, onClose, onSubmit }: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [form, setForm] = useState<CalendlyConnectFormValues>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [credsVerified, setCredsVerified] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError("");
    setTesting(false);
    setCredsVerified(false);
    setTestSuccessMessage("");
  }, [open]);

  const patch = useCallback((fields: Partial<CalendlyConnectFormValues>) => {
    setForm((prev) => ({ ...prev, ...fields }));
    if (fields.personalAccessToken !== undefined) {
      setCredsVerified(false);
      setTestSuccessMessage("");
    }
    setError("");
  }, []);

  const token = form.personalAccessToken.trim();
  const canTest = Boolean(token) && !testing && !busy;
  const canConnect = credsVerified && Boolean(token);

  const handleTestCredentials = async () => {
    if (!canTest) return;

    setTesting(true);
    setError("");
    setTestSuccessMessage("");

    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }

      const res = await fetch(`${apiBase}/api/integrations/calendly/verify`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({ personalAccessToken: token }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.verified) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Credential verification failed"
        );
      }

      setCredsVerified(true);
      setTestSuccessMessage(
        typeof data.message === "string"
          ? data.message
          : "Token verified. You can connect Calendly."
      );
    } catch (err) {
      setCredsVerified(false);
      setError(err instanceof Error ? err.message : "Credential verification failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Personal access token is required.");
      return;
    }
    if (!credsVerified) {
      setError("Test your token before connecting Calendly.");
      return;
    }

    onSubmit({ personalAccessToken: token });
  };

  if (!open) return null;

  return (
    <div
      className="dashboard-modal-overlay py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !testing) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendly-connect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className="dashboard-integration-icon dashboard-integration-icon--brand shrink-0"
              aria-hidden
            >
              <IntegrationBrandLogo provider="calendly" title="Calendly" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="calendly-connect-title" className="dashboard-section-title text-lg">
                Connect Calendly
              </h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Link your Calendly account with a personal access token to share scheduling links
                in outreach.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
              onClick={onClose}
              disabled={busy || testing}
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
        >
          <p className="text-sm text-slate-600">
            Create a token in your{" "}
            <a
              href={CALENDLY_PAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#0050cb] underline-offset-2 hover:underline"
            >
              Calendly integrations
            </a>{" "}
            page under Personal Access Tokens.
          </p>

          <label className={`mt-5 ${dashboardLabelClass}`}>
            Personal access token
            <input
              type="password"
              className={`mt-1 w-full ${dashboardInputClass}`}
              value={form.personalAccessToken}
              onChange={(e) => patch({ personalAccessToken: e.target.value })}
              placeholder="Paste your Calendly PAT"
              required
              autoComplete="off"
            />
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">
              Stored securely on Huntlo. Never shown again after saving.
            </span>
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} px-4 py-2 text-sm disabled:opacity-55`}
              disabled={!canTest}
              onClick={() => void handleTestCredentials()}
            >
              {testing ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Testing…
                </>
              ) : credsVerified ? (
                <>
                  <MaterialIcon name="check_circle" className="text-base text-emerald-600" />
                  Test again
                </>
              ) : (
                <>
                  <MaterialIcon name="verified_user" className="text-base" />
                  Test token
                </>
              )}
            </button>
            {!credsVerified ? (
              <span className="text-xs text-slate-500">Test your token to enable Connect.</span>
            ) : null}
          </div>

          {testSuccessMessage ? (
            <p className="dashboard-alert-success mt-4 text-sm" role="status">
              {testSuccessMessage}
            </p>
          ) : null}

          {error ? (
            <p className="dashboard-alert-error mt-4" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={onClose}
              disabled={busy || testing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || testing || !canConnect}
              className={`${dashboardBtnPrimaryClass} disabled:opacity-60`}
              title={!credsVerified ? "Test token first" : undefined}
            >
              {busy ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <MaterialIcon name="link" className="text-base" />
                  Connect Calendly
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
