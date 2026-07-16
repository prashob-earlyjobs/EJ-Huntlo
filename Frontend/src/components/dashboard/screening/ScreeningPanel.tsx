"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ScreeningLandingPage } from "@/components/dashboard/screening/ScreeningLandingPage";
import { ScreeningResultsPage } from "@/components/dashboard/screening/ScreeningResultsPage";
import { ScreeningVariablesPage } from "@/components/dashboard/screening/ScreeningVariablesPage";
import { ScreeningTypeSelection } from "@/components/dashboard/screening/ScreeningTypeSelection";
import { VideoScreeningBuilder } from "@/components/dashboard/screening/VideoScreeningBuilder";
import { VoiceScreeningBuilder } from "@/components/dashboard/screening/VoiceScreeningBuilder";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import type { ScreeningRow } from "@/components/dashboard/screening/types";
import { getStoredAuth } from "@/lib/auth";
import {
  createVoiceScreening,
  updateVoiceScreening,
  fetchScreenings,
  type VoiceScreeningPayload,
} from "@/lib/screeningApi";
import {
  parseScreeningRoute,
  pathForScreeningBuilder,
  pathForScreeningDetail,
  pathForScreeningEdit,
  pathForScreeningLanding,
  pathForScreeningNew,
  pathForScreeningVariables,
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
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);
  const [screenings, setScreenings] = useState<ScreeningRow[]>([]);
  const [landingLoading, setLandingLoading] = useState(route.view === "landing");

  const navigate = useCallback((path: string) => router.push(path), [router]);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToastVariant(variant);
    setToast(message);
  }, []);

  const loadLanding = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLandingLoading(false);
      return;
    }
    setLandingLoading(true);
    try {
      const listResult = await fetchScreenings(auth.token, { limit: 20 });
      setScreenings(listResult.screenings);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not load screenings", "error");
    } finally {
      setLandingLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (route.view === "landing" || route.view === "mode-select") {
      void loadLanding();
    }
  }, [route.view, loadLanding]);

  // When the builder was opened for an existing draft, save/launch updates it in place.
  const editingDraftId = route.view === "voice-builder" ? route.screeningId : undefined;

  const persistScreening = async (
    payload: VoiceScreeningPayload,
    options?: { navigateOnSuccess?: boolean }
  ) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      throw new Error("Please sign in again");
    }
    setSubmitting(true);
    try {
      const result = editingDraftId
        ? await updateVoiceScreening(auth.token, editingDraftId, payload)
        : await createVoiceScreening(auth.token, payload);
      showToast(
        payload.launch === false
          ? "Screening saved as draft"
          : result.launched
            ? "Voice screening launched — AI calls are being placed"
            : "Screening created"
      );
      if (options?.navigateOnSuccess !== false) {
        navigate(pathForScreeningDetail(result.screening.id));
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save screening";
      showToast(message, "error");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async (payload: VoiceScreeningPayload) => {
    await persistScreening(payload);
  };

  const handleLaunch = async (payload: VoiceScreeningPayload) => {
    const result = await persistScreening(payload, { navigateOnSuccess: false });
    return result.screening.id;
  };

  const handleLaunchSuccess = (screeningId: string) => {
    navigate(pathForScreeningDetail(screeningId));
  };

  const isBuilderView = route.view === "voice-builder" || route.view === "video-builder";

  return (
    <div
      className={`dashboard-card dashboard-screening-panel${
        isBuilderView ? " dashboard-card--fill dashboard-screening-panel--builder" : ""
      }`}
    >
      <div className="dashboard-screening-panel-body">
        {(route.view === "landing" || route.view === "mode-select") && (
          <ScreeningLandingPage
            screenings={screenings}
            loading={landingLoading}
            onNewScreening={() => {
              setTypeModalOpen(true);
              navigate(pathForScreeningNew());
            }}
            onStartVoice={() => navigate(pathForScreeningBuilder("voice"))}
            onStartVideo={() => navigate(pathForScreeningBuilder("video"))}
            onViewScreening={(id) => {
              const row = screenings.find((s) => s.id === id);
              navigate(
                row?.status === "draft" ? pathForScreeningEdit(id) : pathForScreeningDetail(id)
              );
            }}
          />
        )}

        {route.view === "voice-builder" ? (
          <VoiceScreeningBuilder
            key={editingDraftId || "new"}
            draftId={editingDraftId}
            onBack={() => navigate(pathForScreeningLanding())}
            onSaveDraft={handleSaveDraft}
            onLaunch={handleLaunch}
            onLaunchSuccess={handleLaunchSuccess}
            onToast={showToast}
            submitting={submitting}
          />
        ) : null}

        {route.view === "video-builder" ? (
          <VideoScreeningBuilder
            onBack={() => navigate(pathForScreeningLanding())}
            onSaveDraft={() => showToast("Video screening is not available yet", "error")}
            onLaunch={() => showToast("Video screening is not available yet", "error")}
            onToast={showToast}
          />
        ) : null}

        {route.view === "detail" && route.screeningId ? (
          <ScreeningResultsPage
            screeningId={route.screeningId}
            onBack={() => navigate(pathForScreeningLanding())}
            onViewAllDetails={() =>
              navigate(pathForScreeningVariables(route.screeningId as string))
            }
            onToast={showToast}
          />
        ) : null}

        {route.view === "variables" && route.screeningId ? (
          <ScreeningVariablesPage
            screeningId={route.screeningId}
            onBack={() => navigate(pathForScreeningDetail(route.screeningId as string))}
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

        <DashboardToast
          message={toast}
          variant={toastVariant}
          onDismiss={() => setToast("")}
        />
      </div>
    </div>
  );
}
