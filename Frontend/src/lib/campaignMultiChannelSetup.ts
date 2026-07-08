import type {
  CampaignSetupArrangeDraft,
  OutreachSequenceChannel,
  ScreeningChannel,
  SetupEmailStepDraft,
  SetupMessageStepDraft,
} from "@/lib/campaignSetupPickerDraft";
import { createEmptyTouchpoint, type OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import {
  createEmptyWhatsAppStep,
  ensureWhatsAppSequenceWithFallbacks,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";

export type CampaignMultiChannelSetup = {
  channels: OutreachSequenceChannel[];
  activeChannel: OutreachSequenceChannel;
  arrange: CampaignSetupArrangeDraft;
  screeningChannel: ScreeningChannel | "";
  jobTitle: string;
  jobDescription: string;
};

export function multiChannelEditorLabel(channel: OutreachSequenceChannel): string {
  if (channel === "gmail") return "Gmail";
  if (channel === "whatsapp") return "WhatsApp";
  return "AI voice call";
}

export function gmailTouchpointsFromArrange(
  steps: SetupEmailStepDraft[]
): OutreachTouchpointDraft[] {
  if (steps.length === 0) return [createEmptyTouchpoint(1)];
  return steps.map((step, index) => {
    const order = index + 1;
    const base = createEmptyTouchpoint(order);
    return {
      ...base,
      subject: step.subject,
      body: step.body,
    };
  });
}

export function whatsappTouchpointsFromArrange(
  steps: SetupMessageStepDraft[]
): WhatsAppTouchpointDraft[] {
  if (steps.length === 0) return createInitialWhatsAppFromArrange();
  const mapped = steps.map((step, index) => {
    const order = index + 1;
    const base = createEmptyWhatsAppStep(order);
    return {
      ...base,
      body: step.message,
      templateId: step.templateId,
    };
  });
  return ensureWhatsAppSequenceWithFallbacks(mapped);
}

function createInitialWhatsAppFromArrange(): WhatsAppTouchpointDraft[] {
  return ensureWhatsAppSequenceWithFallbacks([createEmptyWhatsAppStep(1)]);
}

export function waitDaysBeforeChannel(
  channel: OutreachSequenceChannel,
  waitDaysByChannel: Record<string, string>
): string {
  const days = waitDaysByChannel[channel]?.trim() || "3";
  return `Wait ${days} day${days === "1" ? "" : "s"}`;
}
