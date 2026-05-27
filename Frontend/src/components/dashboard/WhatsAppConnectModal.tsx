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

export type WhatsAppConnectMode = "huntlo" | "own";

export type WhatsAppConnectFormValues = {
  mode: WhatsAppConnectMode;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  confirmRegistered: boolean;
};

const EMPTY_FORM: WhatsAppConnectFormValues = {
  mode: "huntlo",
  metaPhoneNumberId: "",
  metaAccessToken: "",
  metaWabaId: "",
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
  const [huntloAvailable, setHuntloAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [credsVerified, setCredsVerified] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState("");

  const loadStatus = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setHuntloAvailable(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/integrations/whatsapp/status`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      setHuntloAvailable(Boolean(data.success && data.huntloAvailable));
    } catch {
      setHuntloAvailable(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError("");
    setTesting(false);
    setCredsVerified(false);
    setTestSuccessMessage("");
    void loadStatus();
  }, [open, loadStatus]);

  const patch = useCallback((fields: Partial<WhatsAppConnectFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...fields };
      if (fields.mode !== undefined && fields.mode !== prev.mode) {
        setCredsVerified(false);
        setTestSuccessMessage("");
        setError("");
      }
      return next;
    });
    if (
      fields.metaPhoneNumberId !== undefined ||
      fields.metaAccessToken !== undefined ||
      fields.metaWabaId !== undefined
    ) {
      setCredsVerified(false);
      setTestSuccessMessage("");
    }
    setError("");
  }, []);

  const isHuntlo = form.mode === "huntlo";

  const canTest =
    !testing &&
    !busy &&
    (isHuntlo ? huntloAvailable === true : Boolean(form.metaPhoneNumberId.trim() && form.metaAccessToken.trim()));

  const canConnectHuntlo = isHuntlo && form.confirmRegistered && huntloAvailable === true;
  const canConnectOwn =
    !isHuntlo &&
    form.confirmRegistered &&
    credsVerified &&
    Boolean(form.metaPhoneNumberId.trim()) &&
    Boolean(form.metaAccessToken.trim());

  const canConnect = isHuntlo ? canConnectHuntlo : canConnectOwn;

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

      const res = await fetch(`${apiBase}/api/integrations/whatsapp/verify`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify(
          isHuntlo
            ? { whatsappMode: "huntlo" }
            : {
                provider: "meta_api",
                phoneNumberId: form.metaPhoneNumberId.trim(),
                accessToken: form.metaAccessToken.trim(),
                wabaId: form.metaWabaId.trim(),
              }
        ),
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
          : isHuntlo
            ? "Huntlo WhatsApp is ready. You can connect now."
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

    if (isHuntlo) {
      if (huntloAvailable !== true) {
        setError("Huntlo WhatsApp is not available on this environment.");
        return;
      }
      if (!form.confirmRegistered) {
        setError("Confirm that you want to send from the Huntlo WhatsApp number.");
        return;
      }
      onSubmit({ ...form, mode: "huntlo" });
      return;
    }

    if (!form.metaPhoneNumberId.trim()) {
      setError("Phone Number ID is required.");
      return;
    }
    if (!form.metaAccessToken.trim()) {
      setError("Meta access token is required.");
      return;
    }
    if (!credsVerified) {
      setError("Test your credentials before connecting WhatsApp.");
      return;
    }
    if (!form.confirmRegistered) {
      setError("Confirm that your Meta app has WhatsApp messaging permissions.");
      return;
    }

    onSubmit({
      ...form,
      mode: "own",
      metaPhoneNumberId: form.metaPhoneNumberId.trim(),
      metaAccessToken: form.metaAccessToken.trim(),
      metaWabaId: form.metaWabaId.trim(),
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
        className="dashboard-modal mx-auto flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden p-0"
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
                Use Huntlo&apos;s WhatsApp number or connect your own Meta Cloud API account.
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
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Connection type
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-colors ${
                  isHuntlo
                    ? "border-[#128c7e] bg-[#f0f7f4] ring-1 ring-[#128c7e]/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }${huntloAvailable === false ? " cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="wa-mode"
                    className="text-[#128c7e]"
                    checked={isHuntlo}
                    disabled={huntloAvailable === false}
                    onChange={() => patch({ mode: "huntlo", confirmRegistered: false })}
                  />
                  <span className="text-sm font-semibold text-slate-900">Use Huntlo account</span>
                </span>
                <span className="mt-1 pl-6 text-xs leading-relaxed text-slate-600">
                  Send from Huntlo&apos;s WhatsApp Business number. No Meta setup required.
                </span>
              </label>
              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-colors ${
                  !isHuntlo
                    ? "border-[#128c7e] bg-[#f0f7f4] ring-1 ring-[#128c7e]/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="wa-mode"
                    className="text-[#128c7e]"
                    checked={!isHuntlo}
                    onChange={() => patch({ mode: "own", confirmRegistered: false })}
                  />
                  <span className="text-sm font-semibold text-slate-900">Your Meta account</span>
                </span>
                <span className="mt-1 pl-6 text-xs leading-relaxed text-slate-600">
                  Connect with your Phone Number ID and access token from Meta Business Manager.
                </span>
              </label>
            </div>
            {huntloAvailable === false ? (
              <p className="text-xs text-amber-800" role="status">
                Huntlo WhatsApp is not configured on this server. Choose your own Meta account
                instead.
              </p>
            ) : null}
          </fieldset>

          {isHuntlo ? (
            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm text-slate-700">
                Campaign messages will be sent from Huntlo&apos;s registered WhatsApp Business
                number. You can start outreach after connecting — no API keys to manage.
              </p>
              <button
                type="button"
                className={`${dashboardBtnSecondaryClass} px-4 py-2 text-sm disabled:opacity-55`}
                disabled={!canTest}
                onClick={() => void handleTestCredentials()}
              >
                {testing ? (
                  <>
                    <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                    Checking…
                  </>
                ) : credsVerified ? (
                  <>
                    <MaterialIcon name="check_circle" className="text-base text-emerald-600" />
                    Check again
                  </>
                ) : (
                  <>
                    <MaterialIcon name="verified_user" className="text-base" />
                    Check availability
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Meta Cloud API credentials
              </p>
              <label className={dashboardLabelClass}>
                Phone Number ID
                <input
                  type="text"
                  inputMode="numeric"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={form.metaPhoneNumberId}
                  onChange={(e) => patch({ metaPhoneNumberId: e.target.value })}
                  placeholder="e.g. 123456789012345"
                  required={!isHuntlo}
                  autoComplete="off"
                />
                <FieldHelp>
                  From Meta Business Manager → WhatsApp → API Setup → Phone number ID.
                </FieldHelp>
              </label>
              <label className={dashboardLabelClass}>
                Permanent access token
                <input
                  type="password"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={form.metaAccessToken}
                  onChange={(e) => patch({ metaAccessToken: e.target.value })}
                  placeholder="Token with whatsapp_business_messaging"
                  required={!isHuntlo}
                  autoComplete="off"
                />
                <FieldHelp>Stored securely and never shown again after saving.</FieldHelp>
              </label>
              <label className={dashboardLabelClass}>
                WhatsApp Business Account ID{" "}
                <span className="font-normal text-slate-500">(optional)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={form.metaWabaId}
                  onChange={(e) => patch({ metaWabaId: e.target.value })}
                  placeholder="WABA ID"
                  autoComplete="off"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 pt-1">
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
                      Test credentials
                    </>
                  )}
                </button>
                {!credsVerified ? (
                  <span className="text-xs text-slate-500">
                    Test credentials to enable Connect WhatsApp.
                  </span>
                ) : null}
              </div>
            </div>
          )}

          <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-[#434654]">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300"
              checked={form.confirmRegistered}
              onChange={(e) => patch({ confirmRegistered: e.target.checked })}
            />
            <span>
              {isHuntlo
                ? "I understand outreach will be sent from Huntlo's WhatsApp Business number."
                : "I confirm my Meta app and phone number are approved for WhatsApp Business messaging."}
            </span>
          </label>

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
                isHuntlo
                  ? huntloAvailable !== true
                    ? "Huntlo WhatsApp is not available"
                    : !form.confirmRegistered
                      ? "Accept the confirmation to continue"
                      : undefined
                  : !credsVerified
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
