"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

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
import { OutreachPillSelect } from "@/components/dashboard/OutreachPillSelect";
import type { GenerateOutreachFromJdResult } from "@/lib/outreachAiApi";
import type { OutreachTemplateListItem, OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import {
  WHATSAPP_NO_REPLY_TEMPLATES,
  WHATSAPP_OPENING_TEMPLATES,
  type WhatsAppMessageTemplate,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
import {
  getWhatsAppWaitUnitOptions,
  type WhatsAppWaitUnit,
} from "@/lib/whatsappWait";
import {
  clearCampaignSetupPickerDraft,
  createDefaultSetupPickerDraft,
  readCampaignSetupPickerDraft,
  writeCampaignSetupPickerDraft,
  type CampaignSetupArrangeDraft,
  type OutreachSequenceChannel,
  type ScreeningChannel,
  type SetupEntryPath,
  type SetupPickerStep,
} from "@/lib/campaignSetupPickerDraft";

export type OutreachPlanChannel = "gmail" | "whatsapp";

export type { OutreachSequenceChannel, ScreeningChannel };

type EmailStepDraft = { id: string; subject: string; body: string };
type MessageStepDraft = { id: string; message: string; templateId?: string };
type MessageWaitDraft = { amount: number; unit: WhatsAppWaitUnit };

const WHATSAPP_MESSAGE_STEP_LIMIT = 3;
type VoiceSetupDraft = { objective: string; intro: string; instructions: string };

function createStepId() {
  return `step-${Math.random().toString(36).slice(2, 9)}`;
}

function whatsAppTemplatesForMessageStep(stepIndex: number): WhatsAppMessageTemplate[] {
  if (stepIndex === 0) return WHATSAPP_OPENING_TEMPLATES;
  if (stepIndex === 1) return WHATSAPP_NO_REPLY_TEMPLATES[1];
  return WHATSAPP_NO_REPLY_TEMPLATES[2];
}

function WhatsAppSequenceTemplatePicker({
  stepIndex,
  selectedId,
  disabled,
  onSelect,
}: {
  stepIndex: number;
  selectedId?: string;
  disabled?: boolean;
  onSelect: (template: WhatsAppMessageTemplate) => void;
}) {
  const templates = whatsAppTemplatesForMessageStep(stepIndex);
  const stepLabel =
    stepIndex === 0
      ? "Opening message"
      : stepIndex === 1
        ? "No-reply follow-up 1"
        : "No-reply follow-up 2";

  return (
    <div className="dashboard-wa-opening-templates dashboard-campaign-channel-sequence-templates">
      <p className="dashboard-campaign-channel-sequence-templates-lead">{stepLabel}</p>
      <div
        className="dashboard-wa-opening-templates-grid"
        role="radiogroup"
        aria-label={`${stepLabel} template`}
      >
        {templates.map((tpl) => {
          const active = selectedId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`dashboard-wa-opening-template-card${active ? " dashboard-wa-opening-template-card--active" : ""}`}
              onClick={() => onSelect(tpl)}
            >
              <span className="dashboard-wa-opening-template-card-head">
                <span
                  className={`dashboard-wa-opening-template-radio${active ? " dashboard-wa-opening-template-radio--active" : ""}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="dashboard-wa-opening-template-name">{tpl.name}</span>
                  <span className="dashboard-wa-opening-template-desc">{tpl.description}</span>
                </span>
              </span>
              <pre className="dashboard-wa-opening-template-body">{tpl.body}</pre>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WhatsAppMessageWaitGap({
  beforeMessageNumber,
  amount,
  unit,
  disabled,
  onChange,
}: {
  beforeMessageNumber: number;
  amount: number;
  unit: WhatsAppWaitUnit;
  disabled?: boolean;
  onChange: (patch: Partial<{ amount: number; unit: WhatsAppWaitUnit }>) => void;
}) {
  return (
    <div className="dashboard-campaign-channel-sequence-message-gap">
      <span className="dashboard-campaign-channel-sequence-message-gap-badge">If no reply</span>
      <div className="dashboard-wa-outreach-wait-bar dashboard-campaign-channel-sequence-message-gap-bar">
        <span className="text-xs font-medium text-slate-600">Wait</span>
        <input
          type="number"
          min={1}
          value={amount || 1}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              amount: Math.max(1, Number(e.target.value) || 1),
            })
          }
          className="dashboard-wa-outreach-wait-input"
          aria-label={`Wait before message ${beforeMessageNumber}`}
        />
        <OutreachPillSelect
          value={unit}
          options={getWhatsAppWaitUnitOptions()}
          onChange={(nextUnit) => onChange({ unit: nextUnit })}
          ariaLabel={`Wait before message ${beforeMessageNumber} unit`}
          disabled={disabled}
        />
        <span className="text-xs text-slate-500">before message {beforeMessageNumber}</span>
      </div>
    </div>
  );
}

function ChannelSequenceSetup({
  channel,
  disabled,
  emailSteps,
  messageSteps,
  voiceSetup,
  onEmailStepsChange,
  onMessageStepsChange,
  onVoiceSetupChange,
  showWaitBeforeNext,
  waitDays,
  onWaitDaysChange,
  messageWaits,
  onMessageWaitChange,
}: {
  channel: OutreachSequenceChannel;
  disabled?: boolean;
  emailSteps: EmailStepDraft[];
  messageSteps: MessageStepDraft[];
  voiceSetup: VoiceSetupDraft;
  onEmailStepsChange: (steps: EmailStepDraft[]) => void;
  onMessageStepsChange: (steps: MessageStepDraft[]) => void;
  onVoiceSetupChange: (setup: VoiceSetupDraft) => void;
  showWaitBeforeNext: boolean;
  waitDays: string;
  onWaitDaysChange: (value: string) => void;
  messageWaits: MessageWaitDraft[];
  onMessageWaitChange: (
    gapIndex: number,
    patch: Partial<{ amount: number; unit: WhatsAppWaitUnit }>
  ) => void;
}) {
  return (
    <div className="dashboard-campaign-channel-sequence-setup">
      <div className="dashboard-campaign-channel-sequence-setup-head">
        <h4 className="dashboard-campaign-channel-sequence-setup-title">Sequence</h4>
        <p className="dashboard-campaign-channel-sequence-setup-lead">
          {channel === "gmail"
            ? "Add the emails candidates receive on this channel."
            : channel === "whatsapp"
              ? "Choose templates for each message and set how long to wait before the next one."
              : "Set how the AI voice agent should run this call."}
        </p>
      </div>

      {channel === "gmail" ? (
        <div className="dashboard-campaign-channel-sequence-steps">
          {emailSteps.map((step, stepIndex) => (
            <div key={step.id} className="dashboard-campaign-channel-sequence-step">
              <div className="dashboard-campaign-channel-sequence-step-head">
                <span className="dashboard-campaign-channel-sequence-step-badge">
                  Email {stepIndex + 1}
                </span>
                {emailSteps.length > 1 ? (
                  <button
                    type="button"
                    className="dashboard-campaign-channel-sequence-step-remove"
                    disabled={disabled}
                    onClick={() =>
                      onEmailStepsChange(emailSteps.filter((item) => item.id !== step.id))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <label className={`${dashboardLabelClass} block`}>
                Subject
                <input
                  type="text"
                  value={step.subject}
                  disabled={disabled}
                  placeholder="e.g. Quick question about your experience"
                  className={`${dashboardInputClass} mt-2 w-full`}
                  onChange={(e) =>
                    onEmailStepsChange(
                      emailSteps.map((item) =>
                        item.id === step.id ? { ...item, subject: e.target.value } : item
                      )
                    )
                  }
                />
              </label>
              <label className={`${dashboardLabelClass} mt-3 block`}>
                Message
                <textarea
                  value={step.body}
                  disabled={disabled}
                  rows={4}
                  placeholder="Write the email body for this step..."
                  className={`${dashboardInputClass} mt-2 w-full resize-y`}
                  onChange={(e) =>
                    onEmailStepsChange(
                      emailSteps.map((item) =>
                        item.id === step.id ? { ...item, body: e.target.value } : item
                      )
                    )
                  }
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="dashboard-campaign-channel-sequence-add-btn"
            disabled={disabled || emailSteps.length >= 5}
            onClick={() =>
              onEmailStepsChange([
                ...emailSteps,
                { id: createStepId(), subject: "", body: "" },
              ])
            }
          >
            <MaterialIcon name="add" className="text-base" />
            Add email step
          </button>
        </div>
      ) : null}

      {channel === "whatsapp" ? (
        <div className="dashboard-campaign-channel-sequence-steps">
          {messageSteps.map((step, stepIndex) => (
            <Fragment key={step.id}>
              <div className="dashboard-campaign-channel-sequence-step">
                <div className="dashboard-campaign-channel-sequence-step-head">
                  <span className="dashboard-campaign-channel-sequence-step-badge">
                    Message {stepIndex + 1}
                  </span>
                  {messageSteps.length > 1 ? (
                    <button
                      type="button"
                      className="dashboard-campaign-channel-sequence-step-remove"
                      disabled={disabled}
                      onClick={() =>
                        onMessageStepsChange(messageSteps.filter((item) => item.id !== step.id))
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <WhatsAppSequenceTemplatePicker
                  stepIndex={stepIndex}
                  selectedId={step.templateId}
                  disabled={disabled}
                  onSelect={(template) =>
                    onMessageStepsChange(
                      messageSteps.map((item) =>
                        item.id === step.id
                          ? { ...item, message: template.body, templateId: template.id }
                          : item
                      )
                    )
                  }
                />
              </div>
              {stepIndex < messageSteps.length - 1 ? (
                <WhatsAppMessageWaitGap
                  beforeMessageNumber={stepIndex + 2}
                  amount={messageWaits[stepIndex]?.amount ?? 1}
                  unit={messageWaits[stepIndex]?.unit ?? "days"}
                  disabled={disabled}
                  onChange={(patch) => onMessageWaitChange(stepIndex, patch)}
                />
              ) : null}
            </Fragment>
          ))}
          <button
            type="button"
            className="dashboard-campaign-channel-sequence-add-btn"
            disabled={disabled || messageSteps.length >= WHATSAPP_MESSAGE_STEP_LIMIT}
            onClick={() =>
              onMessageStepsChange([
                ...messageSteps,
                { id: createStepId(), message: "" },
              ])
            }
          >
            <MaterialIcon name="add" className="text-base" />
            Add message step
          </button>
        </div>
      ) : null}

      {channel === "voice_call" ? (
        <div className="dashboard-campaign-channel-sequence-steps">
          <div className="dashboard-campaign-channel-sequence-step">
            <label className={`${dashboardLabelClass} block`}>
              Call objective
              <input
                type="text"
                value={voiceSetup.objective}
                disabled={disabled}
                placeholder="e.g. Screen for interest and availability"
                className={`${dashboardInputClass} mt-2 w-full`}
                onChange={(e) =>
                  onVoiceSetupChange({ ...voiceSetup, objective: e.target.value })
                }
              />
            </label>
            <label className={`${dashboardLabelClass} mt-3 block`}>
              Opening line
              <input
                type="text"
                value={voiceSetup.intro}
                disabled={disabled}
                placeholder="e.g. Hi, I'm calling from Acme about the role you applied for"
                className={`${dashboardInputClass} mt-2 w-full`}
                onChange={(e) => onVoiceSetupChange({ ...voiceSetup, intro: e.target.value })}
              />
            </label>
            <label className={`${dashboardLabelClass} mt-3 block`}>
              Agent instructions
              <textarea
                value={voiceSetup.instructions}
                disabled={disabled}
                rows={5}
                placeholder="What should the agent ask, confirm, and capture on the call?"
                className={`${dashboardInputClass} mt-2 w-full resize-y`}
                onChange={(e) =>
                  onVoiceSetupChange({ ...voiceSetup, instructions: e.target.value })
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      {showWaitBeforeNext ? (
        <label className="dashboard-campaign-channel-sequence-wait">
          <span className="dashboard-campaign-channel-sequence-wait-label">
            If no reply, wait before trying the next channel
          </span>
          <select
            value={waitDays}
            disabled={disabled}
            className={`${dashboardInputClass} dashboard-campaign-channel-sequence-wait-select`}
            onChange={(e) => onWaitDaysChange(e.target.value)}
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}

function OutreachChannelArrangeFlow({
  channels,
  disabled,
  onMoveUp,
  onMoveDown,
  arrangeDraft,
  onArrangeDraftChange,
}: {
  channels: OutreachSequenceChannel[];
  disabled?: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  arrangeDraft: CampaignSetupArrangeDraft;
  onArrangeDraftChange: (draft: CampaignSetupArrangeDraft) => void;
}) {
  const emailSteps = arrangeDraft.emailSteps;
  const messageSteps = arrangeDraft.messageSteps;
  const voiceSetup = arrangeDraft.voiceSetup;
  const waitDaysByChannel = arrangeDraft.waitDaysByChannel;
  const whatsappMessageWaits = arrangeDraft.whatsappMessageWaits;

  const patchArrangeDraft = (patch: Partial<CampaignSetupArrangeDraft>) => {
    onArrangeDraftChange({ ...arrangeDraft, ...patch });
  };

  const singleChannel = channels.length === 1;

  return (
    <div
      className="dashboard-campaign-channel-arrange-flow-wrap"
      aria-label="Outreach channel order and sequences"
    >
      <div className="dashboard-campaign-channel-arrange-stack">
        {channels.map((channel, index) => (
          <div key={channel} className="dashboard-campaign-channel-arrange-block">
            <article className="dashboard-campaign-channel-arrange-panel">
              <header className="dashboard-campaign-channel-arrange-panel-head">
                <div className="dashboard-campaign-channel-arrange-panel-head-main">
                  {!singleChannel ? (
                    <div className="dashboard-campaign-channel-arrange-flow-node-head">
                      <span className="dashboard-campaign-channel-arrange-flow-node-step">
                        Step {index + 1}
                      </span>
                      {index === 0 ? (
                        <span className="dashboard-campaign-channel-arrange-flow-node-badge">
                          Try first
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="dashboard-campaign-channel-arrange-panel-channel">
                    <span className="dashboard-campaign-channel-arrange-flow-node-icon" aria-hidden>
                      <OutreachChannelArrangeIcon
                        channel={channel}
                        className="dashboard-campaign-channel-arrange-brand"
                      />
                    </span>
                    <p className="dashboard-campaign-channel-arrange-flow-node-label">
                      {outreachChannelLabel(channel)}
                    </p>
                  </div>
                </div>
                {!singleChannel ? (
                  <div className="dashboard-campaign-channel-arrange-flow-node-moves">
                    <button
                      type="button"
                      className="dashboard-campaign-channel-arrange-move-btn"
                      disabled={disabled || index === 0}
                      aria-label={`Try ${outreachChannelLabel(channel)} sooner`}
                      onClick={() => onMoveUp(index)}
                    >
                      <MaterialIcon name="chevron_left" className="text-base" />
                    </button>
                    <button
                      type="button"
                      className="dashboard-campaign-channel-arrange-move-btn"
                      disabled={disabled || index === channels.length - 1}
                      aria-label={`Try ${outreachChannelLabel(channel)} later`}
                      onClick={() => onMoveDown(index)}
                    >
                      <MaterialIcon name="chevron_right" className="text-base" />
                    </button>
                  </div>
                ) : null}
              </header>

              <ChannelSequenceSetup
                channel={channel}
                disabled={disabled}
                emailSteps={emailSteps}
                messageSteps={messageSteps}
                voiceSetup={voiceSetup}
                onEmailStepsChange={(steps) => patchArrangeDraft({ emailSteps: steps })}
                onMessageStepsChange={(steps) => patchArrangeDraft({ messageSteps: steps })}
                onVoiceSetupChange={(setup) => patchArrangeDraft({ voiceSetup: setup })}
                showWaitBeforeNext={index < channels.length - 1}
                waitDays={waitDaysByChannel[channel] ?? "3"}
                onWaitDaysChange={(value) =>
                  patchArrangeDraft({
                    waitDaysByChannel: { ...waitDaysByChannel, [channel]: value },
                  })
                }
                messageWaits={whatsappMessageWaits}
                onMessageWaitChange={(gapIndex, patch) =>
                  patchArrangeDraft({
                    whatsappMessageWaits: whatsappMessageWaits.map((item, waitIndex) =>
                      waitIndex === gapIndex ? { ...item, ...patch } : item
                    ),
                  })
                }
              />
            </article>

            {index < channels.length - 1 ? (
              <div className="dashboard-campaign-channel-arrange-flow-link" aria-hidden>
                <span className="dashboard-campaign-channel-arrange-flow-link-line" />
                <div className="dashboard-campaign-channel-arrange-flow-link-copy">
                  <span className="dashboard-campaign-channel-arrange-flow-link-label">
                    No reply?
                  </span>
                  <span className="dashboard-campaign-channel-arrange-flow-link-sub">
                    Try next channel
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function outreachChannelLabel(channel: OutreachSequenceChannel): string {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "voice_call") return "AI voice call";
  return "Gmail";
}

function OutreachChannelArrangeIcon({
  channel,
  className = "",
}: {
  channel: OutreachSequenceChannel;
  className?: string;
}) {
  if (channel === "gmail") {
    return (
      <IntegrationBrandLogo provider="gmail" title="Gmail" className={className} />
    );
  }
  if (channel === "whatsapp") {
    return (
      <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className={className} />
    );
  }
  return (
    <span
      className={`dashboard-campaign-channel-arrange-ai-icon${className ? ` ${className}` : ""}`}
      aria-hidden
    >
      <MaterialIcon name="record_voice_over" className="text-lg" />
    </span>
  );
}

export type ExistingOutreachPlanOption = {
  id: string;
  name: string;
  touchpointCount: number;
  channel: OutreachPlanChannel;
};

export type CreateOutreachChoice =
  | {
      type: "scratch";
      channel: OutreachSequenceChannel;
      channels: OutreachSequenceChannel[];
      arrange: CampaignSetupArrangeDraft;
      screeningChannel: ScreeningChannel | "";
      jobTitle: string;
      jobDescription: string;
    }
  | { type: "template"; templateId: string }
  | { type: "clone"; planId: string; channel: OutreachPlanChannel }
  | {
      type: "ai";
      channel: "gmail";
      planName: string;
      jobTitle: string;
      jobDescription: string;
      touchpoints: OutreachTouchpointDraft[];
    }
  | {
      type: "ai";
      channel: "whatsapp";
      planName: string;
      jobTitle: string;
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
  allowedChannels?: OutreachSequenceChannel[];
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
  /** Pre-fill role fields (e.g. from campaign Job description tab). */
  initialJobTitle?: string;
  initialJobDescription?: string;
  /** When set, setup picker progress is restored from session storage per campaign. */
  campaignId?: string;
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
      iconSize: "text-xl",
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

function ScratchChannelOption({
  variant,
  styles: s,
  selected,
  disabled,
  label,
  brandProvider,
  icon,
  iconVariant = "default",
  onSelect,
}: {
  variant: Variant;
  styles: ReturnType<typeof pickerStyles>;
  selected: boolean;
  disabled?: boolean;
  label: string;
  brandProvider?: "gmail" | "whatsapp";
  icon?: string;
  iconVariant?: "default" | "ai";
  onSelect: () => void;
}) {
  const isCampaign = variant === "campaign";
  const optionClass = isCampaign ? "dashboard-create-outreach-option" : s.optionBtn;
  const iconClass =
    iconVariant === "ai"
      ? isCampaign
        ? "dashboard-create-outreach-option-icon dashboard-create-outreach-option-icon--ai"
        : s.iconBoxAi
      : isCampaign
        ? "dashboard-create-outreach-option-icon"
        : s.iconBox;
  const labelClass = isCampaign ? "dashboard-create-outreach-option-label" : s.label;

  return (
    <button
      type="button"
      className={`${optionClass}${selected ? " border-[#0050cb] bg-[#f3f7ff]" : ""}`}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className={iconClass} aria-hidden>
        {brandProvider ? (
          <IntegrationBrandLogo
            provider={brandProvider}
            title={label}
            className="dashboard-integration-brand-logo"
          />
        ) : icon ? (
          <MaterialIcon name={icon} className={s.iconSize} />
        ) : null}
      </span>
      <span className={labelClass}>{label}</span>
      {selected ? (
        <MaterialIcon name="check_circle" className="shrink-0 text-xl text-[#0050cb]" aria-hidden />
      ) : (
        <MaterialIcon name="radio_button_unchecked" className="shrink-0 text-xl text-slate-400" aria-hidden />
      )}
    </button>
  );
}

function OptionRow({
  styles: s,
  icon,
  brandProvider,
  iconVariant = "default",
  label,
  description,
  disabled,
  selected = false,
  onClick,
}: {
  styles: ReturnType<typeof pickerStyles>;
  icon?: string;
  brandProvider?: "gmail" | "whatsapp";
  iconVariant?: "default" | "ai";
  label: string;
  description?: string;
  disabled?: boolean;
  selected?: boolean;
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
    <button
      type="button"
      className={`${s.optionBtn}${selected ? " border-[#0050cb] bg-[#f3f7ff]" : ""}${
        description && isCampaign ? " dashboard-campaign-sequence-action--described" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {isCampaign ? (
        <span className="dashboard-campaign-sequence-action-top">
          {iconEl}
          <span className={s.label}>
            <span className="block">{label}</span>
            {description ? (
              <span className="dashboard-campaign-sequence-action-desc">{description}</span>
            ) : null}
          </span>
          {selected ? (
            <MaterialIcon name="check_circle" className="shrink-0 text-xl text-[#0050cb]" aria-hidden />
          ) : (
            <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
          )}
        </span>
      ) : (
        <>
          {iconEl}
          <span className={s.label}>
            <span className="block">{label}</span>
            {description ? (
              <span className="mt-0.5 block text-xs font-normal leading-snug text-slate-500">
                {description}
              </span>
            ) : null}
          </span>
          {selected ? (
            <MaterialIcon name="check_circle" className="shrink-0 text-xl text-[#0050cb]" aria-hidden />
          ) : (
            <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
          )}
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
  initialJobTitle = "",
  initialJobDescription = "",
  campaignId,
  onChoose,
}: Props) {
  const draftSeed = useMemo(
    () => ({
      jobTitle: initialJobTitle.trim(),
      jobDescription: initialJobDescription.trim(),
    }),
    [initialJobTitle, initialJobDescription]
  );
  const restoredDraft = useMemo(() => {
    if (!campaignId) return null;
    return readCampaignSetupPickerDraft(campaignId, draftSeed);
  }, [campaignId, draftSeed]);
  const initialDraft = restoredDraft ?? createDefaultSetupPickerDraft(
    draftSeed.jobTitle,
    draftSeed.jobDescription
  );

  const [step, setStep] = useState<SetupPickerStep>(initialDraft.step);
  const [cloneSelection, setCloneSelection] = useState(initialDraft.cloneSelection);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiChannel, setAiChannel] = useState<"gmail" | "whatsapp">(initialDraft.aiChannel);
  const [jobTitle, setJobTitle] = useState(initialDraft.jobTitle);
  const [jobDescription, setJobDescription] = useState(initialDraft.jobDescription);
  const [scratchChannels, setScratchChannels] = useState<OutreachSequenceChannel[]>(
    initialDraft.scratchChannels
  );
  const [orderedScratchChannels, setOrderedScratchChannels] = useState<OutreachSequenceChannel[]>(
    initialDraft.orderedScratchChannels
  );
  const [aiChannels, setAiChannels] = useState<OutreachSequenceChannel[]>(initialDraft.aiChannels);
  const [setupEntryPath, setSetupEntryPath] = useState<SetupEntryPath>(initialDraft.setupEntryPath);
  const [scratchScreeningChannel, setScratchScreeningChannel] = useState<
    ScreeningChannel | ""
  >(initialDraft.scratchScreeningChannel);
  const [arrangeDraft, setArrangeDraft] = useState(initialDraft.arrange);

  const emitChoose = (choice: CreateOutreachChoice) => {
    if (campaignId) clearCampaignSetupPickerDraft(campaignId);
    onChoose(choice);
  };

  useEffect(() => {
    if (!campaignId) return;
    writeCampaignSetupPickerDraft(campaignId, {
      step,
      jobTitle,
      jobDescription,
      scratchChannels,
      orderedScratchChannels,
      aiChannels,
      setupEntryPath,
      scratchScreeningChannel,
      cloneSelection,
      aiChannel,
      arrange: arrangeDraft,
    });
  }, [
    campaignId,
    step,
    jobTitle,
    jobDescription,
    scratchChannels,
    orderedScratchChannels,
    aiChannels,
    setupEntryPath,
    scratchScreeningChannel,
    cloneSelection,
    aiChannel,
    arrangeDraft,
  ]);

  useEffect(() => {
    if (!campaignId) return;
    const next =
      readCampaignSetupPickerDraft(campaignId, draftSeed) ??
      createDefaultSetupPickerDraft(draftSeed.jobTitle, draftSeed.jobDescription);
    setStep(next.step);
    setCloneSelection(next.cloneSelection);
    setAiChannel(next.aiChannel);
    setJobTitle(next.jobTitle);
    setJobDescription(next.jobDescription);
    setScratchChannels(next.scratchChannels);
    setOrderedScratchChannels(next.orderedScratchChannels);
    setAiChannels(next.aiChannels);
    setSetupEntryPath(next.setupEntryPath);
    setScratchScreeningChannel(next.scratchScreeningChannel);
    setArrangeDraft(next.arrange);
  }, [campaignId]);

  const toggleScratchChannel = (channel: OutreachSequenceChannel) => {
    setScratchChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  const toggleAiChannel = (channel: OutreachSequenceChannel) => {
    setAiChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  useEffect(() => {
    if (step !== "scratchChannel" && step !== "arrangeChannels" && step !== "aiChannel") {
      setScratchChannels([]);
      setOrderedScratchChannels([]);
      setScratchScreeningChannel("");
    }
  }, [step]);

  useEffect(() => {
    if (step !== "aiChannel" && step !== "arrangeChannels") {
      setAiChannels([]);
    }
    if (step !== "arrangeChannels" && step !== "scratchChannel" && step !== "aiChannel") {
      setSetupEntryPath("");
    }
  }, [step]);

  useEffect(() => {
    const next = initialJobTitle.trim();
    if (!next) return;
    setJobTitle((prev) => (prev.trim() ? prev : next));
  }, [initialJobTitle]);

  useEffect(() => {
    const next = initialJobDescription.trim();
    if (!next) return;
    setJobDescription((prev) => (prev.trim() ? prev : next));
  }, [initialJobDescription]);

  useEffect(() => {
    if (step !== "scratchChannel" && step !== "aiChannel") return;
    const nextTitle = initialJobTitle.trim();
    if (nextTitle) setJobTitle((prev) => (prev.trim() ? prev : nextTitle));
    const nextJd = initialJobDescription.trim();
    if (nextJd) setJobDescription((prev) => (prev.trim() ? prev : nextJd));
  }, [step, initialJobTitle, initialJobDescription]);

  const handleAiGenerated = (result: GenerateOutreachFromJdResult) => {
    if (result.channel === "whatsapp") {
      emitChoose({
        type: "ai",
        channel: "whatsapp",
        planName: result.planName,
        jobTitle: result.jobTitle,
        jobDescription: result.jobDescription,
        touchpoints: result.touchpoints,
      });
      return;
    }
    emitChoose({
      type: "ai",
      channel: "gmail",
      planName: result.planName,
      jobTitle: result.jobTitle,
      jobDescription: result.jobDescription,
      touchpoints: result.touchpoints,
    });
  };

  const s = pickerStyles(variant);

  const showLead = lead !== undefined && lead !== "";
  const pickerDisabled = readOnly;
  const allowsGmail = allowedChannels.includes("gmail");
  const allowsWhatsApp = allowedChannels.includes("whatsapp");
  const allowsVoiceCall = allowedChannels.includes("voice_call");

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
  const hasTemplateList =
    globalTemplates.length > 0 || userTemplates.length > 0 || savedPlansCount > 0;

  if (step === "scratchChannel") {
    const normalizedJobTitle = jobTitle.trim();
    const normalizedJobDescription = jobDescription.trim();
    const canContinue =
      Boolean(normalizedJobTitle) &&
      Boolean(normalizedJobDescription) &&
      scratchChannels.length > 0;

    const proceedFromScratchChannel = () => {
      if (scratchChannels.length === 0) return;
      setSetupEntryPath("scratch");
      setOrderedScratchChannels([...scratchChannels]);
      setStep("arrangeChannels");
    };

    return (
      <div className={`${s.root}${s.subpanel ? ` ${s.subpanel}` : ""}`}>
        <label className={`${dashboardLabelClass} mb-3 block`}>
          Job title <span className="text-red-600">*</span>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={pickerDisabled}
            placeholder="e.g. Senior Software Engineer"
            className={`${dashboardInputClass} mt-2 w-full`}
          />
        </label>
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
        <p className={s.lead}>Choose one or more channels for your outreach sequence.</p>
        {variant === "campaign" ? (
          <div className="dashboard-campaign-sequence-actions">
            {allowsGmail ? (
              <OptionRow
                styles={s}
                brandProvider="gmail"
                label="Gmail"
                disabled={pickerDisabled}
                selected={scratchChannels.includes("gmail")}
                onClick={() => toggleScratchChannel("gmail")}
              />
            ) : null}
            {allowsWhatsApp ? (
              <OptionRow
                styles={s}
                brandProvider="whatsapp"
                label="WhatsApp"
                disabled={pickerDisabled}
                selected={scratchChannels.includes("whatsapp")}
                onClick={() => toggleScratchChannel("whatsapp")}
              />
            ) : null}
            {allowsVoiceCall ? (
              <OptionRow
                styles={s}
                icon="record_voice_over"
                iconVariant="ai"
                label="AI voice call"
                disabled={pickerDisabled}
                selected={scratchChannels.includes("voice_call")}
                onClick={() => toggleScratchChannel("voice_call")}
              />
            ) : null}
          </div>
        ) : (
          <div className={s.options}>
            {allowsGmail ? (
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchChannels.includes("gmail")}
                disabled={pickerDisabled}
                label="Gmail"
                brandProvider="gmail"
                onSelect={() => toggleScratchChannel("gmail")}
              />
            ) : null}
            {allowsWhatsApp ? (
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchChannels.includes("whatsapp")}
                disabled={pickerDisabled}
                label="WhatsApp"
                brandProvider="whatsapp"
                onSelect={() => toggleScratchChannel("whatsapp")}
              />
            ) : null}
            {allowsVoiceCall ? (
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchChannels.includes("voice_call")}
                disabled={pickerDisabled}
                label="AI voice call"
                icon="record_voice_over"
                iconVariant="ai"
                onSelect={() => toggleScratchChannel("voice_call")}
              />
            ) : null}
          </div>
        )}
        <div className="dashboard-campaign-sequence-screening-section">
          <p className="dashboard-campaign-sequence-lead dashboard-campaign-sequence-screening-lead">
            Choose channel for screening
          </p>
          {variant === "campaign" ? (
            <div className="dashboard-campaign-sequence-actions">
              <OptionRow
                styles={s}
                icon="call"
                label="Call interview"
                disabled={pickerDisabled}
                selected={scratchScreeningChannel === "call_interview"}
                onClick={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "call_interview" ? "" : "call_interview"
                  )
                }
              />
              <OptionRow
                styles={s}
                icon="videocam"
                label="Video interview"
                disabled={pickerDisabled}
                selected={scratchScreeningChannel === "video_interview"}
                onClick={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "video_interview" ? "" : "video_interview"
                  )
                }
              />
            </div>
          ) : (
            <div className={s.options}>
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchScreeningChannel === "call_interview"}
                disabled={pickerDisabled}
                label="Call interview"
                icon="call"
                onSelect={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "call_interview" ? "" : "call_interview"
                  )
                }
              />
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchScreeningChannel === "video_interview"}
                disabled={pickerDisabled}
                label="Video interview"
                icon="videocam"
                onSelect={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "video_interview" ? "" : "video_interview"
                  )
                }
              />
            </div>
          )}
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
            onClick={proceedFromScratchChannel}
            className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === "arrangeChannels") {
    const normalizedJobTitle = jobTitle.trim();
    const normalizedJobDescription = jobDescription.trim();
    const isCampaign = variant === "campaign";
    const singleChannelArrange = orderedScratchChannels.length === 1;

    const moveOrderedChannel = (index: number, direction: -1 | 1) => {
      setOrderedScratchChannels((prev) => {
        const target = index + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    };

    const submitArrangedChannels = () => {
      if (orderedScratchChannels.length === 0) return;
      const singleChannel = orderedScratchChannels.length === 1 ? orderedScratchChannels[0] : null;
      if (
        setupEntryPath === "ai" &&
        singleChannel &&
        (singleChannel === "gmail" || singleChannel === "whatsapp")
      ) {
        setAiChannel(singleChannel);
        setAiModalOpen(true);
        return;
      }
      emitChoose({
        type: "scratch",
        channel: orderedScratchChannels[0],
        channels: [...orderedScratchChannels],
        arrange: arrangeDraft,
        screeningChannel: scratchScreeningChannel,
        jobTitle: normalizedJobTitle,
        jobDescription: normalizedJobDescription,
      });
    };

    return (
      <div className={`${s.root}${s.subpanel ? ` ${s.subpanel}` : ""}`}>
        {isCampaign ? (
          <div className="dashboard-campaign-sequence-subpanel-header">
            <h3 className="dashboard-campaign-sequence-subpanel-title">
              {singleChannelArrange ? "Set up sequence" : "Set order &amp; sequences"}
            </h3>
            <p className="dashboard-campaign-sequence-subpanel-desc">
              {singleChannelArrange
                ? "Configure the outreach sequence for your selected channel before continuing."
                : "Choose which channel to try first, set up each channel's sequence, and decide how long to wait before moving to the next channel if there's no reply."}
            </p>
          </div>
        ) : (
          <p className={s.lead}>
            {singleChannelArrange
              ? "Set up your outreach sequence."
              : "Choose which channel to try first, second, and third."}
          </p>
        )}

        <OutreachChannelArrangeFlow
          channels={orderedScratchChannels}
          disabled={pickerDisabled}
          onMoveUp={(index) => moveOrderedChannel(index, -1)}
          onMoveDown={(index) => moveOrderedChannel(index, 1)}
          arrangeDraft={arrangeDraft}
          onArrangeDraftChange={setArrangeDraft}
        />

        {!singleChannelArrange ? (
          <p className="dashboard-campaign-channel-arrange-flow-footnote">
            Use ‹ › on each step to change channel order. Sequence details are saved when you
            continue.
          </p>
        ) : null}

        <div className={s.actions}>
          <button
            type="button"
            onClick={() => setStep(setupEntryPath === "ai" ? "aiChannel" : "scratchChannel")}
            className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm`}
          >
            Back
          </button>
          <button
            type="button"
            disabled={pickerDisabled || orderedScratchChannels.length === 0}
            onClick={submitArrangedChannels}
            className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
          >
            Continue
          </button>
        </div>

        <GenerateOutreachAiModal
          open={aiModalOpen}
          channel={aiChannel}
          initialJobTitle={jobTitle || initialJobTitle}
          initialJobDescription={jobDescription || initialJobDescription}
          onClose={() => setAiModalOpen(false)}
          onBack={() => {
            setAiModalOpen(false);
          }}
          onGenerated={handleAiGenerated}
        />
      </div>
    );
  }

  if (step === "aiChannel") {
    const isCampaign = variant === "campaign";
    const normalizedJobTitle = jobTitle.trim();
    const normalizedJobDescription = jobDescription.trim();
    const canContinue =
      Boolean(normalizedJobTitle) &&
      Boolean(normalizedJobDescription) &&
      aiChannels.length > 0;

    const proceedFromAiChannel = () => {
      if (aiChannels.length === 0) return;
      const singleChannel = aiChannels.length === 1 ? aiChannels[0] : null;
      if (singleChannel === "gmail" || singleChannel === "whatsapp") {
        setAiChannel(singleChannel);
        setAiModalOpen(true);
        return;
      }
      setSetupEntryPath("ai");
      setOrderedScratchChannels([...aiChannels]);
      setStep("arrangeChannels");
    };

    return (
      <div className={`${s.root}${s.subpanel ? ` ${s.subpanel}` : ""}`}>
        {isCampaign ? (
          <div className="dashboard-campaign-sequence-subpanel-header">
            <h3 className="dashboard-campaign-sequence-subpanel-title">Generate with AI</h3>
            <p className="dashboard-campaign-sequence-subpanel-desc">
              Add your role details, choose channels, and Huntlo will draft messages and steps for
              you.
            </p>
          </div>
        ) : (
          <p className={s.lead}>Choose one or more channels for AI-generated outreach.</p>
        )}

        <label className={`${dashboardLabelClass} mb-3 block`}>
          Job title <span className="text-red-600">*</span>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={pickerDisabled}
            placeholder="e.g. Senior Software Engineer"
            className={`${dashboardInputClass} mt-2 w-full`}
          />
        </label>
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

        {isCampaign ? <p className="dashboard-campaign-sequence-subheading">Channels</p> : (
          <p className={s.lead}>Choose one or more channels for your outreach sequence.</p>
        )}

        {isCampaign ? (
          <div className="dashboard-campaign-sequence-actions">
            {allowsGmail ? (
              <OptionRow
                styles={s}
                brandProvider="gmail"
                label="Gmail"
                description="Multi-step email sequence with personalized subject lines and body copy."
                disabled={pickerDisabled}
                selected={aiChannels.includes("gmail")}
                onClick={() => toggleAiChannel("gmail")}
              />
            ) : null}
            {allowsWhatsApp ? (
              <OptionRow
                styles={s}
                brandProvider="whatsapp"
                label="WhatsApp"
                description="WhatsApp message steps tailored to your role and candidate context."
                disabled={pickerDisabled}
                selected={aiChannels.includes("whatsapp")}
                onClick={() => toggleAiChannel("whatsapp")}
              />
            ) : null}
            {allowsVoiceCall ? (
              <OptionRow
                styles={s}
                icon="record_voice_over"
                iconVariant="ai"
                label="AI voice call"
                description="Outbound AI phone screening — configure role details and call questions."
                disabled={pickerDisabled}
                selected={aiChannels.includes("voice_call")}
                onClick={() => toggleAiChannel("voice_call")}
              />
            ) : null}
          </div>
        ) : (
          <div className={s.options}>
            {allowsGmail ? (
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={aiChannels.includes("gmail")}
                disabled={pickerDisabled}
                label="Gmail"
                brandProvider="gmail"
                onSelect={() => toggleAiChannel("gmail")}
              />
            ) : null}
            {allowsWhatsApp ? (
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={aiChannels.includes("whatsapp")}
                disabled={pickerDisabled}
                label="WhatsApp"
                brandProvider="whatsapp"
                onSelect={() => toggleAiChannel("whatsapp")}
              />
            ) : null}
            {allowsVoiceCall ? (
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={aiChannels.includes("voice_call")}
                disabled={pickerDisabled}
                label="AI voice call"
                icon="record_voice_over"
                iconVariant="ai"
                onSelect={() => toggleAiChannel("voice_call")}
              />
            ) : null}
          </div>
        )}

        <div className="dashboard-campaign-sequence-screening-section">
          <p className="dashboard-campaign-sequence-lead dashboard-campaign-sequence-screening-lead">
            Choose channel for screening
          </p>
          {variant === "campaign" ? (
            <div className="dashboard-campaign-sequence-actions">
              <OptionRow
                styles={s}
                icon="call"
                label="Call interview"
                disabled={pickerDisabled}
                selected={scratchScreeningChannel === "call_interview"}
                onClick={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "call_interview" ? "" : "call_interview"
                  )
                }
              />
              <OptionRow
                styles={s}
                icon="videocam"
                label="Video interview"
                disabled={pickerDisabled}
                selected={scratchScreeningChannel === "video_interview"}
                onClick={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "video_interview" ? "" : "video_interview"
                  )
                }
              />
            </div>
          ) : (
            <div className={s.options}>
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchScreeningChannel === "call_interview"}
                disabled={pickerDisabled}
                label="Call interview"
                icon="call"
                onSelect={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "call_interview" ? "" : "call_interview"
                  )
                }
              />
              <ScratchChannelOption
                variant={variant}
                styles={s}
                selected={scratchScreeningChannel === "video_interview"}
                disabled={pickerDisabled}
                label="Video interview"
                icon="videocam"
                onSelect={() =>
                  setScratchScreeningChannel((prev) =>
                    prev === "video_interview" ? "" : "video_interview"
                  )
                }
              />
            </div>
          )}
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
            onClick={proceedFromAiChannel}
            className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
          >
            Next
          </button>
        </div>

        <GenerateOutreachAiModal
          open={aiModalOpen}
          channel={aiChannel}
          initialJobTitle={jobTitle || initialJobTitle}
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
              emitChoose({
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
          initialJobTitle={jobTitle || initialJobTitle}
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
      </div>

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
                      onClick={() => emitChoose({ type: "template", templateId: tpl.id })}
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
                      onClick={() => emitChoose({ type: "template", templateId: tpl.id })}
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
                          emitChoose({ type: "clone", planId: plan.id, channel: plan.channel })
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
        initialJobTitle={jobTitle || initialJobTitle}
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
