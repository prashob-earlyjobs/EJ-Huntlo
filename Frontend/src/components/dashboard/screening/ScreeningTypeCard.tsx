"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";

type Props = {
  title: string;
  description: string;
  bestFor: string[];
  ctaLabel: string;
  onClick: () => void;
  variant: "voice" | "video";
  locked?: boolean;
};

export function ScreeningTypeCard({
  title,
  description,
  bestFor,
  ctaLabel,
  onClick,
  variant,
  locked = false,
}: Props) {
  return (
    <article
      className={`dashboard-screening-type-card dashboard-screening-type-card--${variant}${
        locked ? " dashboard-screening-type-card--locked" : ""
      }`}
    >
      {locked ? (
        <span className="dashboard-screening-type-card-lock" aria-hidden>
          <MaterialIcon name="lock" />
        </span>
      ) : null}
      <div className="dashboard-screening-type-card-header">
        <span className="dashboard-screening-type-card-icon" aria-hidden>
          <MaterialIcon name={variant === "voice" ? "record_voice_over" : "videocam"} />
        </span>
        <div>
          <h3 className="dashboard-screening-type-card-title">{title}</h3>
          <p className="dashboard-screening-type-card-desc">{description}</p>
        </div>
      </div>
      <ul className="dashboard-screening-best-for-list">
        {bestFor.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button
        type="button"
        className={`${dashboardBtnPrimaryClass}${
          locked ? " dashboard-screening-type-card-cta--locked" : ""
        }`}
        onClick={locked ? undefined : onClick}
        disabled={locked}
        title={locked ? "Coming soon" : undefined}
      >
        {locked ? <MaterialIcon name="lock" className="text-sm" /> : null}
        {ctaLabel}
        {locked ? (
          <span className="dashboard-screening-badge dashboard-screening-badge--muted">Soon</span>
        ) : null}
      </button>
    </article>
  );
}

type SelectionProps = {
  title: string;
  description: string;
  bestFor: string;
  outputs: string[];
  ctaLabel: string;
  onClick: () => void;
  variant: "voice" | "video";
  locked?: boolean;
};

export function ScreeningTypeSelectionCard({
  title,
  description,
  bestFor,
  outputs,
  ctaLabel,
  onClick,
  variant,
  locked = false,
}: SelectionProps) {
  return (
    <button
      type="button"
      className={`dashboard-screening-selection-card dashboard-screening-selection-card--${variant}${
        locked ? " dashboard-screening-selection-card--locked" : ""
      }`}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      title={locked ? "Coming soon" : undefined}
    >
      {locked ? (
        <span className="dashboard-screening-type-card-lock" aria-hidden>
          <MaterialIcon name="lock" />
        </span>
      ) : null}
      <span className="dashboard-screening-selection-card-icon">
        <MaterialIcon name={variant === "voice" ? "record_voice_over" : "videocam"} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <p className="dashboard-screening-selection-best">
        <strong>Best for:</strong> {bestFor}
      </p>
      <ul className="dashboard-screening-output-list">
        {outputs.map((o) => (
          <li key={o}>
            <MaterialIcon name="check_circle" className="text-sm" />
            {o}
          </li>
        ))}
      </ul>
      <span
        className={`dashboard-btn-secondary${
          locked ? " dashboard-screening-selection-card-cta--locked" : ""
        }`}
      >
        {locked ? (
          <>
            <MaterialIcon name="lock" className="text-sm" />
            Coming soon
          </>
        ) : (
          ctaLabel
        )}
      </span>
    </button>
  );
}
