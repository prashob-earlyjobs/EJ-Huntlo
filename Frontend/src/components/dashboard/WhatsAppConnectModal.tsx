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

export type GupshupConnectMode = "existing" | "huntlo";

export type WhatsAppConnectFormValues = {
  provider: "meta_api" | "gupshup";
  gupshupMode: GupshupConnectMode;
  gupshupUserId: string;
  gupshupPassword: string;
  confirmRegistered: boolean;
};

const EMPTY_FORM: WhatsAppConnectFormValues = {
  provider: "gupshup",
  gupshupMode: "existing",
  gupshupUserId: "",
  gupshupPassword: "",
  confirmRegistered: false,
};

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: WhatsAppConnectFormValues) => void;
};

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-relaxed text-slate-500">{children}</p>;
}

export function WhatsAppConnectModal({ open, busy, onClose, onSubmit }: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [form, setForm] = useState<WhatsAppConnectFormValues>(EMPTY_FORM);
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

  const patch = useCallback((fields: Partial<WhatsAppConnectFormValues>) => {
    setForm((prev) => ({ ...prev, ...fields }));
    if (
      fields.gupshupMode !== undefined ||
      fields.gupshupUserId !== undefined ||
      fields.gupshupPassword !== undefined
    ) {
      setCredsVerified(false);
      setTestSuccessMessage("");
    }
    setError("");
  }, []);

  const isExisting = form.gupshupMode === "existing";
  const canConnect =
    form.provider === "gupshup" &&
    form.confirmRegistered &&
    (form.gupshupMode === "huntlo" || credsVerified);

  const canTestExisting =
    isExisting &&
    Boolean(form.gupshupUserId.trim()) &&
    Boolean(form.gupshupPassword) &&
    !testing &&
    !busy;

  const handleTestCredentials = async () => {
    if (!canTestExisting && form.gupshupMode !== "huntlo") return;

    setTesting(true);
    setError("");
    setTestSuccessMessage("");

    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }

      const res = await fetch(`${apiBase}/api/integrations/whatsapp/verify`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          gupshupMode: form.gupshupMode,
          gupshupUserId: form.gupshupUserId.trim(),
          gupshupPassword: form.gupshupPassword,
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
          : "Credentials verified. You can connect WhatsApp."
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

    if (form.provider !== "gupshup") {
      setError("Meta WhatsApp API is not available yet. Use Gupshup to connect.");
      return;
    }

    const userId = form.gupshupUserId.trim();
    const password = form.gupshupPassword;

    if (isExisting) {
      if (!userId) {
        setError("Gupshup user ID is required.");
        return;
      }
      if (!password) {
        setError("Gupshup password is required.");
        return;
      }
      if (!credsVerified) {
        setError("Test your credentials before connecting WhatsApp.");
        return;
      }
    }

    if (!form.confirmRegistered) {
      setError(
        isExisting
          ? "Confirm that your Gupshup account is set up for WhatsApp Business messaging."
          : "Please accept the terms to connect Huntlo WhatsApp."
      );
      return;
    }

    onSubmit({
      ...form,
      gupshupUserId: isExisting ? userId : "",
      gupshupPassword: isExisting ? password : "",
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
        aria-labelledby="whatsapp-connect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className="dashboard-integration-icon dashboard-integration-icon--brand shrink-0"
              aria-hidden
            >
              <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="whatsapp-connect-title" className="dashboard-section-title text-lg">
                Connect WhatsApp Business
              </h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Connect via Gupshup WhatsApp API. Meta direct API support is coming soon.
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
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider
            </legend>

            <div className="relative flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 opacity-80">
              <input
                type="radio"
                name="wa-provider"
                className="mt-1"
                disabled
                aria-disabled="true"
              />
              <span className="min-w-0 flex-1 text-left">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#141b2b]">Meta WhatsApp API</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Coming soon
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Direct Cloud API via Meta Business — templates and session messaging.
                </span>
              </span>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 has-[:checked]:border-[#0050cb]/40 has-[:checked]:bg-[#f8f9ff]">
              <input
                type="radio"
                name="wa-provider"
                className="mt-1"
                checked={form.provider === "gupshup"}
                onChange={() => patch({ provider: "gupshup" })}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#141b2b]">Gupshup WhatsApp API</span>
                  <span className="rounded-full bg-[#0050cb]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0050cb]">
                    Available
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Connect with your own Gupshup account or use Huntlo&apos;s managed WhatsApp.
                </span>
              </span>
            </label>
          </fieldset>

          {form.provider === "gupshup" ? (
            <>
              <fieldset className="mt-5 space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gupshup connection
                </legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 has-[:checked]:border-[#0050cb]/40 has-[:checked]:bg-[#f8f9ff]">
                  <input
                    type="radio"
                    name="gupshup-mode"
                    className="mt-1"
                    checked={form.gupshupMode === "existing"}
                    onChange={() => patch({ gupshupMode: "existing" })}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#141b2b]">
                      Existing Gupshup account
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Use your Gupshup Enterprise user ID and password.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 has-[:checked]:border-[#0050cb]/40 has-[:checked]:bg-[#f8f9ff]">
                  <input
                    type="radio"
                    name="gupshup-mode"
                    className="mt-1"
                    checked={form.gupshupMode === "huntlo"}
                    onChange={() => patch({ gupshupMode: "huntlo" })}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#141b2b]">
                      Huntlo WhatsApp
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Use Huntlo&apos;s Gupshup integration — no credentials required.
                    </span>
                  </span>
                </label>
              </fieldset>

              {isExisting ? (
                <div className="mt-6 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gupshup credentials
                  </p>
                  <label className={dashboardLabelClass}>
                    Gupshup user ID
                    <input
                      type="text"
                      className={`mt-1 w-full ${dashboardInputClass}`}
                      value={form.gupshupUserId}
                      onChange={(e) => patch({ gupshupUserId: e.target.value })}
                      placeholder="Your Gupshup Enterprise user ID"
                      required
                      autoComplete="username"
                    />
                    <FieldHelp>Same user ID you use to log in to Gupshup Enterprise.</FieldHelp>
                  </label>
                  <label className={dashboardLabelClass}>
                    Gupshup password
                    <input
                      type="password"
                      className={`mt-1 w-full ${dashboardInputClass}`}
                      value={form.gupshupPassword}
                      onChange={(e) => patch({ gupshupPassword: e.target.value })}
                      placeholder="Your Gupshup Enterprise password"
                      required
                      autoComplete="current-password"
                    />
                    <FieldHelp>
                      Stored securely on Huntlo. Never shared or shown again after saving.
                    </FieldHelp>
                  </label>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      className={`${dashboardBtnSecondaryClass} px-4 py-2 text-sm disabled:opacity-55`}
                      disabled={!canTestExisting}
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
                          Test credentials
                        </>
                      )}
                    </button>
                    {isExisting && !credsVerified ? (
                      <span className="text-xs text-slate-500">
                        Test credentials to enable Connect WhatsApp.
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-[#434654]">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300"
                  checked={form.confirmRegistered}
                  onChange={(e) => patch({ confirmRegistered: e.target.checked })}
                />
                <span>
                  {isExisting
                    ? "I confirm my Gupshup account is approved for WhatsApp Business messaging."
                    : "I agree to use Huntlo's managed WhatsApp sender for recruiting outreach."}
                </span>
              </label>
            </>
          ) : null}

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
              title={
                isExisting && !credsVerified
                  ? "Test credentials first"
                  : !form.confirmRegistered
                    ? "Accept the confirmation to continue"
                    : undefined
              }
            >
              {busy ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <MaterialIcon name="link" className="text-base" />
                  Connect WhatsApp
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
