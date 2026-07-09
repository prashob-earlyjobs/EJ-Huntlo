"use client";

import { useMemo } from "react";

import { CampaignEmailSenderSelect } from "@/components/dashboard/CampaignEmailSenderSelect";
import { getChannelLabel } from "@/components/dashboard/outreach/ChannelCard";
import { buildJourneyPreviewItems } from "@/components/dashboard/outreach/outreachSequenceHelpers";
import type { OutreachCampaignMode, OutreachChannel, SequenceStep } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignEmailSenderOption } from "@/lib/emailIntegrations";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

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
};

const CHANNEL_ICONS: Record<OutreachChannel, string> = {
  whatsapp: "chat",
  email: "mail",
  voice: "record_voice_over",
  linkedin: "work",
};

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
}: Props) {
  const allChecksDone = checklist.length === 0 || checklist.every((item) => item.done);
  const senderReady =
    !needsEmailSender ||
    emailSenders.length <= 1 ||
    Boolean(selectedEmailIntegrationId.trim());
  const showSenderPicker = needsEmailSender && emailSenders.length > 1;
  const canLaunch = candidateCount > 0 && allChecksDone && senderReady && !submitting;
  const checklistDoneCount = checklist.filter((item) => item.done).length;
  const journeyPreview = useMemo(() => buildJourneyPreviewItems(steps), [steps]);
  const uniqueChannels = useMemo(() => [...new Set(channels.filter(Boolean))], [channels]);

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

        <div className="dashboard-outreach-review-metrics">
          <div className="dashboard-outreach-review-metric">
            <span className="dashboard-outreach-review-metric-icon" aria-hidden>
              <MaterialIcon name="groups" />
            </span>
            <div>
              <span className="dashboard-outreach-review-metric-label">Candidates</span>
              <span className="dashboard-outreach-review-metric-value">{candidateCount}</span>
              {candidateSourceLabel ? (
                <span className="dashboard-outreach-review-metric-meta">{candidateSourceLabel}</span>
              ) : null}
            </div>
          </div>

          <div className="dashboard-outreach-review-metric">
            <span className="dashboard-outreach-review-metric-icon" aria-hidden>
              <MaterialIcon name={mode === "single" ? "send" : "account_tree"} />
            </span>
            <div>
              <span className="dashboard-outreach-review-metric-label">Mode</span>
              <span className="dashboard-outreach-review-metric-value">
                {mode === "single" ? "Single channel" : "Multi channel"}
              </span>
            </div>
          </div>

          {mode === "single" && channel ? (
            <div className="dashboard-outreach-review-metric">
              <span className="dashboard-outreach-review-metric-icon" aria-hidden>
                <MaterialIcon name={CHANNEL_ICONS[channel]} />
              </span>
              <div>
                <span className="dashboard-outreach-review-metric-label">Channel</span>
                <span className="dashboard-outreach-review-metric-value">
                  {getChannelLabel(channel)}
                </span>
                {touchpointSummary ? (
                  <span className="dashboard-outreach-review-metric-meta">{touchpointSummary}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {mode === "multi" ? (
            <>
              <div className="dashboard-outreach-review-metric">
                <span className="dashboard-outreach-review-metric-icon" aria-hidden>
                  <MaterialIcon name="route" />
                </span>
                <div>
                  <span className="dashboard-outreach-review-metric-label">Sequence</span>
                  <span className="dashboard-outreach-review-metric-value">
                    {steps.length} step{steps.length === 1 ? "" : "s"}
                  </span>
                  {estimatedDuration ? (
                    <span className="dashboard-outreach-review-metric-meta">{estimatedDuration}</span>
                  ) : null}
                </div>
              </div>
              {uniqueChannels.length > 0 ? (
                <div className="dashboard-outreach-review-metric dashboard-outreach-review-metric--channels">
                  <span className="dashboard-outreach-review-metric-icon" aria-hidden>
                    <MaterialIcon name="hub" />
                  </span>
                  <div>
                    <span className="dashboard-outreach-review-metric-label">Channels used</span>
                    <div className="dashboard-outreach-review-channel-pills">
                      {uniqueChannels.map((label) => (
                        <span key={label} className="dashboard-outreach-review-channel-pill">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {journeyPreview.length > 0 ? (
          <section className="dashboard-outreach-review-panel dashboard-outreach-review-panel--sequence">
            <div className="dashboard-outreach-review-panel-head">
              <h4 className="dashboard-outreach-review-section-title">Sequence preview</h4>
              <p className="dashboard-outreach-review-section-lead">
                How candidates will move through your outreach steps.
              </p>
            </div>
            <ol className="dashboard-outreach-review-journey">
              {journeyPreview.map((item, index) => (
                <li key={`review-journey-${item.stepNumber}`} className="dashboard-outreach-review-journey-item">
                  <div
                    className={`dashboard-outreach-review-journey-step${
                      item.isInitial ? " dashboard-outreach-review-journey-step--initial" : ""
                    }`}
                  >
                    <span className="dashboard-outreach-review-journey-index">{item.stepNumber}</span>
                    <span
                      className={`dashboard-outreach-review-journey-icon dashboard-outreach-review-journey-icon--${item.channel}`}
                    >
                      <MaterialIcon name={item.channelIcon} className="text-sm" />
                    </span>
                    <span className="dashboard-outreach-review-journey-label">{item.channelLabel}</span>
                    <span className="dashboard-outreach-review-journey-timing">{item.timing}</span>
                  </div>
                  {index < journeyPreview.length - 1 ? (
                    <span className="dashboard-outreach-review-journey-connector" aria-hidden>
                      <MaterialIcon name="chevron_right" />
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="dashboard-outreach-review-layout">
          <div className="dashboard-outreach-review-primary">
            {flowItems.length > 0 ? (
              <section className="dashboard-outreach-review-panel">
                <div className="dashboard-outreach-review-panel-head">
                  <h4 className="dashboard-outreach-review-section-title">Message flow</h4>
                </div>
                <ol className="dashboard-outreach-review-flow-list">
                  {flowItems.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="dashboard-outreach-review-flow-item">
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
          </div>

          <aside className="dashboard-outreach-review-aside">
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
