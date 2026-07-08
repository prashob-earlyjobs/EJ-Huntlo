"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ScreeningLandingPage } from "@/components/dashboard/screening/ScreeningLandingPage";
import { ScreeningResultsPage } from "@/components/dashboard/screening/ScreeningResultsPage";
import { ScreeningTypeSelection } from "@/components/dashboard/screening/ScreeningTypeSelection";
import { VideoScreeningBuilder } from "@/components/dashboard/screening/VideoScreeningBuilder";
import { VoiceScreeningBuilder } from "@/components/dashboard/screening/VoiceScreeningBuilder";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import {
  parseScreeningRoute,
  pathForScreeningBuilder,
  pathForScreeningDetail,
  pathForScreeningLanding,
  pathForScreeningNew,
  type ParsedScreeningRoute,
} from "@/lib/screeningRoutes";

type Props = {
  segments: string[];
};

function resolveView(segments: string[]): ParsedScreeningRoute {
  const parts = segments.filter(Boolean);
  if (parts[0] !== "screening") return { view: "landing" };
  return parseScreeningRoute(parts) ?? { view: "landing" };
}

export function ScreeningPanel({ segments }: Props) {
  const router = useRouter();
  const route = useMemo(() => resolveView(segments), [segments]);
  const [typeModalOpen, setTypeModalOpen] = useState(route.view === "mode-select");
  const [toast, setToast] = useState("");

  const navigate = useCallback((path: string) => router.push(path), [router]);

  const showToast = useCallback((message: string) => {
    console.log(message);
    setToast(message);
  }, []);

  const handleSaveDraft = () => {
    showToast("Screening saved as draft (UI preview)");
    navigate(pathForScreeningLanding());
  };

  const handleLaunch = () => {
    showToast("Screening launched (UI preview — no real calls or recordings)");
    navigate(pathForScreeningDetail("react-dev-voice"));
  };

  return (
    <div className="dashboard-card dashboard-screening-panel">
      <div className="dashboard-screening-panel-body">
        {(route.view === "landing" || route.view === "mode-select") && (
          <ScreeningLandingPage
            onNewScreening={() => {
              setTypeModalOpen(true);
              navigate(pathForScreeningNew());
            }}
            onStartVoice={() => navigate(pathForScreeningBuilder("voice"))}
            onStartVideo={() => navigate(pathForScreeningBuilder("video"))}
            onViewScreening={(id) => navigate(pathForScreeningDetail(id))}
          />
        )}

        {route.view === "voice-builder" ? (
          <VoiceScreeningBuilder
            onBack={() => navigate(pathForScreeningLanding())}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            onToast={showToast}
          />
        ) : null}

        {route.view === "video-builder" ? (
          <VideoScreeningBuilder
            onBack={() => navigate(pathForScreeningLanding())}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            onToast={showToast}
          />
        ) : null}

        {route.view === "detail" && route.screeningId ? (
          <ScreeningResultsPage
            screeningId={route.screeningId}
            onBack={() => navigate(pathForScreeningLanding())}
            onToast={showToast}
          />
        ) : null}

        <ScreeningTypeSelection
          open={typeModalOpen || route.view === "mode-select"}
          onClose={() => {
            setTypeModalOpen(false);
            if (route.view === "mode-select") navigate(pathForScreeningLanding());
          }}
          onSelectVoice={() => {
            setTypeModalOpen(false);
            navigate(pathForScreeningBuilder("voice"));
          }}
          onSelectVideo={() => {
            setTypeModalOpen(false);
            navigate(pathForScreeningBuilder("video"));
          }}
        />

        <DashboardToast message={toast} variant="success" onDismiss={() => setToast("")} />
      </div>
    </div>
  );
}
