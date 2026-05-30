"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignRecord } from "@/lib/campaigns";
import type { CampaignsListSummary } from "@/lib/campaignsApi";

function formatCampaignWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { primary: "—", title: "" };
  }
  const title = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  let primary: string;
  if (mins < 1) primary = "Just now";
  else if (mins < 60) primary = `${mins}m ago`;
  else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) primary = `${hours}h ago`;
    else {
      const days = Math.floor(hours / 24);
      if (days < 7) primary = `${days}d ago`;
      else {
        primary = date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year:
            date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
        });
      }
    }
  }
  return { primary, title };
}

function truncateCampaignName(name: string, maxLength = 25): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

function statusPillClass(status?: CampaignRecord["outreachStatus"]) {
  if (status === "active") return "dashboard-campaign-report-status-pill--active";
  if (status === "paused") return "dashboard-campaign-report-status-pill--paused";
  if (status === "completed") return "dashboard-campaign-report-status-pill--completed";
  return "dashboard-campaign-report-status-pill--idle";
}

function statusLabel(status?: CampaignRecord["outreachStatus"]) {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return "Draft";
}

type Props = {
  campaigns: CampaignRecord[];
  summary: CampaignsListSummary;
  loading?: boolean;
  onOpenCampaign: (campaignId: string) => void;
};

export function CampaignsListTable({
  campaigns,
  summary,
  loading = false,
  onOpenCampaign,
}: Props) {

  return (
    <>
      <div className="dashboard-campaigns-summary" aria-label="Campaign overview">
        <div className="dashboard-campaigns-summary-card">
          <span className="dashboard-campaigns-summary-icon" aria-hidden>
            <MaterialIcon name="flag" className="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="dashboard-campaigns-summary-value tabular-nums">
              {summary.total.toLocaleString()}
            </p>
            <p className="dashboard-campaigns-summary-label">Campaigns</p>
          </div>
        </div>
        <div className="dashboard-campaigns-summary-card">
          <span
            className="dashboard-campaigns-summary-icon dashboard-campaigns-summary-icon--active"
            aria-hidden
          >
            <MaterialIcon name="play_circle" className="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="dashboard-campaigns-summary-value tabular-nums">
              {summary.active.toLocaleString()}
            </p>
            <p className="dashboard-campaigns-summary-label">Active</p>
          </div>
        </div>
        <div className="dashboard-campaigns-summary-card">
          <span
            className="dashboard-campaigns-summary-icon dashboard-campaigns-summary-icon--contacts"
            aria-hidden
          >
            <MaterialIcon name="groups" className="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="dashboard-campaigns-summary-value tabular-nums">
              {summary.contacts.toLocaleString()}
            </p>
            <p className="dashboard-campaigns-summary-label">Contacts</p>
          </div>
        </div>
      </div>

      <div className="dashboard-campaigns-table-shell">
        <p className="dashboard-campaigns-table-scroll-hint" aria-hidden="true">
          Swipe sideways to see all columns
        </p>
        <div
          className={`dashboard-thin-scrollbar dashboard-campaigns-table-scroll${loading ? " dashboard-campaigns-table-scroll--loading" : ""}`}
          aria-busy={loading}
          tabIndex={0}
          role="region"
          aria-label="Campaigns table. Scroll horizontally on small screens to see all columns."
        >
          <div className="dashboard-table-wrap dashboard-table-wrap--scroll-x">
            <table className="dashboard-table dashboard-table--campaigns" role="grid">
            <thead>
              <tr>
                <th scope="col">Campaign</th>
                <th scope="col">Channel</th>
                <th scope="col" className="tabular-nums">
                  Contacts
                </th>
                <th scope="col" className="tabular-nums">
                  Sent / progress
                </th>
                <th scope="col" className="tabular-nums">
                  Interested
                </th>
                <th scope="col">Last activity</th>
                <th scope="col">Status</th>
                <th scope="col" className="dashboard-campaigns-table-action-col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const when = formatCampaignWhen(campaign.createdAt);
                const activityWhen = formatCampaignWhen(
                  campaign.lastActivityAt || campaign.createdAt
                );
                const isWhatsApp = campaign.outreachChannel === "whatsapp";
                const contactCount = campaign.contacts.length;
                const contactsSent = campaign.contactsSent ?? 0;
                const interestedCount = campaign.interestedCount ?? 0;
                return (
                  <tr
                    key={campaign.id}
                    className="dashboard-table-row--clickable"
                    tabIndex={0}
                    onClick={() => onOpenCampaign(campaign.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenCampaign(campaign.id);
                      }
                    }}
                    aria-label={`Open campaign ${campaign.name}`}
                  >
                    <td>
                      <div className="dashboard-campaigns-name-cell">
                        <span className="dashboard-campaigns-avatar" aria-hidden>
                          <MaterialIcon name="flag" className="text-lg" />
                        </span>
                        <div className="min-w-0">
                          <p
                            className="dashboard-campaigns-name"
                            title={campaign.name.length > 25 ? campaign.name : undefined}
                          >
                            {truncateCampaignName(campaign.name)}
                          </p>
                          <p
                            className="dashboard-campaigns-meta truncate"
                            title={when.title || undefined}
                          >
                            Created {when.primary}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="dashboard-campaigns-channel-label">
                        {isWhatsApp ? "WhatsApp" : "Email"}
                      </span>
                    </td>
                    <td className="tabular-nums">
                      <span className="dashboard-campaigns-metric">
                        {contactCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="tabular-nums">
                      <span
                        className="dashboard-campaigns-metric dashboard-campaigns-metric--progress"
                        title={`${contactsSent.toLocaleString()} of ${contactCount.toLocaleString()} contacts messaged`}
                      >
                        {contactCount > 0
                          ? `${contactsSent.toLocaleString()} / ${contactCount.toLocaleString()}`
                          : "—"}
                      </span>
                    </td>
                    <td className="tabular-nums">
                      <span
                        className={`dashboard-campaigns-metric${
                          interestedCount > 0 ? " dashboard-campaigns-metric--interested" : ""
                        }`}
                      >
                        {interestedCount > 0 ? interestedCount.toLocaleString() : "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="dashboard-campaigns-activity"
                        title={activityWhen.title || undefined}
                      >
                        {activityWhen.primary}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`dashboard-campaign-report-status-pill ${statusPillClass(campaign.outreachStatus)}`}
                      >
                        {statusLabel(campaign.outreachStatus)}
                      </span>
                    </td>
                    <td className="dashboard-campaigns-table-action-col">
                      <MaterialIcon
                        name="chevron_right"
                        className="dashboard-campaigns-row-chevron"
                        aria-hidden
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </>
  );
}
