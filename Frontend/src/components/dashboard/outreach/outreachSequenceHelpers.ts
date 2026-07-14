import { getChannelIcon, getChannelLabel } from "@/components/dashboard/outreach/ChannelCard";
import type {
  DelayUnit,
  OutreachChannel,
  SequenceStep,
} from "@/components/dashboard/outreach/types";
import { ensureVoiceStepDefaults } from "@/lib/voiceSingleChannelOutreach";

export const FOLLOW_UP_CONDITION_LABEL = "If no reply";

export type JourneyPreviewItem = {
  stepNumber: number;
  channel: OutreachChannel;
  channelLabel: string;
  channelIcon: string;
  timing: string;
  condition: string;
  isInitial: boolean;
};

function buildJourneyTimingLabel(
  step: Pick<SequenceStep, "delayValue" | "delayUnit">,
  index: number,
  compact = false
) {
  if (index === 0) return compact ? "Immediate" : "Starts immediately";
  if (step.delayValue === 0) {
    return compact ? "Right after" : "Immediately after previous step";
  }
  const full = buildSequenceTimingLabel(step, index);
  if (!compact) return full;
  const unit =
    step.delayUnit === "minutes" ? "m" : step.delayUnit === "hours" ? "h" : "d";
  return `After ${step.delayValue}${unit}`;
}

export function buildJourneyPreviewItems(
  steps: SequenceStep[],
  options?: { compact?: boolean }
): JourneyPreviewItem[] {
  const compact = options?.compact ?? false;
  if (steps.length === 0) return [];

  return steps.map((step, index) => ({
    stepNumber: index + 1,
    channel: step.channel,
    channelLabel: getChannelLabel(step.channel),
    channelIcon: getChannelIcon(step.channel),
    timing: buildJourneyTimingLabel(step, index, compact),
    condition: index === 0 ? "Initial" : FOLLOW_UP_CONDITION_LABEL,
    isInitial: index === 0,
  }));
}

export function buildJourneyPreviewLines(steps: SequenceStep[]): string[] {
  const items = buildJourneyPreviewItems(steps);
  if (items.length === 0) {
    return ["Add at least one step to preview the candidate journey."];
  }

  return items.map((item) => `${item.timing}: ${item.channelLabel} — ${item.condition}`);
}

export function createClientSequenceStepId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultMultiSequenceSteps(): SequenceStep[] {
  return [
    {
      id: createClientSequenceStepId(),
      channel: "whatsapp",
      label: "WhatsApp",
      delayValue: 0,
      delayUnit: "days",
      condition: "all",
      timingLabel: "Immediately",
    },
  ];
}

export function buildSequenceTimingLabel(
  step: Pick<SequenceStep, "delayValue" | "delayUnit">,
  index: number
) {
  if (index === 0) return "Immediately";
  const unit: DelayUnit =
    step.delayUnit === "minutes" || step.delayUnit === "hours" ? step.delayUnit : "days";
  const label = unit === "minutes" ? "minute" : unit === "hours" ? "hour" : "day";
  const plural = step.delayValue === 1 ? label : `${label}s`;
  return `After ${step.delayValue} ${plural}`;
}

export function normalizeSequenceStepsFromApi(
  steps: Array<Partial<SequenceStep> & { id?: string; _id?: string; message?: string | null }>
): SequenceStep[] {
  if (!Array.isArray(steps) || steps.length === 0) return [];

  return steps.map((step, index) => {
    const channel = (step.channel || "whatsapp") as OutreachChannel;
    const delayValue = index === 0 ? 0 : Math.max(0, Number(step.delayValue) || 0);
    const delayUnit: DelayUnit =
      step.delayUnit === "minutes" || step.delayUnit === "hours" ? step.delayUnit : "days";
    const normalized: SequenceStep = {
      id: String(step.id || step._id || createClientSequenceStepId()),
      channel,
      label: step.label?.trim() || getChannelLabel(channel),
      delayValue,
      delayUnit,
      condition: index === 0 ? "all" : "no_response",
      timingLabel:
        step.timingLabel?.trim() || buildSequenceTimingLabel({ delayValue, delayUnit }, index),
    };
    if (step.message != null && String(step.message).trim()) {
      normalized.message = String(step.message);
    }
    return normalized;
  });
}

export function sequenceStepsEquivalent(a: SequenceStep[], b: SequenceStep[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((step, index) => {
    const other = b[index];
    if (!other) return false;
    return (
      step.id === other.id &&
      step.channel === other.channel &&
      step.label === other.label &&
      step.delayValue === other.delayValue &&
      step.delayUnit === other.delayUnit &&
      step.condition === other.condition &&
      step.timingLabel === other.timingLabel
    );
  });
}

export function remapStepMessagesByIndex(
  previousSteps: SequenceStep[],
  nextSteps: SequenceStep[],
  messages: Record<string, string>
): Record<string, string> {
  const remapped: Record<string, string> = {};

  nextSteps.forEach((step, index) => {
    const previousId = previousSteps[index]?.id;
    const direct = messages[step.id];
    const fromPreviousIndex = previousId ? messages[previousId] : undefined;

    if (direct != null && direct.trim()) {
      remapped[step.id] = direct;
    } else if (fromPreviousIndex != null && fromPreviousIndex.trim()) {
      remapped[step.id] = fromPreviousIndex;
    }
  });

  return remapped;
}

export { ensureVoiceStepDefaults } from "@/lib/voiceSingleChannelOutreach";

export function buildStepMessagesPayload(
  steps: SequenceStep[],
  messages: Record<string, string>
) {
  const resolved = ensureVoiceStepDefaults(steps, messages);
  return steps.map((step) => ({
    stepId: step.id,
    message: resolved[step.id]?.trim() || null,
  }));
}

export function pruneStepMessages(
  steps: SequenceStep[],
  messages: Record<string, string>
): Record<string, string> {
  const validIds = new Set(steps.map((step) => step.id));
  const next: Record<string, string> = {};
  for (const [id, message] of Object.entries(messages)) {
    if (validIds.has(id) && message.trim()) {
      next[id] = message;
    }
  }
  return next;
}
