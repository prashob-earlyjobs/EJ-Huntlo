"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { EmailIntegrationConnectPanel } from "@/components/dashboard/EmailIntegrationConnectPanel";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
};

export function EmailIntegrationSetupWarningModal({ open, onClose, onConnected }: Props) {
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
      aria-labelledby="email-setup-warning-title"
    >
      <button
        type="button"
        className="dashboard-confirm-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-confirm-modal-panel dashboard-integration-setup-modal-panel dashboard-integration-setup-modal-panel--connect"
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
        <div className="dashboard-integration-setup-modal-inner dashboard-integration-setup-modal-inner--connect">
          <span className="dashboard-integration-setup-modal-brand" aria-hidden>
            <MaterialIcon name="mail" className="text-2xl text-[#0050cb]" />
          </span>
          <h3 id="email-setup-warning-title" className="dashboard-integration-setup-modal-title">
            Connect email to launch
          </h3>
          <p className="dashboard-integration-setup-modal-message dashboard-integration-setup-modal-message--connect">
            Choose a provider below to connect your inbox before launching this campaign.
          </p>
          <EmailIntegrationConnectPanel
            enabled={open}
            onConnected={() => {
              onConnected?.();
              onClose();
            }}
          />
        </div>
        <div className="dashboard-integration-setup-modal-footer">
          <button type="button" onClick={onClose} className={dashboardBtnSecondaryClass}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
