"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { lockPageScroll, unlockPageScroll } from "@/lib/lockPageScroll";
import { quotaExceededTitle } from "@/lib/apiErrors";

type Props = {
  open: boolean;
  message: string;
  isQuotaExceeded?: boolean;
  onClose: () => void;
  onViewPlans?: () => void;
};

export function UserActionAlertModal({
  open,
  message,
  isQuotaExceeded = false,
  onClose,
  onViewPlans,
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
    lockPageScroll();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      unlockPageScroll();
    };
  }, [open, onClose]);

  if (!open || !message.trim() || !mounted) return null;

  return createPortal(
    <div
      className="dashboard-modal-overlay dashboard-user-action-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-action-alert-title"
      aria-describedby="user-action-alert-message"
    >
      <button
        type="button"
        className="dashboard-user-action-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`dashboard-modal dashboard-user-action-modal relative max-w-md ${
          isQuotaExceeded ? "dashboard-user-action-modal--quota" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`dashboard-user-action-alert-icon shrink-0 ${
              isQuotaExceeded ? "" : "dashboard-user-action-alert-icon--error"
            }`}
            aria-hidden
          >
            <MaterialIcon
              name={isQuotaExceeded ? "account_balance_wallet" : "error_outline"}
              className="text-[26px]"
            />
          </span>
          <div className="min-w-0 flex-1 pr-6">
            <h3 id="user-action-alert-title" className="dashboard-user-action-modal-title">
              {isQuotaExceeded ? quotaExceededTitle() : "Something went wrong"}
            </h3>
            <p id="user-action-alert-message" className="dashboard-user-action-modal-message">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-ghost absolute right-3 top-3 p-1"
            aria-label="Close"
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary px-4 py-2">
            Close
          </button>
          {isQuotaExceeded && onViewPlans ? (
            <button type="button" onClick={onViewPlans} className="dashboard-btn-primary px-4 py-2">
              View plans &amp; usage
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
