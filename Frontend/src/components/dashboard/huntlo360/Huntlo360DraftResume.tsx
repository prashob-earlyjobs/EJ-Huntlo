"use client";

import { useEffect, useState } from "react";

import { Huntlo360Builder } from "@/components/dashboard/huntlo360/Huntlo360Builder";
import { MultiChannelBuilder } from "@/components/dashboard/outreach/MultiChannelBuilder";
import {
  buildResumeAiPersonalize,
  buildResumeCalendlyAutomation,
  buildResumePostQualification,
  buildResumeCandidateIds,
  buildResumeCandidateSource,
  buildResumeChannel,
  buildResumeDetailsForm,
  buildResumeEmailMessage,
  buildResumeSequenceSteps,
  buildResumeStepMessages,
  buildResumeWhatsappMessage,
  buildResumeWhatsappReplyQuestions,
  resolveOutreachResumeStepIndex,
} from "@/components/dashboard/outreach/outreachResumeHelpers";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";
import { fetchOutreachModuleCampaign } from "@/lib/outreachModuleCampaignsApi";
import { pathForHuntlo360Campaign } from "@/lib/huntlo360Routes";

type Props = {
  campaignId: string;
  onBack: () => void;
  onSaveDraft: (campaignId: string) => void;
  onLaunch: (campaignId: string) => void;
  onDraftSaved?: () => void;
  onNavigate: (path: string) => void;
};

function mapHuntlo360SingleResumeStep(builderStep: number, calendlyReady: boolean) {
  if (builderStep >= 4) return 5;
  if (builderStep === 3) return 4;
  if (builderStep === 2 && calendlyReady) return 4;
  if (builderStep === 2) return 3;
  return builderStep;
}

function mapHuntlo360MultiResumeStep(builderStep: number, calendlyReady: boolean) {
  if (builderStep >= 4) return 5;
  if (builderStep === 3) return 4;
  if (builderStep === 2 && calendlyReady) return 4;
  if (builderStep === 2) return 3;
  return builderStep;
}

export function Huntlo360DraftResume({
  campaignId,
  onBack,
  onSaveDraft,
  onLaunch,
  onDraftSaved,
  onNavigate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<{
    mode: "single" | "multi";
    initialStep: number;
    form: ReturnType<typeof buildResumeDetailsForm>;
    channel: ReturnType<typeof buildResumeChannel>;
    whatsappMessage: ReturnType<typeof buildResumeWhatsappMessage>;
    emailMessage: ReturnType<typeof buildResumeEmailMessage>;
    aiPersonalize: boolean;
    selectedIds: string[];
    source: ReturnType<typeof buildResumeCandidateSource>;
    calendlyAutomation: ReturnType<typeof buildResumeCalendlyAutomation>;
    postQualification: ReturnType<typeof buildResumePostQualification>;
    sequenceSteps: ReturnType<typeof buildResumeSequenceSteps>;
    stepMessages: ReturnType<typeof buildResumeStepMessages>;
    whatsappReplyQuestions: ReturnType<typeof buildResumeWhatsappReplyQuestions>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const auth = getStoredAuth();
      if (!auth?.token) {
        if (!cancelled) {
          setError("Sign in to continue this flow.");
          setLoading(false);
        }
        return;
      }

      try {
        const campaign = await fetchOutreachModuleCampaign(auth.token, campaignId);
        if (cancelled) return;

        if (campaign.status !== "draft") {
          onNavigate(pathForHuntlo360Campaign(campaignId));
          return;
        }

        const calendlyAutomation = buildResumeCalendlyAutomation(campaign);
        const postQualification = buildResumePostQualification(campaign);
        const calendlyReady =
          Boolean(calendlyAutomation.enabled) &&
          Boolean(String(calendlyAutomation.schedulingUrl || "").trim());
        const builderStep = resolveOutreachResumeStepIndex(campaign.builder);
        const isMulti = campaign.mode === "multi";

        setResume({
          mode: isMulti ? "multi" : "single",
          initialStep: isMulti
            ? mapHuntlo360MultiResumeStep(builderStep, calendlyReady)
            : mapHuntlo360SingleResumeStep(builderStep, calendlyReady),
          form: buildResumeDetailsForm(campaign),
          channel: buildResumeChannel(campaign),
          whatsappMessage: buildResumeWhatsappMessage(campaign),
          emailMessage: buildResumeEmailMessage(campaign),
          aiPersonalize: buildResumeAiPersonalize(campaign),
          selectedIds: buildResumeCandidateIds(campaign),
          source: buildResumeCandidateSource(campaign),
          calendlyAutomation,
          postQualification,
          sequenceSteps: buildResumeSequenceSteps(campaign),
          stepMessages: buildResumeStepMessages(campaign),
          whatsappReplyQuestions: buildResumeWhatsappReplyQuestions(campaign),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this flow.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, onNavigate]);

  if (loading) {
    return <p className="dashboard-outreach-empty-hint">Loading draft…</p>;
  }

  if (error || !resume) {
    return (
      <div className="dashboard-outreach-empty-state">
        <MaterialIcon name="error_outline" />
        <p>{error || "Draft not found."}</p>
        <button type="button" className={dashboardBtnPrimaryClass} onClick={onBack}>
          Back to Huntlo 360
        </button>
      </div>
    );
  }

  if (resume.mode === "multi") {
    return (
      <MultiChannelBuilder
        key={campaignId}
        variant="huntlo360"
        resumeCampaignId={campaignId}
        initialStep={resume.initialStep}
        initialForm={resume.form}
        initialSelectedIds={resume.selectedIds}
        initialSource={resume.source}
        initialSequenceSteps={resume.sequenceSteps}
        initialStepMessages={resume.stepMessages}
        initialAiPersonalize={resume.aiPersonalize}
        initialWhatsappReplyQuestions={resume.whatsappReplyQuestions}
        initialCalendlyAutomation={resume.calendlyAutomation}
        initialPostQualification={resume.postQualification}
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onLaunch={onLaunch}
        onDraftSaved={onDraftSaved}
      />
    );
  }

  return (
    <Huntlo360Builder
      resumeCampaignId={campaignId}
      initialStep={resume.initialStep}
      initialForm={resume.form}
      initialChannel={resume.channel}
      initialWhatsappMessage={resume.whatsappMessage}
      initialEmailMessage={resume.emailMessage}
      initialCalendlyAutomation={resume.calendlyAutomation}
      initialPostQualification={resume.postQualification}
      initialSelectedIds={resume.selectedIds}
      initialSource={resume.source}
      onBack={onBack}
      onSaveDraft={onSaveDraft}
      onLaunch={onLaunch}
      onDraftSaved={onDraftSaved}
    />
  );
}
