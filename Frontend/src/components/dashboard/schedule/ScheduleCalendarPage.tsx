"use client";

import { useState } from "react";

import { InterviewCalendar } from "@/components/dashboard/schedule/InterviewCalendar";
import { InterviewDetailsDrawer } from "@/components/dashboard/schedule/InterviewDetailsDrawer";
import { mockCalendarEvents, mockInterviewDetail } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  onBack: () => void;
  onScheduleInterview: () => void;
  onToast: (msg: string) => void;
};

export function ScheduleCalendarPage({ onBack, onScheduleInterview, onToast }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="dashboard-schedule-calendar-page">
      <header className="dashboard-schedule-builder-header">
        <button type="button" className="dashboard-schedule-back-btn" onClick={onBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          Back to schedule
        </button>
        <div>
          <h1 className="dashboard-section-title">Interview calendar</h1>
          <p className="dashboard-text-body">View and manage scheduled interviews.</p>
        </div>
      </header>

      <InterviewCalendar
        events={mockCalendarEvents}
        onScheduleInterview={onScheduleInterview}
        onExport={() => onToast("Calendar export started (UI preview)")}
        onConnectCalendar={() => onToast("Connect calendar (UI preview)")}
        onSelectEvent={() => setDrawerOpen(true)}
      />

      <InterviewDetailsDrawer
        interview={mockInterviewDetail}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAction={(action) => {
          console.log("interview action", action);
          onToast(`Action: ${action} (UI preview)`);
        }}
      />
    </div>
  );
}
