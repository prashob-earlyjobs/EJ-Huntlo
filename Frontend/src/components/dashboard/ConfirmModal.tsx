"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `confirm` = primary + secondary; `alert` = single dismiss button */
  variant?: "confirm" | "alert";
  tone?: "default" | "danger" | "warning";
  iconName?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "confirm",
  tone = "default",
  iconName,
  onConfirm,
  onCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  const isDanger = tone === "danger";
  const isWarning = tone === "warning";
  const isAlert = variant === "alert";
  const resolvedIcon =
    iconName ||
    (isDanger ? "delete" : isWarning ? "hourglass_top" : "help_outline");

  return createPortal(
    <div
      className="dashboard-modal-overlay dashboard-confirm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <button
        type="button"
        className="dashboard-confirm-modal-backdrop"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        className={`dashboard-modal dashboard-confirm-modal-panel${
          isDanger ? " dashboard-confirm-modal-panel--danger" : ""
        }${isWarning ? " dashboard-confirm-modal-panel--warning" : ""}${
          isAlert ? " dashboard-confirm-modal-panel--alert" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="dashboard-btn-ghost dashboard-confirm-modal-close"
          aria-label="Close"
        >
          <MaterialIcon name="close" className="dashboard-confirm-modal-icon-symbol" />
        </button>
        <div className="dashboard-confirm-modal-inner">
          <span
            className={`dashboard-confirm-modal-icon${
              isDanger ? " dashboard-confirm-modal-icon--danger" : ""
            }${isWarning ? " dashboard-confirm-modal-icon--warning" : ""}`}
            aria-hidden
          >
            <MaterialIcon
              name={resolvedIcon}
              className="dashboard-confirm-modal-icon-symbol"
            />
          </span>
          <div className="dashboard-confirm-modal-text">
            <h3 id="confirm-modal-title" className="dashboard-confirm-modal-title">
              {title}
            </h3>
            <p id="confirm-modal-message" className="dashboard-confirm-modal-message">
              {message}
            </p>
          </div>
        </div>
        <div
          className={`dashboard-confirm-modal-footer${
            isAlert ? " dashboard-confirm-modal-footer--alert" : ""
          }`}
        >
          {!isAlert ? (
            <button type="button" onClick={onCancel} className="dashboard-btn-secondary">
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            className={isDanger ? "dashboard-btn-danger" : "dashboard-btn-primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
