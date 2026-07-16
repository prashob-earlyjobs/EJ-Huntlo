import {
  VOICE_CALL_OBJECTIVE_DEFAULT,
  VOICE_CALL_PROMPT_DEFAULT,
} from "@/lib/defaultVoiceCallPrompt";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import type { VoiceTone } from "@/components/dashboard/outreach/types";

export type PostQualificationCallLanguage =
  | "english"
  | "hindi"
  | "malayalam"
  | "kannada"
  | "tamil"
  | "telugu";

export type PostQualificationVoice = {
  callObjective: string;
  body: string;
  language: PostQualificationCallLanguage;
  voiceTone: VoiceTone;
  callAttempts: number;
  attemptGapHours: number;
};

export type PostQualificationConfig = {
  screeningEnabled: boolean;
  schedulingEnabled: boolean;
  voice: PostQualificationVoice;
};

export function createDefaultPostQualificationVoice(): PostQualificationVoice {
  return {
    callObjective: VOICE_CALL_OBJECTIVE_DEFAULT,
    body: VOICE_CALL_PROMPT_DEFAULT,
    language: "english",
    voiceTone: "professional",
    callAttempts: 1,
    attemptGapHours: 24,
  };
}

export function createDefaultPostQualification(
  options: { schedulingEnabled?: boolean } = {}
): PostQualificationConfig {
  return {
    screeningEnabled: false,
    schedulingEnabled: Boolean(options.schedulingEnabled),
    voice: createDefaultPostQualificationVoice(),
  };
}

export function resolvePostQualification(
  partial?: Partial<PostQualificationConfig> | null
): PostQualificationConfig {
  const defaults = createDefaultPostQualification();
  const voicePartial = partial?.voice;
  return {
    screeningEnabled: Boolean(partial?.screeningEnabled),
    schedulingEnabled: Boolean(partial?.schedulingEnabled),
    voice: {
      callObjective:
        String(voicePartial?.callObjective || "").trim() || defaults.voice.callObjective,
      body: String(voicePartial?.body || "").trim() || defaults.voice.body,
      language: voicePartial?.language || defaults.voice.language,
      voiceTone: voicePartial?.voiceTone || defaults.voice.voiceTone,
      callAttempts: Math.max(1, Number(voicePartial?.callAttempts ?? defaults.voice.callAttempts)),
      attemptGapHours: Math.max(
        0,
        Number(voicePartial?.attemptGapHours ?? defaults.voice.attemptGapHours)
      ),
    },
  };
}

export function postQualificationScreeningReady(config: PostQualificationConfig): boolean {
  if (!config.screeningEnabled) return true;
  return Boolean(config.voice.body.trim());
}

export function postQualificationSchedulingReady(
  config: PostQualificationConfig,
  calendly: CampaignCalendlyAutomation
): boolean {
  if (!config.schedulingEnabled) return true;
  return Boolean(calendly.enabled && String(calendly.schedulingUrl || "").trim());
}

export function syncCalendlyForPostQualification(
  calendly: CampaignCalendlyAutomation,
  postQualification: PostQualificationConfig
): CampaignCalendlyAutomation {
  if (!postQualification.schedulingEnabled) {
    return { ...calendly, enabled: false };
  }
  if (String(calendly.schedulingUrl || "").trim()) {
    return { ...calendly, enabled: true };
  }
  return calendly;
}

export function postQualificationFlowSummary(config: PostQualificationConfig): string[] {
  if (!config.screeningEnabled && !config.schedulingEnabled) {
    return ["Manual review in Campaign Tracking"];
  }
  if (config.screeningEnabled && config.schedulingEnabled) {
    return [
      "Qualification complete",
      "AI voice screening",
      "Interested on call → Calendly link",
    ];
  }
  if (config.screeningEnabled) {
    return ["Qualification complete", "AI voice screening"];
  }
  return ["Qualification complete", "Calendly scheduling link"];
}
