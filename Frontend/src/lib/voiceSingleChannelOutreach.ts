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
