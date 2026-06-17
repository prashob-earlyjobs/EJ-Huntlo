"use client";

import { useCallback, useEffect, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  verifyCustomMailCredentials,
  type CustomMailConnectPayload,
} from "@/lib/customMailIntegrations";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

export type CustomMailSecurity = "tls" | "ssl" | "none";

export type CustomMailConnectFormValues = {
  displayName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: string;
  security: CustomMailSecurity;
  username: string;
  password: string;
};

const EMPTY_FORM: CustomMailConnectFormValues = {
  displayName: "",
  fromEmail: "",
  smtpHost: "",
  smtpPort: "587",
  security: "tls",
  username: "",
  password: "",
};

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: CustomMailConnectFormValues) => void | Promise<void>;
};

function buildPayload(form: CustomMailConnectFormValues): CustomMailConnectPayload {
  return {
    fromEmail: form.fromEmail.trim(),
    displayName: form.displayName.trim(),
    smtpHost: form.smtpHost.trim(),
    smtpPort: form.smtpPort.trim(),
    security: form.security,
    username: form.username.trim(),
    password: form.password.trim(),
  };
}

export function CustomMailConnectModal({ open, busy, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CustomMailConnectFormValues>(EMPTY_FORM);
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

  const patch = useCallback((fields: Partial<CustomMailConnectFormValues>) => {
    setForm((prev) => ({ ...prev, ...fields }));
    if (
      fields.fromEmail !== undefined ||
      fields.smtpHost !== undefined ||
      fields.smtpPort !== undefined ||
      fields.username !== undefined ||
      fields.password !== undefined ||
      fields.security !== undefined
    ) {
      setCredsVerified(false);
      setTestSuccessMessage("");
    }
    setError("");
  }, []);

  const fromEmail = form.fromEmail.trim();
  const smtpHost = form.smtpHost.trim();
  const smtpPort = form.smtpPort.trim();
  const username = form.username.trim();
  const password = form.password.trim();
  const canTest =
    Boolean(fromEmail && smtpHost && smtpPort && username && password) &&
    !testing &&
    !busy;
  const canConnect = credsVerified && Boolean(fromEmail);

  const handleTestConnection = async () => {
    if (!canTest) return;
    setTesting(true);
    setError("");
    setTestSuccessMessage("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }
      const result = await verifyCustomMailCredentials(auth.token, buildPayload(form));
      setCredsVerified(true);
      setTestSuccessMessage(result.message);
    } catch (err) {
      setCredsVerified(false);
      setError(err instanceof Error ? err.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromEmail) {
      setError("From email is required.");
      return;
    }
    if (!smtpHost) {
      setError("SMTP host is required.");
      return;
    }
    if (!credsVerified) {
      setError("Test the SMTP connection before saving.");
      return;
    }
    setError("");
    await onSubmit({
      displayName: form.displayName.trim(),
      fromEmail,
      smtpHost,
      smtpPort,
      security: form.security,
      username,
      password,
    });
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
        className="dashboard-modal mx-auto flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-mail-connect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className="dashboard-integration-icon dashboard-integration-icon--brand shrink-0"
              aria-hidden
            >
              <IntegrationBrandLogo provider="custom_mail" title="Custom config" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="custom-mail-connect-title" className="dashboard-section-title text-lg">
                Custom mail config
              </h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Connect any SMTP inbox — corporate relay, self-hosted, or niche providers.
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={dashboardLabelClass}>
              From email
              <input
                type="email"
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.fromEmail}
                onChange={(e) => patch({ fromEmail: e.target.value })}
                placeholder="recruiter@company.com"
                required
                autoComplete="email"
              />
            </label>

            <label className={dashboardLabelClass}>
              Display name
              <input
                type="text"
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.displayName}
                onChange={(e) => patch({ displayName: e.target.value })}
                placeholder="Recruiting Team"
                autoComplete="name"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_7rem]">
            <label className={dashboardLabelClass}>
              SMTP host
              <input
                type="text"
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.smtpHost}
                onChange={(e) => patch({ smtpHost: e.target.value })}
                placeholder="smtp.company.com"
                required
                autoComplete="off"
              />
            </label>

            <label className={dashboardLabelClass}>
              Port
              <input
                type="number"
                min={1}
                max={65535}
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.smtpPort}
                onChange={(e) => patch({ smtpPort: e.target.value })}
                required
              />
            </label>
          </div>

          <label className={`mt-4 ${dashboardLabelClass}`}>
            Security
            <select
              className={`mt-1 w-full ${dashboardSelectClass}`}
              value={form.security}
              onChange={(e) => patch({ security: e.target.value as CustomMailSecurity })}
            >
              <option value="tls">STARTTLS (recommended)</option>
              <option value="ssl">SSL/TLS</option>
              <option value="none">None</option>
            </select>
          </label>

          <label className={`mt-4 ${dashboardLabelClass}`}>
            Username
            <input
              type="text"
              className={`mt-1 w-full ${dashboardInputClass}`}
              value={form.username}
              onChange={(e) => patch({ username: e.target.value })}
              placeholder="SMTP username"
              required
              autoComplete="username"
            />
          </label>

          <label className={`mt-4 ${dashboardLabelClass}`}>
            Password
            <input
              type="password"
              className={`mt-1 w-full ${dashboardInputClass}`}
              value={form.password}
              onChange={(e) => patch({ password: e.target.value })}
              placeholder="SMTP password"
              required
              autoComplete="off"
            />
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">
              Credentials are verified server-side and stored securely for campaign sending.
            </span>
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} px-4 py-2 text-sm disabled:opacity-55`}
              disabled={!canTest}
              onClick={() => void handleTestConnection()}
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
                  <MaterialIcon name="cable" className="text-base" />
                  Test connection
                </>
              )}
            </button>
            {!credsVerified ? (
              <span className="text-xs text-slate-500">Test SMTP before saving.</span>
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
              title={!credsVerified ? "Test connection first" : undefined}
            >
              {busy ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <MaterialIcon name="link" className="text-base" />
                  Save configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
