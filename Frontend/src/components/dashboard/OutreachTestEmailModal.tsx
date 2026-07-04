"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";
import {
  applyOutreachMergeFields,
  OUTREACH_PREVIEW_CONTACT,
} from "@/lib/outreachMergeFields";
import { sendOutreachTestEmail } from "@/lib/outreachApi";

type Props = {
  open: boolean;
  stepLabel: string;
  fromEmail: string;
  subject: string;
  body: string;
  senderFirstName: string;
  authToken: string;
  gmailConnected: boolean;
  onGoToIntegrations?: () => void;
  onClose: () => void;
  onSent: (message: string) => void;
};

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.includes("@") && trimmed.includes(".");
}

export function OutreachTestEmailModal({
  open,
  stepLabel,
  fromEmail,
  subject,
  body,
  senderFirstName,
  authToken,
  gmailConnected,
  onGoToIntegrations,
  onClose,
  onSent,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTestEmail("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, sending]);

  const previewSubject = useMemo(
    () =>
      applyOutreachMergeFields(subject, {
        contact: OUTREACH_PREVIEW_CONTACT,
        senderFirstName,
      }).trim(),
    [senderFirstName, subject]
  );

  const previewBody = useMemo(
    () =>
      applyOutreachMergeFields(body, {
        contact: OUTREACH_PREVIEW_CONTACT,
        senderFirstName,
      }),
    [body, senderFirstName]
  );

  const handleSend = async () => {
    const to = testEmail.trim();
    if (!isValidEmail(to)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!previewSubject) {
      setError("Subject is empty. Add a subject before sending a test.");
      return;
    }
    if (!previewBody.trim()) {
      setError("Message body is empty. Add message text before sending a test.");
      return;
    }
    if (!gmailConnected) {
      setError("Connect Gmail in Integrations before sending a test email.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await sendOutreachTestEmail(authToken, {
        to,
        subject: previewSubject,
        body: previewBody,
      });
      onSent(`Test email sent to ${to}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email.");
    } finally {
      setSending(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="dashboard-modal-overlay py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto w-full max-w-lg p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-test-email-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="outreach-test-email-title" className="dashboard-section-title text-lg">
                Preview and test
              </h3>
              <p className="mt-1 text-sm text-slate-600">{stepLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="dashboard-btn-ghost shrink-0 rounded-lg p-1.5 disabled:opacity-50"
              aria-label="Close"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-6 py-5">
          {!gmailConnected ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
              Connect Gmail to send test emails.{" "}
              {onGoToIntegrations ? (
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => {
                    onClose();
                    onGoToIntegrations();
                  }}
                >
                  Go to Integrations
                </button>
              ) : null}
            </div>
          ) : null}

          <label className={`${dashboardLabelClass} mb-4`} htmlFor="outreach-test-email">
            Send test to
            <span className="dashboard-outreach-test-email-field mt-1.5 block">
              <MaterialIcon name="mail" aria-hidden />
              <input
                id="outreach-test-email"
                name="testDeliveryEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value);
                  setError("");
                }}
                placeholder="Enter email address"
                className={`${dashboardInputClass} dashboard-outreach-test-email-input w-full`}
                disabled={sending}
              />
            </span>
          </label>

          <p className="mb-3 text-xs text-slate-500">
            Preview uses sample merge values (Alex, Acme Corp, etc.). The test email uses the same
            sample data.
          </p>

          <div className="dashboard-outreach-test-preview rounded-lg border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Preview
              </p>
            </div>
            <div className="space-y-3 px-4 py-3 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500">From</p>
                <p className="mt-0.5 break-all text-slate-900">{fromEmail || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Subject</p>
                <p className="mt-0.5 text-slate-900">{previewSubject || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Message</p>
                <pre className="dashboard-outreach-test-preview-body mt-1 whitespace-pre-wrap font-sans text-slate-900">
                  {previewBody || "—"}
                </pre>
              </div>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={onClose}
            disabled={sending}
          >
            Close
          </button>
          <button
            type="button"
            className={`${dashboardBtnPrimaryClass} inline-flex items-center gap-1.5`}
            onClick={() => void handleSend()}
            disabled={sending || !gmailConnected}
          >
            <ButtonLoadingContent loading={sending} loadingLabel="Sending">
              <>
                <MaterialIcon name="send" className="text-base" />
                Send test email
              </>
            </ButtonLoadingContent>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
