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

function CampaignOption({
  active,
  icon,
  name,
  meta,
  value,
  nameAttr,
  onSelect,
  disabled,
}: {
  active: boolean;
  icon: string;
  name: string;
  meta?: string;
  value: string;
  nameAttr: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/30 ${
        active
          ? "border-[#0050cb]/40 bg-[#f8f9ff] shadow-[0_0_0_1px_rgba(0,80,203,0.12)]"
          : "border-slate-200 hover:border-[#0050cb]/40 hover:bg-[#f8f9ff]"
      }${disabled ? " cursor-not-allowed opacity-55" : ""}`}
    >
      <input
        type="radio"
        name={nameAttr}
        value={value}
        checked={active}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#0050cb]/15 bg-[#0050cb]/10 text-[#0050cb]"
        aria-hidden
      >
        <MaterialIcon name={icon} className="text-[20px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#141b2b]">{name}</span>
        {meta ? <span className="mt-0.5 block text-xs text-slate-500">{meta}</span> : null}
      </span>
    </label>
  );
}

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
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, submitting]);

  if (!open || !mounted) return null;

  const isNew = choice === NEW_CAMPAIGN_VALUE;
  const trimmedNew = newName.trim();
  const canSubmit = (isNew ? Boolean(trimmedNew) : Boolean(choice)) && !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (isNew) {
      void onConfirm({ newCampaignName: trimmedNew });
    } else {
      void onConfirm({ campaignId: choice });
    }
  };

  const content = (
    <div
      className="dashboard-modal-overlay z-[120] py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-campaign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h3 id="add-to-campaign-title" className="dashboard-section-title text-lg">
              Add to campaign
            </h3>
            <p className="dashboard-text-body mt-1 text-sm">
              Add {selectedCount} selected candidate{selectedCount === 1 ? "" : "s"} to a campaign.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="dashboard-outreach-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
        >
          {campaigns.length > 0 ? (
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Campaigns">
              {campaigns.map((campaign) => (
                <CampaignOption
                  key={campaign.id}
                  active={choice === campaign.id}
                  icon="flag"
                  name={campaign.name}
                  meta={`${campaign.contacts.length} contact${campaign.contacts.length === 1 ? "" : "s"}`}
                  value={campaign.id}
                  nameAttr="campaign-target"
                  onSelect={() => setChoice(campaign.id)}
                  disabled={submitting}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No campaigns yet. Create one below.</p>
          )}

          <div className="mt-4 space-y-3">
            <CampaignOption
              active={isNew}
              icon="add"
              name="Create new campaign"
              value={NEW_CAMPAIGN_VALUE}
              nameAttr="campaign-target"
              onSelect={() => setChoice(NEW_CAMPAIGN_VALUE)}
              disabled={submitting}
            />

            {isNew ? (
              <label className={`${dashboardLabelClass} block`}>
                Campaign name
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`${dashboardInputClass} mt-2 w-full`}
                  placeholder="e.g. Q2 Engineering outreach"
                  autoFocus
                  disabled={submitting}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm disabled:opacity-55`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
            >
              {submitting ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add to campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
