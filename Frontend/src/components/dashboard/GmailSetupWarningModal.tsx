"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

type Props = {
  open: boolean;
  onClose: () => void;
  onConnectGmail: () => void;
};

export function GmailSetupWarningModal({ open, onClose, onConnectGmail }: Props) {
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

  return createPortal(
    <div
      className="dashboard-modal-overlay dashboard-confirm-modal-overlay z-[130]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gmail-setup-warning-title"
    >
      <button
        type="button"
        className="dashboard-confirm-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-confirm-modal-panel dashboard-integration-setup-modal-panel"
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
        <div className="dashboard-integration-setup-modal-inner">
          <span className="dashboard-integration-setup-modal-brand" aria-hidden>
            <IntegrationBrandLogo provider="gmail" title="Gmail" />
          </span>
          <h3 id="gmail-setup-warning-title" className="dashboard-integration-setup-modal-title">
            Gmail not connected
          </h3>
          <p className="dashboard-integration-setup-modal-message">
            Connect your Gmail account before launching so outreach emails can send from your inbox.
          </p>
          <p className="dashboard-integration-setup-modal-path" aria-label="Go to Integrations, then Gmail">
            <MaterialIcon name="settings" />
            Integrations
            <MaterialIcon name="chevron_right" />
            Gmail
          </p>
        </div>
        <div className="dashboard-integration-setup-modal-footer">
          <button type="button" onClick={onClose} className={dashboardBtnSecondaryClass}>
            Cancel
          </button>
          <button type="button" onClick={onConnectGmail} className={dashboardBtnPrimaryClass}>
            <MaterialIcon name="link" className="text-base" aria-hidden />
            Connect Gmail
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
