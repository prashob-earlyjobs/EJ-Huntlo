"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";

export type CreateCampaignPayload = {
  name: string;
};

type Props = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onCreate: (payload: CreateCampaignPayload) => void | Promise<void>;
};

export function CreateCampaignModal({ open, busy = false, onClose, onCreate }: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setName("");
      setSubmitError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, busy]);

  if (!open || !mounted) return null;

  const trimmedName = name.trim();
  const canSubmit = Boolean(trimmedName) && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError("");
    try {
      await onCreate({ name: trimmedName });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not create campaign. Please try again."
      );
    }
  };

  const content = (
    <div
      className="dashboard-modal-overlay z-[120] py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex w-full max-w-md flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-campaign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h3 id="create-campaign-title" className="dashboard-section-title text-lg">
              New campaign
            </h3>
            <p className="dashboard-text-body mt-1 text-sm">
              Group outreach sequences and track contacts in one place.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 cursor-pointer rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label className={`${dashboardLabelClass} block`}>
            Campaign name
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (submitError) setSubmitError("");
              }}
              className={`${dashboardInputClass} mt-2 w-full`}
              placeholder="e.g. Q2 Engineering hires"
              autoFocus
              disabled={busy}
            />
          </label>

          {submitError ? (
            <p className="dashboard-alert-error mt-3" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border border-[#0050cb] bg-[#0050cb] px-5 text-sm font-medium text-white transition hover:bg-[#003d99] disabled:opacity-55"
            >
              <ButtonLoadingContent loading={busy} loadingLabel="Creating">
                Create campaign
              </ButtonLoadingContent>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
