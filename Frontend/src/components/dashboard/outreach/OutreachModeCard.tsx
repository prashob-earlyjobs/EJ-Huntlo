"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

export type SequencePreviewStep = "whatsapp" | "email" | "voice";

const SEQUENCE_STEP_META: Record<
  SequencePreviewStep,
  { icon: string; label: string }
> = {
  whatsapp: { icon: "chat", label: "WhatsApp" },
  email: { icon: "mail", label: "Email" },
  voice: { icon: "record_voice_over", label: "AI Voice Call" },
};

type Props = {
  title: string;
  description: string;
  channels?: string[];
  sequencePreview?: SequencePreviewStep[];
  sequenceArrows?: boolean;
  ctaLabel: string;
  onClick: () => void;
  variant: "single" | "multi";
};

export function OutreachModeCard({
  title,
  description,
  channels = [],
  sequencePreview,
  sequenceArrows = true,
  ctaLabel,
  onClick,
  variant,
}: Props) {
  const visualLabel =
    variant === "single" ? "Available channels" : "Example automated flow";

  return (
    <article className={`dashboard-outreach-mode-card dashboard-outreach-mode-card--${variant}`}>
      <div className="dashboard-outreach-mode-card-header">
        <span className="dashboard-outreach-mode-card-icon" aria-hidden>
          <MaterialIcon name={variant === "single" ? "send" : "account_tree"} />
        </span>
        <div className="dashboard-outreach-mode-card-heading">
          <span className="dashboard-outreach-mode-card-eyebrow">
            {variant === "single" ? "Single channel" : "Multi channel"}
          </span>
          <h3 className="dashboard-outreach-mode-card-title">{title}</h3>
          <p className="dashboard-outreach-mode-card-desc">{description}</p>
        </div>
      </div>

      <div className="dashboard-outreach-mode-card-visual">
        <span className="dashboard-outreach-mode-card-visual-label">{visualLabel}</span>
        {channels.length > 0 ? (
          <div className="dashboard-outreach-sequence-preview" role="list" aria-label="Supported channels">
            {channels.map((ch) => (
              <span key={ch} className="dashboard-outreach-channel-pill">{ch}</span>
            ))}
          </div>
        ) : null}
        {sequencePreview?.length ? (
          <div className="dashboard-outreach-sequence-preview" role="list" aria-label="Outreach sequence">
            {sequencePreview.map((step, i) => {
              const meta = SEQUENCE_STEP_META[step];
              return (
                <span key={`${step}-${i}`} className="dashboard-outreach-sequence-preview-item" role="listitem">
                  {sequenceArrows && i > 0 ? (
                    <MaterialIcon name="arrow_forward" className="dashboard-outreach-sequence-arrow" aria-hidden />
                  ) : null}
                  <span
                    className="dashboard-outreach-sequence-preview-icon"
                    title={meta.label}
                    aria-label={meta.label}
                  >
                    <MaterialIcon name={meta.icon} />
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <button type="button" className={`${dashboardBtnPrimaryClass} dashboard-outreach-mode-card-cta`} onClick={onClick}>
        {ctaLabel}
        <MaterialIcon name="arrow_forward" className="text-sm" />
      </button>
    </article>
  );
}

type SelectionProps = {
  variant: "single" | "multi";
  title: string;
  description: string;
  bestFor: string;
  sequencePreview?: SequencePreviewStep[];
  sequenceArrows?: boolean;
  ctaLabel: string;
  onClick: () => void;
};

export function OutreachModeSelectionCard({
  variant,
  title,
  description,
  bestFor,
  sequencePreview,
  sequenceArrows = false,
  ctaLabel,
  onClick,
}: SelectionProps) {
  return (
    <button
      type="button"
      className={`dashboard-outreach-selection-card dashboard-outreach-mode-card dashboard-outreach-mode-card--${variant}`}
      onClick={onClick}
    >
      <div className="dashboard-outreach-mode-card-header">
        <span className="dashboard-outreach-mode-card-icon" aria-hidden>
          <MaterialIcon name={variant === "single" ? "send" : "account_tree"} />
        </span>
        <div>
          <h3 className="dashboard-outreach-mode-card-title">{title}</h3>
          <p className="dashboard-outreach-mode-card-desc">{description}</p>
        </div>
      </div>
      <p className="dashboard-outreach-mode-card-best">
        <span className="dashboard-outreach-badge dashboard-outreach-badge--ai">Best for</span>
        {bestFor}
      </p>
      <div className="dashboard-outreach-mode-card-visual">
        {sequencePreview?.length ? (
          <div className="dashboard-outreach-sequence-preview" role="list" aria-label="Outreach sequence">
            {sequencePreview.map((step, i) => {
              const meta = SEQUENCE_STEP_META[step];
              return (
                <span key={`${step}-${i}`} className="dashboard-outreach-sequence-preview-item" role="listitem">
                  {sequenceArrows && i > 0 ? (
                    <MaterialIcon name="arrow_forward" className="dashboard-outreach-sequence-arrow" aria-hidden />
                  ) : null}
                  <span
                    className="dashboard-outreach-sequence-preview-icon"
                    title={meta.label}
                    aria-label={meta.label}
                  >
                    <MaterialIcon name={meta.icon} />
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <span className={`${dashboardBtnSecondaryClass} dashboard-outreach-selection-card-cta`}>
        {ctaLabel}
        <MaterialIcon name="arrow_forward" className="text-sm" />
      </span>
    </button>
  );
}
