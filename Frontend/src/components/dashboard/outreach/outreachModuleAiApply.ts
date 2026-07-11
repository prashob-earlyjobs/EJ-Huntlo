import {
  buildSequenceTimingLabel,
  createClientSequenceStepId,
} from "@/components/dashboard/outreach/outreachSequenceHelpers";
import type { OutreachChannel, SequenceStep } from "@/components/dashboard/outreach/types";
import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import type { GenerateOutreachFromJdResult } from "@/lib/outreachAiApi";
import {
  EMAIL_SEQUENCE_DEFAULT_WAITS,
  EMAIL_SEQUENCE_STEP_LABELS,
  emailMessageHasContent,
  resolveEmailSingleChannelMessage,
  type EmailSingleChannelMessage,
} from "@/lib/emailSingleChannelOutreach";
import {
  createDefaultWhatsAppSingleChannelMessage,
  resolveWhatsAppSingleChannelMessage,
  type WhatsAppSingleChannelMessage,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
import {
  resolveVoiceSingleChannelMessage,
  decodeVoiceStepMessage,
  type VoiceSingleChannelMessage,
} from "@/lib/voiceSingleChannelOutreach";

export function singleChannelMissingAiMessages(
  channel: OutreachChannel,
  whatsappMessage: WhatsAppSingleChannelMessage,
  emailMessage: EmailSingleChannelMessage
): boolean {
  if (channel === "email") {
    return !emailMessageHasContent(emailMessage);
  }
  if (channel === "whatsapp") {
    const defaults = createDefaultWhatsAppSingleChannelMessage();
    const repliesMatchDefaults =
      whatsappMessage.replyQuestions.length === defaults.replyQuestions.length &&
      whatsappMessage.replyQuestions.every(
        (question, index) => question.trim() === defaults.replyQuestions[index]?.trim()
      );
    const openingMatchesDefault =
      whatsappMessage.body.trim() === defaults.body.trim() &&
      whatsappMessage.templateId === defaults.templateId;
    return openingMatchesDefault && repliesMatchDefaults;
  }
  return false;
}

export function encodeWhatsAppStepMessage(body: string, templateId = ""): string {
  return JSON.stringify({
    body: String(body || "").trim(),
    templateId: String(templateId || "").trim(),
  });
}

export function decodeWhatsAppStepMessage(raw: string): { body: string; templateId: string } {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { body: "", templateId: "" };
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { body?: string; templateId?: string };
      if (parsed && typeof parsed === "object") {
        return {
          body: String(parsed.body || "").trim(),
          templateId: String(parsed.templateId || "").trim(),
        };
      }
    } catch {
      // fall through
    }
  }
  return { body: trimmed, templateId: "" };
}

export function encodeEmailStepMessage(subject: string, body: string): string {
  return JSON.stringify({
    subject: String(subject || "").trim(),
    body: String(body || "").trim(),
  });
}

export { decodeVoiceStepMessage, encodeVoiceStepMessage } from "@/lib/voiceSingleChannelOutreach";

export function mergeVoiceStepMessage(
  current: Record<string, string>,
  stepId: string,
  patch: Partial<VoiceSingleChannelMessage>
): Record<string, string> {
  const resolved = resolveVoiceSingleChannelMessage({
    ...decodeVoiceStepMessage(current[stepId] ?? ""),
    ...patch,
  });
  return {
    ...current,
    [stepId]: encodeVoiceStepMessage(resolved),
  };
}

export function decodeEmailStepMessage(raw: string): { subject: string; body: string } {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { subject: "", body: "" };
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { subject?: string; body?: string };
      if (parsed && typeof parsed === "object") {
        return {
          subject: String(parsed.subject || "").trim(),
          body: String(parsed.body || "").trim(),
        };
      }
    } catch {
      // fall through to plain body
    }
  }
  return { subject: "", body: trimmed };
}

function touchpointToDelay(
  index: number,
  touchpoint: { waitDays?: number; waitHours?: number; waitMinutes?: number }
): Pick<SequenceStep, "delayValue" | "delayUnit"> {
  if (index === 0) return { delayValue: 0, delayUnit: "days" };
  const waitMinutes = Math.max(0, Number(touchpoint.waitMinutes) || 0);
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);
  if (waitMinutes > 0 && waitDays === 0 && waitHours === 0) {
    return { delayValue: waitMinutes, delayUnit: "minutes" };
  }
  if (waitHours > 0 && waitDays === 0) {
    return { delayValue: waitHours, delayUnit: "hours" };
  }
  return { delayValue: waitDays || 1, delayUnit: "days" };
}

export function applyGmailAiToSingleChannel(
  touchpoints: OutreachTouchpointDraft[]
): EmailSingleChannelMessage {
  return resolveEmailSingleChannelMessage({
    emailTouchpoints: touchpoints.slice(0, 4).map((touchpoint, index) => ({
      order: index + 1,
      label: touchpoint.label || EMAIL_SEQUENCE_STEP_LABELS[index] || `Email ${index + 1}`,
      subject: String(touchpoint.subject || "").trim(),
      body: String(touchpoint.body || "").trim(),
      waitDays: Math.max(0, Number(touchpoint.waitDays ?? EMAIL_SEQUENCE_DEFAULT_WAITS[index])),
      waitHours: Math.max(0, Number(touchpoint.waitHours) || 0),
      waitMinutes: Math.max(0, Number(touchpoint.waitMinutes) || 0),
      waitUnit: touchpoint.waitUnit,
    })),
  });
}

export function applyWhatsAppAiToSingleChannel(
  touchpoints: WhatsAppTouchpointDraft[]
): WhatsAppSingleChannelMessage {
  const opening =
    touchpoints.find((tp) => !tp.isNoReplyFallback && !tp.isReplyFollowUp) || touchpoints[0];
  const noReply = touchpoints.filter((tp) => tp.isNoReplyFallback && !tp.isReplyFollowUp);
  let replyQuestions = touchpoints
    .filter((tp) => tp.isReplyFollowUp)
    .sort((a, b) => a.order - b.order)
    .map((tp) => String(tp.body || "").trim())
    .filter(Boolean);

  if (replyQuestions.length === 0) {
    replyQuestions = touchpoints
      .filter((tp) => tp.order > 3 && !tp.isNoReplyFallback)
      .sort((a, b) => a.order - b.order)
      .map((tp) => String(tp.body || "").trim())
      .filter(Boolean);
  }

  return resolveWhatsAppSingleChannelMessage({
    templateId: opening?.templateId,
    body: opening?.body,
    followUpTemplateId: noReply[0]?.templateId,
    followUpBody: noReply[0]?.body,
    followUpWaitHours: Math.max(1, Number(noReply[0]?.waitHours) || 48),
    followUp2TemplateId: noReply[1]?.templateId,
    followUp2Body: noReply[1]?.body,
    followUp2WaitHours: Math.max(1, Number(noReply[1]?.waitHours) || 96),
    replyQuestions,
  });
}

export function applyGmailTouchpointsToMultiChannel(touchpoints: OutreachTouchpointDraft[]) {
  const steps: SequenceStep[] = [];
  const messages: Record<string, string> = {};

  touchpoints.forEach((touchpoint, index) => {
    const id = createClientSequenceStepId();
    const delay = touchpointToDelay(index, touchpoint);
    const step: SequenceStep = {
      id,
      channel: "email",
      label: touchpoint.label || `Email ${index + 1}`,
      ...delay,
      condition: index === 0 ? "all" : "no_response",
      timingLabel: buildSequenceTimingLabel(delay, index),
    };
    steps.push(step);
    messages[id] = encodeEmailStepMessage(touchpoint.subject, touchpoint.body);
  });

  return { steps, messages };
}

export function applyWhatsAppTouchpointsToMultiChannel(touchpoints: WhatsAppTouchpointDraft[]) {
  const sequenceTouchpoints = touchpoints.filter((tp) => !tp.isReplyFollowUp);
  const steps: SequenceStep[] = [];
  const messages: Record<string, string> = {};

  sequenceTouchpoints.forEach((touchpoint, index) => {
    const id = createClientSequenceStepId();
    const delay = touchpointToDelay(index, touchpoint);
    const step: SequenceStep = {
      id,
      channel: "whatsapp",
      label: touchpoint.label || `WhatsApp ${index + 1}`,
      ...delay,
      condition: index === 0 ? "all" : "no_response",
      timingLabel: buildSequenceTimingLabel(delay, index),
    };
    steps.push(step);
    messages[id] = encodeWhatsAppStepMessage(
      String(touchpoint.body || ""),
      String(touchpoint.templateId || "")
    );
  });

  return { steps, messages };
}

export function applyAiResultToSingleChannel(
  result: GenerateOutreachFromJdResult,
  channel: "email" | "whatsapp"
) {
  if (result.channel === "whatsapp" && channel === "whatsapp") {
    return {
      whatsappMessage: applyWhatsAppAiToSingleChannel(result.touchpoints),
      emailMessage: null,
    };
  }
  if (result.channel === "gmail" && channel === "email") {
    return {
      whatsappMessage: null,
      emailMessage: applyGmailAiToSingleChannel(result.touchpoints),
    };
  }
  return null;
}

export function mergeWhatsAppAiIntoSequence(
  sequenceSteps: SequenceStep[],
  touchpoints: WhatsAppTouchpointDraft[]
): {
  sequenceSteps: SequenceStep[];
  messages: Record<string, string>;
  replyQuestions: string[];
} {
  const existingWaSteps = sequenceSteps.filter((step) => step.channel === "whatsapp");
  if (existingWaSteps.length === 0) {
    return { sequenceSteps, messages: {}, replyQuestions: [] };
  }

  const automated = touchpoints.filter((tp) => !tp.isReplyFollowUp);
  const replyQuestions = touchpoints
    .filter((tp) => tp.isReplyFollowUp)
    .map((tp) => String(tp.body || "").trim())
    .filter(Boolean);

  const messages: Record<string, string> = {};
  existingWaSteps.forEach((step, index) => {
    const touchpoint = automated[index];
    if (!touchpoint) return;
    messages[step.id] = encodeWhatsAppStepMessage(
      String(touchpoint.body || ""),
      String(touchpoint.templateId || "")
    );
  });

  return {
    sequenceSteps,
    messages,
    replyQuestions,
  };
}

export function mergeAiIntoExistingSequence(
  sequenceSteps: SequenceStep[],
  options: {
    gmailTouchpoints?: OutreachTouchpointDraft[];
    whatsappTouchpoints?: WhatsAppTouchpointDraft[];
  }
): Record<string, string> {
  const messages: Record<string, string> = {};
  const emailSteps = sequenceSteps.filter((step) => step.channel === "email");

  if (options.gmailTouchpoints?.length) {
    emailSteps.forEach((step, index) => {
      const touchpoint = options.gmailTouchpoints?.[index];
      if (!touchpoint) return;
      messages[step.id] = encodeEmailStepMessage(touchpoint.subject, touchpoint.body);
    });
  }

  if (options.whatsappTouchpoints?.length) {
    const whatsappResult = mergeWhatsAppAiIntoSequence(
      sequenceSteps,
      options.whatsappTouchpoints
    );
    Object.assign(messages, whatsappResult.messages);
  }

  return messages;
}

export function channelsNeedingAiGeneration(steps: SequenceStep[]) {
  const channels = new Set<"email" | "whatsapp">();
  for (const step of steps) {
    if (step.channel === "email" || step.channel === "whatsapp") {
      channels.add(step.channel);
    }
  }
  return channels;
}

/** Channels in the sequence that still have no saved message content. */
export function channelsMissingAiMessages(
  steps: SequenceStep[],
  stepMessages: Record<string, string>,
  options?: { whatsappReplyQuestions?: string[] }
) {
  const merged = mergeStepMessagesFromSteps(steps, stepMessages);
  const channelsInSequence = channelsNeedingAiGeneration(steps);
  const missing = new Set<"email" | "whatsapp">();

  if (channelsInSequence.has("email")) {
    const hasEmail = steps
      .filter((step) => step.channel === "email")
      .some((step) => String(merged[step.id] || "").trim());
    if (!hasEmail) missing.add("email");
  }

  if (channelsInSequence.has("whatsapp")) {
    const hasWhatsApp = steps
      .filter((step) => step.channel === "whatsapp")
      .some((step) => String(merged[step.id] || "").trim());
    const hasReplyQuestions = (options?.whatsappReplyQuestions || []).some((q) => q.trim());
    if (!hasWhatsApp && !hasReplyQuestions) missing.add("whatsapp");
  }

  return missing;
}

export function mergeStepMessagesFromSteps(
  steps: SequenceStep[],
  stepMessages: Record<string, string>
): Record<string, string> {
  const merged = { ...stepMessages };
  for (const step of steps) {
    const fromStep = String(
      (step as SequenceStep & { message?: string | null }).message || ""
    ).trim();
    if (fromStep && !String(merged[step.id] || "").trim()) {
      merged[step.id] = fromStep;
    }
  }
  return merged;
}

export function applyAiResultToMultiChannel(result: GenerateOutreachFromJdResult) {
  if (result.channel === "gmail") {
    return applyGmailTouchpointsToMultiChannel(result.touchpoints);
  }
  return applyWhatsAppTouchpointsToMultiChannel(result.touchpoints);
}

export type PersonalizeTabGroup = {
  kind: "step";
  step: SequenceStep;
  stepIndex: number;
  label: string;
};

/** One personalize tab per sequence step (multi-channel uses the builder sequence only). */
export function buildPersonalizeTabGroups(sequenceSteps: SequenceStep[]): PersonalizeTabGroup[] {
  return sequenceSteps.map((step, stepIndex) => ({
    kind: "step",
    step,
    stepIndex,
    label: step.label?.trim() || `Step ${stepIndex + 1}`,
  }));
}

export function findPersonalizeTabIndexForStep(
  sequenceSteps: SequenceStep[],
  stepId: string
): number {
  const stepIndex = sequenceSteps.findIndex((step) => step.id === stepId);
  return stepIndex >= 0 ? stepIndex : 0;
}

function sequenceStepDelayToHours(step: Pick<SequenceStep, "delayValue" | "delayUnit">) {
  const delayValue = Math.max(0, Number(step.delayValue) || 0);
  if (delayValue <= 0) return 0;
  if (step.delayUnit === "minutes") return delayValue / 60;
  if (step.delayUnit === "hours") return delayValue;
  return delayValue * 24;
}

export function readWhatsAppFromSequenceSteps(
  sequenceSteps: SequenceStep[],
  stepMessages: Record<string, string>,
  replyQuestions: string[]
): WhatsAppSingleChannelMessage {
  const waSteps = sequenceSteps.filter((step) => step.channel === "whatsapp");
  const [opening, followUp1, followUp2] = waSteps;

  const openingMsg = opening
    ? decodeWhatsAppStepMessage(stepMessages[opening.id] ?? "")
    : { body: "", templateId: "" };
  const followUp1Msg = followUp1
    ? decodeWhatsAppStepMessage(stepMessages[followUp1.id] ?? "")
    : { body: "", templateId: "" };
  const followUp2Msg = followUp2
    ? decodeWhatsAppStepMessage(stepMessages[followUp2.id] ?? "")
    : { body: "", templateId: "" };

  return {
    templateId: openingMsg.templateId,
    body: openingMsg.body,
    followUpTemplateId: followUp1Msg.templateId,
    followUpBody: followUp1Msg.body,
    followUpWaitHours: followUp1
      ? Math.max(1, sequenceStepDelayToHours(followUp1) || 48)
      : 48,
    followUp2TemplateId: followUp2Msg.templateId,
    followUp2Body: followUp2Msg.body,
    followUp2WaitHours: followUp2
      ? Math.max(1, sequenceStepDelayToHours(followUp2) || 96)
      : 96,
    replyQuestions,
  };
}

const WHATSAPP_SEQUENCE_STEP_LABELS = [
  "Opening message",
  "No-reply follow-up 1",
  "No-reply follow-up 2",
] as const;

function whatsAppContentStepCount(message: WhatsAppSingleChannelMessage): number {
  let count = 1;
  if (String(message.followUpBody || "").trim() || String(message.followUpTemplateId || "").trim()) {
    count = 2;
  }
  if (String(message.followUp2Body || "").trim() || String(message.followUp2TemplateId || "").trim()) {
    count = 3;
  }
  return count;
}

function resolveWhatsAppSequenceStepCount(
  existingWaSteps: SequenceStep[],
  message: WhatsAppSingleChannelMessage
): number {
  const existing = existingWaSteps.length;
  const fromContent = whatsAppContentStepCount(message);
  if (existing <= 0) return Math.min(3, fromContent);
  return Math.min(3, Math.max(existing, fromContent));
}

function whatsAppMessagePartAtIndex(
  message: WhatsAppSingleChannelMessage,
  index: number
): { body: string; templateId: string; delay?: Pick<SequenceStep, "delayValue" | "delayUnit"> } {
  if (index === 0) {
    return {
      body: message.body,
      templateId: message.templateId,
      delay: { delayValue: 0, delayUnit: "days" },
    };
  }
  if (index === 1) {
    return {
      body: message.followUpBody,
      templateId: message.followUpTemplateId,
      delay: {
        delayValue: Math.max(1, message.followUpWaitHours),
        delayUnit: "hours",
      },
    };
  }
  return {
    body: message.followUp2Body,
    templateId: message.followUp2TemplateId,
    delay: {
      delayValue: Math.max(1, message.followUp2WaitHours),
      delayUnit: "hours",
    },
  };
}

/** Sync WhatsApp personalize editor onto existing sequence steps (grow only when follow-ups have content). */
export function applyWhatsAppMessageToSequence(
  sequenceSteps: SequenceStep[],
  stepMessages: Record<string, string>,
  message: WhatsAppSingleChannelMessage
): { sequenceSteps: SequenceStep[]; stepMessages: Record<string, string> } {
  const firstWaIndex = sequenceSteps.findIndex((step) => step.channel === "whatsapp");
  if (firstWaIndex < 0) {
    return { sequenceSteps, stepMessages };
  }

  const lastWaIndex = sequenceSteps.reduce(
    (last, step, index) => (step.channel === "whatsapp" ? index : last),
    firstWaIndex
  );

  const existingWaSteps = sequenceSteps.filter((step) => step.channel === "whatsapp");
  const stepCount = resolveWhatsAppSequenceStepCount(existingWaSteps, message);

  const waSteps: SequenceStep[] = Array.from({ length: stepCount }, (_, index) => {
    const existing = existingWaSteps[index];
    const part = whatsAppMessagePartAtIndex(message, index);
    const delay = part.delay ?? { delayValue: 0, delayUnit: "days" as const };
    return {
      id: existing?.id ?? createClientSequenceStepId(),
      channel: "whatsapp",
      label: existing?.label?.trim() || WHATSAPP_SEQUENCE_STEP_LABELS[index] || `WhatsApp ${index + 1}`,
      ...delay,
      condition: index === 0 ? "all" : "no_response",
      timingLabel: buildSequenceTimingLabel(delay, index),
    };
  });

  const nextSequenceSteps = [
    ...sequenceSteps.slice(0, firstWaIndex),
    ...waSteps,
    ...sequenceSteps.slice(lastWaIndex + 1).filter((step) => step.channel !== "whatsapp"),
  ];

  const nextStepMessages = { ...stepMessages };
  waSteps.forEach((step, index) => {
    const part = whatsAppMessagePartAtIndex(message, index);
    nextStepMessages[step.id] = encodeWhatsAppStepMessage(part.body, part.templateId);
  });

  return {
    sequenceSteps: nextSequenceSteps,
    stepMessages: nextStepMessages,
  };
}

export type MultiChannelReviewFlowItem = {
  icon: string;
  title: string;
  subtitle?: string;
  detail?: string;
};

/** Message-level flow items for multi-channel review (mirrors single-channel review). */
export function buildMultiChannelReviewFlowItems(
  sequenceSteps: SequenceStep[],
  stepMessages: Record<string, string>,
  whatsappReplyQuestions: string[] = []
): MultiChannelReviewFlowItem[] {
  const items: MultiChannelReviewFlowItem[] = [];

  sequenceSteps.forEach((step, index) => {
    if (step.channel === "email") {
      const { subject, body } = decodeEmailStepMessage(stepMessages[step.id] ?? "");
      if (!subject.trim() && !body.trim()) return;
      items.push({
        icon: "mail",
        title: index === 0 ? subject.trim() || step.label : step.label,
        subtitle: index === 0 ? step.label : buildSequenceTimingLabel(step, index),
        detail: body,
      });
      return;
    }

    if (step.channel === "whatsapp") {
      const { body, templateId } = decodeWhatsAppStepMessage(stepMessages[step.id] ?? "");
      if (!body.trim() && !templateId.trim()) return;
      items.push({
        icon: "chat",
        title: step.label || `WhatsApp step ${index + 1}`,
        subtitle: templateId.trim() || "WhatsApp template",
        detail: body,
      });
      return;
    }

    if (step.channel === "voice") {
      const { body } = decodeVoiceStepMessage(stepMessages[step.id] ?? "");
      if (!body.trim()) return;
      items.push({
        icon: "record_voice_over",
        title: step.label || "Voice call",
        subtitle: buildSequenceTimingLabel(step, index),
        detail: body,
      });
    }
  });

  whatsappReplyQuestions
    .map((question) => question.trim())
    .filter(Boolean)
    .forEach((question, index) => {
      items.push({
        icon: "quiz",
        title: `Qualification question ${index + 1}`,
        subtitle: "When candidate replies on WhatsApp",
        detail: question,
      });
    });

  return items;
}
