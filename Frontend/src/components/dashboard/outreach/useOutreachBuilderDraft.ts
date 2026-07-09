"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CampaignDetailsForm,
  CandidateSource,
  OutreachCampaignMode,
  OutreachChannel,
  SequenceStep,
} from "@/components/dashboard/outreach/types";
import { normalizeSequenceStepsFromApi } from "@/components/dashboard/outreach/outreachSequenceHelpers";
import { getStoredAuth } from "@/lib/auth";
import {
  createOutreachModuleDraft,
  launchOutreachModuleCampaign,
  saveOutreachModuleCampaignStep,
  type OutreachModuleBuilderStepKey,
  type OutreachModuleChannelMessage,
} from "@/lib/outreachModuleCampaignsApi";
import type { WhatsAppSingleChannelMessage } from "@/lib/whatsappOutreach";
import {
  emailMessageToChannelPayload,
  type EmailSingleChannelMessage,
} from "@/lib/emailSingleChannelOutreach";
import {
  voiceMessageToChannelPayload,
  resolveVoiceSingleChannelMessage,
  type VoiceSingleChannelMessage,
} from "@/lib/voiceSingleChannelOutreach";

export type VoiceChannelOptions = Pick<
  VoiceSingleChannelMessage,
  "callObjective" | "voiceTone" | "callAttempts" | "attemptGapHours"
>;

export type SingleChannelSyncPayload = {
  form: CampaignDetailsForm;
  channel: OutreachChannel;
  whatsappMessage?: WhatsAppSingleChannelMessage;
  aiPersonalize?: boolean;
  message?: string;
  emailMessage?: EmailSingleChannelMessage;
  emailAutoReplyEnabled?: boolean;
  calendlyAutomation?: import("@/lib/campaigns").CampaignCalendlyAutomation;
  voiceOptions?: VoiceChannelOptions;
  candidateIds: string[];
  candidateSource: CandidateSource;
};

export type MultiChannelSyncPayload = {
  form: CampaignDetailsForm;
  sequenceSteps: SequenceStep[];
  aiPersonalize?: boolean;
  stepMessages?: { stepId: string; message: string | null }[];
  whatsappReplyQuestions?: string[];
  emailAutoReplyEnabled?: boolean;
  calendlyAutomation?: import("@/lib/campaigns").CampaignCalendlyAutomation;
  candidateIds: string[];
  candidateSource: CandidateSource;
};

type Options = {
  mode: OutreachCampaignMode;
  form: CampaignDetailsForm;
  step: number;
  channel?: OutreachChannel;
  whatsappMessage?: WhatsAppSingleChannelMessage;
  aiPersonalize?: boolean;
  message?: string;
  emailMessage?: EmailSingleChannelMessage;
  voiceOptions?: VoiceChannelOptions;
  initialCampaignId?: string | null;
  onDraftSaved?: () => void;
};

function buildChannelMessagePayload(
  channel: OutreachChannel,
  whatsappMessage: WhatsAppSingleChannelMessage | undefined,
  message: string,
  emailMessage?: EmailSingleChannelMessage,
  voiceOptions?: VoiceChannelOptions
): OutreachModuleChannelMessage {
  if (channel === "whatsapp" && whatsappMessage) {
    return {
      channel: "whatsapp",
      templateId: whatsappMessage.templateId,
      body: whatsappMessage.body,
      followUpTemplateId: whatsappMessage.followUpTemplateId,
      followUpBody: whatsappMessage.followUpBody,
      followUpWaitHours: whatsappMessage.followUpWaitHours,
      followUp2TemplateId: whatsappMessage.followUp2TemplateId,
      followUp2Body: whatsappMessage.followUp2Body,
      followUp2WaitHours: whatsappMessage.followUp2WaitHours,
      replyQuestions: whatsappMessage.replyQuestions,
      replyBody: whatsappMessage.replyQuestions[0] || "",
    };
  }

  if (channel === "email" && emailMessage) {
    return {
      channel: "email",
      ...emailMessageToChannelPayload(emailMessage),
    };
  }

  if (channel === "voice") {
    return voiceMessageToChannelPayload(
      resolveVoiceSingleChannelMessage({
        body: message,
        callObjective: voiceOptions?.callObjective,
        voiceTone: voiceOptions?.voiceTone,
        callAttempts: voiceOptions?.callAttempts,
        attemptGapHours: voiceOptions?.attemptGapHours,
      })
    );
  }

  return {
    channel,
    body: message,
  };
}

export function useOutreachBuilderDraft({
  mode,
  form,
  step,
  channel = "whatsapp",
  whatsappMessage,
  aiPersonalize = true,
  message = "",
  emailMessage,
  voiceOptions,
  initialCampaignId = null,
  onDraftSaved,
}: Options) {
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaignId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [autoSavingSequence, setAutoSavingSequence] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const campaignIdRef = useRef<string | null>(initialCampaignId);
  const formRef = useRef(form);
  const stepRef = useRef(step);
  const channelRef = useRef(channel);
  const whatsappMessageRef = useRef(whatsappMessage);
  const aiPersonalizeRef = useRef(aiPersonalize);
  const messageRef = useRef(message);
  const emailMessageRef = useRef(emailMessage);
  const voiceOptionsRef = useRef(voiceOptions);

  formRef.current = form;
  stepRef.current = step;
  channelRef.current = channel;
  whatsappMessageRef.current = whatsappMessage;
  aiPersonalizeRef.current = aiPersonalize;
  messageRef.current = message;
  emailMessageRef.current = emailMessage;
  voiceOptionsRef.current = voiceOptions;
  campaignIdRef.current = campaignId;

  useEffect(() => {
    if (initialCampaignId) {
      campaignIdRef.current = initialCampaignId;
      setCampaignId(initialCampaignId);
    }
  }, [initialCampaignId]);

  const hasValidDetails = useCallback((details: CampaignDetailsForm) => {
    return Boolean(details.name.trim() && details.jobTitle.trim());
  }, []);

  const ensureCampaignId = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return null;

    let id = campaignIdRef.current;
    if (!id) {
      const created = await createOutreachModuleDraft(auth.token, mode);
      id = created.campaign.id;
      campaignIdRef.current = id;
      setCampaignId(id);
    }
    return { auth, id };
  }, [mode]);

  const persistDetailsStep = useCallback(
    async (currentStep: number, details: CampaignDetailsForm = formRef.current) => {
      if (!hasValidDetails(details)) {
        return false;
      }

      setSavingDraft(true);
      try {
        const session = await ensureCampaignId();
        if (!session) return false;

        await saveOutreachModuleCampaignStep(session.auth.token, session.id, "details", {
          data: { ...details },
          currentStep,
        });
        onDraftSaved?.();
        return true;
      } catch {
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [ensureCampaignId, hasValidDetails, onDraftSaved]
  );

  const persistChannelStep = useCallback(
    async (currentStep: number, nextChannel: OutreachChannel = channelRef.current) => {
      setSavingDraft(true);
      try {
        const session = await ensureCampaignId();
        if (!session) return false;

        await saveOutreachModuleCampaignStep(session.auth.token, session.id, "channel", {
          data: { channel: nextChannel },
          currentStep,
        });
        onDraftSaved?.();
        return true;
      } catch {
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [ensureCampaignId, onDraftSaved]
  );

  const persistMessageStep = useCallback(
    async (
      currentStep: number,
      payload: {
        channel?: OutreachChannel;
        whatsappMessage?: WhatsAppSingleChannelMessage;
        aiPersonalize?: boolean;
        message?: string;
        emailMessage?: EmailSingleChannelMessage;
        voiceOptions?: VoiceChannelOptions;
        emailAutoReplyEnabled?: boolean;
        calendlyAutomation?: import("@/lib/campaigns").CampaignCalendlyAutomation;
      } = {}
    ) => {
      setSavingDraft(true);
      try {
        const session = await ensureCampaignId();
        if (!session) return false;

        const activeChannel = payload.channel ?? channelRef.current;
        const channelMessage = buildChannelMessagePayload(
          activeChannel,
          payload.whatsappMessage ?? whatsappMessageRef.current,
          payload.message ?? messageRef.current,
          payload.emailMessage ?? emailMessageRef.current,
          payload.voiceOptions ?? voiceOptionsRef.current
        );

        await saveOutreachModuleCampaignStep(session.auth.token, session.id, "message", {
          data: {
            aiPersonalize: payload.aiPersonalize ?? aiPersonalizeRef.current,
            channelMessage,
            emailAutoReplyEnabled: payload.emailAutoReplyEnabled !== false,
            calendlyAutomation: payload.calendlyAutomation,
          },
          currentStep,
        });
        onDraftSaved?.();
        return true;
      } catch {
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [ensureCampaignId, onDraftSaved]
  );

  const persistSequenceStep = useCallback(
    async (
      currentStep: number,
      steps: SequenceStep[] = [],
      options?: { silent?: boolean }
    ) => {
      if (steps.length === 0) return null;

      if (options?.silent) {
        setAutoSavingSequence(true);
      } else {
        setSavingDraft(true);
      }
      try {
        const session = await ensureCampaignId();
        if (!session) return null;

        const saved = await saveOutreachModuleCampaignStep(session.auth.token, session.id, "sequence", {
          data: {
            steps: steps.map((step, index) => ({
              channel: step.channel,
              label: step.label,
              delayValue: step.delayValue,
              delayUnit: step.delayUnit,
              condition: index === 0 ? "all" : "no_response",
              timingLabel: step.timingLabel,
            })),
          },
          currentStep,
        });
        onDraftSaved?.();
        return normalizeSequenceStepsFromApi(saved.campaign.sequenceSteps);
      } catch {
        return null;
      } finally {
        if (options?.silent) {
          setAutoSavingSequence(false);
        } else {
          setSavingDraft(false);
        }
      }
    },
    [ensureCampaignId, onDraftSaved]
  );

  const persistPersonalizeStep = useCallback(
    async (
      currentStep: number,
      payload: {
        aiPersonalize?: boolean;
        stepMessages?: { stepId: string; message: string | null }[];
        whatsappReplyQuestions?: string[];
        emailAutoReplyEnabled?: boolean;
        calendlyAutomation?: import("@/lib/campaigns").CampaignCalendlyAutomation;
      } = {}
    ) => {
      setSavingDraft(true);
      try {
        const session = await ensureCampaignId();
        if (!session) return false;

        await saveOutreachModuleCampaignStep(session.auth.token, session.id, "personalize", {
          data: {
            aiPersonalize: payload.aiPersonalize ?? aiPersonalizeRef.current,
            stepMessages: payload.stepMessages ?? [],
            whatsappReplyQuestions: payload.whatsappReplyQuestions ?? [],
            emailAutoReplyEnabled: payload.emailAutoReplyEnabled !== false,
            calendlyAutomation: payload.calendlyAutomation,
          },
          currentStep,
        });
        onDraftSaved?.();
        return true;
      } catch {
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [ensureCampaignId, onDraftSaved]
  );

  const saveReviewStep = useCallback(
    async (
      token: string,
      id: string,
      stepKey: OutreachModuleBuilderStepKey,
      data: Record<string, unknown>
    ) => {
      await saveOutreachModuleCampaignStep(token, id, stepKey, {
        data,
        currentStep: 4,
      });
    },
    []
  );

  const syncSingleChannelDraft = useCallback(
    async (payload: SingleChannelSyncPayload) => {
      const session = await ensureCampaignId();
      if (!session) {
        throw new Error("Sign in to save your campaign.");
      }
      if (payload.candidateIds.length === 0) {
        throw new Error("Select at least one candidate before continuing.");
      }

      const channelMessage = buildChannelMessagePayload(
        payload.channel,
        payload.whatsappMessage,
        payload.message ?? "",
        payload.emailMessage,
        payload.voiceOptions
      );

      await saveReviewStep(session.auth.token, session.id, "details", { ...payload.form });
      await saveReviewStep(session.auth.token, session.id, "channel", { channel: payload.channel });
      await saveReviewStep(session.auth.token, session.id, "message", {
        aiPersonalize: payload.aiPersonalize !== false,
        channelMessage,
        emailAutoReplyEnabled: payload.emailAutoReplyEnabled !== false,
        calendlyAutomation: payload.calendlyAutomation,
      });
      await saveReviewStep(session.auth.token, session.id, "candidates", {
        candidateIds: payload.candidateIds,
        candidateSource: payload.candidateSource,
      });

      onDraftSaved?.();
      return session.id;
    },
    [ensureCampaignId, onDraftSaved, saveReviewStep]
  );

  const syncMultiChannelDraft = useCallback(
    async (payload: MultiChannelSyncPayload) => {
      const session = await ensureCampaignId();
      if (!session) {
        throw new Error("Sign in to save your campaign.");
      }
      if (payload.sequenceSteps.length === 0) {
        throw new Error("Add at least one step to your sequence before continuing.");
      }
      if (payload.candidateIds.length === 0) {
        throw new Error("Select at least one candidate before continuing.");
      }

      await saveReviewStep(session.auth.token, session.id, "details", { ...payload.form });
      await saveReviewStep(session.auth.token, session.id, "sequence", {
        steps: payload.sequenceSteps.map((step, index) => ({
          channel: step.channel,
          label: step.label,
          delayValue: step.delayValue,
          delayUnit: step.delayUnit,
          condition: index === 0 ? "all" : "no_response",
          timingLabel: step.timingLabel,
        })),
      });
      await saveReviewStep(session.auth.token, session.id, "personalize", {
        aiPersonalize: payload.aiPersonalize !== false,
        stepMessages: payload.stepMessages ?? [],
        whatsappReplyQuestions: payload.whatsappReplyQuestions ?? [],
        emailAutoReplyEnabled: payload.emailAutoReplyEnabled !== false,
        calendlyAutomation: payload.calendlyAutomation,
      });
      await saveReviewStep(session.auth.token, session.id, "candidates", {
        candidateIds: payload.candidateIds,
        candidateSource: payload.candidateSource,
      });

      onDraftSaved?.();
      return session.id;
    },
    [ensureCampaignId, onDraftSaved, saveReviewStep]
  );

  const saveDraftFromReview = useCallback(
    async (sync: () => Promise<string>) => {
      setSubmittingReview(true);
      try {
        return await sync();
      } finally {
        setSubmittingReview(false);
      }
    },
    []
  );

  const launchFromReview = useCallback(
    async (sync: () => Promise<string>) => {
      setSubmittingReview(true);
      try {
        const session = await ensureCampaignId();
        if (!session) {
          throw new Error("Sign in to launch your campaign.");
        }
        const id = await sync();
        const campaign = await launchOutreachModuleCampaign(session.auth.token, id);
        onDraftSaved?.();
        return campaign.id;
      } finally {
        setSubmittingReview(false);
      }
    },
    [ensureCampaignId, onDraftSaved]
  );

  const persistCandidatesStep = useCallback(
    async (
      currentStep: number,
      payload: { candidateIds: string[]; candidateSource?: CandidateSource } = {
        candidateIds: [],
        candidateSource: "csv",
      }
    ) => {
      if (payload.candidateIds.length === 0) return false;

      setSavingDraft(true);
      try {
        const session = await ensureCampaignId();
        if (!session) return false;

        await saveOutreachModuleCampaignStep(session.auth.token, session.id, "candidates", {
          data: {
            candidateIds: payload.candidateIds,
            candidateSource: payload.candidateSource || "csv",
          },
          currentStep,
        });
        onDraftSaved?.();
        return true;
      } catch {
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [ensureCampaignId, onDraftSaved]
  );

  const persistDetailsIfPastFirstStep = useCallback(async () => {
    const currentStep = stepRef.current;
    const details = formRef.current;
    if (currentStep >= 1 || hasValidDetails(details)) {
      await persistDetailsStep(currentStep >= 1 ? currentStep : 0, details);
    }
  }, [hasValidDetails, persistDetailsStep]);

  useEffect(() => {
    return () => {
      const auth = getStoredAuth();
      if (!auth?.token) return;

      const currentStep = stepRef.current;
      const details = formRef.current;
      const shouldSave = currentStep >= 1 || hasValidDetails(details);
      if (!shouldSave) return;

      void (async () => {
        try {
          let id = campaignIdRef.current;
          if (!id) {
            const created = await createOutreachModuleDraft(auth.token, mode);
            id = created.campaign.id;
          }
          await saveOutreachModuleCampaignStep(auth.token, id, "details", {
            data: { ...details },
            currentStep: currentStep >= 1 ? currentStep : 0,
          });
        } catch {
          // Best-effort on unmount
        }
      })();
    };
  }, [hasValidDetails, mode]);

  return {
    campaignId,
    savingDraft,
    autoSavingSequence,
    submittingReview,
    hasValidDetails: () => hasValidDetails(formRef.current),
    persistDetailsStep,
    persistChannelStep,
    persistMessageStep,
    persistSequenceStep,
    persistPersonalizeStep,
    persistCandidatesStep,
    persistDetailsIfPastFirstStep,
    syncSingleChannelDraft,
    syncMultiChannelDraft,
    saveDraftFromReview,
    launchFromReview,
  };
}
