"use client";

import { useEffect } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type ApplyFiltersSessionMode = "new" | "existing";

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: ApplyFiltersSessionMode) => void;
};

export function ApplyFiltersSessionChoiceModal({ open, onClose, onChoose }: Props) {
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

  if (!open) return null;

  return (
    <div
      className="dashboard-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-filters-session-choice-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-apply-session-choice-modal relative max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="dashboard-btn-ghost absolute right-3 top-3 p-1"
          aria-label="Close"
        >
          <MaterialIcon name="close" className="text-xl" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="dashboard-user-action-alert-icon shrink-0" aria-hidden>
            <MaterialIcon name="tune" className="text-[26px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="apply-filters-session-choice-title"
              className="dashboard-user-action-modal-title"
            >
              Apply updated filters
            </h3>
            <p className="dashboard-user-action-modal-message mt-2">
              Choose whether to update your current search session or start a new one.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            className="dashboard-apply-session-choice-option w-full text-left"
            onClick={() => onChoose("existing")}
          >
            <span className="dashboard-apply-session-choice-option-title">
              Add to current session
            </span>
            <span className="dashboard-apply-session-choice-option-desc">
              Update this session with the new filters and merge new profiles with the
              candidates already shown. Uses one search from your plan.
            </span>
          </button>
          <button
            type="button"
            className="dashboard-apply-session-choice-option w-full text-left"
            onClick={() => onChoose("new")}
          >
            <span className="dashboard-apply-session-choice-option-title">
              Create new session
            </span>
            <span className="dashboard-apply-session-choice-option-desc">
              Start a completely new search with the updated filters. Your current session
              stays in search history. This uses one search from your plan.
            </span>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary px-4 py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
