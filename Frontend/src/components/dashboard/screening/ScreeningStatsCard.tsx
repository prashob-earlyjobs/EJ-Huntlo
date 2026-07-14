"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  label: string;
  value: string | number;
  icon?: string;
};

export function ScreeningStatsCard({ label, value, icon = "insights" }: Props) {
  return (
    <div className="dashboard-screening-stat-card">
      <span className="dashboard-screening-stat-icon" aria-hidden>
        <MaterialIcon name={icon} />
      </span>
      <div>
        <span className="dashboard-screening-stat-value">{value}</span>
        <span className="dashboard-screening-stat-label">{label}</span>
      </div>
    </div>
  );
}
