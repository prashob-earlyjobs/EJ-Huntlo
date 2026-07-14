import type { WhatsAppWaitUnit } from "@/lib/whatsappWait";
import {
  VOICE_CALL_INTRO_DEFAULT,
  VOICE_CALL_OBJECTIVE_DEFAULT,
  VOICE_CALL_PROMPT_DEFAULT,
} from "@/lib/defaultVoiceCallPrompt";

export type OutreachSequenceChannel = "gmail" | "whatsapp" | "voice_call";
export type ScreeningChannel = "call_interview" | "video_interview";

export type SetupPickerStep =
  | "choose"
  | "clone"
  | "scratchChannel"
  | "arrangeChannels"
  | "aiChannel";

export type SetupEmailStepDraft = { id: string; subject: string; body: string };
export type SetupMessageStepDraft = { id: string; message: string; templateId?: string };
export type SetupVoiceDraft = { objective: string; intro: string; instructions: string };
export type SetupMessageWaitDraft = { amount: number; unit: WhatsAppWaitUnit };

export type CampaignSetupArrangeDraft = {
  emailSteps: SetupEmailStepDraft[];
  messageSteps: SetupMessageStepDraft[];
  voiceSetup: SetupVoiceDraft;
  waitDaysByChannel: Record<string, string>;
  whatsappMessageWaits: SetupMessageWaitDraft[];
};

export type SetupEntryPath = "scratch" | "ai" | "";

export type CampaignSetupPickerDraft = {
  step: SetupPickerStep;
  jobTitle: string;
  jobDescription: string;
  scratchChannels: OutreachSequenceChannel[];
  orderedScratchChannels: OutreachSequenceChannel[];
  aiChannels: OutreachSequenceChannel[];
  setupEntryPath: SetupEntryPath;
  scratchScreeningChannel: ScreeningChannel | "";
  cloneSelection: string;
  aiChannel: "gmail" | "whatsapp";
  arrange: CampaignSetupArrangeDraft;
};

const STORAGE_PREFIX = "huntlo:campaign-setup-picker:";

export function defaultSetupVoiceDraft(): SetupVoiceDraft {
  return {
    objective: VOICE_CALL_OBJECTIVE_DEFAULT,
    intro: VOICE_CALL_INTRO_DEFAULT,
    instructions: VOICE_CALL_PROMPT_DEFAULT,
  };
}

export function createDefaultSetupArrangeDraft(): CampaignSetupArrangeDraft {
  return {
    emailSteps: [{ id: `step-${Date.now()}-email`, subject: "", body: "" }],
    messageSteps: [{ id: `step-${Date.now()}-wa`, message: "" }],
    voiceSetup: defaultSetupVoiceDraft(),
    waitDaysByChannel: {},
    whatsappMessageWaits: [
      { amount: 1, unit: "days" },
      { amount: 1, unit: "days" },
    ],
  };
}

export function createDefaultSetupPickerDraft(
  jobTitle = "",
  jobDescription = ""
): CampaignSetupPickerDraft {
  return {
    step: "choose",
    jobTitle,
    jobDescription,
    scratchChannels: [],
    orderedScratchChannels: [],
    aiChannels: [],
    setupEntryPath: "",
    scratchScreeningChannel: "",
    cloneSelection: "",
    aiChannel: "gmail",
    arrange: createDefaultSetupArrangeDraft(),
  };
}

function isSetupPickerStep(value: unknown): value is SetupPickerStep {
  return (
    value === "choose" ||
    value === "clone" ||
    value === "scratchChannel" ||
    value === "arrangeChannels" ||
    value === "aiChannel"
  );
}

function normalizeArrangeDraft(raw: unknown): CampaignSetupArrangeDraft {
  const defaults = createDefaultSetupArrangeDraft();
  if (!raw || typeof raw !== "object") return defaults;
  const source = raw as Partial<CampaignSetupArrangeDraft>;
  return {
    emailSteps:
      Array.isArray(source.emailSteps) && source.emailSteps.length > 0
        ? source.emailSteps.map((step) => ({
            id: String(step.id || `step-${Math.random().toString(36).slice(2, 9)}`),
            subject: String(step.subject ?? ""),
            body: String(step.body ?? ""),
          }))
        : defaults.emailSteps,
    messageSteps:
      Array.isArray(source.messageSteps) && source.messageSteps.length > 0
        ? source.messageSteps.map((step) => ({
            id: String(step.id || `step-${Math.random().toString(36).slice(2, 9)}`),
            message: String(step.message ?? ""),
            templateId: step.templateId ? String(step.templateId) : undefined,
          }))
        : defaults.messageSteps,
    voiceSetup: {
      objective: String(source.voiceSetup?.objective ?? defaults.voiceSetup.objective),
      intro: String(source.voiceSetup?.intro ?? defaults.voiceSetup.intro),
      instructions: String(source.voiceSetup?.instructions ?? defaults.voiceSetup.instructions),
    },
    waitDaysByChannel:
      source.waitDaysByChannel && typeof source.waitDaysByChannel === "object"
        ? Object.fromEntries(
            Object.entries(source.waitDaysByChannel).map(([key, value]) => [key, String(value)])
          )
        : {},
    whatsappMessageWaits:
      Array.isArray(source.whatsappMessageWaits) && source.whatsappMessageWaits.length > 0
        ? source.whatsappMessageWaits.map((item) => ({
            amount: Math.max(1, Number(item.amount) || 1),
            unit:
              item.unit === "minutes" || item.unit === "hours" || item.unit === "days"
                ? item.unit
                : "days",
          }))
        : defaults.whatsappMessageWaits,
  };
}

export function normalizeCampaignSetupPickerDraft(
  raw: unknown,
  fallback?: Partial<CampaignSetupPickerDraft>
): CampaignSetupPickerDraft {
  const base = createDefaultSetupPickerDraft(
    fallback?.jobTitle ?? "",
    fallback?.jobDescription ?? ""
  );
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<CampaignSetupPickerDraft>;
  return {
    step: isSetupPickerStep(source.step) ? source.step : base.step,
    jobTitle: String(source.jobTitle ?? base.jobTitle),
    jobDescription: String(source.jobDescription ?? base.jobDescription),
    scratchChannels: Array.isArray(source.scratchChannels)
      ? source.scratchChannels.filter(
          (item): item is OutreachSequenceChannel =>
            item === "gmail" || item === "whatsapp" || item === "voice_call"
        )
      : base.scratchChannels,
    orderedScratchChannels: Array.isArray(source.orderedScratchChannels)
      ? source.orderedScratchChannels.filter(
          (item): item is OutreachSequenceChannel =>
            item === "gmail" || item === "whatsapp" || item === "voice_call"
        )
      : base.orderedScratchChannels,
    aiChannels: Array.isArray(source.aiChannels)
      ? source.aiChannels.filter(
          (item): item is OutreachSequenceChannel =>
            item === "gmail" || item === "whatsapp" || item === "voice_call"
        )
      : base.aiChannels,
    setupEntryPath:
      source.setupEntryPath === "scratch" || source.setupEntryPath === "ai"
        ? source.setupEntryPath
        : "",
    scratchScreeningChannel:
      source.scratchScreeningChannel === "call_interview" ||
      source.scratchScreeningChannel === "video_interview"
        ? source.scratchScreeningChannel
        : "",
    cloneSelection: String(source.cloneSelection ?? ""),
    aiChannel: source.aiChannel === "whatsapp" ? "whatsapp" : "gmail",
    arrange: normalizeArrangeDraft(source.arrange),
  };
}

function storageKey(campaignId: string) {
  return `${STORAGE_PREFIX}${campaignId}`;
}

export function readCampaignSetupPickerDraft(
  campaignId: string,
  fallback?: Partial<CampaignSetupPickerDraft>
): CampaignSetupPickerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(campaignId));
    if (!raw) return null;
    return normalizeCampaignSetupPickerDraft(JSON.parse(raw), fallback);
  } catch {
    return null;
  }
}

export function writeCampaignSetupPickerDraft(
  campaignId: string,
  draft: CampaignSetupPickerDraft
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(campaignId), JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearCampaignSetupPickerDraft(campaignId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(campaignId));
  } catch {
    /* ignore */
  }
}
