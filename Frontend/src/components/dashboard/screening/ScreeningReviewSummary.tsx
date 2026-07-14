"use client";

import type { ScreeningType } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

export type ScreeningReviewStat = {
  icon: string;
  value: string;
  muted?: string;
};

type Props = {
  name: string;
  jobTitle?: string;
  type: ScreeningType;
  candidateCount: number;
  questionsCount: number;
  stats?: ScreeningReviewStat[];
  /** @deprecated Use stats — kept for video builder extras grid */
  extras?: { label: string; value: string }[];
  goalLabel?: string;
  callObjective?: string;
  onSaveDraft: () => void;
  onLaunch: () => void;
  launchLabel: string;
  launchDisabled?: boolean;
};

export function ScreeningReviewSummary({
  name,
  jobTitle,
  type,
  candidateCount,
  questionsCount,
  stats = [],
  extras = [],
  goalLabel,
  callObjective,
  onSaveDraft,
  onLaunch,
  launchLabel,
  launchDisabled = false,
}: Props) {
  const typeLabel = type === "voice" ? "AI Voice" : "AI Video";
  const checklist = [
    {
      label: "Screening details",
      done: Boolean(name.trim() && jobTitle?.trim()),
    },
    {
      label: "Candidates selected",
      done: candidateCount > 0,
    },
    {
      label: "Screening questions",
      done: questionsCount > 0,
    },
  ];
  const checklistDone = checklist.filter((item) => item.done).length;
  const allChecksDone = checklist.every((item) => item.done);
  const canLaunch = allChecksDone && !launchDisabled;

  const launchHint =
    type === "voice"
      ? "Launching places AI voice calls via Hunar to selected candidates with valid phone numbers."
      : "Launching invites selected candidates to complete the video screening.";

  return (
    <div className="dashboard-screening-review">
      <div className="dashboard-screening-review-body">
        <header className="dashboard-screening-review-header">
          <div className="dashboard-screening-review-header-copy">
            <p className="dashboard-screening-review-eyebrow">Review &amp; launch</p>
            <h3 className="dashboard-screening-review-heading">
              {name.trim() || "Untitled screening"}
            </h3>
            {jobTitle?.trim() ? (
              <p className="dashboard-screening-review-subheading">{jobTitle.trim()}</p>
            ) : null}
          </div>
          <span
            className={`dashboard-screening-review-readiness${
              allChecksDone
                ? " dashboard-screening-review-readiness--ready"
                : " dashboard-screening-review-readiness--pending"
            }`}
          >
            <MaterialIcon
              name={allChecksDone ? "verified" : "pending"}
              className="text-sm"
            />
            {allChecksDone ? "Ready to launch" : "Complete checklist"}
          </span>
        </header>

        <div className="dashboard-screening-review-stats-bar" aria-label="Screening summary">
          <span className="dashboard-screening-review-stat">
            <MaterialIcon
              name={type === "voice" ? "record_voice_over" : "videocam"}
              className="dashboard-screening-review-stat-icon"
            />
            {typeLabel}
          </span>
          <span className="dashboard-screening-review-stat">
            <MaterialIcon name="groups" className="dashboard-screening-review-stat-icon" />
            {candidateCount} {candidateCount === 1 ? "candidate" : "candidates"}
          </span>
          <span className="dashboard-screening-review-stat">
            <MaterialIcon name="quiz" className="dashboard-screening-review-stat-icon" />
            {questionsCount} {questionsCount === 1 ? "question" : "questions"}
          </span>
          {stats.map((stat) => (
            <span key={`${stat.icon}-${stat.value}`} className="dashboard-screening-review-stat">
              <MaterialIcon name={stat.icon} className="dashboard-screening-review-stat-icon" />
              {stat.value}
              {stat.muted ? (
                <>
                  <span className="dashboard-screening-review-stat-sep" aria-hidden>
                    ·
                  </span>
                  <span className="dashboard-screening-review-stat-muted">{stat.muted}</span>
                </>
              ) : null}
            </span>
          ))}
        </div>

        {goalLabel || callObjective ? (
          <section className="dashboard-screening-review-panel">
            <div className="dashboard-screening-review-panel-head">
              <h4 className="dashboard-screening-review-section-title">Call objective</h4>
              {goalLabel ? (
                <span className="dashboard-screening-review-goal-badge">{goalLabel}</span>
              ) : null}
            </div>
            {callObjective ? (
              <p className="dashboard-screening-review-objective">{callObjective}</p>
            ) : null}
          </section>
        ) : null}

        {extras.length > 0 ? (
          <section className="dashboard-screening-review-panel">
            <h4 className="dashboard-screening-review-section-title">Configuration</h4>
            <dl className="dashboard-screening-review-detail-grid">
              {extras.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <aside className="dashboard-screening-review-aside">
          <section className="dashboard-screening-review-panel dashboard-screening-review-checklist">
            <div className="dashboard-screening-review-panel-head dashboard-screening-review-panel-head--row">
              <div>
                <h4 className="dashboard-screening-review-section-title">Launch checklist</h4>
                <p className="dashboard-screening-review-section-lead">
                  {checklistDone} of {checklist.length} complete
                </p>
              </div>
              <span className="dashboard-screening-review-checklist-ring" aria-hidden>
                {checklistDone}/{checklist.length}
              </span>
            </div>
            <ul>
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className={`dashboard-screening-review-checklist-item${
                    item.done ? " dashboard-screening-review-checklist-item--done" : ""
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

          <p className="dashboard-screening-review-note">
            <MaterialIcon name="info" className="text-sm" />
            {launchHint}
          </p>
        </aside>
      </div>

      <footer className="dashboard-screening-review-actions">
        <button
          type="button"
          className={dashboardBtnSecondaryClass}
          onClick={onSaveDraft}
          disabled={launchDisabled}
        >
          Save draft
        </button>
        <button
          type="button"
          className={dashboardBtnPrimaryClass}
          onClick={onLaunch}
          disabled={!canLaunch}
        >
          <MaterialIcon name="rocket_launch" className="text-sm" />
          {launchLabel}
        </button>
      </footer>
    </div>
  );
}
