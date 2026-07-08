"use client";

import { ReportExportCard } from "@/components/dashboard/schedule/RescheduleAndReports";
import { mockReports } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  onBack: () => void;
  onToast: (msg: string) => void;
};

export function ScheduleReportsPage({ onBack, onToast }: Props) {
  return (
    <div className="dashboard-schedule-reports-page">
      <header className="dashboard-schedule-builder-header">
        <button type="button" className="dashboard-schedule-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to schedule
        </button>
        <div>
          <h1 className="dashboard-section-title">Interview reports</h1>
          <p className="dashboard-text-body">Export interview data and performance reports.</p>
        </div>
      </header>

      <div className="dashboard-schedule-reports-grid">
        {mockReports.map((r) => (
          <ReportExportCard
            key={r.id}
            title={r.title}
            description={r.description}
            onExport={(format) => onToast(`Exporting ${r.title} as ${format.toUpperCase()} (UI preview)`)}
          />
        ))}
      </div>
    </div>
  );
}
