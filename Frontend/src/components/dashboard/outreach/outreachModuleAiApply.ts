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
  touchpoint: { waitDays?: number; waitHours?: number }
): Pick<SequenceStep, "delayValue" | "delayUnit"> {
  if (index === 0) return { delayValue: 0, delayUnit: "days" };
  const waitHours = Math.max(0, Number(touchpoint.waitHours) || 0);
  const waitDays = Math.max(0, Number(touchpoint.waitDays) || 0);
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
  const firstWaIndex = sequenceSteps.findIndex((step) => step.channel === "whatsapp");
  if (firstWaIndex < 0) {
    return { sequenceSteps, messages: {}, replyQuestions: [] };
  }

  const automated = touchpoints.filter((tp) => !tp.isReplyFollowUp);
  const replyQuestions = touchpoints
    .filter((tp) => tp.isReplyFollowUp)
    .map((tp) => String(tp.body || "").trim())
    .filter(Boolean);

  const lastWaIndex = sequenceSteps.reduce(
    (last, step, index) => (step.channel === "whatsapp" ? index : last),
    firstWaIndex
  );

  const waStepsToInsert: SequenceStep[] = automated.slice(0, 3).map((touchpoint, index) => {
    const delay = touchpointToDelay(index, touchpoint);
    return {
      id: createClientSequenceStepId(),
      channel: "whatsapp",
      label:
        touchpoint.label ||
        (index === 0
          ? "Opening message"
          : index === 1
            ? "No-reply follow-up 1"
            : "No-reply follow-up 2"),
      ...delay,
      condition: index === 0 ? "all" : "no_response",
      timingLabel: buildSequenceTimingLabel(delay, index),
    };
  });

  const nextSequenceSteps = [
    ...sequenceSteps.slice(0, firstWaIndex),
    ...waStepsToInsert,
    ...sequenceSteps.slice(lastWaIndex + 1).filter((step) => step.channel !== "whatsapp"),
  ];

  const messages: Record<string, string> = {};
  waStepsToInsert.forEach((step, index) => {
    const touchpoint = automated[index];
    if (!touchpoint) return;
    messages[step.id] = encodeWhatsAppStepMessage(
      String(touchpoint.body || ""),
      String(touchpoint.templateId || "")
    );
  });

  return {
    sequenceSteps: nextSequenceSteps,
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

export type PersonalizeTabGroup =
  | { kind: "step"; step: SequenceStep; stepIndex: number; label: string }
  | { kind: "whatsapp"; stepIndices: number[]; label: string };

function sequenceStepDelayToHours(step: Pick<SequenceStep, "delayValue" | "delayUnit">) {
  const delayValue = Math.max(0, Number(step.delayValue) || 0);
  if (delayValue <= 0) return 0;
  if (step.delayUnit === "hours") return delayValue;
  return delayValue * 24;
}

/** Collapse consecutive WhatsApp sequence steps into one personalize tab. */
export function buildPersonalizeTabGroups(sequenceSteps: SequenceStep[]): PersonalizeTabGroup[] {
  const groups: PersonalizeTabGroup[] = [];
  let index = 0;

  while (index < sequenceSteps.length) {
    const step = sequenceSteps[index];
    if (step.channel === "whatsapp") {
      const stepIndices: number[] = [];
      while (index < sequenceSteps.length && sequenceSteps[index].channel === "whatsapp") {
        stepIndices.push(index);
        index += 1;
      }
      groups.push({
        kind: "whatsapp",
        stepIndices,
        label: "WhatsApp",
      });
      continue;
    }

    groups.push({
      kind: "step",
      step,
      stepIndex: index,
      label: step.label,
    });
    index += 1;
  }

  return groups;
}

export function findPersonalizeTabIndexForStep(
  sequenceSteps: SequenceStep[],
  stepId: string
): number {
  const stepIndex = sequenceSteps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) return 0;

  const groups = buildPersonalizeTabGroups(sequenceSteps);
  const tabIndex = groups.findIndex((group) =>
    group.kind === "step"
      ? group.stepIndex === stepIndex
      : group.stepIndices.includes(stepIndex)
  );
  return tabIndex >= 0 ? tabIndex : 0;
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

  return resolveWhatsAppSingleChannelMessage({
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
  });
}

/** Normalize WhatsApp block to 3 sequence steps and sync encoded messages. */
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
  const followUp1Delay = {
    delayValue: Math.max(1, message.followUpWaitHours),
    delayUnit: "hours" as const,
  };
  const followUp2Delay = {
    delayValue: Math.max(1, message.followUp2WaitHours),
    delayUnit: "hours" as const,
  };

  const waSteps: SequenceStep[] = [
    {
      id: existingWaSteps[0]?.id ?? createClientSequenceStepId(),
      channel: "whatsapp",
      label: "Opening message",
      delayValue: 0,
      delayUnit: "days",
      condition: "all",
      timingLabel: buildSequenceTimingLabel({ delayValue: 0, delayUnit: "days" }, 0),
    },
    {
      id: existingWaSteps[1]?.id ?? createClientSequenceStepId(),
      channel: "whatsapp",
      label: "No-reply follow-up 1",
      ...followUp1Delay,
      condition: "no_response",
      timingLabel: buildSequenceTimingLabel(followUp1Delay, 1),
    },
    {
      id: existingWaSteps[2]?.id ?? createClientSequenceStepId(),
      channel: "whatsapp",
      label: "No-reply follow-up 2",
      ...followUp2Delay,
      condition: "no_response",
      timingLabel: buildSequenceTimingLabel(followUp2Delay, 2),
    },
  ];

  const nextSequenceSteps = [
    ...sequenceSteps.slice(0, firstWaIndex),
    ...waSteps,
    ...sequenceSteps.slice(lastWaIndex + 1).filter((step) => step.channel !== "whatsapp"),
  ];

  const nextStepMessages = { ...stepMessages };
  nextStepMessages[waSteps[0].id] = encodeWhatsAppStepMessage(message.body, message.templateId);
  nextStepMessages[waSteps[1].id] = encodeWhatsAppStepMessage(
    message.followUpBody,
    message.followUpTemplateId
  );
  nextStepMessages[waSteps[2].id] = encodeWhatsAppStepMessage(
    message.followUp2Body,
    message.followUp2TemplateId
  );

  return {
    sequenceSteps: nextSequenceSteps,
    stepMessages: nextStepMessages,
  };
}
