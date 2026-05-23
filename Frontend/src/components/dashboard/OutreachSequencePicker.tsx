"use client";

import { useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { OutreachTemplateListItem } from "@/lib/outreachTemplates";

export type ExistingOutreachPlanOption = {
  id: string;
  name: string;
  touchpointCount: number;
};

export type CreateOutreachChoice =
  | { type: "scratch" }
  | { type: "template"; templateId: string }
  | { type: "clone"; planId: string }
  | { type: "ai" };

type Props = {
  existingPlans: ExistingOutreachPlanOption[];
  plansLoading?: boolean;
  templates: OutreachTemplateListItem[];
  templatesLoading?: boolean;
  lead?: string;
  onChoose: (choice: CreateOutreachChoice) => void;
};

function OptionRow({
  icon,
  iconVariant = "default",
  label,
  disabled,
  onClick,
}: {
  icon: string;
  iconVariant?: "default" | "ai";
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="dashboard-create-outreach-option"
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={`dashboard-create-outreach-option-icon${
          iconVariant === "ai" ? " dashboard-create-outreach-option-icon--ai" : ""
        }`}
        aria-hidden
      >
        <MaterialIcon name={icon} className="text-[24px]" />
      </span>
      <span className="dashboard-create-outreach-option-label">{label}</span>
      <MaterialIcon
        name="chevron_right"
        className="dashboard-create-outreach-option-chevron"
        aria-hidden
      />
    </button>
  );
}

export function OutreachSequencePicker({
  existingPlans,
  plansLoading = false,
  templates,
  templatesLoading = false,
  lead = "Choose how to build your sequence",
  onChoose,
}: Props) {
  const [step, setStep] = useState<"choose" | "clone">("choose");
  const [clonePlanId, setClonePlanId] = useState("");

  const globalTemplates = templates.filter((t) => t.isGlobal);
  const userTemplates = templates.filter((t) => !t.isGlobal);
  const listLoading = templatesLoading || plansLoading;
  const hasTemplateList =
    globalTemplates.length > 0 || userTemplates.length > 0 || existingPlans.length > 0;

  if (step === "clone") {
    return (
      <div className="dashboard-campaign-sequence-picker dashboard-outreach-scroll">
        <p className="dashboard-create-outreach-lead">
          Pick a plan to duplicate as your starting point.
        </p>
        <label className="dashboard-label block">
          Outreach plan
          <select
            value={clonePlanId}
            onChange={(e) => setClonePlanId(e.target.value)}
            className="dashboard-input mt-2 w-full"
            disabled={plansLoading}
          >
            <option value="">
              {plansLoading ? "Loading plans…" : "Select a plan…"}
            </option>
            {existingPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.touchpointCount} touchpoints
              </option>
            ))}
          </select>
        </label>
        <div className="dashboard-create-outreach-clone-actions">
          <button
            type="button"
            onClick={() => {
              setStep("choose");
              setClonePlanId("");
            }}
            className="dashboard-btn-secondary px-4 py-2.5 text-sm"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!clonePlanId}
            onClick={() => onChoose({ type: "clone", planId: clonePlanId })}
            className="dashboard-btn-primary px-5 py-2.5 text-sm disabled:opacity-55"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-campaign-sequence-picker dashboard-outreach-scroll">
      <p className="dashboard-create-outreach-lead">{lead}</p>

      <div className="dashboard-create-outreach-options">
        <OptionRow
          icon="auto_awesome"
          iconVariant="ai"
          label="Generate with AI"
          onClick={() => onChoose({ type: "ai" })}
        />
        <OptionRow
          icon="add"
          label="Start from scratch"
          onClick={() => onChoose({ type: "scratch" })}
        />
        <OptionRow
          icon="content_copy"
          label="Clone an existing outreach"
          disabled={!plansLoading && existingPlans.length === 0}
          onClick={() => {
            if (existingPlans.length === 0 && !plansLoading) return;
            setStep("clone");
          }}
        />
      </div>

      {!plansLoading && existingPlans.length === 0 ? (
        <p className="dashboard-create-outreach-hint">
          Create and save a plan first to enable cloning.
        </p>
      ) : null}

      <div className="dashboard-create-outreach-templates-block">
        <h3 className="dashboard-create-outreach-templates-heading">Templates</h3>
        {listLoading ? (
          <p className="dashboard-create-outreach-hint">Loading templates…</p>
        ) : !hasTemplateList ? (
          <p className="dashboard-create-outreach-hint">
            No templates yet. Save an outreach plan to reuse it here.
          </p>
        ) : (
          <div className="dashboard-create-outreach-templates">
            {globalTemplates.length > 0 ? (
              <>
                <p className="dashboard-create-outreach-templates-subheading">Starter</p>
                {globalTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="dashboard-create-outreach-template-row"
                    onClick={() => onChoose({ type: "template", templateId: tpl.id })}
                  >
                    <span className="dashboard-create-outreach-template-icon" aria-hidden>
                      <MaterialIcon name="mail" className="text-[22px] text-[#5f6368]" />
                    </span>
                    <span className="dashboard-create-outreach-template-text">
                      <span className="dashboard-create-outreach-template-name">{tpl.name}</span>
                      <span className="dashboard-create-outreach-template-meta">
                        {tpl.description}
                      </span>
                    </span>
                    <MaterialIcon
                      name="chevron_right"
                      className="dashboard-create-outreach-option-chevron"
                      aria-hidden
                    />
                  </button>
                ))}
              </>
            ) : null}

            {userTemplates.length > 0 ? (
              <>
                <p className="dashboard-create-outreach-templates-subheading">Your templates</p>
                {userTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="dashboard-create-outreach-template-row"
                    onClick={() => onChoose({ type: "template", templateId: tpl.id })}
                  >
                    <span className="dashboard-create-outreach-template-icon" aria-hidden>
                      <MaterialIcon name="mail" className="text-[22px] text-[#5f6368]" />
                    </span>
                    <span className="dashboard-create-outreach-template-text">
                      <span className="dashboard-create-outreach-template-name">{tpl.name}</span>
                      <span className="dashboard-create-outreach-template-meta">
                        {tpl.description}
                        {tpl.createdByName ? ` · ${tpl.createdByName}` : null}
                      </span>
                    </span>
                    <MaterialIcon
                      name="chevron_right"
                      className="dashboard-create-outreach-option-chevron"
                      aria-hidden
                    />
                  </button>
                ))}
              </>
            ) : null}

            {existingPlans.length > 0 ? (
              <>
                <p className="dashboard-create-outreach-templates-subheading">
                  Your saved outreaches
                </p>
                {existingPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className="dashboard-create-outreach-template-row dashboard-create-outreach-template-row--plan"
                    onClick={() => onChoose({ type: "clone", planId: plan.id })}
                  >
                    <span
                      className="dashboard-create-outreach-template-icon dashboard-create-outreach-template-icon--plan"
                      aria-hidden
                    >
                      <MaterialIcon name="description" className="text-[22px] text-[#5f6368]" />
                    </span>
                    <span className="dashboard-create-outreach-template-text">
                      <span className="dashboard-create-outreach-template-name">{plan.name}</span>
                      <span className="dashboard-create-outreach-template-meta">
                        {plan.touchpointCount} touchpoint
                        {plan.touchpointCount === 1 ? "" : "s"} · Saved plan
                      </span>
                    </span>
                    <MaterialIcon
                      name="chevron_right"
                      className="dashboard-create-outreach-option-chevron"
                      aria-hidden
                    />
                  </button>
                ))}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
