"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

export type WhatsAppSetupWarningContext = "save" | "launch";

type Props = {
  open: boolean;
  context: WhatsAppSetupWarningContext;
  onClose: () => void;
  onSetupWhatsApp: () => void;
  /** Shown only when context is "save" — user can persist the sequence without integration. */
  onSaveAnyway?: () => void;
};

export function WhatsAppSetupWarningModal({
  open,
  context,
  onClose,
  onSetupWhatsApp,
  onSaveAnyway,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const isLaunch = context === "launch";

  return createPortal(
    <div
      className="dashboard-modal-overlay dashboard-confirm-modal-overlay z-[130]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-setup-warning-title"
    >
      <button
        type="button"
        className="dashboard-confirm-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-confirm-modal-panel max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="dashboard-btn-ghost dashboard-confirm-modal-close"
          aria-label="Close"
        >
          <MaterialIcon name="close" className="dashboard-confirm-modal-icon-symbol" />
        </button>
        <div className="dashboard-confirm-modal-inner">
          <span
            className="dashboard-confirm-modal-icon shrink-0 !bg-amber-50 !text-amber-700"
            aria-hidden
          >
            <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className="h-7 w-7" />
          </span>
          <div className="dashboard-confirm-modal-text min-w-0">
            <h3 id="wa-setup-warning-title" className="dashboard-confirm-modal-title">
              WhatsApp not connected
            </h3>
            <p className="dashboard-confirm-modal-message text-sm leading-relaxed text-slate-600">
              {isLaunch ? (
                <>
                  Connect WhatsApp under <strong>Integrations</strong> before launching this
                  campaign. Use your own Meta account or Huntlo&apos;s WhatsApp Business number.
                </>
              ) : (
                <>
                  Your sequence can be saved, but you must connect WhatsApp under{" "}
                  <strong>Integrations</strong> before you can launch and send messages.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="dashboard-confirm-modal-footer flex-wrap gap-2">
          <button type="button" onClick={onClose} className={dashboardBtnSecondaryClass}>
            Cancel
          </button>
          {!isLaunch && onSaveAnyway ? (
            <button type="button" onClick={onSaveAnyway} className={dashboardBtnSecondaryClass}>
              Save anyway
            </button>
          ) : null}
          <button type="button" onClick={onSetupWhatsApp} className={dashboardBtnPrimaryClass}>
            <MaterialIcon name="link" className="text-base" />
            Set up WhatsApp
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
