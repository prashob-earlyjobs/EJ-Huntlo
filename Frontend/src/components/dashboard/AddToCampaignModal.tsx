"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
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

function sortCampaignsUnlockedFirst(list: CampaignRecord[]): CampaignRecord[] {
  return [...list].sort((a, b) => {
    const aLocked = isCampaignLaunched(a.outreachStatus);
    const bLocked = isCampaignLaunched(b.outreachStatus);
    if (aLocked !== bLocked) return aLocked ? 1 : -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

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
      className={`dashboard-add-campaign-create-option flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/35${
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
      className={`dashboard-add-campaign-cell flex min-h-[3.25rem] cursor-pointer items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/30 ${
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
  const [revealEmail, setRevealEmail] = useState(true);
  const [revealPhone, setRevealPhone] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setChoice("");
      setNewName("");
      setRevealEmail(true);
      setRevealPhone(true);
      setSubmitError("");
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) {
      setChoice(NEW_CAMPAIGN_VALUE);
      setRevealEmail(true);
      setRevealPhone(true);
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

  const campaignsToShow = useMemo(
    () => sortCampaignsUnlockedFirst(campaigns),
    [campaigns]
  );

  const revealTypes = useMemo((): CampaignRevealType[] => {
    const types: CampaignRevealType[] = [];
    if (revealEmail) types.push("EMAIL");
    if (revealPhone) types.push("PHONE");
    return types;
  }, [revealEmail, revealPhone]);

  const revealHint = useMemo(() => {
    if (revealEmail && revealPhone) {
      return "Email addresses and phone numbers will be unveiled for added candidates. Progress appears in the campaign Activity tab.";
    }
    if (revealEmail) {
      return "Email addresses will be unveiled for added candidates. Progress appears in the campaign Activity tab.";
    }
    if (revealPhone) {
      return "Phone numbers will be unveiled for added candidates. Progress appears in the campaign Activity tab.";
    }
    return "Select at least one option to unveil contact details.";
  }, [revealEmail, revealPhone]);

  const hasRevealChoice = revealEmail || revealPhone;

  if (!open || !mounted) return null;

  const isNew = choice === NEW_CAMPAIGN_VALUE;
  const trimmedNew = newName.trim();
  const selectedCampaign = campaigns.find((c) => c.id === choice);
  const selectedCampaignLaunched =
    Boolean(selectedCampaign) && isCampaignLaunched(selectedCampaign?.outreachStatus);
  const canSubmit =
    (isNew ? Boolean(trimmedNew) : Boolean(choice) && !selectedCampaignLaunched) &&
    hasRevealChoice &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError("");
    if (!hasRevealChoice) {
      setSubmitError("Select at least one contact detail to unveil — email or phone.");
      return;
    }
    if (!(isNew ? Boolean(trimmedNew) : Boolean(choice) && !selectedCampaignLaunched)) {
      return;
    }
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
      className="dashboard-modal-overlay dashboard-add-campaign-overlay z-[120]"
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
        <div className="dashboard-add-campaign-header flex shrink-0 items-start justify-between border-b border-slate-200">
          <div className="min-w-0">
            <h3 id="add-to-campaign-title" className="dashboard-section-title text-lg">
              Add to campaign
            </h3>
            <p className="dashboard-text-body dashboard-add-campaign-subtitle text-sm">
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

        <form onSubmit={handleSubmit} className="dashboard-add-campaign-form flex min-h-0 flex-1 flex-col">
          <div className="dashboard-add-campaign-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="dashboard-add-campaign-scroll-inner">
              <div role="radiogroup" aria-label="Campaign destination" className="dashboard-add-campaign-choices">
                {campaigns.length > 0 ? (
                  <p className="dashboard-add-campaign-existing-label">Choose a campaign</p>
                ) : null}
                <div className="dashboard-add-campaign-grid">
                  <CreateNewCampaignOption
                    active={isNew}
                    value={NEW_CAMPAIGN_VALUE}
                    nameAttr="campaign-target"
                    onSelect={() => setChoice(NEW_CAMPAIGN_VALUE)}
                    disabled={submitting}
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
            </div>
          </div>

          <div className="dashboard-add-campaign-footer shrink-0">
            <fieldset className="dashboard-add-campaign-footer-section border-0 p-0">
              <legend className={`${dashboardLabelClass} mb-2`}>Unveil contact details</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#141b2b]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={revealEmail}
                    onChange={(e) => {
                      setRevealEmail(e.target.checked);
                      setSubmitError("");
                    }}
                    disabled={submitting}
                  />
                  Email address
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#141b2b]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={revealPhone}
                    onChange={(e) => {
                      setRevealPhone(e.target.checked);
                      setSubmitError("");
                    }}
                    disabled={submitting}
                  />
                  Phone number
                </label>
              </div>
              <p className="dashboard-add-campaign-footer-hint mt-2">{revealHint}</p>
            </fieldset>

            {isNew ? (
              <label className={`${dashboardLabelClass} dashboard-add-campaign-footer-section block`}>
                Campaign name
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`${dashboardInputClass} dashboard-add-campaign-field dashboard-add-campaign-name-input mt-1 w-full`}
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

            <div className="dashboard-confirm-modal-footer dashboard-add-campaign-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={`${dashboardBtnSecondaryClass} dashboard-add-campaign-btn`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`${dashboardBtnPrimaryClass} dashboard-add-campaign-btn`}
              >
                <ButtonLoadingContent loading={submitting} loadingLabel="Adding">
                  Add to campaign
                </ButtonLoadingContent>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
