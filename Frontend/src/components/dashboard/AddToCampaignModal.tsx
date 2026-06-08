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
import type { CampaignRevealType } from "@/lib/campaignRevealJob";

const NEW_CAMPAIGN_VALUE = "__new__";

type RevealConfirmPayload = {
  revealTypes: CampaignRevealType[];
};

type Props = {
  open: boolean;
  selectedCount: number;
  campaigns: CampaignRecord[];
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (
    payload:
      | ({ campaignId: string } & RevealConfirmPayload)
      | ({ newCampaignName: string } & RevealConfirmPayload)
  ) => void | Promise<void>;
};

function CreateNewCampaignOption({
  active,
  nameAttr,
  value,
  onSelect,
  disabled,
}: {
  active: boolean;
  nameAttr: string;
  value: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`dashboard-add-campaign-create-option flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-3.5 py-2.5 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/35${
        active
          ? " dashboard-add-campaign-create-option--active"
          : " border-[#0050cb]/35 bg-gradient-to-r from-[#f0f6ff] to-[#f8f9ff] hover:border-[#0050cb]/55 hover:from-[#e8f1ff] hover:to-[#f3f7ff]"
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
      <span className="dashboard-add-campaign-create-option-icon shrink-0" aria-hidden>
        <MaterialIcon name="add" className="text-[20px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#141b2b]">Create new campaign</span>
          <span className="dashboard-add-campaign-create-badge">New</span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[#424656]">
          Start a fresh campaign with the selected candidates
        </span>
      </span>
      {active ? (
        <span className="dashboard-add-campaign-cell-check shrink-0" aria-hidden>
          <MaterialIcon name="check_circle" className="text-lg text-[#0050cb]" />
        </span>
      ) : (
        <MaterialIcon name="chevron_right" className="shrink-0 text-lg text-[#0050cb]/55" aria-hidden />
      )}
    </label>
  );
}

function CampaignGridCell({
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
      className={`dashboard-add-campaign-cell flex min-h-[3.75rem] cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/30 ${
        active
          ? "border-[#0050cb]/45 bg-[#f8f9ff] shadow-[0_0_0_1px_rgba(0,80,203,0.14)]"
          : "border-slate-200 hover:border-[#0050cb]/35 hover:bg-[#f8f9ff]"
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0050cb]/15 bg-[#0050cb]/10 text-[#0050cb]"
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
  const [revealEmail, setRevealEmail] = useState(true);
  const [revealPhone, setRevealPhone] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setChoice("");
      setNewName("");
      setSearchQuery("");
      setRevealEmail(true);
      setRevealPhone(true);
      setSubmitError("");
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      setChoice(NEW_CAMPAIGN_VALUE);
      wasOpenRef.current = true;
      return;
    }
    if (!choice) {
      setChoice(NEW_CAMPAIGN_VALUE);
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

  const revealTypes = useMemo(() => {
    const types: CampaignRevealType[] = [];
    if (revealEmail) types.push("EMAIL");
    if (revealPhone) types.push("PHONE");
    return types;
  }, [revealEmail, revealPhone]);

  if (!open || !mounted) return null;

  const isNew = choice === NEW_CAMPAIGN_VALUE;
  const showCampaignSearch = campaigns.length > 0;
  const searchActive = searchQuery.trim().length > 0;
  const trimmedNew = newName.trim();
  const selectedCampaign = campaigns.find((c) => c.id === choice);
  const selectedCampaignLaunched =
    Boolean(selectedCampaign) && isCampaignLaunched(selectedCampaign?.outreachStatus);
  const canSubmit =
    revealTypes.length > 0 &&
    (isNew ? Boolean(trimmedNew) : Boolean(choice) && !selectedCampaignLaunched) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitError("");
    try {
      if (isNew) {
        await onConfirm({ newCampaignName: trimmedNew, revealTypes });
      } else {
        await onConfirm({ campaignId: choice, revealTypes });
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
            <div role="radiogroup" aria-label="Campaign destination">
              <CreateNewCampaignOption
                active={isNew}
                value={NEW_CAMPAIGN_VALUE}
                nameAttr="campaign-target"
                onSelect={() => setChoice(NEW_CAMPAIGN_VALUE)}
                disabled={submitting}
              />

              {campaigns.length > 0 ? (
                <p className="dashboard-add-campaign-existing-label">
                  Or add to an existing campaign
                </p>
              ) : null}

              <div className="dashboard-add-campaign-grid grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
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
          </div>

          <div className="shrink-0 space-y-4 border-t border-slate-200 px-6 py-4">
            <div>
              <p className={`${dashboardLabelClass} mb-2`}>Unveil after adding</p>
              <p className="mb-2.5 text-xs leading-snug text-slate-500">
                Choose what to unveil for the selected candidates. Progress appears in the
                campaign Activity tab.
              </p>
              <div className="dashboard-add-campaign-reveal-options flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setRevealEmail((prev) => !prev)}
                  className={`dashboard-add-campaign-reveal-option${
                    revealEmail ? " dashboard-add-campaign-reveal-option--active" : ""
                  }`}
                >
                  <MaterialIcon name="mail" className="text-base" aria-hidden />
                  Email
                  {revealEmail ? (
                    <MaterialIcon name="check_circle" className="text-base text-[#0050cb]" aria-hidden />
                  ) : null}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setRevealPhone((prev) => !prev)}
                  className={`dashboard-add-campaign-reveal-option${
                    revealPhone ? " dashboard-add-campaign-reveal-option--active" : ""
                  }`}
                >
                  <MaterialIcon name="call" className="text-base" aria-hidden />
                  Phone
                  {revealPhone ? (
                    <MaterialIcon name="check_circle" className="text-base text-[#0050cb]" aria-hidden />
                  ) : null}
                </button>
              </div>
              {revealTypes.length === 0 ? (
                <p className="mt-2 text-xs text-amber-800">Select at least one unveil type.</p>
              ) : null}
            </div>

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
