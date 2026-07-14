"use client";

import { OutreachEmailReplySetup } from "@/components/dashboard/outreach/OutreachEmailReplySetup";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import {
  postQualificationFlowSummary,
  type PostQualificationConfig,
} from "@/lib/postQualification";

type Props = {
  value: PostQualificationConfig;
  onChange: (value: PostQualificationConfig) => void;
  calendlyAutomation: CampaignCalendlyAutomation;
  onCalendlyAutomationChange: (value: CampaignCalendlyAutomation) => void;
  disabled?: boolean;
};

export function AfterQualificationSetup({
  value,
  onChange,
  calendlyAutomation,
  onCalendlyAutomationChange,
  disabled = false,
}: Props) {
  const flowSteps = postQualificationFlowSummary(value);

  const setScreeningEnabled = (screeningEnabled: boolean) => {
    onChange({ ...value, screeningEnabled });
  };

  const setSchedulingEnabled = (schedulingEnabled: boolean) => {
    const next = { ...value, schedulingEnabled };
    onChange(next);
    if (schedulingEnabled) {
      onCalendlyAutomationChange({
        ...calendlyAutomation,
        enabled: Boolean(calendlyAutomation.schedulingUrl?.trim()),
      });
    } else {
      onCalendlyAutomationChange({ ...calendlyAutomation, enabled: false });
    }
  };

  const updateVoice = (patch: Partial<PostQualificationConfig["voice"]>) => {
    onChange({
      ...value,
      voice: { ...value.voice, ...patch },
    });
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
          onClick={() => setScreeningEnabled(!value.screeningEnabled)}
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
          onClick={() => setSchedulingEnabled(!value.schedulingEnabled)}
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
          <p className="dashboard-outreach-post-qual-expand-label">Screening script</p>
          <div className="dashboard-outreach-post-qual-fields">
            <label className="dashboard-outreach-field">
              <span className="dashboard-outreach-field-label">Objective</span>
              <input
                type="text"
                className="dashboard-outreach-input"
                value={value.voice.callObjective}
                onChange={(e) => updateVoice({ callObjective: e.target.value })}
                disabled={disabled}
              />
            </label>
            <label className="dashboard-outreach-field">
              <span className="dashboard-outreach-field-label">Voice script</span>
              <textarea
                className="dashboard-outreach-textarea"
                rows={3}
                value={value.voice.body}
                onChange={(e) => updateVoice({ body: e.target.value })}
                disabled={disabled}
              />
            </label>
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
    </section>
  );
}
