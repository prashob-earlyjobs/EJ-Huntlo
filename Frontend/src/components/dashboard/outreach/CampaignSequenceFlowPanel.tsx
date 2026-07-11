"use client";

import { useMemo } from "react";

import { buildJourneyPreviewItems } from "@/components/dashboard/outreach/outreachSequenceHelpers";
import {
  buildSequenceFlowStepCounts,
  formatCandidateCountLabel,
} from "@/components/dashboard/outreach/sequenceFlowCounts";
import type {
  CampaignTrackingCandidate,
  SequenceFlowStepCounts,
  SequenceStep,
} from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  steps: SequenceStep[];
  whatsappReplyQuestions?: string[];
  title?: string;
  lead?: string;
  /** `preview` before launch; `live` on tracking after launch */
  variant?: "preview" | "live";
  onHide?: () => void;
  /** Live tracking candidates — used to compute per-step counts when variant is `live` */
  candidates?: CampaignTrackingCandidate[];
  stepCounts?: SequenceFlowStepCounts[];
};

function replyBranchDetail(
  channel: SequenceStep["channel"],
  replyQuestionCount: number,
  variant: "preview" | "live",
  counts: SequenceFlowStepCounts | undefined
) {
  if (variant === "live" && counts) {
    if (counts.replied > 0) {
      if (channel === "whatsapp" && replyQuestionCount > 0) {
        return `AI qualification (${replyQuestionCount} question${replyQuestionCount === 1 ? "" : "s"})`;
      }
      return "Replied on this step";
    }
    return "No candidates on this branch yet";
  }

  if (channel === "whatsapp" && replyQuestionCount > 0) {
    return `AI qualification (${replyQuestionCount} question${replyQuestionCount === 1 ? "" : "s"})`;
  }
  if (variant === "live") {
    return "Tracked as replied — outreach continues on this channel";
  }
  return "Conversation continues on this channel";
}

function noReplyBranchDetail(
  isLast: boolean,
  nextItem: ReturnType<typeof buildJourneyPreviewItems>[number] | undefined,
  stepNumber: number,
  counts: SequenceFlowStepCounts | undefined,
  variant: "preview" | "live"
) {
  if (variant === "live" && counts) {
    const parts: string[] = [];
    if (counts.noReply > 0) {
      parts.push(`${formatCandidateCountLabel(counts.noReply)} continued to next step`);
    }
    if (counts.awaiting > 0) {
      parts.push(`${formatCandidateCountLabel(counts.awaiting)} still waiting`);
    }
    if (parts.length > 0) return parts.join(" · ");
    if (isLast && counts.contacted > 0) {
      return `${formatCandidateCountLabel(counts.awaiting || counts.contacted)} with no response`;
    }
    return "No candidates on this branch yet";
  }

  if (isLast) {
    return "Sequence ends — candidate stays in no response";
  }
  return `${nextItem?.timing || "After delay"} → Step ${stepNumber + 1} (${nextItem?.channelLabel || "next channel"})`;
}

export function CampaignSequenceFlowPanel({
  steps,
  whatsappReplyQuestions = [],
  title = "Campaign flow",
  lead = "How candidates move when they reply or stay silent between steps.",
  variant = "preview",
  onHide,
  candidates = [],
  stepCounts: stepCountsProp,
}: Props) {
  const journeyItems = useMemo(() => buildJourneyPreviewItems(steps), [steps]);
  const replyQuestionCount = whatsappReplyQuestions.map((q) => q.trim()).filter(Boolean).length;
  const stepCounts = useMemo(() => {
    if (stepCountsProp) return stepCountsProp;
    if (variant !== "live" || candidates.length === 0) return [];
    return buildSequenceFlowStepCounts(steps, candidates);
  }, [stepCountsProp, variant, candidates, steps]);

  if (journeyItems.length === 0) return null;

  return (
    <section
      className={`dashboard-outreach-sequence-flow${
        variant === "live" ? " dashboard-outreach-sequence-flow--live" : ""
      }`}
      aria-label={title}
    >
      <div className="dashboard-outreach-sequence-flow-head">
        <div className="dashboard-outreach-sequence-flow-head-copy">
          <h4 className="dashboard-outreach-review-section-title">{title}</h4>
          <p className="dashboard-outreach-review-section-lead">{lead}</p>
          {variant === "live" ? (
            <p className="dashboard-outreach-sequence-flow-legend">
              <MaterialIcon name="groups" className="text-sm" aria-hidden />
              Numbers show how many candidates reached each step or branch. Use Refresh to update.
            </p>
          ) : null}
        </div>
        {onHide ? (
          <button
            type="button"
            className={`${dashboardBtnSecondaryClass} dashboard-outreach-sequence-flow-hide-btn`}
            onClick={onHide}
            aria-label="Hide sequence flow"
          >
            <MaterialIcon name="expand_less" className="text-sm" />
            Hide
          </button>
        ) : null}
      </div>

      <ol className="dashboard-outreach-sequence-flow-list">
        {journeyItems.map((item, index) => {
          const isLast = index === journeyItems.length - 1;
          const step = steps[index];
          const stepLabel = step?.label?.trim() || item.channelLabel;
          const nextItem = journeyItems[index + 1];
          const counts = variant === "live" ? stepCounts[index] : undefined;

          return (
            <li key={`sequence-flow-${item.stepNumber}`} className="dashboard-outreach-sequence-flow-item">
              <div
                className={`dashboard-outreach-sequence-flow-step${
                  item.isInitial ? " dashboard-outreach-sequence-flow-step--initial" : ""
                }`}
              >
                <span className="dashboard-outreach-sequence-flow-step-index">{item.stepNumber}</span>
                <span
                  className={`dashboard-outreach-sequence-flow-step-icon dashboard-outreach-sequence-flow-step-icon--${item.channel}`}
                >
                  <MaterialIcon name={item.channelIcon} className="text-sm" />
                </span>
                <div className="dashboard-outreach-sequence-flow-step-body">
                  <span className="dashboard-outreach-sequence-flow-step-label">{stepLabel}</span>
                  <span className="dashboard-outreach-sequence-flow-step-meta">
                    {item.channelLabel}
                    <span aria-hidden> · </span>
                    {item.timing}
                  </span>
                </div>
                {variant === "live" && counts ? (
                  <span className="dashboard-outreach-sequence-flow-step-count">
                    <MaterialIcon name="groups" className="text-sm" aria-hidden />
                    {formatCandidateCountLabel(counts.contacted)}
                  </span>
                ) : null}
              </div>

              <div
                className={`dashboard-outreach-sequence-flow-branches${
                  isLast ? " dashboard-outreach-sequence-flow-branches--terminal" : ""
                }`}
              >
                <div className="dashboard-outreach-sequence-flow-branch dashboard-outreach-sequence-flow-branch--positive">
                  <MaterialIcon name={item.channel === "whatsapp" ? "forum" : "reply"} className="text-sm" />
                  <div>
                    <span className="dashboard-outreach-sequence-flow-branch-label">Candidate replies</span>
                    {variant === "live" && counts ? (
                      <span className="dashboard-outreach-sequence-flow-branch-candidate-count dashboard-outreach-sequence-flow-branch-candidate-count--positive">
                        <MaterialIcon name="person" className="text-sm" aria-hidden />
                        {formatCandidateCountLabel(counts.replied)}
                      </span>
                    ) : null}
                    <span className="dashboard-outreach-sequence-flow-branch-detail">
                      {replyBranchDetail(item.channel, replyQuestionCount, variant, counts)}
                    </span>
                  </div>
                </div>
                <div className="dashboard-outreach-sequence-flow-branch dashboard-outreach-sequence-flow-branch--muted">
                  <MaterialIcon name={isLast ? "block" : "hourglass_empty"} className="text-sm" />
                  <div>
                    <span className="dashboard-outreach-sequence-flow-branch-label">No reply</span>
                    {variant === "live" && counts ? (
                      <span className="dashboard-outreach-sequence-flow-branch-candidate-count dashboard-outreach-sequence-flow-branch-candidate-count--muted">
                        <MaterialIcon name="person" className="text-sm" aria-hidden />
                        {formatCandidateCountLabel(counts.noReply + counts.awaiting)}
                      </span>
                    ) : null}
                    <span className="dashboard-outreach-sequence-flow-branch-detail">
                      {noReplyBranchDetail(isLast, nextItem, item.stepNumber, counts, variant)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
