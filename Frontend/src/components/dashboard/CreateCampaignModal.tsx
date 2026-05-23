"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type CreateCampaignPayload = {
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateCampaignPayload) => void;
};

export function CreateCampaignModal({ open, onClose, onCreate }: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

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

  const trimmedName = name.trim();
  const canSubmit = Boolean(trimmedName);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({ name: trimmedName });
  };

  const content = (
    <div
      className="dashboard-modal-overlay dashboard-create-outreach-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-campaign-title"
    >
      <button
        type="button"
        className="dashboard-create-outreach-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-create-outreach-modal dashboard-create-campaign-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dashboard-create-outreach-modal-header">
          <h2 id="create-campaign-title" className="dashboard-create-outreach-modal-title">
            New campaign
          </h2>
          <button type="button" onClick={onClose} className="dashboard-create-outreach-close">
            Close
          </button>
        </header>

        <div className="dashboard-create-outreach-body">
          <label className="dashboard-label block">
            Campaign name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) handleSubmit();
              }}
              className="dashboard-input mt-2 w-full"
              placeholder="e.g. Q2 Engineering hires"
              autoFocus
            />
          </label>

          <div className="dashboard-create-outreach-clone-actions">
            <button
              type="button"
              onClick={onClose}
              className="dashboard-btn-secondary px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="dashboard-btn-primary px-5 py-2.5 text-sm disabled:opacity-55"
            >
              Create campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
