"use client";

import { useEffect } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type DashboardToastVariant = "warning" | "error" | "success";

type DashboardToastProps = {
  message: string;
  variant?: DashboardToastVariant;
  onDismiss: () => void;
  durationMs?: number;
};

export function DashboardToast({
  message,
  variant = "warning",
  onDismiss,
  durationMs = 5000,
}: DashboardToastProps) {
  useEffect(() => {
    if (!message.trim()) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message.trim()) return null;

  return (
    <div className="dashboard-toast" role="status" aria-live="polite">
      <p className={`dashboard-toast-body dashboard-toast-body--${variant}`}>{message}</p>
      <button
        type="button"
        className="dashboard-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <MaterialIcon name="close" className="text-base" />
      </button>
    </div>
  );
}
