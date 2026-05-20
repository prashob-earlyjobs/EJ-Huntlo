"use client";

import { useEffect } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
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

  if (!open || !message.trim()) return null;

  return (
    <div
      className="dashboard-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-action-alert-title"
      aria-describedby="user-action-alert-message"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
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
    </div>
  );
}
