"use client";

import { useMemo, useState } from "react";

import {
  RescheduleDrawer,
  RescheduleRequestTable,
} from "@/components/dashboard/schedule/RescheduleAndReports";
import { ScheduleStatsCard } from "@/components/dashboard/schedule/ScheduleStatsCard";
import { mockRescheduleRequests, mockRescheduleStats } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  onBack: () => void;
  onToast: (msg: string) => void;
};

export function RescheduleManagementPage({ onBack, onToast }: Props) {
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const request = useMemo(
    () => mockRescheduleRequests.find((r) => r.id === drawerId) ?? null,
    [drawerId]
  );

  return (
    <div className="dashboard-schedule-reschedule-page">
      <header className="dashboard-schedule-builder-header">
        <button type="button" className="dashboard-schedule-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to schedule
        </button>
        <div>
          <h1 className="dashboard-section-title">Reschedule requests</h1>
          <p className="dashboard-text-body">Review and manage candidate or interviewer reschedule requests.</p>
        </div>
      </header>

      <section className="dashboard-schedule-stats-grid dashboard-schedule-stats-grid--dense">
        <ScheduleStatsCard label="New requests" value={mockRescheduleStats.newRequests} icon="fiber_new" />
        <ScheduleStatsCard label="Approved" value={mockRescheduleStats.approved} icon="check_circle" />
        <ScheduleStatsCard label="Rejected" value={mockRescheduleStats.rejected} icon="cancel" />
        <ScheduleStatsCard label="Pending" value={mockRescheduleStats.pending} icon="schedule" />
      </section>

      <RescheduleRequestTable rows={mockRescheduleRequests} onManage={setDrawerId} />

      <RescheduleDrawer
        request={request}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onApprove={() => { onToast("Reschedule approved (UI preview)"); setDrawerId(null); }}
        onReject={() => { onToast("Reschedule rejected (UI preview)"); setDrawerId(null); }}
        onSuggest={() => onToast("Suggest another slot (UI preview)")}
      />
    </div>
  );
}
