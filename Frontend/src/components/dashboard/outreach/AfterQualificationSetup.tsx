"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ConfirmModal } from "@/components/dashboard/ConfirmModal";
import { OutreachEmailReplySetup } from "@/components/dashboard/outreach/OutreachEmailReplySetup";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import {
  postQualificationFlowSummary,
  type PostQualificationCallLanguage,
  type PostQualificationConfig,
  type PostQualificationVoice,
} from "@/lib/postQualification";
import type { VoiceTone } from "@/components/dashboard/outreach/types";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

type Props = {
  value: PostQualificationConfig;
  onChange: (value: PostQualificationConfig) => void;
  calendlyAutomation: CampaignCalendlyAutomation;
  onCalendlyAutomationChange: (value: CampaignCalendlyAutomation) => void;
  disabled?: boolean;
};

const GAP_OPTIONS: { label: string; hours: number }[] = [
  { label: "2 hours", hours: 2 },
  { label: "4 hours", hours: 4 },
  { label: "1 day", hours: 24 },
];

function snapGapHours(hours: number): number {
  return GAP_OPTIONS.some((o) => o.hours === hours) ? hours : 24;
}

type ScreeningFlowModalProps = {
  open: boolean;
  initialVoice: PostQualificationVoice;
  confirmLabel: string;
  onConfirm: (voice: PostQualificationVoice) => void;
  onCancel: () => void;
};

function ScreeningFlowModal({
  open,
  initialVoice,
  confirmLabel,
  onConfirm,
  onCancel,
}: ScreeningFlowModalProps) {
  const [mounted, setMounted] = useState(false);
  const [callObjective, setCallObjective] = useState(initialVoice.callObjective);
  const [body, setBody] = useState(initialVoice.body);
  const [language, setLanguage] = useState<PostQualificationCallLanguage>(initialVoice.language);
  const [voiceTone, setVoiceTone] = useState<VoiceTone>(initialVoice.voiceTone);
  const [callAttempts, setCallAttempts] = useState(initialVoice.callAttempts);
  const [attemptGapHours, setAttemptGapHours] = useState(snapGapHours(initialVoice.attemptGapHours));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setCallObjective(initialVoice.callObjective);
      setBody(initialVoice.body);
      setLanguage(initialVoice.language);
      setVoiceTone(initialVoice.voiceTone);
      setCallAttempts(initialVoice.callAttempts);
      setAttemptGapHours(snapGapHours(initialVoice.attemptGapHours));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  const canConfirm = Boolean(body.trim());

  return createPortal(
    <div
      className="dashboard-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="screening-flow-modal-title"
    >
      <div
        className="dashboard-modal dashboard-outreach-screening-flow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dashboard-outreach-screening-flow-modal-head">
          <span className="dashboard-outreach-post-qual-card-icon" aria-hidden>
            <MaterialIcon name="record_voice_over" />
          </span>
          <div>
            <h3 id="screening-flow-modal-title" className="dashboard-outreach-screening-flow-modal-title">
              Screening flow
            </h3>
            <p className="dashboard-outreach-screening-flow-modal-lead">
              Tell the AI what the Hunar screening call should cover. Screening is enabled
              once the flow is saved.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-btn-ghost dashboard-outreach-screening-flow-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="dashboard-outreach-post-qual-fields">
          <label className="dashboard-outreach-field">
            <span className="dashboard-outreach-field-label">Objective</span>
            <input
              type="text"
              className="dashboard-outreach-input"
              value={callObjective}
              onChange={(e) => setCallObjective(e.target.value)}
              placeholder="e.g. Confirm interest and check basic eligibility"
            />
          </label>
          <label className="dashboard-outreach-field">
            <span className="dashboard-outreach-field-label">Voice script</span>
            <textarea
              className="dashboard-outreach-textarea"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What the AI should say and ask on the screening call…"
            />
          </label>

          <div className="dashboard-outreach-screening-flow-modal-grid">
            <label className="dashboard-outreach-field">
              <span className="dashboard-outreach-field-label">Call language</span>
              <select
                className="dashboard-outreach-input"
                value={language}
                onChange={(e) => setLanguage(e.target.value as PostQualificationCallLanguage)}
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="malayalam">Malayalam</option>
                <option value="kannada">Kannada</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
              </select>
            </label>
            <label className="dashboard-outreach-field">
              <span className="dashboard-outreach-field-label">Voice tone</span>
              <select
                className="dashboard-outreach-input"
                value={voiceTone}
                onChange={(e) => setVoiceTone(e.target.value as VoiceTone)}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="direct">Direct</option>
              </select>
            </label>
            <label className="dashboard-outreach-field">
              <span className="dashboard-outreach-field-label">Call attempts</span>
              <select
                className="dashboard-outreach-input"
                value={callAttempts}
                onChange={(e) => setCallAttempts(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <label className="dashboard-outreach-field">
              <span className="dashboard-outreach-field-label">Gap between attempts</span>
              <select
                className="dashboard-outreach-input"
                value={attemptGapHours}
                onChange={(e) => setAttemptGapHours(Number(e.target.value))}
              >
                {GAP_OPTIONS.map((option) => (
                  <option key={option.hours} value={option.hours}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="dashboard-outreach-screening-flow-modal-footer">
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                callObjective: callObjective.trim(),
                body: body.trim(),
                language,
                voiceTone,
                callAttempts,
                attemptGapHours,
              })
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

type SchedulingSetupModalProps = {
  open: boolean;
  initialAutomation: CampaignCalendlyAutomation;
  onConfirm: (automation: CampaignCalendlyAutomation) => void;
  onCancel: () => void;
};

function SchedulingSetupModal({
  open,
  initialAutomation,
  onConfirm,
  onCancel,
}: SchedulingSetupModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<CampaignCalendlyAutomation>(initialAutomation);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setDraft(initialAutomation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="dashboard-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scheduling-setup-modal-title"
    >
      <div
        className="dashboard-modal dashboard-outreach-screening-flow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dashboard-outreach-screening-flow-modal-head">
          <span className="dashboard-outreach-post-qual-card-icon" aria-hidden>
            <MaterialIcon name="event_available" />
          </span>
          <div>
            <h3
              id="scheduling-setup-modal-title"
              className="dashboard-outreach-screening-flow-modal-title"
            >
              Interview scheduling
            </h3>
            <p className="dashboard-outreach-screening-flow-modal-lead">
              Pick the Calendly meeting to send automatically when the candidate is
              ready to book.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-btn-ghost dashboard-outreach-screening-flow-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="dashboard-outreach-post-qual-fields">
          <OutreachEmailReplySetup
            calendlyAutomation={draft}
            onCalendlyAutomationChange={setDraft}
          />
        </div>

        <div className="dashboard-outreach-screening-flow-modal-footer">
          <button type="button" className={dashboardBtnSecondaryClass} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            onClick={() => onConfirm(draft)}
          >
            Enable scheduling
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AfterQualificationSetup({
  value,
  onChange,
  calendlyAutomation,
  onCalendlyAutomationChange,
  disabled = false,
}: Props) {
  const flowSteps = postQualificationFlowSummary(value);
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [schedulingDisableConfirmOpen, setSchedulingDisableConfirmOpen] = useState(false);

  const handleScreeningCardClick = () => {
    if (value.screeningEnabled) {
      onChange({ ...value, screeningEnabled: false });
    } else {
      setFlowModalOpen(true);
    }
  };

  const handleFlowConfirm = (voice: PostQualificationVoice) => {
    onChange({
      ...value,
      screeningEnabled: true,
      voice,
    });
    setFlowModalOpen(false);
  };

  const handleSchedulingCardClick = () => {
    if (value.schedulingEnabled) {
      setSchedulingDisableConfirmOpen(true);
    } else {
      setSchedulingModalOpen(true);
    }
  };

  const handleSchedulingEnableConfirm = (automation: CampaignCalendlyAutomation) => {
    onChange({ ...value, schedulingEnabled: true });
    onCalendlyAutomationChange({
      ...automation,
      enabled: Boolean(automation.schedulingUrl?.trim()),
    });
    setSchedulingModalOpen(false);
  };

  const handleSchedulingDisableConfirm = () => {
    onChange({ ...value, schedulingEnabled: false });
    onCalendlyAutomationChange({ ...calendlyAutomation, enabled: false });
    setSchedulingDisableConfirmOpen(false);
  };

  return (
    <section className="dashboard-outreach-review-panel dashboard-outreach-post-qual">
      <div className="dashboard-outreach-review-panel-head">
        <h4 className="dashboard-outreach-review-section-title">After qualification</h4>
        <p className="dashboard-outreach-review-section-lead">
          Configure what happens automatically once a candidate completes qualification.
        </p>
      </div>

      <div className="dashboard-outreach-post-qual-pipeline" aria-label="Post-qualification flow">
        {flowSteps.map((step, index) => (
          <span key={step} className="dashboard-outreach-post-qual-pipeline-step">
            {index > 0 ? (
              <MaterialIcon name="arrow_forward" className="dashboard-outreach-post-qual-pipeline-arrow" />
            ) : null}
            <span>{step}</span>
          </span>
        ))}
      </div>

      <div className="dashboard-outreach-post-qual-grid">
        <button
          type="button"
          className={`dashboard-outreach-post-qual-card${
            value.screeningEnabled ? " dashboard-outreach-post-qual-card--active" : ""
          }`}
          onClick={handleScreeningCardClick}
          disabled={disabled}
          aria-pressed={value.screeningEnabled}
        >
          <span className="dashboard-outreach-post-qual-card-icon" aria-hidden>
            <MaterialIcon name="record_voice_over" />
          </span>
          <span className="dashboard-outreach-post-qual-card-copy">
            <strong>AI voice screening</strong>
            <span>Start a Hunar screening call after qualification.</span>
          </span>
          <MaterialIcon
            name={value.screeningEnabled ? "check_circle" : "radio_button_unchecked"}
            className="dashboard-outreach-post-qual-card-check"
          />
        </button>

        <button
          type="button"
          className={`dashboard-outreach-post-qual-card${
            value.schedulingEnabled ? " dashboard-outreach-post-qual-card--active" : ""
          }`}
          onClick={handleSchedulingCardClick}
          disabled={disabled}
          aria-pressed={value.schedulingEnabled}
        >
          <span className="dashboard-outreach-post-qual-card-icon" aria-hidden>
            <MaterialIcon name="event_available" />
          </span>
          <span className="dashboard-outreach-post-qual-card-copy">
            <strong>Interview scheduling</strong>
            <span>Send your Calendly link when the candidate is ready to book.</span>
          </span>
          <MaterialIcon
            name={value.schedulingEnabled ? "check_circle" : "radio_button_unchecked"}
            className="dashboard-outreach-post-qual-card-check"
          />
        </button>
      </div>

      {value.screeningEnabled ? (
        <div className="dashboard-outreach-post-qual-expand">
          <div className="dashboard-outreach-post-qual-flow-row">
            <div className="dashboard-outreach-post-qual-flow-copy">
              <p className="dashboard-outreach-post-qual-expand-label">Screening flow</p>
              <p className="dashboard-outreach-post-qual-flow-preview">
                {value.voice.callObjective || value.voice.body}
              </p>
            </div>
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={() => setFlowModalOpen(true)}
              disabled={disabled}
            >
              <MaterialIcon name="edit" className="text-sm" />
              Edit flow
            </button>
          </div>
        </div>
      ) : null}

      {value.schedulingEnabled ? (
        <div className="dashboard-outreach-post-qual-expand">
          <p className="dashboard-outreach-post-qual-expand-label">Calendly meeting</p>
          <OutreachEmailReplySetup
            calendlyAutomation={calendlyAutomation}
            onCalendlyAutomationChange={onCalendlyAutomationChange}
            disabled={disabled}
          />
        </div>
      ) : null}

      {value.screeningEnabled && value.schedulingEnabled ? (
        <p className="dashboard-outreach-post-qual-chain">
          <MaterialIcon name="route" className="text-sm" />
          Screening runs first. Scheduling is sent only if the candidate shows interest on the call.
        </p>
      ) : null}

      <ScreeningFlowModal
        open={flowModalOpen}
        initialVoice={value.voice}
        confirmLabel={value.screeningEnabled ? "Save flow" : "Save & enable screening"}
        onConfirm={handleFlowConfirm}
        onCancel={() => setFlowModalOpen(false)}
      />

      <SchedulingSetupModal
        open={schedulingModalOpen}
        initialAutomation={calendlyAutomation}
        onConfirm={handleSchedulingEnableConfirm}
        onCancel={() => setSchedulingModalOpen(false)}
      />

      <ConfirmModal
        open={schedulingDisableConfirmOpen}
        title="Turn off interview scheduling?"
        message="Your Calendly link will no longer be sent automatically after qualification."
        confirmLabel="Turn off"
        cancelLabel="Cancel"
        iconName="event_available"
        onConfirm={handleSchedulingDisableConfirm}
        onCancel={() => setSchedulingDisableConfirmOpen(false)}
      />
    </section>
  );
}
