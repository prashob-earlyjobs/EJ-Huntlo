"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";
import type { CampaignRecord } from "@/lib/campaigns";
import { isCampaignLaunched } from "@/lib/campaignContactLimits";

const NEW_CAMPAIGN_VALUE = "__new__";

type Props = {
  open: boolean;
  selectedCount: number;
  campaigns: CampaignRecord[];
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (
    payload: { campaignId: string } | { newCampaignName: string }
  ) => void | Promise<void>;
};

function CampaignGridCell({
  active,
  icon,
  name,
  meta,
  value,
  nameAttr,
  onSelect,
  disabled,
  variant = "campaign",
}: {
  active: boolean;
  icon: string;
  name: string;
  meta?: string;
  value: string;
  nameAttr: string;
  onSelect: () => void;
  disabled?: boolean;
  variant?: "campaign" | "create";
}) {
  return (
    <label
      className={`dashboard-add-campaign-cell flex min-h-[4.25rem] cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/30 ${
        active
          ? "border-[#0050cb]/45 bg-[#f8f9ff] shadow-[0_0_0_1px_rgba(0,80,203,0.14)]"
          : "border-slate-200 hover:border-[#0050cb]/35 hover:bg-[#f8f9ff]"
      }${disabled ? " cursor-not-allowed opacity-55" : ""}${
        variant === "create" ? " dashboard-add-campaign-cell--create" : ""
      }`}
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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[#0050cb] ${
          variant === "create"
            ? "border-[#0050cb]/25 bg-[#0050cb]/12"
            : "border-[#0050cb]/15 bg-[#0050cb]/10"
        }`}
        aria-hidden
      >
        <MaterialIcon name={icon} className="text-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#141b2b]">{name}</span>
        {meta ? (
          <span className="mt-0.5 block truncate text-xs leading-snug text-slate-500">{meta}</span>
        ) : null}
      </span>
      {active ? (
        <span className="dashboard-add-campaign-cell-check shrink-0" aria-hidden>
          <MaterialIcon name="check_circle" className="text-base text-[#0050cb]" />
        </span>
      ) : null}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [submitError, setSubmitError] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setChoice("");
      setNewName("");
      setSearchQuery("");
      setSubmitError("");
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      const openCampaigns = campaigns.filter((c) => !isCampaignLaunched(c.outreachStatus));
      setChoice(
        campaigns.length === 0
          ? NEW_CAMPAIGN_VALUE
          : (openCampaigns[0]?.id ?? NEW_CAMPAIGN_VALUE)
      );
      wasOpenRef.current = true;
      return;
    }
    if (!choice && campaigns.length > 0) {
      const openCampaigns = campaigns.filter((c) => !isCampaignLaunched(c.outreachStatus));
      setChoice(openCampaigns[0]?.id ?? NEW_CAMPAIGN_VALUE);
    }
  }, [open, campaigns, choice]);

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

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => c.name.toLowerCase().includes(q));
  }, [campaigns, searchQuery]);

  const campaignsToShow = useMemo(() => {
    if (!choice || choice === NEW_CAMPAIGN_VALUE) return filteredCampaigns;
    const selected = campaigns.find((c) => c.id === choice);
    if (!selected || filteredCampaigns.some((c) => c.id === choice)) {
      return filteredCampaigns;
    }
    return [selected, ...filteredCampaigns];
  }, [filteredCampaigns, campaigns, choice]);

  if (!open || !mounted) return null;

  const isNew = choice === NEW_CAMPAIGN_VALUE;
  const showCampaignSearch = campaigns.length > 0;
  const searchActive = searchQuery.trim().length > 0;
  const trimmedNew = newName.trim();
  const selectedCampaign = campaigns.find((c) => c.id === choice);
  const selectedCampaignLaunched =
    Boolean(selectedCampaign) && isCampaignLaunched(selectedCampaign?.outreachStatus);
  const canSubmit =
    (isNew ? Boolean(trimmedNew) : Boolean(choice) && !selectedCampaignLaunched) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitError("");
    try {
      if (isNew) {
        await onConfirm({ newCampaignName: trimmedNew });
      } else {
        await onConfirm({ campaignId: choice });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not add to campaign. Please try again."
      );
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
        className="dashboard-modal dashboard-add-campaign-modal mx-auto flex w-full max-w-2xl flex-col p-0"
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
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 space-y-3 px-6 pt-5">
            {showCampaignSearch ? (
              <label className="dashboard-campaign-wa-comms-search relative block">
                <MaterialIcon
                  name="search"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-slate-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns…"
                  className="dashboard-campaign-wa-comms-search-input w-full"
                  disabled={submitting}
                  aria-label="Search campaigns"
                />
              </label>
            ) : null}

            {searchActive && filteredCampaigns.length === 0 ? (
              <p className="text-sm text-slate-500">
                No campaigns match &ldquo;{searchQuery.trim()}&rdquo;.
              </p>
            ) : null}
          </div>

          <div className="dashboard-add-campaign-grid-scroll min-h-0 flex-1 overflow-y-auto px-6 py-3">
            <div
              className="dashboard-add-campaign-grid grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3"
              role="radiogroup"
              aria-label="Campaigns"
            >
              <CampaignGridCell
                active={isNew}
                icon="add"
                name="Create new campaign"
                meta="Start fresh"
                value={NEW_CAMPAIGN_VALUE}
                nameAttr="campaign-target"
                onSelect={() => setChoice(NEW_CAMPAIGN_VALUE)}
                disabled={submitting}
                variant="create"
              />

              {campaignsToShow.map((campaign) => {
                const launched = isCampaignLaunched(campaign.outreachStatus);
                const count = campaign.contactCount ?? campaign.contacts.length;
                return (
                  <CampaignGridCell
                    key={campaign.id}
                    active={choice === campaign.id}
                    icon="flag"
                    name={campaign.name}
                    meta={
                      launched
                        ? "Launched — locked"
                        : `${count.toLocaleString()} contact${count === 1 ? "" : "s"}`
                    }
                    value={campaign.id}
                    nameAttr="campaign-target"
                    onSelect={() => setChoice(campaign.id)}
                    disabled={submitting || launched}
                  />
                );
              })}
            </div>
          </div>

          {isNew || submitError ? (
            <div className="shrink-0 space-y-4 border-t border-slate-200 px-6 py-4">
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

              {submitError ? (
                <p className="dashboard-alert-warning" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="dashboard-confirm-modal-footer shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={dashboardBtnSecondaryClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={dashboardBtnPrimaryClass}
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
