"use client";

import { useEffect, useMemo, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { OutreachSequencePickerSkeleton } from "@/components/dashboard/OutreachSequencePickerSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";
import { GenerateOutreachAiModal } from "@/components/dashboard/GenerateOutreachAiModal";
import type { GenerateOutreachFromJdResult } from "@/lib/outreachAiApi";
import type { OutreachTemplateListItem, OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";

export type OutreachPlanChannel = "gmail" | "whatsapp";

export type ExistingOutreachPlanOption = {
  id: string;
  name: string;
  touchpointCount: number;
  channel: OutreachPlanChannel;
};

export type CreateOutreachChoice =
  | { type: "scratch"; channel: "gmail" | "whatsapp"; jobDescription?: string }
  | { type: "template"; templateId: string }
  | { type: "clone"; planId: string; channel: OutreachPlanChannel }
  | {
      type: "ai";
      channel: "gmail";
      planName: string;
      jobDescription: string;
      touchpoints: OutreachTouchpointDraft[];
    }
  | {
      type: "ai";
      channel: "whatsapp";
      planName: string;
      jobDescription: string;
      touchpoints: WhatsAppTouchpointDraft[];
    };

function cloneSelectionKey(channel: OutreachPlanChannel, planId: string) {
  return `${channel}:${planId}`;
}

function parseCloneSelection(
  key: string
): { channel: OutreachPlanChannel; planId: string } | null {
  if (key.startsWith("whatsapp:")) {
    const planId = key.slice("whatsapp:".length);
    return planId ? { channel: "whatsapp", planId } : null;
  }
  if (key.startsWith("gmail:")) {
    const planId = key.slice("gmail:".length);
    return planId ? { channel: "gmail", planId } : null;
  }
  return null;
}

function planChannelLabel(channel: OutreachPlanChannel) {
  return channel === "whatsapp" ? "WhatsApp" : "Gmail";
}

function planOptionLabel(plan: ExistingOutreachPlanOption) {
  return `${plan.name} · ${plan.touchpointCount} touchpoint${
    plan.touchpointCount === 1 ? "" : "s"
  } · ${planChannelLabel(plan.channel)}`;
}

type Variant = "modal" | "embedded" | "campaign";

type Props = {
  variant?: Variant;
  allowedChannels?: ("gmail" | "whatsapp")[];
  existingPlans: ExistingOutreachPlanOption[];
  plansLoading?: boolean;
  plansPage?: number;
  plansTotalPages?: number;
  plansTotal?: number;
  onPlansPageChange?: (page: number) => void;
  templates: OutreachTemplateListItem[];
  templatesLoading?: boolean;
  /** False until the first templates/plans fetch has finished. */
  optionsReady?: boolean;
  lead?: string;
  /** Disable all picker actions (e.g. active or completed campaign). */
  readOnly?: boolean;
  /** Pre-fill JD fields (e.g. from campaign Job description tab). */
  initialJobDescription?: string;
  onChoose: (choice: CreateOutreachChoice) => void;
};

function SavedOutreachesPagination({
  page,
  totalPages,
  total,
  loading,
  onPageChange,
  compact,
}: {
  page: number;
  totalPages: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div
      className={`dashboard-pagination dashboard-pagination--compact${
        compact ? " mt-2" : " mt-3"
      }`}
    >
      <p className="dashboard-pagination-label tabular-nums">
        Page {page} of {totalPages}
        <span className="text-[#424656]/80"> · {total.toLocaleString()} total</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`${dashboardBtnSecondaryClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <MaterialIcon name="chevron_left" className="text-base" />
          Previous
        </button>
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={`${dashboardBtnSecondaryClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Next
          <MaterialIcon name="chevron_right" className="text-base" />
        </button>
      </div>
    </div>
  );
}

function pickerStyles(variant: Variant) {
  if (variant === "campaign") {
    return {
      root: "dashboard-campaign-sequence-picker",
      lead: "dashboard-campaign-sequence-lead",
      options: "dashboard-campaign-sequence-actions",
      optionBtn: "dashboard-campaign-sequence-action",
      iconBox: "dashboard-campaign-sequence-action-icon",
      iconBoxAi:
        "dashboard-campaign-sequence-action-icon dashboard-campaign-sequence-action-icon--ai",
      iconSize: "text-[22px]",
      label: "dashboard-campaign-sequence-action-label",
      chevron: "dashboard-campaign-sequence-action-chevron",
      hint: "dashboard-campaign-sequence-hint",
      sectionGap: "dashboard-campaign-sequence-section",
      sectionTitle: "dashboard-label-upper",
      subheading: "dashboard-campaign-sequence-subheading",
      templateList: "dashboard-table-wrap dashboard-campaign-sequence-template-list",
      templateRow: "dashboard-create-outreach-template-row",
      templateName: "dashboard-create-outreach-template-name",
      templateMeta: "dashboard-create-outreach-template-meta",
      actions: "dashboard-campaign-sequence-footer-actions",
      subpanel: "dashboard-campaign-sequence-subpanel",
    };
  }

  const compact = variant === "embedded";
  return {
    root: compact ? "dashboard-campaign-sequence-picker w-full max-w-[18rem] mx-auto" : "w-full",
    lead: compact
      ? "mb-2 text-center text-[11px] font-medium leading-snug text-slate-500"
      : "mb-4 text-sm font-medium text-[#434654]",
    options: compact ? "flex flex-col gap-1" : "flex flex-col gap-2",
    optionBtn: compact
      ? "flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-left transition hover:border-[#0050cb]/40 hover:bg-[#f8f9ff] disabled:cursor-not-allowed disabled:opacity-45"
      : "flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-[#0050cb]/40 hover:bg-[#f8f9ff] disabled:cursor-not-allowed disabled:opacity-45",
    iconBox: compact
      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500"
      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500",
    iconBoxAi: compact
      ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600"
      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600",
    iconSize: compact ? "text-[15px]" : "text-[22px]",
    label: compact ? "min-w-0 flex-1 text-xs font-medium text-[#141b2b]" : "min-w-0 flex-1 text-sm font-semibold text-[#141b2b]",
    chevron: compact ? "shrink-0 text-base text-slate-400" : "shrink-0 text-xl text-slate-400",
    hint: compact
      ? "mt-1 text-center text-[11px] text-slate-500"
      : "mt-2 text-xs text-slate-500",
    sectionGap: compact ? "mt-2.5" : "mt-6",
    sectionTitle: compact
      ? "mb-1.5 text-center text-[11px] font-semibold text-[#141b2b]"
      : "mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
    subheading: compact
      ? "mb-0.5 mt-1.5 px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500"
      : "mb-1 mt-3 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 first:mt-0",
    templateList: "overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100",
    templateRow: compact
      ? "flex w-full items-center gap-2 bg-white px-1.5 py-1.5 text-left transition hover:bg-[#f8f9ff]"
      : "flex w-full items-center gap-3 bg-white px-3 py-3 text-left transition hover:bg-[#f8f9ff]",
    templateName: compact ? "text-xs font-semibold text-[#141b2b] line-clamp-1" : "text-sm font-semibold text-[#141b2b]",
    templateMeta: compact ? "text-[11px] text-slate-500 line-clamp-1" : "text-xs text-slate-500",
    actions: compact
      ? "mt-2.5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-2.5"
      : "mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4",
    subpanel: "",
  };
}

function OptionRow({
  styles: s,
  icon,
  brandProvider,
  iconVariant = "default",
  label,
  disabled,
  onClick,
}: {
  styles: ReturnType<typeof pickerStyles>;
  icon?: string;
  brandProvider?: "gmail" | "whatsapp";
  iconVariant?: "default" | "ai";
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const compact = s.iconBox.includes("h-6");
  const isCampaign = s.optionBtn.includes("dashboard-campaign-sequence-action");
  const brandLogoClass =
    isCampaign || !compact
      ? "dashboard-integration-brand-logo"
      : "dashboard-integration-brand-logo--sm";

  const iconEl = (
    <span className={iconVariant === "ai" ? s.iconBoxAi : s.iconBox} aria-hidden>
      {brandProvider ? (
        <IntegrationBrandLogo provider={brandProvider} title={label} className={brandLogoClass} />
      ) : icon ? (
        <MaterialIcon name={icon} className={s.iconSize} />
      ) : null}
    </span>
  );

  return (
    <button type="button" className={s.optionBtn} onClick={onClick} disabled={disabled}>
      {isCampaign ? (
        <span className="dashboard-campaign-sequence-action-top">
          {iconEl}
          <span className={s.label}>{label}</span>
          <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
        </span>
      ) : (
        <>
          {iconEl}
          <span className={s.label}>{label}</span>
          <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
        </>
      )}
    </button>
  );
}

export function OutreachSequencePicker({
  variant = "modal",
  allowedChannels = ["gmail", "whatsapp"],
  existingPlans,
  plansLoading = false,
  plansPage = 1,
  plansTotalPages = 1,
  plansTotal = 0,
  onPlansPageChange,
  templates,
  templatesLoading = false,
  optionsReady,
  lead = "Choose how to build your sequence",
  readOnly = false,
  initialJobDescription = "",
  onChoose,
}: Props) {
  const [step, setStep] = useState<"choose" | "clone" | "scratchChannel" | "aiChannel">("choose");
  const [cloneSelection, setCloneSelection] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiChannel, setAiChannel] = useState<"gmail" | "whatsapp">("gmail");
  const [jobDescription, setJobDescription] = useState(
    () => initialJobDescription.trim()
  );
  const [scratchChannel, setScratchChannel] = useState<"gmail" | "whatsapp" | "">("");

  useEffect(() => {
    const next = initialJobDescription.trim();
    if (!next) return;
    setJobDescription((prev) => (prev.trim() ? prev : next));
  }, [initialJobDescription]);

  useEffect(() => {
    if (step !== "scratchChannel") return;
    const next = initialJobDescription.trim();
    if (!next) return;
    setJobDescription((prev) => (prev.trim() ? prev : next));
  }, [step, initialJobDescription]);

  const handleAiGenerated = (result: GenerateOutreachFromJdResult) => {
    if (result.channel === "whatsapp") {
      onChoose({
        type: "ai",
        channel: "whatsapp",
        planName: result.planName,
        jobDescription: result.jobDescription,
        touchpoints: result.touchpoints,
      });
      return;
    }
    onChoose({
      type: "ai",
      channel: "gmail",
      planName: result.planName,
      jobDescription: result.jobDescription,
      touchpoints: result.touchpoints,
    });
  };

  const s = pickerStyles(variant);

  const showLead = lead !== undefined && lead !== "";
  const pickerDisabled = readOnly;
  const allowsGmail = allowedChannels.includes("gmail");
  const allowsWhatsApp = allowedChannels.includes("whatsapp");

  const visiblePlans = useMemo(
    () => existingPlans.filter((p) => allowedChannels.includes(p.channel)),
    [existingPlans, allowedChannels]
  );

  const savedPlansCount = plansTotal > 0 ? plansTotal : visiblePlans.length;

  useEffect(() => {
    setCloneSelection("");
  }, [plansPage, existingPlans]);

  // Hide deprecated multi-channel starter template in picker UI.
  const globalTemplates = templates.filter(
    (t) => t.isGlobal && t.starterKey !== "multichannel"
  );
  const userTemplates = templates.filter((t) => !t.isGlobal);
  const listLoading = templatesLoading || plansLoading;
  /** Explicit false = parent gates first paint (campaign editor); undefined = loading flags only. */
  const pickerLoading =
    optionsReady === undefined ? listLoading : !optionsReady || listLoading;
  const showEmptyHints = optionsReady !== false && !pickerLoading;
  const hasTemplateList =
    globalTemplates.length > 0 || userTemplates.length > 0 || savedPlansCount > 0;

  if (step === "scratchChannel") {
    const normalizedJobDescription = jobDescription.trim();
    const canContinue = Boolean(normalizedJobDescription) && Boolean(scratchChannel);
    return (
      <div className={`${s.root}${s.subpanel ? ` ${s.subpanel}` : ""}`}>
        <label className={`${dashboardLabelClass} mb-3 block`}>
          Job description <span className="text-red-600">*</span>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            disabled={pickerDisabled}
            placeholder="Paste the role context, requirements, and key candidate profile details..."
            className={`${dashboardInputClass} mt-2 w-full resize-y`}
          />
        </label>
        <p className={s.lead}>Choose a channel for your outreach sequence.</p>
        <div
          className={
            variant === "campaign"
              ? "dashboard-campaign-sequence-channel-options"
              : s.options
          }
        >
          <button
            type="button"
            className={`${
              variant === "campaign" ? "dashboard-create-outreach-option" : s.optionBtn
            }${scratchChannel === "gmail" ? " border-[#0050cb] bg-[#f3f7ff]" : ""}`}
            disabled={pickerDisabled}
            onClick={() => setScratchChannel("gmail")}
          >
            <span
              className={
                variant === "campaign"
                  ? "dashboard-create-outreach-option-icon"
                  : s.iconBox
              }
              aria-hidden
            >
              <IntegrationBrandLogo provider="gmail" title="Gmail" className="dashboard-integration-brand-logo" />
            </span>
            <span
              className={
                variant === "campaign" ? "dashboard-create-outreach-option-label" : s.label
              }
            >
              Gmail
            </span>
            {scratchChannel === "gmail" ? (
              <MaterialIcon name="check_circle" className="shrink-0 text-xl text-[#0050cb]" aria-hidden />
            ) : (
              <MaterialIcon name="radio_button_unchecked" className="shrink-0 text-xl text-slate-400" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={`${
              variant === "campaign" ? "dashboard-create-outreach-option" : s.optionBtn
            }${scratchChannel === "whatsapp" ? " border-[#0050cb] bg-[#f3f7ff]" : ""}`}
            disabled={pickerDisabled}
            onClick={() => setScratchChannel("whatsapp")}
          >
            <span
              className={
                variant === "campaign"
                  ? "dashboard-create-outreach-option-icon"
                  : s.iconBox
              }
              aria-hidden
            >
              <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className="dashboard-integration-brand-logo" />
            </span>
            <span
              className={
                variant === "campaign" ? "dashboard-create-outreach-option-label" : s.label
              }
            >
              WhatsApp
            </span>
            {scratchChannel === "whatsapp" ? (
              <MaterialIcon name="check_circle" className="shrink-0 text-xl text-[#0050cb]" aria-hidden />
            ) : (
              <MaterialIcon name="radio_button_unchecked" className="shrink-0 text-xl text-slate-400" aria-hidden />
            )}
          </button>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            onClick={() => setStep("choose")}
            className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm`}
          >
            Back
          </button>
          <button
            type="button"
            disabled={pickerDisabled || !canContinue}
            onClick={() =>
              onChoose({
                type: "scratch",
                channel: scratchChannel as "gmail" | "whatsapp",
                jobDescription: normalizedJobDescription,
              })
            }
            className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === "aiChannel") {
    return (
      <div className={`${s.root}${s.subpanel ? ` ${s.subpanel}` : ""}`}>
        <p className={s.lead}>Choose a channel for AI-generated outreach.</p>
        <div className={s.options}>
          {allowsGmail ? (
            <OptionRow
              styles={s}
              brandProvider="gmail"
              label="Gmail"
              onClick={() => {
                setAiChannel("gmail");
                setAiModalOpen(true);
                setStep("choose");
              }}
            />
          ) : null}
          {allowsWhatsApp ? (
            <OptionRow
              styles={s}
              brandProvider="whatsapp"
              label="WhatsApp"
              onClick={() => {
                setAiChannel("whatsapp");
                setAiModalOpen(true);
                setStep("choose");
              }}
            />
          ) : null}
        </div>
        <div className={s.actions}>
          <button
            type="button"
            onClick={() => setStep("choose")}
            className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm`}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "clone") {
    return (
      <div className={`${s.root}${s.subpanel ? ` ${s.subpanel}` : ""}`}>
        <p className={s.lead}>Pick a plan to duplicate as your starting point.</p>
        {pickerLoading ? (
          <div className="mt-2 space-y-2" aria-busy="true" aria-label="Loading outreach plans">
            <div className="dashboard-shimmer h-10 w-full rounded-lg" />
            <div className="dashboard-shimmer h-10 w-full rounded-lg" />
          </div>
        ) : (
          <label className={`${dashboardLabelClass} block`}>
            Outreach plan
            <select
              value={cloneSelection}
              onChange={(e) => setCloneSelection(e.target.value)}
              className={`${dashboardInputClass} mt-2 w-full`}
              disabled={pickerDisabled || plansLoading}
            >
              <option value="">{plansLoading ? "Loading plans…" : "Select a plan…"}</option>
              {visiblePlans.map((p) => (
                <option key={cloneSelectionKey(p.channel, p.id)} value={cloneSelectionKey(p.channel, p.id)}>
                  {planOptionLabel(p)}
                </option>
              ))}
            </select>
          </label>
        )}
        {onPlansPageChange ? (
          <SavedOutreachesPagination
            page={plansPage}
            totalPages={plansTotalPages}
            total={savedPlansCount}
            loading={plansLoading}
            onPageChange={onPlansPageChange}
            compact={variant === "embedded"}
          />
        ) : null}
        <div className={s.actions}>
          <button
            type="button"
            onClick={() => {
              setStep("choose");
              setCloneSelection("");
            }}
            className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm`}
          >
            Back
          </button>
          <button
            type="button"
            disabled={pickerDisabled || !cloneSelection}
            onClick={() => {
              const parsed = parseCloneSelection(cloneSelection);
              if (!parsed) return;
              onChoose({
                type: "clone",
                planId: parsed.planId,
                channel: parsed.channel,
              });
            }}
            className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
          >
            Continue
          </button>
        </div>

        <GenerateOutreachAiModal
          open={aiModalOpen}
          channel={aiChannel}
          initialJobDescription={jobDescription || initialJobDescription}
          onClose={() => setAiModalOpen(false)}
          onGenerated={handleAiGenerated}
        />
      </div>
    );
  }

  return (
    <div className={s.root}>
      {showLead ? <p className={s.lead}>{lead}</p> : null}

      {variant === "campaign" ? (
        <p className="dashboard-label-upper dashboard-campaign-sequence-actions-label">Start Free Trial</p>
      ) : null}
      <div className={s.options}>
        <OptionRow
          styles={s}
          icon="auto_awesome"
          iconVariant="ai"
          label="Generate with AI"
          disabled={pickerDisabled}
          onClick={() => setStep("aiChannel")}
        />
        <OptionRow
          styles={s}
          icon="add"
          label="Start from scratch"
          disabled={pickerDisabled}
          onClick={() => setStep("scratchChannel")}
        />
        <OptionRow
          styles={s}
          icon="content_copy"
          label="Clone an existing outreach"
          disabled={
            pickerDisabled || pickerLoading || (!plansLoading && savedPlansCount === 0)
          }
          onClick={() => {
            if (pickerLoading || (savedPlansCount === 0 && !plansLoading)) return;
            setStep("clone");
          }}
        />
      </div>

      {showEmptyHints && savedPlansCount === 0 ? (
        <p className={s.hint}>Create and save a plan first to enable cloning.</p>
      ) : null}

      <div className={s.sectionGap}>
        {pickerLoading ? (
          <OutreachSequencePickerSkeleton rows={4} variant={variant} />
        ) : (
          <>
            <h3 className={s.sectionTitle}>
              {variant === "campaign" ? "Templates & saved outreaches" : "Templates"}
            </h3>
            {!hasTemplateList ? (
              <p className={s.hint}>No templates yet. Save an outreach plan to reuse it here.</p>
            ) : (
          <div className="space-y-0">
            {globalTemplates.length > 0 ? (
              <>
                <p className={s.subheading}>Starter</p>
                <div className={s.templateList}>
                  {globalTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className={s.templateRow}
                      disabled={pickerDisabled}
                      onClick={() => onChoose({ type: "template", templateId: tpl.id })}
                    >
                      <span
                        className={
                          variant === "embedded" ? s.iconBox : `${s.iconBox} text-[#0050cb]`
                        }
                        aria-hidden
                      >
                        <MaterialIcon name="mail" className={s.iconSize} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block ${s.templateName}`}>{tpl.name}</span>
                        <span className={`block ${s.templateMeta}`}>{tpl.description}</span>
                      </span>
                      <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {userTemplates.length > 0 ? (
              <>
                <p className={s.subheading}>Your templates</p>
                <div className={s.templateList}>
                  {userTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className={s.templateRow}
                      disabled={pickerDisabled}
                      onClick={() => onChoose({ type: "template", templateId: tpl.id })}
                    >
                      <span className={s.iconBox} aria-hidden>
                        <MaterialIcon name="mail" className={s.iconSize} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block ${s.templateName}`}>{tpl.name}</span>
                        <span className={`block ${s.templateMeta}`}>
                          {tpl.description}
                          {tpl.createdByName ? ` · ${tpl.createdByName}` : null}
                        </span>
                      </span>
                      <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {savedPlansCount > 0 ? (
              <>
                <p className={s.subheading}>Your saved outreaches</p>
                <div className={s.templateList}>
                  {plansLoading && visiblePlans.length === 0 ? (
                    <>
                      <div className="dashboard-shimmer h-12 w-full" aria-hidden />
                      <div className="dashboard-shimmer h-12 w-full" aria-hidden />
                    </>
                  ) : (
                    visiblePlans.map((plan) => (
                      <button
                        key={cloneSelectionKey(plan.channel, plan.id)}
                        type="button"
                        className={s.templateRow}
                        disabled={pickerDisabled}
                        onClick={() =>
                          onChoose({ type: "clone", planId: plan.id, channel: plan.channel })
                        }
                      >
                        <span
                          className={
                            variant === "embedded"
                              ? `${s.iconBox} border-[#0050cb]/20 bg-[#0050cb]/10 text-[#0050cb]`
                              : `${s.iconBox} border-[#0050cb]/20 bg-[#0050cb]/10 text-[#0050cb]`
                          }
                          aria-hidden
                        >
                          {plan.channel === "whatsapp" ? (
                            <IntegrationBrandLogo
                              provider="whatsapp"
                              title="WhatsApp"
                              className="dashboard-integration-brand-logo"
                            />
                          ) : (
                            <IntegrationBrandLogo
                              provider="gmail"
                              title="Gmail"
                              className="dashboard-integration-brand-logo"
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block ${s.templateName}`}>{plan.name}</span>
                          <span className={`block ${s.templateMeta}`}>
                            {plan.touchpointCount} touchpoint
                            {plan.touchpointCount === 1 ? "" : "s"} · {planChannelLabel(plan.channel)}
                          </span>
                        </span>
                        <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
                      </button>
                    ))
                  )}
                </div>
                {onPlansPageChange ? (
                  <SavedOutreachesPagination
                    page={plansPage}
                    totalPages={plansTotalPages}
                    total={savedPlansCount}
                    loading={plansLoading}
                    onPageChange={onPlansPageChange}
                    compact={variant === "embedded"}
                  />
                ) : null}
              </>
            ) : null}
          </div>
            )}
          </>
        )}
      </div>

      <GenerateOutreachAiModal
        open={aiModalOpen}
        channel={aiChannel}
        initialJobDescription={jobDescription || initialJobDescription}
        onClose={() => setAiModalOpen(false)}
        onBack={() => {
          setAiModalOpen(false);
          setStep("aiChannel");
        }}
        onGenerated={handleAiGenerated}
      />
    </div>
  );
}
