"use client";

import { useMemo, useState } from "react";
import { CampaignEmailSenderSelect } from "@/components/dashboard/CampaignEmailSenderSelect";
import { CampaignSequenceFlowPanel } from "@/components/dashboard/outreach/CampaignSequenceFlowPanel";
import { getChannelLabel } from "@/components/dashboard/outreach/ChannelCard";
import type { OutreachCampaignMode, OutreachChannel, SequenceStep } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignEmailSenderOption } from "@/lib/emailIntegrations";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";
import { AfterQualificationSetup } from "@/components/dashboard/outreach/AfterQualificationSetup";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import type { PostQualificationConfig } from "@/lib/postQualification";

export type ReviewFlowItem = {
  icon: string;
  title: string;
  subtitle?: string;
  detail?: string;
};

export type ReviewChecklistItem = {
  label: string;
  done: boolean;
};

type Props = {
  campaignName: string;
  jobTitle?: string;
  candidateCount: number;
  candidateSourceLabel?: string;
  mode: OutreachCampaignMode;
  channel?: OutreachChannel;
  channels?: string[];
  touchpointSummary?: string;
  flowItems?: ReviewFlowItem[];
  steps?: SequenceStep[];
  whatsappReplyQuestions?: string[];
  estimatedDuration?: string;
  checklist?: ReviewChecklistItem[];
  needsEmailSender?: boolean;
  emailSenders?: CampaignEmailSenderOption[];
  selectedEmailIntegrationId?: string;
  onEmailIntegrationChange?: (integrationId: string) => void;
  emailSendersLoading?: boolean;
  submitting?: boolean;
  submitMode?: "save" | "launch" | null;
  error?: string;
  onBack?: () => void;
  onSaveDraft: () => void | Promise<void>;
  onLaunch: () => void | Promise<void>;
  postQualification?: PostQualificationConfig;
  onPostQualificationChange?: (value: PostQualificationConfig) => void;
  calendlyAutomation?: CampaignCalendlyAutomation;
  onCalendlyAutomationChange?: (value: CampaignCalendlyAutomation) => void;
};

const CHANNEL_ICONS: Record<OutreachChannel, string> = {
  whatsapp: "chat",
  email: "mail",
  voice: "record_voice_over",
  linkedin: "work",
};

function shortSourceLabel(label?: string): string | null {
  if (!label?.trim()) return null;
  return label.replace(/^Huntlo\s+/i, "").trim() || label.trim();
}

function compactTouchpointSummary(summary?: string): string | null {
  if (!summary?.trim()) return null;
  const text = summary.trim();
  const whatsapp = text.match(
    /(\d+)\s+automated steps\s+\+\s+(\d+)\s+qualification question/i
  );
  if (whatsapp) {
    return `${whatsapp[1]} steps · ${whatsapp[2]} questions`;
  }
  if (/automated emails/i.test(text)) return "4 emails";
  if (/voice call/i.test(text)) return "Voice outreach";
  return text.length > 24 ? `${text.slice(0, 24)}…` : text;
}

export function CampaignReviewSummary({
  campaignName,
  jobTitle,
  candidateCount,
  candidateSourceLabel,
  mode,
  channel,
  channels = [],
  touchpointSummary,
  flowItems = [],
  steps = [],
  whatsappReplyQuestions = [],
  estimatedDuration,
  checklist = [],
  needsEmailSender = false,
  emailSenders = [],
  selectedEmailIntegrationId = "",
  onEmailIntegrationChange,
  emailSendersLoading = false,
  submitting = false,
  submitMode = null,
  error = "",
  onBack,
  onSaveDraft,
  onLaunch,
  postQualification,
  onPostQualificationChange,
  calendlyAutomation,
  onCalendlyAutomationChange,
}: Props) {
  const allChecksDone = checklist.length === 0 || checklist.every((item) => item.done);
  const senderReady =
    !needsEmailSender ||
    emailSenders.length <= 1 ||
    Boolean(selectedEmailIntegrationId.trim());
  const showSenderPicker = needsEmailSender && emailSenders.length > 1;
  const canLaunch = candidateCount > 0 && allChecksDone && senderReady && !submitting;
  const checklistDoneCount = checklist.filter((item) => item.done).length;
  const uniqueChannels = useMemo(() => [...new Set(channels.filter(Boolean))], [channels]);
  const sourceShort = shortSourceLabel(candidateSourceLabel);
  const touchpointShort = compactTouchpointSummary(touchpointSummary);
  const candidateLabel = `${candidateCount} ${candidateCount === 1 ? "candidate" : "candidates"}`;
  const [showOutreachSequence, setShowOutreachSequence] = useState(false);

  return (
    <div className="dashboard-outreach-review">
      <div className="dashboard-outreach-review-body">
        <header className="dashboard-outreach-review-header">
          <div className="dashboard-outreach-review-header-copy">
            <p className="dashboard-outreach-review-eyebrow">Review &amp; launch</p>
            <h3 className="dashboard-outreach-review-heading">
              {campaignName.trim() || "Untitled campaign"}
            </h3>
            {jobTitle ? <p className="dashboard-outreach-review-subheading">{jobTitle}</p> : null}
          </div>
          <span
            className={`dashboard-outreach-review-readiness${
              allChecksDone
                ? " dashboard-outreach-review-readiness--ready"
                : " dashboard-outreach-review-readiness--pending"
            }`}
          >
            <MaterialIcon
              name={allChecksDone ? "verified" : "pending"}
              className="text-sm"
            />
            {allChecksDone ? "Ready to launch" : "Complete checklist"}
          </span>
        </header>

        <div className="dashboard-outreach-review-stats-bar">
          <div className="dashboard-outreach-review-stats" aria-label="Campaign summary">
            <span className="dashboard-outreach-review-stat">
              <MaterialIcon name="groups" className="dashboard-outreach-review-stat-icon" />
              {candidateLabel}
              {sourceShort ? (
                <>
                  <span className="dashboard-outreach-review-stat-sep" aria-hidden>
                    ·
                  </span>
                  <span className="dashboard-outreach-review-stat-muted">{sourceShort}</span>
                </>
              ) : null}
            </span>

            {mode === "single" && channel ? (
              <span className="dashboard-outreach-review-stat">
                <MaterialIcon
                  name={CHANNEL_ICONS[channel]}
                  className="dashboard-outreach-review-stat-icon"
                />
                {getChannelLabel(channel)}
                {touchpointShort ? (
                  <>
                    <span className="dashboard-outreach-review-stat-sep" aria-hidden>
                      ·
                    </span>
                    <span className="dashboard-outreach-review-stat-muted">{touchpointShort}</span>
                  </>
                ) : null}
              </span>
            ) : null}

            {mode === "multi" ? (
              <>
                <span className="dashboard-outreach-review-stat">
                  <MaterialIcon name="route" className="dashboard-outreach-review-stat-icon" />
                  {steps.length} step{steps.length === 1 ? "" : "s"}
                  {estimatedDuration ? (
                    <>
                      <span className="dashboard-outreach-review-stat-sep" aria-hidden>
                        ·
                      </span>
                      <span className="dashboard-outreach-review-stat-muted">{estimatedDuration}</span>
                    </>
                  ) : null}
                </span>
                {uniqueChannels.length > 0 ? (
                  <span className="dashboard-outreach-review-stat">
                    <MaterialIcon name="hub" className="dashboard-outreach-review-stat-icon" />
                    {uniqueChannels.join(", ")}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>

          {flowItems.length > 0 ? (
            <button
              type="button"
              className="dashboard-outreach-review-sequence-toggle"
              onClick={() => setShowOutreachSequence((open) => !open)}
              aria-expanded={showOutreachSequence}
            >
              <MaterialIcon
                name={showOutreachSequence ? "expand_less" : "expand_more"}
                className="dashboard-outreach-review-sequence-toggle-icon"
              />
              <span>
                {showOutreachSequence ? "Hide sequence" : "View sequence"}
              </span>
              <span className="dashboard-outreach-review-sequence-toggle-count">
                {flowItems.length}
              </span>
            </button>
          ) : null}
        </div>

        {showOutreachSequence && flowItems.length > 0 ? (
          <section className="dashboard-outreach-review-panel dashboard-outreach-review-panel--flow">
            <ol className="dashboard-outreach-review-flow-list">
              {flowItems.map((item, index) => (
                <li key={`${item.title}-${index}`} className="dashboard-outreach-review-flow-item">
                  <span className="dashboard-outreach-review-flow-step" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="dashboard-outreach-review-flow-marker" aria-hidden>
                    <MaterialIcon name={item.icon} className="text-sm" />
                  </span>
                  <div className="dashboard-outreach-review-flow-body">
                    <p className="dashboard-outreach-review-flow-title">{item.title}</p>
                    {item.subtitle ? (
                      <p className="dashboard-outreach-review-flow-subtitle">{item.subtitle}</p>
                    ) : null}
                    {item.detail ? (
                      <pre className="dashboard-outreach-review-flow-detail">{item.detail}</pre>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {mode === "multi" && steps.length > 0 ? (
          <CampaignSequenceFlowPanel
            steps={steps}
            whatsappReplyQuestions={whatsappReplyQuestions}
            title="Sequence flow"
            lead="How candidates move when they reply or stay silent between channels."
            variant="preview"
          />
        ) : null}

        {postQualification && onPostQualificationChange && calendlyAutomation && onCalendlyAutomationChange ? (
          <AfterQualificationSetup
            value={postQualification}
            onChange={onPostQualificationChange}
            calendlyAutomation={calendlyAutomation}
            onCalendlyAutomationChange={onCalendlyAutomationChange}
            disabled={submitting}
          />
        ) : null}

        <div className="dashboard-outreach-review-layout dashboard-outreach-review-layout--single">
          <aside className="dashboard-outreach-review-aside">
            {checklist.length > 0 ? (
              <section className="dashboard-outreach-review-panel dashboard-outreach-review-checklist">
                <div className="dashboard-outreach-review-panel-head dashboard-outreach-review-panel-head--row">
                  <div>
                    <h4 className="dashboard-outreach-review-section-title">Launch checklist</h4>
                    <p className="dashboard-outreach-review-section-lead">
                      {checklistDoneCount} of {checklist.length} complete
                    </p>
                  </div>
                  <span className="dashboard-outreach-review-checklist-ring" aria-hidden>
                    {checklistDoneCount}/{checklist.length}
                  </span>
                </div>
                <ul>
                  {checklist.map((item) => (
                    <li
                      key={item.label}
                      className={`dashboard-outreach-review-checklist-item${
                        item.done ? " dashboard-outreach-review-checklist-item--done" : ""
                      }`}
                    >
                      <MaterialIcon
                        name={item.done ? "check_circle" : "radio_button_unchecked"}
                        className="text-sm"
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showSenderPicker ? (
              <section className="dashboard-outreach-review-panel dashboard-outreach-review-sender">
                <div className="dashboard-outreach-review-panel-head">
                  <h4 className="dashboard-outreach-review-section-title">Sender account</h4>
                  <p className="dashboard-outreach-review-section-lead">
                    Choose which connected inbox sends this campaign&apos;s emails.
                  </p>
                </div>
                {emailSendersLoading ? (
                  <p className="dashboard-outreach-review-section-lead">Loading connected accounts…</p>
                ) : onEmailIntegrationChange ? (
                  <CampaignEmailSenderSelect
                    value={selectedEmailIntegrationId}
                    options={emailSenders}
                    onChange={onEmailIntegrationChange}
                    disabled={submitting}
                    className="dashboard-campaign-sender-field--rail"
                  />
                ) : null}
              </section>
            ) : null}

            {error ? (
              <p className="dashboard-outreach-review-error" role="alert">
                <MaterialIcon name="error_outline" className="text-sm" />
                {error}
              </p>
            ) : null}

            <p className="dashboard-outreach-review-note">
              <MaterialIcon name="info" className="text-sm" />
              Launch activates this campaign for the selected candidates. You can pause it anytime
              from the campaign dashboard.
            </p>
          </aside>
        </div>
      </div>

      <footer className="dashboard-outreach-review-actions dashboard-outreach-builder-footer">
        {onBack ? (
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={onBack}
            disabled={submitting}
          >
            Back
          </button>
        ) : null}
        <div className="dashboard-outreach-review-actions-primary">
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={() => void onSaveDraft()}
            disabled={submitting}
          >
            {submitting && submitMode === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            onClick={() => void onLaunch()}
            disabled={!canLaunch}
          >
            <MaterialIcon name="rocket_launch" className="text-sm" />
            {submitting && submitMode === "launch" ? "Launching…" : "Launch campaign"}
          </button>
        </div>
      </footer>
    </div>
  );
}
