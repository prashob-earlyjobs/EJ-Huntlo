"use client";

import { ScheduleReminderSettingsPanel } from "@/components/dashboard/schedule/ScheduleReminderSettingsPanel";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  onBack: () => void;
  onToast?: (message: string) => void;
};

export function ScheduleReminderSettingsPage({ onBack, onToast }: Props) {
  return (
    <div className="dashboard-schedule-reminder-page">
      <button type="button" className="dashboard-schedule-back-btn" onClick={onBack}>
        <MaterialIcon name="arrow_back" className="text-sm" />
        Back to schedule
      </button>

      <header className="dashboard-schedule-reminder-page-header">
        <div className="dashboard-schedule-reminder-page-title-row">
          <span className="dashboard-schedule-reminder-page-icon" aria-hidden>
            <MaterialIcon name="notifications_active" />
          </span>
          <div>
            <h1 className="dashboard-section-title">Interview reminders</h1>
            <p className="dashboard-text-body dashboard-schedule-reminder-page-lead">
              Choose when Huntlo notifies you before interviews, and which channels to use when
              sending Calendly links to candidates.
            </p>
          </div>
        </div>
      </header>

      <ScheduleReminderSettingsPanel onToast={onToast} embedded={false} />
    </div>
  );
}
