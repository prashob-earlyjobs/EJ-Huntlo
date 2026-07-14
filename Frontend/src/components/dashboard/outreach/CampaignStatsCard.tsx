"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  label: string;
  value: string | number;
  icon?: string;
};

export function CampaignStatsCard({ label, value, icon = "insights" }: Props) {
  return (
    <div className="dashboard-outreach-stat-card">
      <span className="dashboard-outreach-stat-icon" aria-hidden>
        <MaterialIcon name={icon} />
      </span>
      <div className="dashboard-outreach-stat-body">
        <span className="dashboard-outreach-stat-value">{value}</span>
        <span className="dashboard-outreach-stat-label">{label}</span>
      </div>
    </div>
  );
}
