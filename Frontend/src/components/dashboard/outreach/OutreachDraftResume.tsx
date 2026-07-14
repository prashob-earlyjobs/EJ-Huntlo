"use client";

import { useEffect, useState } from "react";

import { MultiChannelBuilder } from "@/components/dashboard/outreach/MultiChannelBuilder";
import {
  buildResumeAiPersonalize,
  buildResumeCandidateIds,
  buildResumeCandidateSource,
  buildResumeChannel,
  buildResumeDetailsForm,
  buildResumeEmailMessage,
  buildResumeEmailSubject,
  buildResumeEmailAutoReplyEnabled,
  buildResumeCalendlyAutomation,
  buildResumePostQualification,
  buildResumeMessage,
  buildResumeSequenceSteps,
  buildResumeStepMessages,
  buildResumeVoiceMessage,
  buildResumeWhatsappReplyQuestions,
  buildResumeWhatsappMessage,
  resolveOutreachResumeStepIndex,
} from "@/components/dashboard/outreach/outreachResumeHelpers";
import { SingleChannelBuilder } from "@/components/dashboard/outreach/SingleChannelBuilder";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";
import { fetchOutreachModuleCampaign } from "@/lib/outreachModuleCampaignsApi";
import { pathForOutreachCampaign } from "@/lib/outreachRoutes";

type Props = {
  campaignId: string;
  onBack: () => void;
  onSaveDraft: (campaignId: string) => void;
  onLaunch: (campaignId: string) => void;
  onDraftSaved?: () => void;
  onNavigate: (path: string) => void;
};

type ResumeState = {
  mode: "single" | "multi";
  initialStep: number;
  form: ReturnType<typeof buildResumeDetailsForm>;
  channel: ReturnType<typeof buildResumeChannel>;
  message: string;
  voiceMessage: ReturnType<typeof buildResumeVoiceMessage>;
  emailSubject: string;
  emailMessage: ReturnType<typeof buildResumeEmailMessage>;
  whatsappMessage: ReturnType<typeof buildResumeWhatsappMessage>;
  aiPersonalize: boolean;
  selectedIds: string[];
  source: ReturnType<typeof buildResumeCandidateSource>;
  sequenceSteps: ReturnType<typeof buildResumeSequenceSteps>;
  stepMessages: ReturnType<typeof buildResumeStepMessages>;
  whatsappReplyQuestions: ReturnType<typeof buildResumeWhatsappReplyQuestions>;
  emailAutoReplyEnabled: boolean;
  calendlyAutomation: ReturnType<typeof buildResumeCalendlyAutomation>;
  postQualification: ReturnType<typeof buildResumePostQualification>;
};

export function OutreachDraftResume({
  campaignId,
  onBack,
  onSaveDraft,
  onLaunch,
  onDraftSaved,
  onNavigate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resume, setResume] = useState<ResumeState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const auth = getStoredAuth();
      if (!auth?.token) {
        if (!cancelled) {
          setError("Sign in to continue this campaign.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const campaign = await fetchOutreachModuleCampaign(auth.token, campaignId);
        if (cancelled) return;

        if (campaign.status !== "draft") {
          onNavigate(pathForOutreachCampaign(campaignId));
          return;
        }

        setResume({
          mode: campaign.mode,
          initialStep: resolveOutreachResumeStepIndex(campaign.builder),
          form: buildResumeDetailsForm(campaign),
          channel: buildResumeChannel(campaign),
          message: buildResumeMessage(campaign),
          voiceMessage: buildResumeVoiceMessage(campaign),
          emailSubject: buildResumeEmailSubject(campaign),
          emailMessage: buildResumeEmailMessage(campaign),
          whatsappMessage: buildResumeWhatsappMessage(campaign),
          aiPersonalize: buildResumeAiPersonalize(campaign),
          selectedIds: buildResumeCandidateIds(campaign),
          source: buildResumeCandidateSource(campaign),
          sequenceSteps: buildResumeSequenceSteps(campaign),
          stepMessages: buildResumeStepMessages(campaign),
          whatsappReplyQuestions: buildResumeWhatsappReplyQuestions(campaign),
          emailAutoReplyEnabled: buildResumeEmailAutoReplyEnabled(campaign),
          calendlyAutomation: buildResumeCalendlyAutomation(campaign),
          postQualification: buildResumePostQualification(campaign),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load draft");
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
    return (
      <p className="dashboard-text-body dashboard-outreach-recent-loading">Loading draft…</p>
    );
  }

  if (error) {
    return (
      <div className="dashboard-outreach-empty-state">
        <MaterialIcon name="error_outline" />
        <p>{error}</p>
        <button type="button" className={dashboardBtnPrimaryClass} onClick={onBack}>
          Back to outreach
        </button>
      </div>
    );
  }

  if (!resume) return null;

  if (resume.mode === "multi") {
    return (
      <MultiChannelBuilder
        key={campaignId}
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
    <SingleChannelBuilder
      key={campaignId}
      resumeCampaignId={campaignId}
      initialStep={resume.initialStep}
      initialForm={resume.form}
      initialChannel={resume.channel}
      initialMessage={resume.message}
      initialVoiceMessage={resume.voiceMessage}
      initialEmailSubject={resume.emailSubject}
      initialEmailMessage={resume.emailMessage}
      initialWhatsappMessage={resume.whatsappMessage}
      initialAiPersonalize={resume.aiPersonalize}
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
