import {
  VOICE_CALL_OBJECTIVE_DEFAULT,
  VOICE_CALL_PROMPT_DEFAULT,
} from "@/lib/defaultVoiceCallPrompt";
import type { VoiceTone } from "@/components/dashboard/outreach/types";

export type VoiceSingleChannelMessage = {
  body: string;
  callObjective: string;
  voiceTone: VoiceTone;
  callAttempts: number;
  attemptGapHours: number;
};

export function createDefaultVoiceSingleChannelMessage(): VoiceSingleChannelMessage {
  return {
    body: VOICE_CALL_PROMPT_DEFAULT,
    callObjective: VOICE_CALL_OBJECTIVE_DEFAULT,
    voiceTone: "professional",
    callAttempts: 1,
    attemptGapHours: 24,
  };
}

type ResolveVoiceMessageInput = {
  body?: string;
  callObjective?: string;
  voiceTone?: VoiceTone;
  callAttempts?: number;
  attemptGapHours?: number;
};

export function resolveVoiceSingleChannelMessage(
  partial?: ResolveVoiceMessageInput
): VoiceSingleChannelMessage {
  const defaults = createDefaultVoiceSingleChannelMessage();
  const body = String(partial?.body || "").trim();

  return {
    body: body || defaults.body,
    callObjective: String(partial?.callObjective || "").trim() || defaults.callObjective,
    voiceTone: partial?.voiceTone || defaults.voiceTone,
    callAttempts: Math.max(1, Number(partial?.callAttempts ?? defaults.callAttempts)),
    attemptGapHours: Math.max(0, Number(partial?.attemptGapHours ?? defaults.attemptGapHours)),
  };
}

export function voiceMessageHasContent(message: VoiceSingleChannelMessage): boolean {
  return Boolean(message.body.trim());
}

export function voiceMessageToChannelPayload(message: VoiceSingleChannelMessage) {
  return {
    channel: "voice" as const,
    body: message.body,
    callObjective: message.callObjective,
    voiceTone: message.voiceTone,
    callAttempts: message.callAttempts,
    attemptGapHours: message.attemptGapHours,
  };
}

export function encodeVoiceStepMessage(message: VoiceSingleChannelMessage): string {
  const resolved = resolveVoiceSingleChannelMessage(message);
  return JSON.stringify({
    body: resolved.body,
    callObjective: resolved.callObjective,
    voiceTone: resolved.voiceTone,
    callAttempts: resolved.callAttempts,
    attemptGapHours: resolved.attemptGapHours,
  });
}

export function decodeVoiceStepMessage(raw: string): VoiceSingleChannelMessage {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return resolveVoiceSingleChannelMessage();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<VoiceSingleChannelMessage>;
      if (parsed && typeof parsed === "object") {
        return resolveVoiceSingleChannelMessage(parsed);
      }
    } catch {
      // fall through to plain body
    }
  }
  return resolveVoiceSingleChannelMessage({ body: trimmed });
}

export function ensureVoiceStepDefaults(
  steps: Array<{ id: string; channel: string }>,
  messages: Record<string, string>
): Record<string, string> {
  const next = { ...messages };
  const defaultVoice = createDefaultVoiceSingleChannelMessage();
  for (const step of steps) {
    if (step.channel !== "voice") continue;
    if (String(next[step.id] || "").trim()) continue;
    next[step.id] = encodeVoiceStepMessage(defaultVoice);
  }
  return next;
}
