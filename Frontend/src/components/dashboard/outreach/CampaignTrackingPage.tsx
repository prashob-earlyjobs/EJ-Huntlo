"use client";

import { useCallback, useEffect, useState } from "react";

import { CampaignFunnel, CampaignFunnelToggle } from "@/components/dashboard/outreach/CampaignFunnel";
import { CampaignSequenceFlowPanel } from "@/components/dashboard/outreach/CampaignSequenceFlowPanel";
import { CampaignStatsCard } from "@/components/dashboard/outreach/CampaignStatsCard";
import { CampaignScheduledInterviewsSection } from "@/components/dashboard/outreach/CampaignScheduledInterviewsSection";
import { CampaignTrackingSkeleton } from "@/components/dashboard/outreach/CampaignTrackingSkeleton";
import { CampaignTrackingTable } from "@/components/dashboard/outreach/CampaignTrackingTable";
import { CandidateInteractionDrawer } from "@/components/dashboard/outreach/CandidateInteractionDrawer";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import {
  fetchCampaignScheduledInterviews,
  fetchOutreachModuleCampaignTracking,
  pauseOutreachModuleCampaign,
  recordOutreachModuleCandidateAction,
  resumeOutreachModuleCampaign,
  syncCampaignScheduledInterviews,
} from "@/lib/outreachModuleCampaignsApi";
import type {
  CampaignCalendlyConfig,
  CampaignDetailStats,
  CampaignScheduledInterview,
  CampaignTrackingCandidate,
  OutreachCampaignRow,
  SequenceStep,
} from "@/components/dashboard/outreach/types";

type Props = {
  campaignId: string;
  onBack: () => void;
  onToast: (message: string) => void;
  backLabel?: string;
  scheduleFirst?: boolean;
};

function exportCandidatesCsv(rows: CampaignTrackingCandidate[], campaignName: string) {
  const headers = ["Name", "Role", "Email", "Phone", "Channel", "Last step", "Status", "Interest", "Last response", "Next action"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.role,
        row.email,
        row.phone,
        row.channel,
        row.lastStep,
        row.status,
        row.interest,
        row.lastResponse,
        row.nextAction,
      ]
        .map((cell) => escape(String(cell ?? "")))
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${campaignName.replace(/[^\w.-]+/g, "_") || "campaign"}_candidates.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CampaignTrackingPage({
  campaignId,
  onBack,
  onToast,
  backLabel = "Back to outreach",
  scheduleFirst = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<OutreachCampaignRow | null>(null);
  const [stats, setStats] = useState<CampaignDetailStats | null>(null);
  const [funnel, setFunnel] = useState<{ label: string; count: number }[]>([]);
  const [candidates, setCandidates] = useState<CampaignTrackingCandidate[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [interactionRefreshKey, setInteractionRefreshKey] = useState(0);
  const [funnelOpen, setFunnelOpen] = useState(false);
  const [scheduledInterviews, setScheduledInterviews] = useState<CampaignScheduledInterview[]>([]);
  const [calendlyConfig, setCalendlyConfig] = useState<CampaignCalendlyConfig>({
    enabled: false,
    meetingName: "",
    schedulingUrl: "",
  });
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [interviewsSyncing, setInterviewsSyncing] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [whatsappReplyQuestions, setWhatsappReplyQuestions] = useState<string[]>([]);
  const [sequenceFlowOpen, setSequenceFlowOpen] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const loadScheduledInterviews = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setInterviewsLoading(false);
      return;
    }
    setInterviewsLoading(true);
    try {
      const data = await fetchCampaignScheduledInterviews(auth.token, campaignId);
      setScheduledInterviews(data.interviews);
      setCalendlyConfig(data.calendly);
    } catch {
      setScheduledInterviews([]);
    } finally {
      setInterviewsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadScheduledInterviews();
  }, [loadScheduledInterviews]);

  const applyTrackingData = useCallback(
    (data: Awaited<ReturnType<typeof fetchOutreachModuleCampaignTracking>>) => {
      setCampaign(data.campaign);
      setStats(data.stats);
      setFunnel(data.funnel);
      setCandidates(data.candidates);
      setSequenceSteps(data.sequenceSteps ?? []);
      setWhatsappReplyQuestions(data.whatsappReplyQuestions ?? []);
    },
    []
  );

  const loadTracking = useCallback(
    async (options?: { syncReplies?: boolean; silent?: boolean }) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setError("Sign in to view campaign tracking.");
        setLoading(false);
        return false;
      }

      if (!options?.silent) {
        setLoading(true);
        setError("");
      }
      try {
        const data = await fetchOutreachModuleCampaignTracking(auth.token, campaignId, options);
        applyTrackingData(data);
        return true;
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load campaign tracking.");
        }
        return false;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [applyTrackingData, campaignId]
  );

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  const handleManualRefresh = async () => {
    setRefreshBusy(true);
    try {
      const ok = await loadTracking({ syncReplies: true, silent: true });
      onToast(ok ? "Tracking data refreshed" : "Could not refresh tracking data.");
    } finally {
      setRefreshBusy(false);
    }
  };

  const selectedCandidate = candidates.find((c) => c.id === drawerId) ?? null;

  const handleTogglePause = async () => {
    const auth = getStoredAuth();
    if (!auth?.token || !campaign) return;

    setStatusBusy(true);
    try {
      if (campaign.status === "active") {
        const updated = await pauseOutreachModuleCampaign(auth.token, campaignId);
        setCampaign((current) => (current ? { ...current, status: updated.status } : current));
        onToast("Campaign paused");
      } else if (campaign.status === "paused") {
        const updated = await resumeOutreachModuleCampaign(auth.token, campaignId);
        setCampaign((current) => (current ? { ...current, status: updated.status } : current));
        onToast("Campaign resumed");
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update campaign status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleExport = () => {
    if (!campaign || candidates.length === 0) {
      onToast("No candidates to export.");
      return;
    }
    exportCandidatesCsv(candidates, campaign.name);
    onToast("Candidate export downloaded");
  };

  const handleCandidateAction = async (action: string) => {
    const auth = getStoredAuth();
    if (!auth?.token || !drawerId) return;

    let note: string | undefined;
    if (action === "note") {
      const input = window.prompt("Add a note for this candidate:");
      if (!input?.trim()) return;
      note = input.trim();
    }

    try {
      const result = await recordOutreachModuleCandidateAction(auth.token, campaignId, drawerId, {
        action: action as "screening" | "interview" | "not_interested" | "note" | "send_scheduling_link",
        note,
      });
      setStats(result.stats);
      setFunnel(result.funnel);
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === result.candidate.id ? result.candidate : candidate
        )
      );
      setInteractionRefreshKey((key) => key + 1);
      void loadScheduledInterviews();
      if (result.schedulingUrl) {
        const parts = [];
        if (result.emailSent) parts.push("email");
        if (result.whatsappSent) parts.push("WhatsApp");
        onToast(
          parts.length
            ? `Calendly link sent via ${parts.join(" and ")}`
            : "Calendly scheduling link sent"
        );
      } else {
        onToast("Candidate updated");
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not update candidate.");
    }
  };

  const handleSyncInterviews = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    setInterviewsSyncing(true);
    try {
      const data = await syncCampaignScheduledInterviews(auth.token, campaignId);
      setScheduledInterviews(data.interviews);
      setCalendlyConfig(data.calendly);
      await loadTracking({ syncReplies: true });
      onToast(data.message || "Calendly bookings synced");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not sync Calendly bookings.");
    } finally {
      setInterviewsSyncing(false);
    }
  };

  if (loading) {
    return <CampaignTrackingSkeleton />;
  }

  if (error || !campaign || !stats) {
    return (
      <div className="dashboard-outreach-empty-state">
        <MaterialIcon name="error_outline" />
        <p>{error || "Campaign not found."}</p>
        <button type="button" className={dashboardBtnPrimaryClass} onClick={onBack}>
          {backLabel}
        </button>
      </div>
    );
  }

  const canToggleStatus = campaign.status === "active" || campaign.status === "paused";

  return (
    <div className="dashboard-outreach-tracking">
      <header className="dashboard-outreach-tracking-header">
        <button type="button" className="dashboard-outreach-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          {backLabel}
        </button>
        <div className="dashboard-outreach-tracking-title-row">
          <div>
            <h1 className="dashboard-section-title">{campaign.name}</h1>
            <div className="dashboard-outreach-tracking-meta">
              <span
                className={`dashboard-outreach-table-status dashboard-outreach-table-status--${campaign.status}`}
              >
                {campaign.status}
              </span>
              <span>{campaign.mode === "multi" ? "Multi Channel" : "Single Channel"}</span>
              {campaign.responseRate && campaign.responseRate !== "-" ? (
                <span>{campaign.responseRate} response rate</span>
              ) : null}
            </div>
          </div>
          <div className="dashboard-outreach-tracking-actions">
            <button
              type="button"
              className={dashboardBtnSecondaryClass}
              onClick={() => void handleManualRefresh()}
              disabled={refreshBusy}
            >
              <MaterialIcon name="refresh" className="text-sm" />
              {refreshBusy ? "Refreshing…" : "Refresh"}
            </button>
            {canToggleStatus ? (
              <button
                type="button"
                className={dashboardBtnSecondaryClass}
                onClick={() => void handleTogglePause()}
                disabled={statusBusy}
              >
                {statusBusy
                  ? "Updating…"
                  : campaign.status === "active"
                    ? "Pause campaign"
                    : "Resume campaign"}
              </button>
            ) : null}
            <button type="button" className={dashboardBtnSecondaryClass} onClick={handleExport}>
              Export
            </button>
          </div>
        </div>
      </header>

      <section className="dashboard-outreach-stats-grid dashboard-outreach-stats-grid--dense">
        <CampaignStatsCard label="Total candidates" value={stats.total} icon="groups" />
        <CampaignStatsCard label="Sent" value={stats.sent} icon="send" />
        <CampaignStatsCard label="Delivered" value={stats.delivered} icon="done_all" />
        <CampaignStatsCard label="Replied" value={stats.replied} icon="reply" />
        <CampaignStatsCard label="Interested" value={stats.interested} icon="thumb_up" />
        <CampaignStatsCard label="Not interested" value={stats.notInterested} icon="thumb_down" />
        <CampaignStatsCard label="No response" value={stats.noResponse} icon="hourglass_empty" />
      </section>

      {campaign.mode === "multi" && sequenceSteps.length > 0 && sequenceFlowOpen ? (
        <CampaignSequenceFlowPanel
          steps={sequenceSteps}
          whatsappReplyQuestions={whatsappReplyQuestions}
          title="Live sequence flow"
          lead="Reply vs. no-reply paths for this launched campaign. Use Refresh to update candidate counts."
          variant="live"
          candidates={candidates}
          onHide={() => setSequenceFlowOpen(false)}
        />
      ) : null}

      {funnelOpen && funnel.length > 0 ? (
        <CampaignFunnel stages={funnel} onClose={() => setFunnelOpen(false)} />
      ) : null}

      {scheduleFirst ? (
        <CampaignScheduledInterviewsSection
          interviews={scheduledInterviews}
          calendly={calendlyConfig}
          loading={interviewsLoading}
          syncing={interviewsSyncing}
          onSync={() => void handleSyncInterviews()}
          onViewCandidate={setDrawerId}
        />
      ) : null}

      <section className="dashboard-outreach-tracking-table-section">
        <div className="dashboard-outreach-tracking-section-head">
          <h2 className="dashboard-outreach-subsection-title">Candidates</h2>
          <div className="dashboard-outreach-tracking-section-actions">
            {campaign.mode === "multi" && sequenceSteps.length > 0 && !sequenceFlowOpen ? (
              <button
                type="button"
                className={`${dashboardBtnSecondaryClass} dashboard-outreach-sequence-flow-toggle-btn`}
                onClick={() => setSequenceFlowOpen(true)}
                aria-expanded={false}
              >
                <MaterialIcon name="route" className="text-sm" />
                View sequence flow
              </button>
            ) : null}
            {!funnelOpen && funnel.length > 0 ? (
              <CampaignFunnelToggle onClick={() => setFunnelOpen(true)} />
            ) : null}
          </div>
        </div>
        <CampaignTrackingTable rows={candidates} onView={setDrawerId} />
      </section>

      {!scheduleFirst ? (
        <CampaignScheduledInterviewsSection
          interviews={scheduledInterviews}
          calendly={calendlyConfig}
          loading={interviewsLoading}
          syncing={interviewsSyncing}
          onSync={() => void handleSyncInterviews()}
          onViewCandidate={setDrawerId}
        />
      ) : null}

      <CandidateInteractionDrawer
        campaignId={campaignId}
        candidate={selectedCandidate}
        calendlyEnabled={calendlyConfig.enabled}
        open={Boolean(drawerId)}
        refreshKey={interactionRefreshKey}
        onClose={() => setDrawerId(null)}
        onAction={(action) => void handleCandidateAction(action)}
      />
    </div>
  );
}
