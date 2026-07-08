"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { InterviewDetailsDrawer } from "@/components/dashboard/schedule/InterviewDetailsDrawer";
import { RescheduleManagementPage } from "@/components/dashboard/schedule/RescheduleManagementPage";
import { ScheduleCalendarPage } from "@/components/dashboard/schedule/ScheduleCalendarPage";
import { ScheduleInterviewBuilder } from "@/components/dashboard/schedule/ScheduleInterviewBuilder";
import { ScheduleLandingPage } from "@/components/dashboard/schedule/ScheduleLandingPage";
import { ScheduleReportsPage } from "@/components/dashboard/schedule/ScheduleReportsPage";
import { mockInterviewDetail } from "@/components/dashboard/schedule/mockData";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import {
  parseScheduleRoute,
  pathForScheduleBuilder,
  pathForScheduleCalendar,
  pathForScheduleLanding,
  pathForScheduleReports,
  pathForScheduleReschedule,
  type ParsedScheduleRoute,
} from "@/lib/scheduleRoutes";

type Props = {
  segments: string[];
};

function resolveView(segments: string[]): ParsedScheduleRoute {
  const parts = segments.filter(Boolean);
  if (parts[0] !== "schedule") return { view: "landing" };
  return parseScheduleRoute(parts) ?? { view: "landing" };
}

export function SchedulePanel({ segments }: Props) {
  const router = useRouter();
  const route = useMemo(() => resolveView(segments), [segments]);
  const [toast, setToast] = useState("");
  const [interviewDrawerOpen, setInterviewDrawerOpen] = useState(false);

  const navigate = useCallback((path: string) => router.push(path), [router]);

  const showToast = useCallback((message: string) => {
    console.log(message);
    setToast(message);
  }, []);

  const handleSaveDraft = () => {
    showToast("Interview saved as draft (UI preview)");
    navigate(pathForScheduleLanding());
  };

  const handleSchedule = () => {
    showToast("Interview scheduled (UI preview — no invites sent)");
    navigate(pathForScheduleCalendar());
  };

  return (
    <div className="dashboard-card dashboard-schedule-panel">
      <div className="dashboard-schedule-panel-body">
        {route.view === "landing" ? (
          <ScheduleLandingPage
            onScheduleInterview={() => navigate(pathForScheduleBuilder())}
            onConnectCalendar={() => showToast("Connect calendar (UI preview)")}
            onFindSlots={() => navigate(pathForScheduleBuilder())}
            onViewCalendar={() => navigate(pathForScheduleCalendar())}
            onManageReschedule={() => navigate(pathForScheduleReschedule())}
            onViewInterview={() => setInterviewDrawerOpen(true)}
          />
        ) : null}

        {route.view === "builder" ? (
          <ScheduleInterviewBuilder
            onBack={() => navigate(pathForScheduleLanding())}
            onSaveDraft={handleSaveDraft}
            onSchedule={handleSchedule}
            onToast={showToast}
          />
        ) : null}

        {route.view === "calendar" ? (
          <ScheduleCalendarPage
            onBack={() => navigate(pathForScheduleLanding())}
            onScheduleInterview={() => navigate(pathForScheduleBuilder())}
            onToast={showToast}
          />
        ) : null}

        {route.view === "reschedule" ? (
          <RescheduleManagementPage
            onBack={() => navigate(pathForScheduleLanding())}
            onToast={showToast}
          />
        ) : null}

        {route.view === "reports" ? (
          <ScheduleReportsPage
            onBack={() => navigate(pathForScheduleLanding())}
            onToast={showToast}
          />
        ) : null}

        <InterviewDetailsDrawer
          interview={mockInterviewDetail}
          open={interviewDrawerOpen}
          onClose={() => setInterviewDrawerOpen(false)}
          onAction={(action) => {
            console.log("interview action", action);
            showToast(`Action: ${action} (UI preview)`);
          }}
        />

        <DashboardToast message={toast} variant="success" onDismiss={() => setToast("")} />
      </div>
    </div>
  );
}
