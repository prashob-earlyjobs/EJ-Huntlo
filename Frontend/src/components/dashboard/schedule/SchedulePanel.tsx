"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DirectScheduleCandidatePage } from "@/components/dashboard/schedule/DirectScheduleCandidatePage";
import { InterviewDetailsDrawer } from "@/components/dashboard/schedule/InterviewDetailsDrawer";
import { RescheduleManagementPage } from "@/components/dashboard/schedule/RescheduleManagementPage";
import { ScheduleCalendarPage } from "@/components/dashboard/schedule/ScheduleCalendarPage";
import { ScheduleInterviewBuilder } from "@/components/dashboard/schedule/ScheduleInterviewBuilder";
import { ScheduleLandingPage } from "@/components/dashboard/schedule/ScheduleLandingPage";
import { ScheduleReminderSettingsPage } from "@/components/dashboard/schedule/ScheduleReminderSettingsPage";
import { ScheduleReportsPage } from "@/components/dashboard/schedule/ScheduleReportsPage";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchScheduleOverview,
  syncScheduleBookings,
  type ScheduleStats,
  type ScheduleUpcomingInterview,
} from "@/lib/scheduleApi";
import { upcomingToInterviewDetail } from "@/lib/scheduleMappers";
import {
  parseScheduleRoute,
  pathForScheduleBuilder,
  pathForScheduleCalendar,
  pathForScheduleDirectAdd,
  pathForScheduleLanding,
  pathForScheduleReminders,
  pathForScheduleReports,
  pathForScheduleReschedule,
  type ParsedScheduleRoute,
} from "@/lib/scheduleRoutes";

type Props = {
  segments: string[];
  onGoToIntegrations?: () => void;
};

function resolveView(segments: string[]): ParsedScheduleRoute {
  const parts = segments.filter(Boolean);
  if (parts[0] !== "schedule") return { view: "landing" };
  return parseScheduleRoute(parts) ?? { view: "landing" };
}

const EMPTY_STATS: ScheduleStats = {
  interviewsScheduled: 0,
  confirmed: 0,
  pendingConfirmation: 0,
  rescheduleRequests: 0,
  noShows: 0,
  canceled: 0,
};

export function SchedulePanel({ segments, onGoToIntegrations }: Props) {
  const router = useRouter();
  const route = useMemo(() => resolveView(segments), [segments]);
  const [toast, setToast] = useState("");
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [stats, setStats] = useState<ScheduleStats>(EMPTY_STATS);
  const [upcoming, setUpcoming] = useState<ScheduleUpcomingInterview[]>([]);
  const [interviews, setInterviews] = useState<ScheduleUpcomingInterview[]>([]);
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const navigate = useCallback((path: string) => router.push(path), [router]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const applyOverview = useCallback((data: {
    stats: ScheduleStats;
    upcoming: ScheduleUpcomingInterview[];
    interviews?: ScheduleUpcomingInterview[];
    calendlyConnected: boolean;
  }) => {
    setStats(data.stats);
    setUpcoming(data.upcoming);
    setInterviews(data.interviews ?? data.upcoming);
    setCalendlyConnected(data.calendlyConnected);
  }, []);

  const loadOverview = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchScheduleOverview(auth.token);
      applyOverview(data);
    } catch {
      setStats(EMPTY_STATS);
      setUpcoming([]);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [applyOverview]);

  useEffect(() => {
    if (route.view === "landing" || route.view === "calendar") {
      void loadOverview();
    }
  }, [route.view, loadOverview]);

  const handleSync = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    setSyncing(true);
    try {
      const data = await syncScheduleBookings(auth.token);
      applyOverview(data);
      showToast(data.message || "Interviews synced");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not sync interviews.");
    } finally {
      setSyncing(false);
    }
  };

  const goToIntegrations = () => {
    if (onGoToIntegrations) onGoToIntegrations();
    else showToast("Open Integrations to connect Calendly");
  };

  const selectedInterview = useMemo(() => {
    if (!selectedInterviewId) return null;
    const row = interviews.find((i) => i.id === selectedInterviewId) || upcoming.find((i) => i.id === selectedInterviewId);
    return row ? upcomingToInterviewDetail(row) : null;
  }, [interviews, upcoming, selectedInterviewId]);

  const selectedRow = useMemo(
    () =>
      selectedInterviewId
        ? interviews.find((i) => i.id === selectedInterviewId) ||
          upcoming.find((i) => i.id === selectedInterviewId) ||
          null
        : null,
    [interviews, upcoming, selectedInterviewId]
  );

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
            stats={stats}
            upcoming={upcoming}
            loading={loading}
            syncing={syncing}
            calendlyConnected={calendlyConnected}
            onScheduleInterview={() => navigate(pathForScheduleDirectAdd())}
            onAddCandidate={() => navigate(pathForScheduleDirectAdd())}
            onConnectCalendar={goToIntegrations}
            onViewCalendar={() => navigate(pathForScheduleCalendar())}
            onOpenReminders={() => navigate(pathForScheduleReminders())}
            onViewInterview={setSelectedInterviewId}
            onSync={() => void handleSync()}
            onToast={showToast}
          />
        ) : null}

        {route.view === "direct" ? (
          <DirectScheduleCandidatePage
            onBack={() => navigate(pathForScheduleLanding())}
            onDone={() => navigate(pathForScheduleLanding())}
            onToast={showToast}
            onGoToIntegrations={onGoToIntegrations ? () => onGoToIntegrations() : undefined}
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
            interviews={interviews}
            loading={loading}
            calendlyConnected={calendlyConnected}
            onBack={() => navigate(pathForScheduleLanding())}
            onScheduleInterview={() => navigate(pathForScheduleDirectAdd())}
            onSync={() => void handleSync()}
            onConnectCalendar={goToIntegrations}
            onToast={showToast}
          />
        ) : null}

        {route.view === "reschedule" ? (
          <RescheduleManagementPage onBack={() => navigate(pathForScheduleLanding())} onToast={showToast} />
        ) : null}

        {route.view === "reports" ? (
          <ScheduleReportsPage onBack={() => navigate(pathForScheduleLanding())} onToast={showToast} />
        ) : null}

        {route.view === "reminders" ? (
          <ScheduleReminderSettingsPage
            onBack={() => navigate(pathForScheduleLanding())}
            onToast={showToast}
          />
        ) : null}

        {route.view === "landing" ? (
          <InterviewDetailsDrawer
            interview={selectedInterview}
            open={Boolean(selectedInterviewId && selectedInterview)}
            onClose={() => setSelectedInterviewId(null)}
            onAction={(action) => {
              if (action === "reschedule" && selectedRow?.rescheduleUrl) {
                window.open(selectedRow.rescheduleUrl, "_blank", "noreferrer");
                return;
              }
              if (action === "cancel" && selectedRow?.cancelUrl) {
                window.open(selectedRow.cancelUrl, "_blank", "noreferrer");
                return;
              }
              showToast("This action is not available for Calendly bookings yet.");
            }}
          />
        ) : null}

        <DashboardToast message={toast} variant="success" onDismiss={() => setToast("")} />
      </div>
    </div>
  );
}
