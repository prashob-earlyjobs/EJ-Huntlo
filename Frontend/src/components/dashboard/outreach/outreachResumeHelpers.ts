import type { OutreachModuleBuilderState, OutreachModuleCampaignDetail } from "@/lib/outreachModuleCampaignsApi";
import type {
  CampaignDetailsForm,
  CampaignGoal,
  CandidateSource,
  OutreachChannel,
  SequenceStep,
} from "@/components/dashboard/outreach/types";
import {
  resolveWhatsAppSingleChannelMessage,
  type WhatsAppSingleChannelMessage,
} from "@/lib/whatsappOutreach";
import {
  resolveEmailSingleChannelMessage,
  type EmailSingleChannelMessage,
} from "@/lib/emailSingleChannelOutreach";
import {
  resolveVoiceSingleChannelMessage,
  type VoiceSingleChannelMessage,
} from "@/lib/voiceSingleChannelOutreach";
import { normalizeSequenceStepsFromApi } from "@/components/dashboard/outreach/outreachSequenceHelpers";

type DetailsStep = Partial<CampaignDetailsForm>;
type ChannelStep = { channel?: OutreachChannel };
type MessageStep = {
  aiPersonalize?: boolean;
  channelMessage?: {
    body?: string;
    subject?: string;
    templateId?: string;
    followUpTemplateId?: string;
    followUpBody?: string;
    followUpWaitHours?: number;
    followUp2TemplateId?: string;
    followUp2Body?: string;
    followUp2WaitHours?: number;
    replyQuestions?: string[];
    replyBody?: string;
    emailTouchpoints?: EmailSingleChannelMessage["touchpoints"];
    callObjective?: string;
    voiceTone?: VoiceSingleChannelMessage["voiceTone"];
    callAttempts?: number;
    attemptGapHours?: number;
  };
};
type CandidatesStep = {
  candidateSource?: CandidateSource;
  candidateIds?: string[];
};
type SequenceStepData = { steps?: SequenceStep[] };

/** First wizard step that is not yet completed; review step when all four are done. */
export function resolveOutreachResumeStepIndex(builder: OutreachModuleBuilderState | null | undefined): number {
  if (!builder?.stepOrder?.length) return 0;

  const completed = new Set(builder.completedSteps || []);
  for (let i = 0; i < builder.stepOrder.length; i++) {
    if (!completed.has(builder.stepOrder[i])) {
      return i;
    }
  }

  return builder.stepOrder.length;
}

export function buildResumeDetailsForm(campaign: OutreachModuleCampaignDetail): CampaignDetailsForm {
  const details = (campaign.builder?.steps?.details ?? {}) as DetailsStep;
  return {
    name: details.name || campaign.name || "",
    jobTitle: details.jobTitle || campaign.jobTitle || "",
    jobDescription: details.jobDescription || campaign.jobDescription || "",
    goal: (details.goal || campaign.goal || "interest") as CampaignGoal,
  };
}

export function buildResumeChannel(campaign: OutreachModuleCampaignDetail): OutreachChannel {
  const channelStep = (campaign.builder?.steps?.channel ?? {}) as ChannelStep;
  const channel = channelStep.channel || campaign.channel;
  if (channel === "whatsapp" || channel === "email" || channel === "voice" || channel === "linkedin") {
    return channel;
  }
  return "whatsapp";
}

export function buildResumeEmailSubject(campaign: OutreachModuleCampaignDetail): string {
  const messageStep = (campaign.builder?.steps?.message ?? {}) as MessageStep;
  return String(
    messageStep.channelMessage?.subject || campaign.channelMessage?.subject || ""
  ).trim();
}

export function buildResumeMessage(campaign: OutreachModuleCampaignDetail): string {
  return buildResumeVoiceMessage(campaign).body;
}

export function buildResumeVoiceMessage(
  campaign: OutreachModuleCampaignDetail
): VoiceSingleChannelMessage {
  const messageStep = (campaign.builder?.steps?.message ?? {}) as MessageStep;
  const channelMessage = messageStep.channelMessage || campaign.channelMessage || {};
  return resolveVoiceSingleChannelMessage({
    body: channelMessage.body,
    callObjective: channelMessage.callObjective,
    voiceTone: channelMessage.voiceTone,
    callAttempts: channelMessage.callAttempts,
    attemptGapHours: channelMessage.attemptGapHours,
  });
}

export function buildResumeEmailMessage(
  campaign: OutreachModuleCampaignDetail
): EmailSingleChannelMessage {
  const messageStep = (campaign.builder?.steps?.message ?? {}) as MessageStep;
  const channelMessage = messageStep.channelMessage || campaign.channelMessage || {};
  return resolveEmailSingleChannelMessage({
    subject: channelMessage.subject,
    body: channelMessage.body,
    emailTouchpoints: channelMessage.emailTouchpoints,
  });
}

export function buildResumeWhatsappMessage(
  campaign: OutreachModuleCampaignDetail
): WhatsAppSingleChannelMessage {
  const messageStep = (campaign.builder?.steps?.message ?? {}) as MessageStep;
  const channelMessage = messageStep.channelMessage || campaign.channelMessage || {};
  return resolveWhatsAppSingleChannelMessage({
    templateId: channelMessage.templateId,
    body: channelMessage.body,
    followUpTemplateId: channelMessage.followUpTemplateId,
    followUpBody: channelMessage.followUpBody,
    followUpWaitHours: channelMessage.followUpWaitHours,
    followUp2TemplateId: channelMessage.followUp2TemplateId,
    followUp2Body: channelMessage.followUp2Body,
    followUp2WaitHours: channelMessage.followUp2WaitHours,
    replyQuestions: channelMessage.replyQuestions,
    replyBody: channelMessage.replyBody,
  });
}

export function buildResumeAiPersonalize(campaign: OutreachModuleCampaignDetail): boolean {
  const messageStep = (campaign.builder?.steps?.message ?? {}) as MessageStep;
  const personalizeStep = campaign.builder?.steps?.personalize as { aiPersonalize?: boolean } | undefined;
  if (messageStep.aiPersonalize != null) return messageStep.aiPersonalize !== false;
  if (personalizeStep?.aiPersonalize != null) return personalizeStep.aiPersonalize !== false;
  return campaign.aiPersonalize !== false;
}

export function buildResumeCandidateIds(campaign: OutreachModuleCampaignDetail): string[] {
  const candidatesStep = (campaign.builder?.steps?.candidates ?? {}) as CandidatesStep;
  if (Array.isArray(candidatesStep.candidateIds) && candidatesStep.candidateIds.length > 0) {
    return candidatesStep.candidateIds;
  }
  return [];
}

export function buildResumeCandidateSource(campaign: OutreachModuleCampaignDetail): CandidateSource {
  const candidatesStep = (campaign.builder?.steps?.candidates ?? {}) as CandidatesStep;
  const source = candidatesStep.candidateSource || campaign.candidateSource;
  if (source === "csv" || source === "cvs" || source === "ats" || source === "talent_pool") {
    return source;
  }
  return "talent_pool";
}

export function buildResumeSequenceSteps(campaign: OutreachModuleCampaignDetail): SequenceStep[] {
  const sequenceStep = (campaign.builder?.steps?.sequence ?? {}) as SequenceStepData;
  if (Array.isArray(sequenceStep.steps) && sequenceStep.steps.length > 0) {
    return normalizeSequenceStepsFromApi(sequenceStep.steps);
  }
  if (Array.isArray(campaign.sequenceSteps) && campaign.sequenceSteps.length > 0) {
    return normalizeSequenceStepsFromApi(campaign.sequenceSteps);
  }
  return [];
}

export function buildResumeWhatsappReplyQuestions(
  campaign: OutreachModuleCampaignDetail
): string[] {
  const personalizeStep = campaign.builder?.steps?.personalize as
    | { whatsappReplyQuestions?: string[] }
    | undefined;
  if (
    Array.isArray(personalizeStep?.whatsappReplyQuestions) &&
    personalizeStep.whatsappReplyQuestions.length > 0
  ) {
    return personalizeStep.whatsappReplyQuestions
      .map((q) => String(q || "").trim())
      .filter(Boolean);
  }

  const channelMessage = campaign.channelMessage;
  if (Array.isArray(channelMessage?.replyQuestions) && channelMessage.replyQuestions.length > 0) {
    return channelMessage.replyQuestions.map((q) => String(q || "").trim()).filter(Boolean);
  }

  return [];
}

type PersonalizeStepMessage = { stepId?: string; message?: string | null };

export function buildResumeStepMessages(
  campaign: OutreachModuleCampaignDetail
): Record<string, string> {
  const messages: Record<string, string> = {};
  const personalizeStep = campaign.builder?.steps?.personalize as
    | { stepMessages?: PersonalizeStepMessage[] }
    | undefined;

  for (const item of personalizeStep?.stepMessages ?? []) {
    const stepId = String(item.stepId || "").trim();
    const body = String(item.message || "").trim();
    if (stepId && body) {
      messages[stepId] = body;
    }
  }

  for (const step of campaign.sequenceSteps ?? []) {
    const body = String(step.message || "").trim();
    if (step.id && body && !messages[step.id]) {
      messages[step.id] = body;
    }
  }

  return messages;
}
