"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChannelCard, getChannelLabel } from "@/components/dashboard/outreach/ChannelCard";
import {
  buildJourneyPreviewItems,
  buildSequenceTimingLabel,
  createClientSequenceStepId,
  FOLLOW_UP_CONDITION_LABEL,
} from "@/components/dashboard/outreach/outreachSequenceHelpers";
import type {
  DelayUnit,
  OutreachChannel,
  SequenceStep,
} from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getSequenceDelayUnitOptions, maxWaitAmountForUnit, clampWaitAmount } from "@/lib/outreachWait";
import { dashboardBtnSecondaryClass, dashboardSelectClass } from "@/lib/dashboardStyles";

const ADD_CHANNELS: OutreachChannel[] = ["whatsapp", "email", "voice", "linkedin"];

type Props = {
  steps: SequenceStep[];
  onStepsChange: (steps: SequenceStep[]) => void;
  onEditMessage?: (stepId: string) => void;
  allowedChannels?: OutreachChannel[];
};

export function SequenceBuilder({ steps, onStepsChange, onEditMessage, allowedChannels }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const pendingScrollStepIdRef = useRef<string | null>(null);
  const addStepSectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef(new Map<string, HTMLLIElement>());
  const journeyPreview = useMemo(() => buildJourneyPreviewItems(steps, { compact: true }), [steps]);
  const addChannels = useMemo(
    () =>
      allowedChannels?.length
        ? ADD_CHANNELS.filter((ch) => allowedChannels.includes(ch))
        : ADD_CHANNELS,
    [allowedChannels]
  );
  const selectableChannels = useMemo(
    () => (allowedChannels?.length ? allowedChannels : (["whatsapp", "email", "voice"] as OutreachChannel[])),
    [allowedChannels]
  );
  const delayUnitOptions = useMemo(() => getSequenceDelayUnitOptions(), []);

  const updateStep = (id: string, patch: Partial<SequenceStep>) => {
    onStepsChange(
      steps.map((step, index) => {
        if (step.id !== id) return step;
        const next = { ...step, ...patch };
        if (patch.delayUnit != null) {
          next.delayValue = clampWaitAmount(next.delayValue, next.delayUnit);
        }
        if (
          patch.delayValue != null ||
          patch.delayUnit != null ||
          patch.channel != null
        ) {
          next.timingLabel = buildSequenceTimingLabel(next, index);
        }
        return next;
      })
    );
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    onStepsChange(steps.filter((s) => s.id !== id));
  };

  const addStep = (channel: OutreachChannel) => {
    if (channel === "linkedin") return;
    const label =
      channel === "whatsapp" && steps.some((s) => s.channel === "whatsapp")
        ? "WhatsApp Follow-up"
        : getChannelLabel(channel);
    const nextIndex = steps.length;
    const newStepId = createClientSequenceStepId();
    pendingScrollStepIdRef.current = newStepId;
    onStepsChange([
      ...steps,
      {
        id: newStepId,
        channel,
        label,
        delayValue: 1,
        delayUnit: "days" as DelayUnit,
        condition: "no_response",
        timingLabel: buildSequenceTimingLabel({ delayValue: 1, delayUnit: "days" }, nextIndex),
      },
    ]);
    setAddOpen(false);
  };

  const scrollToAddStepSection = () => {
    requestAnimationFrame(() => {
      addStepSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  };

  useEffect(() => {
    if (!addOpen) return;
    scrollToAddStepSection();
  }, [addOpen]);

  useEffect(() => {
    const stepId = pendingScrollStepIdRef.current;
    if (!stepId) return;

    const stepEl = stepRefs.current.get(stepId);
    if (!stepEl) return;

    pendingScrollStepIdRef.current = null;
    requestAnimationFrame(() => {
      stepEl.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [steps]);

  return (
    <div className="dashboard-outreach-sequence-layout">
      <div className="dashboard-outreach-sequence-main">
        <div className="dashboard-outreach-sequence-header">
          <div>
            <h3 className="dashboard-section-title">Build sequence</h3>
            <p className="dashboard-text-body">
              Configure automated follow-ups across channels.
            </p>
          </div>
          {!previewOpen ? (
            <div className="dashboard-outreach-sequence-header-actions">
              <button
                type="button"
                className={`${dashboardBtnSecondaryClass} dashboard-outreach-journey-preview-toggle`}
                onClick={() => setPreviewOpen(true)}
                aria-expanded={false}
              >
                <MaterialIcon name="route" className="text-sm" />
                View journey preview
              </button>
            </div>
          ) : null}
        </div>

        {previewOpen ? (
          <aside className="dashboard-outreach-journey-preview" aria-label="Candidate journey preview">
            <div className="dashboard-outreach-journey-preview-head">
              <h4>
                <MaterialIcon name="route" className="text-sm" aria-hidden="true" />
                Candidate journey
              </h4>
              <button
                type="button"
                className="dashboard-outreach-journey-preview-close"
                onClick={() => setPreviewOpen(false)}
                aria-expanded={true}
                aria-label="Hide journey preview"
              >
                <MaterialIcon name="close" className="text-sm" />
              </button>
            </div>

            {journeyPreview.length === 0 ? (
              <p className="dashboard-outreach-journey-preview-empty">
                Add at least one step to preview the journey.
              </p>
            ) : (
              <ol className="dashboard-outreach-journey-preview-flow">
                {journeyPreview.map((item, index) => (
                  <li key={`journey-${item.stepNumber}`} className="dashboard-outreach-journey-preview-flow-item">
                    <div
                      className={`dashboard-outreach-journey-preview-step${
                        item.isInitial ? " dashboard-outreach-journey-preview-step--initial" : ""
                      }`}
                    >
                      <span className="dashboard-outreach-journey-preview-step-index" aria-hidden="true">
                        {item.stepNumber}
                      </span>
                      <span
                        className={`dashboard-outreach-journey-preview-step-icon dashboard-outreach-journey-preview-step-icon--${item.channel}`}
                        aria-hidden="true"
                      >
                        <MaterialIcon name={item.channelIcon} />
                      </span>
                      <span className="dashboard-outreach-journey-preview-step-label">{item.channelLabel}</span>
                      <span className="dashboard-outreach-journey-preview-step-timing">{item.timing}</span>
                      {!item.isInitial ? (
                        <span className="dashboard-outreach-journey-preview-step-condition">{item.condition}</span>
                      ) : null}
                    </div>
                    {index < journeyPreview.length - 1 ? (
                      <span className="dashboard-outreach-journey-preview-connector" aria-hidden="true">
                        <MaterialIcon name="chevron_right" />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </aside>
        ) : null}

        <ol className="dashboard-outreach-sequence-timeline">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="dashboard-outreach-sequence-step"
              ref={(node) => {
                if (node) {
                  stepRefs.current.set(step.id, node);
                } else {
                  stepRefs.current.delete(step.id);
                }
              }}
            >
              <span className="dashboard-outreach-sequence-step-marker">{index + 1}</span>
              <div className="dashboard-outreach-sequence-step-card">
                <div className="dashboard-outreach-sequence-step-head">
                  <strong>{step.label}</strong>
                  <span className="dashboard-outreach-badge dashboard-outreach-badge--muted">
                    {index === 0 ? "Initial" : FOLLOW_UP_CONDITION_LABEL}
                  </span>
                </div>
                <div className="dashboard-outreach-sequence-step-controls">
                  <div className="dashboard-outreach-sequence-control">
                    <span className="dashboard-outreach-sequence-control-label">Channel</span>
                    <select
                      className={`${dashboardSelectClass} dashboard-input-sm`}
                      value={step.channel}
                      onChange={(e) =>
                        updateStep(step.id, {
                          channel: e.target.value as OutreachChannel,
                          label: getChannelLabel(e.target.value as OutreachChannel),
                        })
                      }
                    >
                      {selectableChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {getChannelLabel(channel)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="dashboard-outreach-sequence-control">
                    <span className="dashboard-outreach-sequence-control-label">Delay</span>
                    <div className="dashboard-outreach-delay-row">
                      <input
                        type="number"
                        min={0}
                        max={maxWaitAmountForUnit(step.delayUnit)}
                        className="dashboard-input dashboard-input-sm dashboard-outreach-delay-input"
                        value={step.delayValue}
                        onChange={(e) =>
                          updateStep(step.id, { delayValue: Number(e.target.value) })
                        }
                        disabled={index === 0}
                      />
                      <select
                        className={`${dashboardSelectClass} dashboard-input-sm`}
                        value={step.delayUnit}
                        onChange={(e) =>
                          updateStep(step.id, { delayUnit: e.target.value as DelayUnit })
                        }
                        disabled={index === 0}
                      >
                        {delayUnitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="dashboard-outreach-sequence-control dashboard-outreach-sequence-control--actions">
                    <span
                      className="dashboard-outreach-sequence-control-label dashboard-outreach-sequence-control-label--spacer"
                      aria-hidden="true"
                    >
                      Actions
                    </span>
                    <div className="dashboard-outreach-sequence-step-actions">
                      <button
                        type="button"
                        className="dashboard-btn-secondary dashboard-btn-secondary--sm dashboard-outreach-sequence-edit-btn"
                        onClick={() => onEditMessage?.(step.id)}
                      >
                        <MaterialIcon name="edit" className="text-sm" />
                        Edit message
                      </button>
                      <button
                        type="button"
                        className="dashboard-outreach-icon-btn dashboard-outreach-icon-btn--danger dashboard-outreach-sequence-delete-btn"
                        onClick={() => removeStep(step.id)}
                        disabled={steps.length <= 1}
                        aria-label="Remove step"
                      >
                        <MaterialIcon name="delete" className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="dashboard-outreach-add-step" ref={addStepSectionRef}>
          <button
            type="button"
            className="dashboard-btn-secondary"
            onClick={() => setAddOpen((open) => !open)}
          >
            <MaterialIcon name="add" className="text-sm" />
            Add step
          </button>
          {addOpen ? (
            <div className="dashboard-outreach-add-step-picker">
              {addChannels.map((ch) => (
                <ChannelCard
                  key={ch}
                  channel={ch}
                  onSelect={() => addStep(ch)}
                  disabled={ch === "linkedin"}
                  showBestUse={false}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
