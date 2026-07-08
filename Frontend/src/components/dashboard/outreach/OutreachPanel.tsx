"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CampaignTrackingPage } from "@/components/dashboard/outreach/CampaignTrackingPage";
import { MultiChannelBuilder } from "@/components/dashboard/outreach/MultiChannelBuilder";
import { OutreachBuilderChromeProvider } from "@/components/dashboard/outreach/OutreachBuilderChrome";
import { OutreachDraftResume } from "@/components/dashboard/outreach/OutreachDraftResume";
import { OutreachLandingPage } from "@/components/dashboard/outreach/OutreachLandingPage";
import { OutreachModeSelection } from "@/components/dashboard/outreach/OutreachModeSelection";
import { SingleChannelBuilder } from "@/components/dashboard/outreach/SingleChannelBuilder";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import {
  parseOutreachRoute,
  pathForOutreachBuilder,
  pathForOutreachCampaign,
  pathForOutreachDraftResume,
  pathForOutreachLanding,
  pathForOutreachNew,
  type ParsedOutreachRoute,
} from "@/lib/outreachRoutes";

type Props = {
  segments: string[];
};

function resolveView(segments: string[]): ParsedOutreachRoute {
  const parts = segments.filter(Boolean);
  if (parts[0] !== "outreach") {
    return { view: "landing" };
  }
  return parseOutreachRoute(parts) ?? { view: "landing" };
}

export function OutreachPanel({ segments }: Props) {
  const router = useRouter();
  const route = useMemo(() => resolveView(segments), [segments]);
  const [modeModalOpen, setModeModalOpen] = useState(route.view === "mode-select");
  const [toast, setToast] = useState("");
  const [campaignListKey, setCampaignListKey] = useState(0);

  const handleDraftSaved = useCallback(() => {
    setCampaignListKey((key) => key + 1);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const showToast = useCallback((message: string) => {
    console.log(message);
    setToast(message);
  }, []);

  const handleSaveDraft = useCallback(
    (campaignId: string) => {
      setCampaignListKey((key) => key + 1);
      showToast("Campaign saved as draft");
      navigate(pathForOutreachLanding());
    },
    [navigate, showToast]
  );

  const handleLaunch = useCallback(
    (campaignId: string) => {
      setCampaignListKey((key) => key + 1);
      showToast("Campaign launched successfully");
      navigate(pathForOutreachCampaign(campaignId));
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
        isBuilderView ? " dashboard-card--fill dashboard-outreach-panel--builder" : ""
      }`}
    >
      <OutreachBuilderChromeProvider enabled={isBuilderView}>
      <div className="dashboard-outreach-panel-body">
        {(route.view === "landing" || route.view === "mode-select") && (
          <OutreachLandingPage
            reloadToken={campaignListKey}
            onNewCampaign={() => {
              setModeModalOpen(true);
              navigate(pathForOutreachNew());
            }}
            onStartSingle={() => navigate(pathForOutreachBuilder("single"))}
            onStartMulti={() => navigate(pathForOutreachBuilder("multi"))}
            onViewCampaign={(id, status) => {
              if (status === "draft") {
                navigate(pathForOutreachDraftResume(id));
                return;
              }
              navigate(pathForOutreachCampaign(id));
            }}
          />
        )}

        {route.view === "resume-builder" && route.campaignId ? (
          <OutreachDraftResume
            campaignId={route.campaignId}
            onBack={() => navigate(pathForOutreachLanding())}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            onDraftSaved={handleDraftSaved}
            onNavigate={navigate}
          />
        ) : null}

        {route.view === "single-builder" ? (
          <SingleChannelBuilder
            onBack={() => navigate(pathForOutreachLanding())}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            onDraftSaved={handleDraftSaved}
          />
        ) : null}

        {route.view === "multi-builder" ? (
          <MultiChannelBuilder
            onBack={() => navigate(pathForOutreachLanding())}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            onDraftSaved={handleDraftSaved}
          />
        ) : null}

        {route.view === "detail" && route.campaignId ? (
          <CampaignTrackingPage
            campaignId={route.campaignId}
            onBack={() => navigate(pathForOutreachLanding())}
            onToast={showToast}
          />
        ) : null}

        <OutreachModeSelection
          open={modeModalOpen || route.view === "mode-select"}
          onClose={() => {
            setModeModalOpen(false);
            if (route.view === "mode-select") navigate(pathForOutreachLanding());
          }}
          onSelectSingle={() => {
            setModeModalOpen(false);
            navigate(pathForOutreachBuilder("single"));
          }}
          onSelectMulti={() => {
            setModeModalOpen(false);
            navigate(pathForOutreachBuilder("multi"));
          }}
        />

        <DashboardToast message={toast} variant="success" onDismiss={() => setToast("")} />
      </div>
      </OutreachBuilderChromeProvider>
    </div>
  );
}
