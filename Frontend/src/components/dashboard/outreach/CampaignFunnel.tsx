"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type FunnelStage = {
  label: string;
  count: number;
};

type ToggleProps = {
  onClick: () => void;
};

type PanelProps = {
  stages: FunnelStage[];
  onClose: () => void;
};

const STAGE_META: Record<string, { icon: string }> = {
  Selected: { icon: "groups" },
  Contacted: { icon: "send" },
  Replied: { icon: "reply" },
  Interested: { icon: "thumb_up" },
  Screened: { icon: "fact_check" },
};

function stageMeta(label: string) {
  return STAGE_META[label] ?? { icon: "insights" };
}

function conversionRate(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round((current / previous) * 100);
}

export function CampaignFunnelToggle({ onClick }: ToggleProps) {
  return (
    <button
      type="button"
      className={`${dashboardBtnSecondaryClass} dashboard-outreach-funnel-toggle-btn`}
      onClick={onClick}
      aria-expanded={false}
    >
      <MaterialIcon name="filter_alt" className="text-sm" />
      View candidate funnel
    </button>
  );
}

export function CampaignFunnel({ stages, onClose }: PanelProps) {
  if (stages.length === 0) return null;

  const baseline = stages[0]?.count ?? 0;
  const endCount = stages[stages.length - 1]?.count ?? 0;
  const overallRate =
    baseline > 0 ? Math.round((endCount / baseline) * 100) : 0;

  return (
    <section className="dashboard-outreach-funnel" aria-label="Candidate funnel">
      <div className="dashboard-outreach-funnel-header">
        <div>
          <h2 className="dashboard-outreach-subsection-title">Candidate funnel</h2>
          <p className="dashboard-outreach-funnel-subtitle">
            Progression from enrollment through screening
          </p>
        </div>
        <div className="dashboard-outreach-funnel-header-actions">
          {baseline > 0 ? (
            <div className="dashboard-outreach-funnel-summary">
              <span className="dashboard-outreach-funnel-summary-value">{overallRate}%</span>
              <span className="dashboard-outreach-funnel-summary-label">End-to-end conversion</span>
            </div>
          ) : null}
          <button
            type="button"
            className={`${dashboardBtnSecondaryClass} dashboard-outreach-funnel-hide-btn`}
            onClick={onClose}
            aria-expanded={true}
          >
            <MaterialIcon name="expand_less" className="text-sm" />
            Hide funnel
          </button>
        </div>
      </div>

      <div className="dashboard-outreach-funnel-track">
        {stages.map((stage, index) => {
          const meta = stageMeta(stage.label);
          const previousCount = index > 0 ? stages[index - 1].count : null;
          const fromPrevious =
            previousCount != null ? conversionRate(stage.count, previousCount) : null;
          const fillPercent =
            baseline > 0 ? Math.max(8, Math.round((stage.count / baseline) * 100)) : 0;
          const isActive = stage.count > 0;

          return (
            <div key={stage.label} className="dashboard-outreach-funnel-step">
              {index > 0 ? (
                <div className="dashboard-outreach-funnel-connector" aria-hidden>
                  {fromPrevious != null ? (
                    <span className="dashboard-outreach-funnel-connector-rate">
                      {fromPrevious}%
                    </span>
                  ) : null}
                </div>
              ) : null}

              <article
                className={`dashboard-outreach-funnel-card${
                  isActive ? " dashboard-outreach-funnel-card--active" : ""
                }`}
              >
                <div className="dashboard-outreach-funnel-card-head">
                  <span className="dashboard-outreach-funnel-card-icon" aria-hidden>
                    <MaterialIcon name={meta.icon} className="text-sm" />
                  </span>
                  <span className="dashboard-outreach-funnel-card-step">Step {index + 1}</span>
                </div>

                <p className="dashboard-outreach-funnel-count">{stage.count}</p>
                <p className="dashboard-outreach-funnel-label">{stage.label}</p>

                <div className="dashboard-outreach-funnel-bar" aria-hidden>
                  <span
                    className="dashboard-outreach-funnel-bar-fill"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
