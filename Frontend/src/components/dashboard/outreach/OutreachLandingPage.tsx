"use client";

import { useCallback, useEffect, useState } from "react";

import { OutreachModeCard } from "@/components/dashboard/outreach/OutreachModeCard";
import type { OutreachCampaignRow, OutreachCampaignStatus } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import { fetchOutreachModuleCampaigns } from "@/lib/outreachModuleCampaignsApi";

type Props = {
  reloadToken?: number;
  onNewCampaign: () => void;
  onStartSingle: () => void;
  onStartMulti: () => void;
  onViewCampaign: (id: string, status: OutreachCampaignStatus) => void;
};

function statusClass(status: string) {
  return `dashboard-outreach-table-status dashboard-outreach-table-status--${status}`;
}

function formatStatusLabel(status: string) {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatChannels(channels: string[]) {
  if (!channels.length) return "—";
  return channels.join(", ");
}

function formatModeLabel(mode: OutreachCampaignRow["mode"]) {
  return mode === "multi" ? "Multi channel" : "Single channel";
}

export function OutreachLandingPage({
  reloadToken = 0,
  onNewCampaign,
  onStartSingle,
  onStartMulti,
  onViewCampaign,
}: Props) {
  const [campaigns, setCampaigns] = useState<OutreachCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCampaigns = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setCampaigns([]);
      setError("Sign in to view your outreach campaigns.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await fetchOutreachModuleCampaigns(auth.token, { limit: 20 });
      setCampaigns(result.campaigns);
    } catch (err) {
      setCampaigns([]);
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns, reloadToken]);

  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="dashboard-outreach-landing">
      <header className="dashboard-outreach-landing-header">
        <div>
          <h1 className="dashboard-outreach-landing-section-title">Choose your approach</h1>
          <p className="dashboard-outreach-landing-section-lead">
            Start with a single channel for speed, or build a multi-step sequence for nurture
            campaigns.
          </p>
        </div>
        <button type="button" className={dashboardBtnPrimaryClass} onClick={onNewCampaign}>
          <MaterialIcon name="add" className="text-sm" />
          New campaign
        </button>
      </header>

      <section className="dashboard-outreach-landing-section">
        <div className="dashboard-outreach-mode-grid">
          <OutreachModeCard
            variant="single"
            title="Single channel outreach"
            description="Run a focused campaign on one channel with a streamlined setup."
            sequencePreview={["whatsapp", "email", "voice"]}
            sequenceArrows={false}
            ctaLabel="Start single channel"
            onClick={onStartSingle}
          />
          <OutreachModeCard
            variant="multi"
            title="Multi channel outreach"
            description="Automate follow-ups across channels when candidates do not reply."
            sequencePreview={["whatsapp", "email", "whatsapp", "voice"]}
            sequenceArrows
            ctaLabel="Start multi channel"
            onClick={onStartMulti}
          />
        </div>
      </section>

      <section className="dashboard-outreach-landing-section dashboard-outreach-recent">
        <div className="dashboard-outreach-recent-header">
          <div>
            <h2 className="dashboard-outreach-landing-section-title">Recent campaigns</h2>
            <p className="dashboard-outreach-landing-section-lead">
              Resume drafts or open live campaigns from your workspace.
            </p>
          </div>
          {!loading && hasCampaigns ? (
            <div className="dashboard-outreach-recent-header-actions">
              <button
                type="button"
                className={`${dashboardBtnSecondaryClass} dashboard-btn-secondary--sm`}
                onClick={() => void loadCampaigns()}
              >
                <MaterialIcon name="refresh" className="text-sm" />
                Refresh
              </button>
            </div>
          ) : null}
        </div>

        <div className="dashboard-outreach-recent-panel">
          {loading ? (
            <div className="dashboard-outreach-landing-loading" role="status" aria-live="polite">
              <span className="dashboard-outreach-landing-loading-spinner" aria-hidden />
              Loading campaigns…
            </div>
          ) : error ? (
            <div className="dashboard-outreach-empty-state">
              <MaterialIcon name="error_outline" />
              <p>{error}</p>
              <button type="button" className={dashboardBtnPrimaryClass} onClick={() => void loadCampaigns()}>
                Try again
              </button>
            </div>
          ) : !hasCampaigns ? (
            <div className="dashboard-outreach-empty-state">
              <MaterialIcon name="inbox" />
              <p>No campaigns yet. Create your first outreach campaign to get started.</p>
              <button type="button" className={dashboardBtnPrimaryClass} onClick={onNewCampaign}>
                <MaterialIcon name="add" className="text-sm" />
                New campaign
              </button>
            </div>
          ) : (
            <div className="dashboard-outreach-table-wrap">
              <table className="dashboard-outreach-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Mode</th>
                    <th>Channels</th>
                    <th>Candidates</th>
                    <th>Status</th>
                    <th>Response</th>
                    <th>Created</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="dashboard-outreach-table-campaign">
                          <strong>{row.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="dashboard-outreach-table-mode">{formatModeLabel(row.mode)}</span>
                      </td>
                      <td>{formatChannels(row.channels)}</td>
                      <td>{row.candidates}</td>
                      <td>
                        <span className={statusClass(row.status)}>{formatStatusLabel(row.status)}</span>
                      </td>
                      <td>{row.responseRate}</td>
                      <td className="dashboard-outreach-table-date">{row.createdDate}</td>
                      <td className="dashboard-outreach-table-actions">
                        <button
                          type="button"
                          className={`${dashboardBtnSecondaryClass} dashboard-btn-secondary--sm`}
                          onClick={() => onViewCampaign(row.id, row.status)}
                        >
                          {row.status === "draft" ? "Continue" : "View"}
                          <MaterialIcon name="arrow_forward" className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
