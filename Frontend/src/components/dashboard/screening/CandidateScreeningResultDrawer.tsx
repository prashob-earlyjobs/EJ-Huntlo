"use client";

import { RecommendationBadge } from "@/components/dashboard/screening/RecommendationBadge";
import { Scorecard } from "@/components/dashboard/screening/Scorecard";
import { TranscriptViewer } from "@/components/dashboard/screening/TranscriptViewer";
import type { ScreeningResultDetail } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  detail: ScreeningResultDetail | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
};

export function CandidateScreeningResultDrawer({
  detail,
  open,
  onClose,
  onAction,
}: Props) {
  if (!open || !detail) return null;

  return (
    <>
      <button type="button" className="dashboard-screening-drawer-backdrop" onClick={onClose} aria-label="Close" />
      <aside className="dashboard-screening-drawer" role="dialog" aria-label="Screening result">
        <header className="dashboard-screening-drawer-header">
          <div>
            <h3>{detail.name}</h3>
            <p>{detail.role} · {detail.location} · {detail.experience}</p>
            <div className="dashboard-screening-drawer-score-row">
              <span className="dashboard-screening-drawer-score">{detail.overallScore}/100</span>
              <RecommendationBadge recommendation={detail.recommendation} />
            </div>
          </div>
          <button type="button" className="dashboard-screening-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>

        <div className="dashboard-screening-drawer-body">
          <section>
            <h4>AI summary</h4>
            <p className="dashboard-screening-ai-summary">{detail.aiSummary}</p>
          </section>

          <section>
            <h4>Scorecard</h4>
            <Scorecard entries={detail.scorecard} />
          </section>

          <section>
            <TranscriptViewer type={detail.type} />
          </section>

          <section>
            <h4>Key insights</h4>
            <ul className="dashboard-screening-insights-list">
              {detail.insights.map((i) => (
                <li key={i}><MaterialIcon name="check_circle" className="text-sm" />{i}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>Red flags / concerns</h4>
            <ul className="dashboard-screening-concerns-list">
              {detail.concerns.map((c) => (
                <li key={c}><MaterialIcon name="warning" className="text-sm" />{c}</li>
              ))}
            </ul>
          </section>

          <section className="dashboard-screening-decision">
            <h4>Recruiter decision</h4>
            <p className="dashboard-screening-decision-hint">
              AI assists — you make the final call.
            </p>
          </section>
        </div>

        <footer className="dashboard-screening-drawer-footer">
          <button type="button" className={dashboardBtnPrimaryClass} onClick={() => onAction("shortlist")}>
            Shortlist
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("interview")}>
            Move to interview scheduling
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("reject")}>
            Reject
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("rescreen")}>
            Request re-screening
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("note")}>
            Add note
          </button>
        </footer>
      </aside>
    </>
  );
}
