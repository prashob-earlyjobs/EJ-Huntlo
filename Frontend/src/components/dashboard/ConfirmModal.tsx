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
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
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
            }`}
            aria-hidden
          >
            <MaterialIcon
              name={isDanger ? "delete" : "help_outline"}
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
        <div className="dashboard-confirm-modal-footer">
          <button type="button" onClick={onCancel} className="dashboard-btn-secondary">
            {cancelLabel}
          </button>
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
