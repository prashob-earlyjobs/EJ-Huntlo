"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Huntlo360Builder } from "@/components/dashboard/huntlo360/Huntlo360Builder";
import { Huntlo360DraftResume } from "@/components/dashboard/huntlo360/Huntlo360DraftResume";
import { Huntlo360LandingPage } from "@/components/dashboard/huntlo360/Huntlo360LandingPage";
import { Huntlo360TrackingPage } from "@/components/dashboard/huntlo360/Huntlo360TrackingPage";
import { MultiChannelBuilder } from "@/components/dashboard/outreach/MultiChannelBuilder";
import { OutreachBuilderChromeProvider } from "@/components/dashboard/outreach/OutreachBuilderChrome";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import {
  parseHuntlo360Route,
  pathForHuntlo360Builder,
  pathForHuntlo360Campaign,
  pathForHuntlo360DraftResume,
  pathForHuntlo360Landing,
  type ParsedHuntlo360Route,
} from "@/lib/huntlo360Routes";

type Props = {
  segments: string[];
};

function resolveView(segments: string[]): ParsedHuntlo360Route {
  const parts = segments.filter(Boolean);
  if (parts[0] !== "huntlo-360") {
    return { view: "landing" };
  }
  return parseHuntlo360Route(parts) ?? { view: "landing" };
}

export function Huntlo360Panel({ segments }: Props) {
  const router = useRouter();
  const route = useMemo(() => resolveView(segments), [segments]);
  const [toast, setToast] = useState("");
  const [flowListKey, setFlowListKey] = useState(0);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const handleDraftSaved = useCallback(() => {
    setFlowListKey((key) => key + 1);
  }, []);

  const handleSaveDraft = useCallback(
    (_campaignId: string) => {
      setFlowListKey((key) => key + 1);
      showToast("Flow saved as draft");
      navigate(pathForHuntlo360Landing());
    },
    [navigate, showToast]
  );

  const handleLaunch = useCallback(
    (campaignId: string) => {
      setFlowListKey((key) => key + 1);
      showToast("Huntlo 360 flow launched");
      navigate(pathForHuntlo360Campaign(campaignId));
    },
    [navigate, showToast]
  );

  const isBuilderView =
    route.view === "single-builder" ||
    route.view === "multi-builder" ||
    route.view === "resume-builder";

  return (
    <div
      className={`dashboard-card dashboard-outreach-panel${
        isBuilderView
          ? " dashboard-card--fill dashboard-outreach-panel--builder"
          : " dashboard-outreach-panel--landing"
      }`}
    >
      <OutreachBuilderChromeProvider enabled={isBuilderView}>
        <div className="dashboard-outreach-panel-body">
          {route.view === "landing" || route.view === "mode-select" ? (
            <Huntlo360LandingPage
              reloadToken={flowListKey}
              onStartSingle={() => navigate(pathForHuntlo360Builder("single"))}
              onStartMulti={() => navigate(pathForHuntlo360Builder("multi"))}
              onViewCampaign={(id, status) => {
                if (status === "draft") {
                  navigate(pathForHuntlo360DraftResume(id));
                  return;
                }
                navigate(pathForHuntlo360Campaign(id));
              }}
            />
          ) : null}

          {route.view === "single-builder" ? (
            <Huntlo360Builder
              onBack={() => navigate(pathForHuntlo360Landing())}
              onSaveDraft={handleSaveDraft}
              onLaunch={handleLaunch}
              onDraftSaved={handleDraftSaved}
            />
          ) : null}

          {route.view === "multi-builder" ? (
            <MultiChannelBuilder
              variant="huntlo360"
              onBack={() => navigate(pathForHuntlo360Landing())}
              onSaveDraft={handleSaveDraft}
              onLaunch={handleLaunch}
              onDraftSaved={handleDraftSaved}
            />
          ) : null}

          {route.view === "resume-builder" && route.campaignId ? (
            <Huntlo360DraftResume
              campaignId={route.campaignId}
              onBack={() => navigate(pathForHuntlo360Landing())}
              onSaveDraft={handleSaveDraft}
              onLaunch={handleLaunch}
              onDraftSaved={handleDraftSaved}
              onNavigate={navigate}
            />
          ) : null}

          {route.view === "detail" && route.campaignId ? (
            <Huntlo360TrackingPage
              campaignId={route.campaignId}
              onBack={() => navigate(pathForHuntlo360Landing())}
              onToast={showToast}
            />
          ) : null}
        </div>

        <DashboardToast message={toast} variant="success" onDismiss={() => setToast("")} />
      </OutreachBuilderChromeProvider>
    </div>
  );
}
