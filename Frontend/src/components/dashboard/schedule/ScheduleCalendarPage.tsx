"use client";

import { useMemo, useState } from "react";

import { InterviewCalendar } from "@/components/dashboard/schedule/InterviewCalendar";
import { InterviewDetailsDrawer } from "@/components/dashboard/schedule/InterviewDetailsDrawer";
import type { ScheduleUpcomingInterview } from "@/lib/scheduleApi";
import { upcomingToCalendarEvent, upcomingToInterviewDetail } from "@/lib/scheduleMappers";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  interviews: ScheduleUpcomingInterview[];
  loading?: boolean;
  calendlyConnected?: boolean;
  onBack: () => void;
  onScheduleInterview: () => void;
  onSync: () => void;
  onConnectCalendar: () => void;
  onToast: (msg: string) => void;
};

export function ScheduleCalendarPage({
  interviews,
  loading = false,
  calendlyConnected = false,
  onBack,
  onScheduleInterview,
  onSync,
  onConnectCalendar,
  onToast,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = useMemo(() => interviews.map(upcomingToCalendarEvent), [interviews]);

  const selectedInterview = useMemo(() => {
    if (!selectedId) return null;
    const row = interviews.find((i) => i.id === selectedId);
    return row ? upcomingToInterviewDetail(row) : null;
  }, [interviews, selectedId]);

  const selectedRow = useMemo(
    () => (selectedId ? interviews.find((i) => i.id === selectedId) : null),
    [interviews, selectedId]
  );

  return (
    <div className="dashboard-schedule-calendar-page">
      <header className="dashboard-schedule-calendar-page-header">
        <button type="button" className="dashboard-schedule-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to schedule
        </button>
        <div className="dashboard-schedule-calendar-page-title">
          <h1 className="dashboard-section-title">Interview calendar</h1>
          <p className="dashboard-text-body">
            Calendly bookings from direct imports and outreach campaigns.
          </p>
        </div>
      </header>

      <InterviewCalendar
        events={events}
        loading={loading}
        calendlyConnected={calendlyConnected}
        onScheduleInterview={onScheduleInterview}
        onSync={onSync}
        onConnectCalendar={onConnectCalendar}
        onSelectEvent={setSelectedId}
      />

      <InterviewDetailsDrawer
        interview={selectedInterview}
        open={Boolean(selectedId && selectedInterview)}
        onClose={() => setSelectedId(null)}
        onAction={(action) => {
          if (action === "reschedule" && selectedRow?.rescheduleUrl) {
            window.open(selectedRow.rescheduleUrl, "_blank", "noreferrer");
            return;
          }
          if (action === "cancel" && selectedRow?.cancelUrl) {
            window.open(selectedRow.cancelUrl, "_blank", "noreferrer");
            return;
          }
          onToast("This action is not available for Calendly bookings yet.");
        }}
      />
    </div>
  );
}
