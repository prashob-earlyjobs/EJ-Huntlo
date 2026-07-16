"use client";

import { useCallback, useEffect, useState } from "react";

import { CandidateScreeningResultDrawer } from "@/components/dashboard/screening/CandidateScreeningResultDrawer";
import { ScreeningResultsSkeleton } from "@/components/dashboard/screening/ScreeningResultsSkeleton";
import { ScreeningResultsTable } from "@/components/dashboard/screening/ScreeningResultsTable";
import { ScreeningStatsCard } from "@/components/dashboard/screening/ScreeningStatsCard";
import type { ScreeningResultDetail, ScreeningResultRow, ScreeningRow } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchScreeningCandidateDetail,
  fetchScreeningDetail,
  pauseScreening,
  recordScreeningCandidateAction,
  type ScreeningDetailStats,
} from "@/lib/screeningApi";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  screeningId: string;
  onBack: () => void;
  onViewAllDetails: () => void;
  onToast: (message: string) => void;
};

const EMPTY_STATS: ScreeningDetailStats = {
  total: 0,
  invited: 0,
  completed: 0,
  shortlisted: 0,
  rejected: 0,
  pending: 0,
  avgScore: "—",
};

export function ScreeningResultsPage({ screeningId, onBack, onViewAllDetails, onToast }: Props) {
  const [screening, setScreening] = useState<ScreeningRow | null>(null);
  const [stats, setStats] = useState<ScreeningDetailStats>(EMPTY_STATS);
  const [funnel, setFunnel] = useState<{ label: string; count: number }[]>([]);
  const [results, setResults] = useState<ScreeningResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScreeningResultDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [funnelOpen, setFunnelOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchScreeningDetail(auth.token, screeningId);
      setScreening(data.screening);
      setStats(data.stats);
      setFunnel(data.funnel);
      setResults(data.results);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not load screening");
    } finally {
      setLoading(false);
    }
  }, [onToast, screeningId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!drawerId) {
      setDetail(null);
      return;
    }
    const auth = getStoredAuth();
    if (!auth?.token) return;

    let cancelled = false;
    setDetailLoading(true);
    void fetchScreeningCandidateDetail(auth.token, screeningId, drawerId)
      .then((candidateDetail) => {
        if (!cancelled) setDetail(candidateDetail);
      })
      .catch((err) => {
        if (!cancelled) {
          onToast(err instanceof Error ? err.message : "Could not load candidate detail");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [drawerId, onToast, screeningId]);

  const handlePause = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      onToast("Please sign in again");
      return;
    }
    setPausing(true);
    try {
      await pauseScreening(auth.token, screeningId);
      onToast("Screening paused");
      await loadDetail();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not pause screening");
    } finally {
      setPausing(false);
    }
  };

  const handleCandidateAction = async (action: string, note?: string) => {
    if (!drawerId) return;
    const auth = getStoredAuth();
    if (!auth?.token) {
      onToast("Please sign in again");
      return;
    }
    const actionMap: Record<string, string> = {
      shortlist: "shortlist",
      interview: "schedule_interview",
      reject: "reject",
      note: "add_note",
    };
    const apiAction = actionMap[action];
    if (!apiAction) {
      onToast("This action isn't available yet");
      return;
    }

    try {
      await recordScreeningCandidateAction(auth.token, screeningId, drawerId, apiAction, note);
      onToast(action === "note" ? "Note added" : `Action: ${action.replace(/_/g, " ")}`);
      await loadDetail();
      const refreshed = await fetchScreeningCandidateDetail(auth.token, screeningId, drawerId);
      setDetail(refreshed);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Action failed");
    }
  };

  if (loading) {
    return <ScreeningResultsSkeleton />;
  }

  if (!screening) {
    return (
      <div className="dashboard-screening-empty-state">
        <p>Screening not found.</p>
        <button type="button" className={dashboardBtnSecondaryClass} onClick={onBack}>
          Back to screening
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-screening-results">
      <header className="dashboard-screening-results-header">
        <button type="button" className="dashboard-screening-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to screening
        </button>
        <div className="dashboard-screening-results-title-row">
          <div>
            <h1 className="dashboard-section-title">{screening.name}</h1>
            <div className="dashboard-screening-results-meta">
              <span className={`dashboard-screening-table-status dashboard-screening-table-status--${screening.status}`}>
                {screening.status}
              </span>
              <span className="dashboard-screening-type-badge">
                {screening.type === "voice" ? "AI Voice" : "AI Video"}
              </span>
            </div>
          </div>
          <div className="dashboard-screening-results-actions">
            {screening.status === "active" ? (
              <button
                type="button"
                className={dashboardBtnSecondaryClass}
                onClick={() => void handlePause()}
                disabled={pausing}
              >
                {pausing ? "Pausing…" : "Pause screening"}
              </button>
            ) : null}
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={() => setFunnelOpen((open) => !open)}
              aria-expanded={funnelOpen}
            >
              <MaterialIcon name={funnelOpen ? "expand_less" : "filter_alt"} className="text-sm" />
              Screening funnel
            </button>
          </div>
        </div>
      </header>

      <section className="dashboard-screening-stats-grid dashboard-screening-stats-grid--dense">
        <ScreeningStatsCard label="Total candidates" value={stats.total} icon="groups" />
        <ScreeningStatsCard label="Invited / called" value={stats.invited} icon="call" />
        <ScreeningStatsCard label="Completed" value={stats.completed} icon="task_alt" />
        <ScreeningStatsCard label="Shortlisted" value={stats.shortlisted} icon="thumb_up" />
        <ScreeningStatsCard label="Rejected" value={stats.rejected} icon="thumb_down" />
        <ScreeningStatsCard label="Pending" value={stats.pending} icon="hourglass_empty" />
      </section>

      {funnelOpen ? (
        <section className="dashboard-screening-funnel">
          <h2 className="dashboard-screening-subsection-title">Screening funnel</h2>
          <div className="dashboard-screening-funnel-track">
            {funnel.map((stage, i) => (
              <div key={stage.label} className="dashboard-screening-funnel-step">
                {i > 0 ? (
                  <div className="dashboard-screening-funnel-connector" aria-hidden>
                    <MaterialIcon name="arrow_forward" className="dashboard-screening-funnel-arrow" />
                  </div>
                ) : null}
                <div className="dashboard-screening-funnel-card">
                  <span className="dashboard-screening-funnel-count">{stage.count}</span>
                  <span className="dashboard-screening-funnel-label">{stage.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="dashboard-screening-subsection-title">Candidate results</h2>
        <ScreeningResultsTable
          rows={results}
          onView={setDrawerId}
          onViewAllDetails={onViewAllDetails}
        />
      </section>

      <CandidateScreeningResultDrawer
        detail={detailLoading ? null : detail}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onAction={(action, note) => void handleCandidateAction(action, note)}
      />
    </div>
  );
}
