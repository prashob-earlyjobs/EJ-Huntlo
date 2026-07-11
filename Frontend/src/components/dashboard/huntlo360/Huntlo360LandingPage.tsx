"use client";

import { useCallback, useEffect, useState } from "react";

import { OutreachModeCard } from "@/components/dashboard/outreach/OutreachModeCard";
import { Huntlo360JourneyBar } from "@/components/dashboard/huntlo360/Huntlo360JourneyBar";
import type { OutreachCampaignRow, OutreachCampaignStatus } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";
import { fetchOutreachModuleCampaigns } from "@/lib/outreachModuleCampaignsApi";

type Props = {
  reloadToken?: number;
  onStartSingle: () => void;
  onStartMulti: () => void;
  onViewCampaign: (id: string, status: OutreachCampaignStatus) => void;
};

function formatModeLabel(mode: OutreachCampaignRow["mode"]) {
  return mode === "multi" ? "Multi channel" : "Single channel";
}

const FLOW_STEPS = [
  {
    icon: "send",
    title: "Reach candidates",
    description: "Launch personalized email or WhatsApp outreach with AI-generated follow-ups.",
  },
  {
    icon: "auto_awesome",
    title: "Qualify with AI",
    description: "Automatic replies handle interest screening and conversation flow.",
  },
  {
    icon: "event_available",
    title: "Book interviews",
    description: "Interested candidates receive your Calendly link and book directly.",
  },
] as const;

function statusClass(status: string) {
  return `dashboard-outreach-table-status dashboard-outreach-table-status--${status}`;
}

function formatStatusLabel(status: string) {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function Huntlo360LandingPage({
  reloadToken = 0,
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
      setError("Sign in to view your Huntlo 360 flows.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await fetchOutreachModuleCampaigns(auth.token, {
        limit: 20,
        sourceModule: "huntlo360",
      });
      setCampaigns(result.campaigns);
    } catch (err) {
      setCampaigns([]);
      setError(err instanceof Error ? err.message : "Failed to load flows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns, reloadToken]);

  const hasFlows = campaigns.length > 0;

  return (
    <div className="dashboard-huntlo360-landing">
      <section className="dashboard-huntlo360-hero-card">
        <div className="dashboard-huntlo360-hero-grid">
          <div className="dashboard-huntlo360-hero-copy">
            <span className="dashboard-huntlo360-badge">
              <MaterialIcon name="hub" className="text-sm" />
              Huntlo 360
            </span>
            <h1 className="dashboard-huntlo360-title">Outreach to interview, one flow</h1>
            <p className="dashboard-huntlo360-lead">
              Run outreach, auto-qualify candidates, send Calendly links, and track booked
              interviews — all in a single guided workflow.
            </p>
            <div className="dashboard-huntlo360-hero-actions">
              <button type="button" className={dashboardBtnPrimaryClass} onClick={onStartSingle}>
                <MaterialIcon name="add" className="text-sm" />
                Start new flow
              </button>
            </div>
          </div>
          <div className="dashboard-huntlo360-hero-visual" aria-hidden>
            <div className="dashboard-huntlo360-hero-orbit">
              <span className="dashboard-huntlo360-hero-orbit-node dashboard-huntlo360-hero-orbit-node--send">
                <MaterialIcon name="send" />
              </span>
              <span className="dashboard-huntlo360-hero-orbit-node dashboard-huntlo360-hero-orbit-node--calendar">
                <MaterialIcon name="event_available" />
              </span>
              <span className="dashboard-huntlo360-hero-orbit-node dashboard-huntlo360-hero-orbit-node--track">
                <MaterialIcon name="insights" />
              </span>
            </div>
          </div>
        </div>
        <Huntlo360JourneyBar activePhase="outreach" variant="overview" />
      </section>

      <section className="dashboard-outreach-landing-section">
        <div className="dashboard-huntlo360-section-head">
          <h2 className="dashboard-huntlo360-section-title">Choose your approach</h2>
          <p className="dashboard-huntlo360-section-lead">
            Single channel for a focused flow, or multi channel to nurture across email and WhatsApp.
          </p>
        </div>
        <div className="dashboard-outreach-mode-grid">
          <OutreachModeCard
            variant="single"
            title="Single channel flow"
            description="Reach candidates on one channel, qualify with AI, and auto-send your Calendly link."
            sequencePreview={["whatsapp", "email"]}
            sequenceArrows={false}
            ctaLabel="Start single channel"
            onClick={onStartSingle}
          />
          <OutreachModeCard
            variant="multi"
            title="Multi channel flow"
            description="Automate follow-ups across email and WhatsApp when candidates do not reply."
            sequencePreview={["whatsapp", "email", "whatsapp"]}
            sequenceArrows
            ctaLabel="Start multi channel"
            onClick={onStartMulti}
          />
        </div>
      </section>

      <section className="dashboard-huntlo360-how-section">
        <div className="dashboard-huntlo360-section-head">
          <h2 className="dashboard-huntlo360-section-title">How it works</h2>
          <p className="dashboard-huntlo360-section-lead">
            Three connected stages from first touch to confirmed interview.
          </p>
        </div>
        <div className="dashboard-huntlo360-steps-grid">
          {FLOW_STEPS.map((step, index) => (
            <article key={step.title} className="dashboard-huntlo360-step-card">
              <div className="dashboard-huntlo360-step-card-top">
                <span className="dashboard-huntlo360-step-index">{index + 1}</span>
                <span className="dashboard-huntlo360-step-icon" aria-hidden>
                  <MaterialIcon name={step.icon} />
                </span>
              </div>
              <h3 className="dashboard-huntlo360-step-title">{step.title}</h3>
              <p className="dashboard-huntlo360-step-desc">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-huntlo360-flows-section">
        <div className="dashboard-huntlo360-section-head dashboard-huntlo360-section-head--row">
          <div>
            <h2 className="dashboard-huntlo360-section-title">Your flows</h2>
            <p className="dashboard-huntlo360-section-lead">
              Resume drafts or open live flows from your workspace.
            </p>
          </div>
          {!loading && hasFlows ? (
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} dashboard-btn-secondary--sm`}
              onClick={() => void loadCampaigns()}
            >
              <MaterialIcon name="refresh" className="text-sm" />
              Refresh
            </button>
          ) : null}
        </div>

        <div className="dashboard-huntlo360-flows-panel">
          {loading ? (
            <div className="dashboard-outreach-landing-loading" role="status" aria-live="polite">
              <span className="dashboard-outreach-landing-loading-spinner" aria-hidden />
              Loading flows…
            </div>
          ) : error ? (
            <div className="dashboard-outreach-empty-state">
              <MaterialIcon name="error_outline" />
              <p>{error}</p>
              <button type="button" className={dashboardBtnPrimaryClass} onClick={() => void loadCampaigns()}>
                Try again
              </button>
            </div>
          ) : !hasFlows ? (
            <div className="dashboard-outreach-empty-state">
              <MaterialIcon name="hub" />
              <p>No Huntlo 360 flows yet. Start one to combine outreach and scheduling.</p>
              <button type="button" className={dashboardBtnPrimaryClass} onClick={onStartSingle}>
                <MaterialIcon name="add" className="text-sm" />
                Start new flow
              </button>
            </div>
          ) : (
            <div className="dashboard-outreach-table-wrap">
              <table className="dashboard-outreach-table">
                <thead>
                  <tr>
                    <th>Flow</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Candidates</th>
                    <th>Response</th>
                    <th>Created</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((row) => (
                    <tr
                      key={row.id}
                      className="dashboard-outreach-table-row dashboard-outreach-table-row--clickable"
                      onClick={() => onViewCampaign(row.id, row.status)}
                    >
                      <td>
                        <div className="dashboard-outreach-table-campaign">
                          <strong>{row.name}</strong>
                          <span className="dashboard-huntlo360-table-tag">Huntlo 360</span>
                        </div>
                      </td>
                      <td>
                        <span className="dashboard-outreach-table-mode">{formatModeLabel(row.mode)}</span>
                      </td>
                      <td>
                        <span className={statusClass(row.status)}>{formatStatusLabel(row.status)}</span>
                      </td>
                      <td>{row.candidates}</td>
                      <td>{row.responseRate || "—"}</td>
                      <td className="dashboard-outreach-table-date">{row.createdDate}</td>
                      <td className="dashboard-outreach-table-actions">
                        <MaterialIcon name="chevron_right" className="text-base" />
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
