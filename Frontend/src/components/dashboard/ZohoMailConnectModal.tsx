"use client";

import { useCallback, useEffect, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";
import {
  fetchZohoMailOAuthUrl,
  fetchZohoMailStatus,
  persistZohoOAuthContext,
  ZOHO_DATA_CENTER_OPTIONS,
  type ZohoDataCenter,
} from "@/lib/zohoMailIntegrations";

export type ZohoMailConnectFormValues = {
  dataCenter: ZohoDataCenter;
  email: string;
  senderName: string;
  appPassword: string;
};

const EMPTY_FORM: ZohoMailConnectFormValues = {
  dataCenter: "com",
  email: "",
  senderName: "",
  appPassword: "",
};

type ConnectMode = "oauth" | "smtp";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: ZohoMailConnectFormValues) => void;
};

export function ZohoMailConnectModal({ open, busy, onClose, onSubmit }: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [mode, setMode] = useState<ConnectMode>("oauth");
  const [form, setForm] = useState<ZohoMailConnectFormValues>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [credsVerified, setCredsVerified] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState("");
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("oauth");
    setForm(EMPTY_FORM);
    setError("");
    setTesting(false);
    setOauthLoading(false);
    setCredsVerified(false);
    setTestSuccessMessage("");
    setOauthConfigured(null);

    const auth = getStoredAuth();
    if (!auth?.token) return;
    void fetchZohoMailStatus(auth.token).then((status) => {
      setOauthConfigured(status?.oauthConfigured ?? false);
      if (status?.oauthConfigured === false) {
        setMode("smtp");
      }
    });
  }, [open]);

  const patch = useCallback((fields: Partial<ZohoMailConnectFormValues>) => {
    setForm((prev) => ({ ...prev, ...fields }));
    if (fields.email !== undefined || fields.appPassword !== undefined) {
      setCredsVerified(false);
      setTestSuccessMessage("");
    }
    setError("");
  }, []);

  const email = form.email.trim();
  const appPassword = form.appPassword.trim();
  const canTest = Boolean(email && appPassword) && !testing && !busy;
  const canConnectSmtp = credsVerified && Boolean(email);

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

      const res = await fetch(`${apiBase}/api/integrations/zoho_mail/verify`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          authMode: "smtp",
          email,
          appPassword,
          dataCenter: form.dataCenter,
        }),
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
          : `Ready to connect as ${email}.`
      );
    } catch (err) {
      setCredsVerified(false);
      setError(err instanceof Error ? err.message : "Credential verification failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleOAuthSignIn = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }

      const payload = await fetchZohoMailOAuthUrl(auth.token, form.dataCenter);
      if (!payload?.authorizeUrl) {
        throw new Error(
          "Zoho OAuth is not configured on this server. Use SMTP with an app-specific password instead."
        );
      }

      persistZohoOAuthContext(form.dataCenter);
      window.location.href = payload.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Zoho sign-in.");
      setOauthLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== "smtp") return;
    if (!email) {
      setError("Zoho Mail address is required.");
      return;
    }
    if (!credsVerified) {
      setError("Test your credentials before connecting.");
      return;
    }
    onSubmit({
      dataCenter: form.dataCenter,
      email,
      senderName: form.senderName.trim(),
      appPassword,
    });
  };

  if (!open) return null;

  return (
    <div
      className="dashboard-modal-overlay py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !testing && !oauthLoading) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,700px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zoho-mail-connect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className="dashboard-integration-icon dashboard-integration-icon--brand shrink-0"
              aria-hidden
            >
              <IntegrationBrandLogo provider="zoho_mail" title="Zoho Mail" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="zoho-mail-connect-title" className="dashboard-section-title text-lg">
                Connect Zoho Mail
              </h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Sign in with Zoho OAuth or connect with an app-specific password over SMTP.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
              onClick={onClose}
              disabled={busy || testing || oauthLoading}
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
        >
          <label className={dashboardLabelClass}>
            Zoho data center
            <select
              className={`mt-1 w-full ${dashboardSelectClass}`}
              value={form.dataCenter}
              onChange={(e) => patch({ dataCenter: e.target.value as ZohoDataCenter })}
              disabled={busy || testing || oauthLoading}
            >
              {ZOHO_DATA_CENTER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className="mt-4 flex gap-2 rounded-lg bg-slate-100 p-1"
            role="tablist"
            aria-label="Zoho Mail connection method"
          >
            <button
              type="button"
              role="tab"
              id="zoho-connect-tab-oauth"
              aria-selected={mode === "oauth"}
              aria-controls="zoho-connect-panel-oauth"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "oauth"
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`}
              onClick={() => {
                setMode("oauth");
                setError("");
                setTestSuccessMessage("");
              }}
            >
              OAuth (recommended)
            </button>
            <button
              type="button"
              role="tab"
              id="zoho-connect-tab-smtp"
              aria-selected={mode === "smtp"}
              aria-controls="zoho-connect-panel-smtp"
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === "smtp"
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`}
              onClick={() => {
                setMode("smtp");
                setError("");
              }}
            >
              App password (SMTP)
            </button>
          </div>

          {mode === "oauth" ? (
            <div
              id="zoho-connect-panel-oauth"
              role="tabpanel"
              aria-labelledby="zoho-connect-tab-oauth"
              className="mt-5"
            >
              <ul className="dashboard-integration-features">
                <li>Secure OAuth — no password stored</li>
                <li>Send outreach via Zoho Mail API</li>
                <li>Works with Zoho Mail and custom domains</li>
              </ul>

              {oauthConfigured === null ? (
                <p className="mt-4 text-sm text-slate-500">Checking OAuth availability…</p>
              ) : null}

              <button
                type="button"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E42527] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c91f22] disabled:opacity-60"
                disabled={busy || oauthLoading || oauthConfigured !== true}
                onClick={() => void handleOAuthSignIn()}
              >
                <ButtonLoadingContent loading={oauthLoading} loadingLabel="Redirecting to Zoho">
                  <>
                    <IntegrationBrandLogo
                      provider="zoho_mail"
                      title="Zoho"
                      className="dashboard-integration-brand-logo--sm"
                    />
                    Sign in with Zoho
                  </>
                </ButtonLoadingContent>
              </button>

              {oauthConfigured === false ? (
                <p className="dashboard-alert-warning mt-4 text-sm" role="status">
                  OAuth is not configured on this server yet. Use{" "}
                  <strong>App password (SMTP)</strong> above, or ask an admin to add{" "}
                  <code className="text-xs">ZOHO_CLIENT_ID</code> and{" "}
                  <code className="text-xs">ZOHO_CLIENT_SECRET</code> to Backend/.env.
                </p>
              ) : null}
            </div>
          ) : (
            <div
              id="zoho-connect-panel-smtp"
              role="tabpanel"
              aria-labelledby="zoho-connect-tab-smtp"
            >
              <p className="mt-5 text-sm text-slate-600">
                Generate an app-specific password in your{" "}
                <a
                  href="https://accounts.zoho.com/home#security/app_passwords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#0050cb] underline-offset-2 hover:underline"
                >
                  Zoho Account security
                </a>{" "}
                settings, then paste it below.
              </p>

              <label className={`mt-5 ${dashboardLabelClass}`}>
                Zoho Mail address
                <input
                  type="email"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="you@yourdomain.com"
                  required
                  autoComplete="email"
                />
              </label>

              <label className={`mt-4 ${dashboardLabelClass}`}>
                Sender display name
                <input
                  type="text"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={form.senderName}
                  onChange={(e) => patch({ senderName: e.target.value })}
                  placeholder="Your name (optional)"
                  autoComplete="name"
                />
              </label>

              <label className={`mt-4 ${dashboardLabelClass}`}>
                App-specific password
                <input
                  type="password"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={form.appPassword}
                  onChange={(e) => patch({ appPassword: e.target.value })}
                  placeholder="Paste Zoho app password"
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
                  <ButtonLoadingContent loading={testing} loadingLabel="Testing">
                    {credsVerified ? (
                      <>
                        <MaterialIcon name="check_circle" className="text-base text-emerald-600" />
                        Test again
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="verified_user" className="text-base" />
                        Test credentials
                      </>
                    )}
                  </ButtonLoadingContent>
                </button>
                {!credsVerified ? (
                  <span className="text-xs text-slate-500">Test credentials to enable Connect.</span>
                ) : null}
              </div>
            </div>
          )}

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
              disabled={busy || testing || oauthLoading}
            >
              Cancel
            </button>
            {mode === "smtp" ? (
              <button
                type="submit"
                disabled={busy || testing || !canConnectSmtp}
                className={`${dashboardBtnPrimaryClass} disabled:opacity-60`}
                title={!credsVerified ? "Test credentials first" : undefined}
              >
                <ButtonLoadingContent loading={busy} loadingLabel="Saving">
                  <>
                    <MaterialIcon name="link" className="text-base" />
                    Connect Zoho Mail
                  </>
                </ButtonLoadingContent>
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
