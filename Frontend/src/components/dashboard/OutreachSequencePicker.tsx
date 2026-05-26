"use client";

import { useState } from "react";

import { OutreachSequencePickerSkeleton } from "@/components/dashboard/OutreachSequencePickerSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";
import { GenerateOutreachAiModal } from "@/components/dashboard/GenerateOutreachAiModal";
import type { OutreachTemplateListItem, OutreachTouchpointDraft } from "@/lib/outreachTemplates";

export type ExistingOutreachPlanOption = {
  id: string;
  name: string;
  touchpointCount: number;
};

export type CreateOutreachChoice =
  | { type: "scratch" }
  | { type: "template"; templateId: string }
  | { type: "clone"; planId: string }
  | { type: "ai"; touchpoints: OutreachTouchpointDraft[]; planName: string };

type Variant = "modal" | "embedded";

type Props = {
  variant?: Variant;
  existingPlans: ExistingOutreachPlanOption[];
  plansLoading?: boolean;
  templates: OutreachTemplateListItem[];
  templatesLoading?: boolean;
  /** False until the first templates/plans fetch has finished. */
  optionsReady?: boolean;
  lead?: string;
  onChoose: (choice: CreateOutreachChoice) => void;
};

function pickerStyles(variant: Variant) {
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
  };
}

function OptionRow({
  styles: s,
  icon,
  iconVariant = "default",
  label,
  disabled,
  onClick,
}: {
  styles: ReturnType<typeof pickerStyles>;
  icon: string;
  iconVariant?: "default" | "ai";
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={s.optionBtn} onClick={onClick} disabled={disabled}>
      <span className={iconVariant === "ai" ? s.iconBoxAi : s.iconBox} aria-hidden>
        <MaterialIcon name={icon} className={s.iconSize} />
      </span>
      <span className={s.label}>{label}</span>
      <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
    </button>
  );
}

export function OutreachSequencePicker({
  variant = "modal",
  existingPlans,
  plansLoading = false,
  templates,
  templatesLoading = false,
  optionsReady,
  lead = "Choose how to build your sequence",
  onChoose,
}: Props) {
  const [step, setStep] = useState<"choose" | "clone">("choose");
  const [clonePlanId, setClonePlanId] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const s = pickerStyles(variant);

  const showLead = lead !== undefined && lead !== "";

  const globalTemplates = templates.filter((t) => t.isGlobal);
  const userTemplates = templates.filter((t) => !t.isGlobal);
  const listLoading = templatesLoading || plansLoading;
  /** Explicit false = parent gates first paint (campaign editor); undefined = loading flags only. */
  const pickerLoading =
    optionsReady === undefined ? listLoading : !optionsReady || listLoading;
  const showEmptyHints = optionsReady !== false && !pickerLoading;
  const hasTemplateList =
    globalTemplates.length > 0 || userTemplates.length > 0 || existingPlans.length > 0;

  if (step === "clone") {
    return (
      <div className={`${s.root} dashboard-outreach-scroll`}>
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
              value={clonePlanId}
              onChange={(e) => setClonePlanId(e.target.value)}
              className={`${dashboardInputClass} mt-2 w-full`}
              disabled={plansLoading}
            >
              <option value="">{plansLoading ? "Loading plans…" : "Select a plan…"}</option>
              {existingPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.touchpointCount} touchpoints
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={s.actions}>
          <button
            type="button"
            onClick={() => {
              setStep("choose");
              setClonePlanId("");
            }}
            className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm`}
          >
            Back
          </button>
          <button
            type="button"
            disabled={!clonePlanId}
            onClick={() => onChoose({ type: "clone", planId: clonePlanId })}
            className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm disabled:opacity-55`}
          >
            Continue
          </button>
        </div>

        <GenerateOutreachAiModal
          open={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          onGenerated={({ touchpoints, planName }) =>
            onChoose({ type: "ai", touchpoints, planName })
          }
        />
      </div>
    );
  }

  return (
    <div className={`${s.root} dashboard-outreach-scroll`}>
      {showLead ? <p className={s.lead}>{lead}</p> : null}

      <div className={s.options}>
        <OptionRow
          styles={s}
          icon="auto_awesome"
          iconVariant="ai"
          label="Generate with AI"
          onClick={() => setAiModalOpen(true)}
        />
        <OptionRow
          styles={s}
          icon="add"
          label="Start from scratch"
          onClick={() => onChoose({ type: "scratch" })}
        />
        <OptionRow
          styles={s}
          icon="content_copy"
          label="Clone an existing outreach"
          disabled={pickerLoading || (!plansLoading && existingPlans.length === 0)}
          onClick={() => {
            if (pickerLoading || (existingPlans.length === 0 && !plansLoading)) return;
            setStep("clone");
          }}
        />
      </div>

      {showEmptyHints && existingPlans.length === 0 ? (
        <p className={s.hint}>Create and save a plan first to enable cloning.</p>
      ) : null}

      <div className={s.sectionGap}>
        {pickerLoading ? (
          <OutreachSequencePickerSkeleton rows={4} />
        ) : (
          <>
            <h3 className={s.sectionTitle}>Templates</h3>
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

            {existingPlans.length > 0 ? (
              <>
                <p className={s.subheading}>Your saved outreaches</p>
                <div className={s.templateList}>
                  {existingPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={s.templateRow}
                      onClick={() => onChoose({ type: "clone", planId: plan.id })}
                    >
                      <span
                        className={
                          variant === "embedded"
                            ? `${s.iconBox} border-[#0050cb]/20 bg-[#0050cb]/10 text-[#0050cb]`
                            : `${s.iconBox} border-[#0050cb]/20 bg-[#0050cb]/10 text-[#0050cb]`
                        }
                        aria-hidden
                      >
                        <MaterialIcon name="description" className={s.iconSize} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block ${s.templateName}`}>{plan.name}</span>
                        <span className={`block ${s.templateMeta}`}>
                          {plan.touchpointCount} touchpoint
                          {plan.touchpointCount === 1 ? "" : "s"} · Saved plan
                        </span>
                      </span>
                      <MaterialIcon name="chevron_right" className={s.chevron} aria-hidden />
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
            )}
          </>
        )}
      </div>

      <GenerateOutreachAiModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerated={({ touchpoints, planName }) =>
          onChoose({ type: "ai", touchpoints, planName })
        }
      />
    </div>
  );
}
