"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
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
  onCreate: (payload: CreateCampaignPayload) => void;
};

export function CreateCampaignModal({ open, busy = false, onClose, onCreate }: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setName("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onCreate({ name: trimmedName });
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
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
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
              onChange={(e) => setName(e.target.value)}
              className={`${dashboardInputClass} mt-2 w-full`}
              placeholder="e.g. Q2 Engineering hires"
              autoFocus
              disabled={busy}
            />
          </label>

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm disabled:opacity-55`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
            >
              {busy ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Creating…
                </>
              ) : (
                "Create campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
