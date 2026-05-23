"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignRecord } from "@/lib/campaigns";

const NEW_CAMPAIGN_VALUE = "__new__";

type Props = {
  open: boolean;
  selectedCount: number;
  campaigns: CampaignRecord[];
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: { campaignId: string } | { newCampaignName: string }) => void | Promise<void>;
};

export function AddToCampaignModal({
  open,
  selectedCount,
  campaigns,
  submitting = false,
  onClose,
  onConfirm,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [choice, setChoice] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setChoice("");
      setNewName("");
      return;
    }
    setChoice(campaigns.length === 0 ? NEW_CAMPAIGN_VALUE : (campaigns[0]?.id ?? NEW_CAMPAIGN_VALUE));
  }, [open, campaigns]);

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

  const isNew = choice === NEW_CAMPAIGN_VALUE;
  const trimmedNew = newName.trim();
  const canSubmit = isNew ? Boolean(trimmedNew) : Boolean(choice);

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;
    if (isNew) {
      void onConfirm({ newCampaignName: trimmedNew });
    } else {
      void onConfirm({ campaignId: choice });
    }
  };

  const content = (
    <div
      className="dashboard-modal-overlay dashboard-create-outreach-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-campaign-title"
    >
      <button
        type="button"
        className="dashboard-create-outreach-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-create-outreach-modal dashboard-add-to-campaign-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dashboard-create-outreach-modal-header">
          <h2 id="add-to-campaign-title" className="dashboard-create-outreach-modal-title">
            Add to campaign
          </h2>
          <button type="button" onClick={onClose} className="dashboard-create-outreach-close">
            Close
          </button>
        </header>

        <div className="dashboard-create-outreach-body dashboard-outreach-scroll">
          <p className="dashboard-create-outreach-lead">
            Add {selectedCount} selected candidate{selectedCount === 1 ? "" : "s"} to a campaign.
          </p>

          {campaigns.length > 0 ? (
            <div className="dashboard-add-to-campaign-list" role="radiogroup" aria-label="Campaigns">
              {campaigns.map((campaign) => (
                <label
                  key={campaign.id}
                  className={`dashboard-add-to-campaign-option${
                    choice === campaign.id ? " dashboard-add-to-campaign-option--active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="campaign-target"
                    value={campaign.id}
                    checked={choice === campaign.id}
                    onChange={() => setChoice(campaign.id)}
                    className="dashboard-add-to-campaign-radio"
                  />
                  <span className="dashboard-add-to-campaign-option-icon" aria-hidden>
                    <MaterialIcon name="flag" className="text-[20px] text-[#0050cb]" />
                  </span>
                  <span className="dashboard-add-to-campaign-option-text">
                    <span className="dashboard-add-to-campaign-option-name">{campaign.name}</span>
                    <span className="dashboard-add-to-campaign-option-meta">
                      {campaign.contacts.length} contact
                      {campaign.contacts.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="dashboard-create-outreach-hint">No campaigns yet. Create one below.</p>
          )}

          <div className="dashboard-add-to-campaign-new-block">
            <label
              className={`dashboard-add-to-campaign-option dashboard-add-to-campaign-option--new${
                isNew ? " dashboard-add-to-campaign-option--active" : ""
              }`}
            >
              <input
                type="radio"
                name="campaign-target"
                value={NEW_CAMPAIGN_VALUE}
                checked={isNew}
                onChange={() => setChoice(NEW_CAMPAIGN_VALUE)}
                className="dashboard-add-to-campaign-radio"
              />
              <span className="dashboard-add-to-campaign-option-icon" aria-hidden>
                <MaterialIcon name="add" className="text-[20px] text-[#0050cb]" />
              </span>
              <span className="dashboard-add-to-campaign-option-text">
                <span className="dashboard-add-to-campaign-option-name">Create new campaign</span>
              </span>
            </label>

            {isNew ? (
              <label className="dashboard-label mt-3 block">
                Campaign name
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) handleSubmit();
                  }}
                  className="dashboard-input mt-2 w-full"
                  placeholder="e.g. Q2 Engineering outreach"
                  autoFocus
                />
              </label>
            ) : null}
          </div>

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
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="dashboard-btn-primary px-5 py-2.5 text-sm disabled:opacity-55"
            >
              {submitting ? "Adding…" : "Add to campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
