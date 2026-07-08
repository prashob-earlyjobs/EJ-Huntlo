"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = { label: string; value: string | number; icon?: string };

export function ScheduleStatsCard({ label, value, icon = "insights" }: Props) {
  return (
    <div className="dashboard-schedule-stat-card">
      <span className="dashboard-schedule-stat-icon"><MaterialIcon name={icon} /></span>
      <div>
        <span className="dashboard-schedule-stat-value">{value}</span>
        <span className="dashboard-schedule-stat-label">{label}</span>
      </div>
    </div>
  );
}
