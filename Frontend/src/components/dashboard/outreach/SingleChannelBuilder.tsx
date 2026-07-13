"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import {
  CampaignReviewSummary,
  type ReviewFlowItem,
} from "@/components/dashboard/outreach/CampaignReviewSummary";
import { CandidateSelectionTable } from "@/components/dashboard/outreach/CandidateSelectionTable";
import { ChannelCard } from "@/components/dashboard/outreach/ChannelCard";
import { MessageEditor } from "@/components/dashboard/outreach/MessageEditor";
import { OutreachEmailReplySetup } from "@/components/dashboard/outreach/OutreachEmailReplySetup";
import { Huntlo360JourneyBar } from "@/components/dashboard/huntlo360/Huntlo360JourneyBar";
import { OutreachAiGeneratingPanel } from "@/components/dashboard/outreach/OutreachAiGeneratingPanel";
import { OutreachGenerateAiBar } from "@/components/dashboard/outreach/OutreachGenerateAiBar";
import {
  applyAiResultToSingleChannel,
  singleChannelMissingAiMessages,
} from "@/components/dashboard/outreach/outreachModuleAiApply";
import { useEmailIntegrationLaunchGuard } from "@/components/dashboard/outreach/useEmailIntegrationLaunchGuard";
import { useCampaignEmailSenders } from "@/components/dashboard/outreach/useCampaignEmailSenders";
import { useOutreachBuilderDraft } from "@/components/dashboard/outreach/useOutreachBuilderDraft";
import { mergeCsvContactsIntoCandidates } from "@/components/dashboard/outreach/mergeCsvContactsIntoCandidates";
import { useOutreachCandidatePool } from "@/components/dashboard/outreach/useOutreachCandidatePool";
import { OutreachStepper } from "@/components/dashboard/outreach/OutreachStepper";
import type {
  CampaignDetailsForm,
  CandidateSource,
  OutreachCandidate,
  OutreachChannel,
} from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { formatGmailWaitConnectorLabel } from "@/lib/outreachWait";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";
import {
  importOutreachModuleCandidatesCsv,
  type OutreachCsvImportContact,
} from "@/lib/outreachModuleCampaignsApi";
import {
  generateOutreachSequenceFromJd,
  type GenerateOutreachFromJdResult,
} from "@/lib/outreachAiApi";
import {
  getWhatsAppNoReplyTemplate,
  getWhatsAppOpeningTemplate,
  createDefaultWhatsAppSingleChannelMessage,
  resolveWhatsAppSingleChannelMessage,
  type WhatsAppSingleChannelMessage,
} from "@/lib/whatsappOutreach";
import {
  resolveEmailSingleChannelMessage,
  emailMessageHasContent,
  type EmailSingleChannelMessage,
} from "@/lib/emailSingleChannelOutreach";
import {
  resolveVoiceSingleChannelMessage,
  voiceMessageHasContent,
  type VoiceSingleChannelMessage,
} from "@/lib/voiceSingleChannelOutreach";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import {
  createDefaultPostQualification,
  postQualificationSchedulingReady,
  postQualificationScreeningReady,
  resolvePostQualification,
  syncCalendlyForPostQualification,
  type PostQualificationConfig,
} from "@/lib/postQualification";

const SOURCE_LABELS: Record<CandidateSource, string> = {
  talent_pool: "Huntlo Talent Pool",
  csv: "Imported CSV",
  cvs: "Uploaded CVs",
  ats: "ATS / CRM",
};

const STEPS = [
  { key: "details", label: "Details" },
  { key: "channel", label: "Channel" },
  { key: "message", label: "Message" },
  { key: "candidates", label: "Candidates" },
  { key: "review", label: "Review" },
];

const HUNTLO360_STEPS = [
  { key: "details", label: "Details" },
  { key: "channel", label: "Outreach" },
  { key: "message", label: "Messages" },
  { key: "schedule", label: "Schedule" },
  { key: "candidates", label: "Candidates" },
  { key: "launch", label: "Launch" },
];

const STEP_META = [
  {
    title: "Campaign details",
    description: "Name your campaign and add the role information candidates will see.",
  },
  {
    title: "Outreach channel",
    description: "Choose how you want to reach candidates for this campaign.",
  },
  {
    title: "Message templates",
    description: "Configure opening templates, no-reply follow-ups, and additional candidate questions.",
  },
  {
    title: "Select candidates",
    description: "Choose who should receive this outreach sequence.",
  },
  {
    title: "Review & launch",
    description: "Confirm your settings before launching the campaign.",
  },
];

const HUNTLO360_STEP_META = [
  {
    title: "Campaign details",
    description: "Name your flow and add the role information candidates will see.",
  },
  {
    title: "Outreach channel",
    description: "Choose email or WhatsApp to reach and qualify candidates.",
  },
  {
    title: "Outreach messages",
    description: "Configure opening templates, follow-ups, and AI reply questions.",
  },
  {
    title: "Interview scheduling",
    description: "Connect Calendly so interested candidates can book directly from your outreach.",
  },
  {
    title: "Select candidates",
    description: "Choose who enters this outreach-to-schedule flow.",
  },
  {
    title: "Review & launch",
    description: "Confirm outreach, scheduling, and candidates before going live.",
  },
];

const DEFAULT_FORM: CampaignDetailsForm = {
  name: "",
  jobTitle: "",
  jobDescription: "",
  goal: "interest",
};

type BuilderVariant = "outreach" | "huntlo360";

type Props = {
  variant?: BuilderVariant;
  onBack: () => void;
  onSaveDraft: (campaignId: string) => void;
  onLaunch: (campaignId: string) => void;
  onDraftSaved?: () => void;
  resumeCampaignId?: string;
  initialStep?: number;
  initialForm?: CampaignDetailsForm;
  initialChannel?: OutreachChannel;
  initialWhatsappMessage?: Partial<WhatsAppSingleChannelMessage>;
  initialMessage?: string;
  initialVoiceMessage?: Partial<VoiceSingleChannelMessage>;
  initialEmailSubject?: string;
  initialEmailMessage?: Partial<EmailSingleChannelMessage> & {
    subject?: string;
    body?: string;
    emailTouchpoints?: EmailSingleChannelMessage["touchpoints"];
  };
  initialAiPersonalize?: boolean;
  initialCalendlyAutomation?: CampaignCalendlyAutomation;
  initialPostQualification?: PostQualificationConfig;
  initialSelectedIds?: string[];
  initialSource?: CandidateSource;
};

export function SingleChannelBuilder({
  variant = "outreach",
  onBack,
  onSaveDraft,
  onLaunch,
  onDraftSaved,
  resumeCampaignId,
  initialStep = 0,
  initialForm = DEFAULT_FORM,
  initialChannel = "whatsapp",
  initialWhatsappMessage,
  initialMessage = "",
  initialVoiceMessage,
  initialEmailSubject = "",
  initialEmailMessage,
  initialAiPersonalize = true,
  initialCalendlyAutomation,
  initialPostQualification,
  initialSelectedIds = [],
  initialSource = "csv",
}: Props) {
  const isHuntlo360 = variant === "huntlo360";
  const flowSteps = isHuntlo360 ? HUNTLO360_STEPS : STEPS;
  const flowMeta = isHuntlo360 ? HUNTLO360_STEP_META : STEP_META;
  const reviewStepIndex = isHuntlo360 ? 5 : 4;
  const candidatesStepIndex = isHuntlo360 ? 4 : 3;
  const scheduleStepIndex = isHuntlo360 ? 3 : -1;
  const backToModuleLabel = isHuntlo360 ? "Back to Huntlo 360" : "Back to outreach";
  const builderTitle = isHuntlo360 ? "Huntlo 360 flow" : "Single channel campaign";

  const [step, setStep] = useState(initialStep);
  const journeyPhase =
    step <= 2 ? "outreach" : step <= 4 ? "schedule" : ("track" as const);
  const [form, setForm] = useState<CampaignDetailsForm>(initialForm);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [source, setSource] = useState<CandidateSource>(initialSource);
  const [channel, setChannel] = useState<OutreachChannel>(initialChannel);
  const [aiPersonalize, setAiPersonalize] = useState(initialAiPersonalize);
  const [whatsappMessage, setWhatsappMessage] = useState<WhatsAppSingleChannelMessage>(() =>
    resolveWhatsAppSingleChannelMessage({
      ...createDefaultWhatsAppSingleChannelMessage(),
      ...initialWhatsappMessage,
      body: initialWhatsappMessage?.body || initialMessage || undefined,
    })
  );
  const [voiceMessage, setVoiceMessage] = useState<VoiceSingleChannelMessage>(() =>
    resolveVoiceSingleChannelMessage({
      ...initialVoiceMessage,
      body: initialVoiceMessage?.body ?? (initialChannel === "voice" ? initialMessage : undefined),
    })
  );
  const [emailMessage, setEmailMessage] = useState<EmailSingleChannelMessage>(() =>
    resolveEmailSingleChannelMessage({
      ...initialEmailMessage,
      subject: initialEmailMessage?.subject ?? initialEmailSubject,
      body: initialEmailMessage?.body ?? initialMessage,
      emailTouchpoints: initialEmailMessage?.emailTouchpoints ?? initialEmailMessage?.touchpoints,
    })
  );
  const [calendlyAutomation, setCalendlyAutomation] = useState<CampaignCalendlyAutomation>(
    () =>
      initialCalendlyAutomation ?? {
        enabled: false,
        meetingUri: "",
        meetingName: "",
        schedulingUrl: "",
        durationMinutes: 0,
        kind: "",
      }
  );
  const [postQualification, setPostQualification] = useState<PostQualificationConfig>(() =>
    resolvePostQualification(
      initialPostQualification ??
        createDefaultPostQualification({ schedulingEnabled: isHuntlo360 })
    )
  );
  const [csvCandidates, setCsvCandidates] = useState<OutreachCandidate[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitMode, setReviewSubmitMode] = useState<"save" | "launch" | null>(null);
  const [launching, setLaunching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingChannel, setAiGeneratingChannel] = useState<"email" | "whatsapp" | null>(
    null
  );
  const [aiGenerateError, setAiGenerateError] = useState("");
  const skipAutoAiRef = useRef(
    Boolean(
      resumeCampaignId &&
        (initialStep > 2 ||
          !singleChannelMissingAiMessages(
            initialChannel,
            resolveWhatsAppSingleChannelMessage({
              ...initialWhatsappMessage,
              body: initialWhatsappMessage?.body || initialMessage || undefined,
            }),
            resolveEmailSingleChannelMessage({
              ...initialEmailMessage,
              subject: initialEmailMessage?.subject ?? initialEmailSubject,
              body: initialEmailMessage?.body ?? initialMessage,
              emailTouchpoints:
                initialEmailMessage?.emailTouchpoints ?? initialEmailMessage?.touchpoints,
            })
          ))
    )
  );
  const autoAiInFlightRef = useRef(false);
  const lastAutoAiChannelRef = useRef<OutreachChannel | null>(null);

  const aiGenerationBlockedReason = useCallback(() => {
    if (!form.jobTitle.trim()) {
      return "Add a job title on the details step to generate messages with AI.";
    }
    if (form.jobDescription.trim().length < 20) {
      return "Add a job description (at least 20 characters) on the details step to generate messages with AI.";
    }
    return "";
  }, [form.jobDescription, form.jobTitle]);
  const { ensureEmailIntegrationReady, resolveLaunchError, modal: emailIntegrationModal } =
    useEmailIntegrationLaunchGuard();
  const launchNeedsEmail = channel === "email";
  const launchOverlayChannel = channel === "whatsapp" ? "whatsapp" : "gmail";
  const onReviewStep = step === reviewStepIndex;
  const {
    emailSenders,
    selectedEmailIntegrationId,
    setSelectedEmailIntegrationId,
    loading: emailSendersLoading,
    needsSenderSelection,
    senderReady,
  } = useCampaignEmailSenders(onReviewStep && launchNeedsEmail);

  const {
    savingDraft,
    submittingReview,
    persistDetailsStep,
    persistChannelStep,
    persistMessageStep,
    persistCandidatesStep,
    syncSingleChannelDraft,
    saveDraftFromReview,
    launchFromReview,
  } = useOutreachBuilderDraft({
      mode: "single",
      form,
      step,
      channel,
      whatsappMessage,
      aiPersonalize,
      message: voiceMessage.body,
      emailMessage,
      voiceOptions: {
        callObjective: voiceMessage.callObjective,
        voiceTone: voiceMessage.voiceTone,
        callAttempts: voiceMessage.callAttempts,
        attemptGapHours: voiceMessage.attemptGapHours,
      },
      sourceModule: isHuntlo360 ? "huntlo360" : "outreach",
      initialCampaignId: resumeCampaignId ?? null,
      onDraftSaved,
    });

  const {
    candidates: poolCandidates,
    loading: poolLoading,
    error: poolError,
  } = useOutreachCandidatePool(step === candidatesStepIndex && source === "talent_pool");

  useEffect(() => {
    if (step !== candidatesStepIndex || source !== "csv" || initialSelectedIds.length === 0) return;
    const restored = poolCandidates.filter((c) => initialSelectedIds.includes(c.id));
    if (restored.length > 0) {
      setCsvCandidates(restored);
    }
  }, [step, source, poolCandidates, initialSelectedIds]);

  const handleSourceChange = useCallback((next: CandidateSource) => {
    setSource(next);
    setSelectedIds([]);
    if (next !== "csv") {
      setCsvCandidates([]);
    }
  }, []);

  const handleCsvImport = useCallback(async (contacts: OutreachCsvImportContact[]) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      throw new Error("Sign in to import candidates.");
    }
    const result = await importOutreachModuleCandidatesCsv(auth.token, contacts);
    const imported = mergeCsvContactsIntoCandidates(result.candidates, contacts);
    setCsvCandidates((current) => {
      const byId = new Map(current.map((c) => [c.id, c]));
      for (const candidate of imported) {
        byId.set(candidate.id, candidate);
      }
      return [...byId.values()];
    });
    return imported;
  }, []);

  const handleDeleteSelected = useCallback((ids: string[]) => {
    const remove = new Set(ids);
    if (source === "csv") {
      setCsvCandidates((current) => current.filter((c) => !remove.has(c.id)));
    }
    setSelectedIds((current) => current.filter((id) => !remove.has(id)));
  }, [source]);

  const displayCandidates = source === "csv" ? csvCandidates : poolCandidates;

  const buildSyncPayload = useCallback(
    () => ({
      form,
      channel,
      whatsappMessage,
      aiPersonalize,
      message: voiceMessage.body,
      emailMessage,
      emailAutoReplyEnabled: true,
      calendlyAutomation,
      postQualification,
      voiceOptions: {
        callObjective: voiceMessage.callObjective,
        voiceTone: voiceMessage.voiceTone,
        callAttempts: voiceMessage.callAttempts,
        attemptGapHours: voiceMessage.attemptGapHours,
      },
      candidateIds: selectedIds,
      candidateSource: source,
    }),
    [
      form,
      channel,
      whatsappMessage,
      aiPersonalize,
      voiceMessage,
      emailMessage,
      selectedIds,
      source,
      calendlyAutomation,
      postQualification,
    ]
  );

  const handlePostQualificationChange = useCallback(
    (next: PostQualificationConfig) => {
      setPostQualification(next);
      setCalendlyAutomation((current) => syncCalendlyForPostQualification(current, next));
    },
    []
  );

  const handleCalendlyAutomationChange = useCallback(
    (next: CampaignCalendlyAutomation) => {
      setCalendlyAutomation(next);
      if (next.enabled && next.schedulingUrl?.trim()) {
        setPostQualification((current) =>
          current.schedulingEnabled ? current : { ...current, schedulingEnabled: true }
        );
      }
    },
    []
  );

  const handleAiGenerated = useCallback(
    (result: GenerateOutreachFromJdResult) => {
      const targetChannel = channel === "whatsapp" ? "whatsapp" : channel === "email" ? "email" : null;
      if (!targetChannel) return;

      const applied = applyAiResultToSingleChannel(result, targetChannel);
      if (!applied) {
        setAiGenerateError("Could not apply generated messages. Try again.");
        return;
      }

      if (applied.whatsappMessage) {
        setWhatsappMessage(applied.whatsappMessage);
      }
      if (applied.emailMessage) {
        setEmailMessage(applied.emailMessage);
      }
      setAiPersonalize(true);
      setAiGenerateError("");
      lastAutoAiChannelRef.current = targetChannel;
      if (!form.name.trim() && result.planName.trim()) {
        setForm((current) => ({ ...current, name: result.planName.trim() }));
      }
    },
    [channel, form.name]
  );

  const maybeAutoGenerateMessages = useCallback(async () => {
    if (autoAiInFlightRef.current || aiGenerating) return;
    if (channel !== "email" && channel !== "whatsapp") return;

    const blockedReason = aiGenerationBlockedReason();
    if (blockedReason) {
      setAiGenerateError(blockedReason);
      return;
    }

    const channelChanged = lastAutoAiChannelRef.current !== null && lastAutoAiChannelRef.current !== channel;
    if (skipAutoAiRef.current && !channelChanged) return;
    if (!channelChanged && !singleChannelMissingAiMessages(channel, whatsappMessage, emailMessage)) {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setAiGenerateError("Sign in to generate messages with AI.");
      return;
    }

    autoAiInFlightRef.current = true;
    setAiGenerating(true);
    setAiGenerateError("");
    setAiGeneratingChannel(channel === "whatsapp" ? "whatsapp" : "email");
    try {
      const result = await generateOutreachSequenceFromJd(auth.token, form.jobDescription.trim(), {
        channel: channel === "whatsapp" ? "whatsapp" : "gmail",
        jobTitle: form.jobTitle.trim(),
        planName: form.name.trim() || undefined,
      });
      handleAiGenerated(result);
    } catch (err) {
      setAiGenerateError(
        err instanceof Error ? err.message : "Could not generate messages with AI."
      );
    } finally {
      autoAiInFlightRef.current = false;
      setAiGenerating(false);
      setAiGeneratingChannel(null);
    }
  }, [
    aiGenerationBlockedReason,
    aiGenerating,
    channel,
    emailMessage,
    form.jobDescription,
    form.jobTitle,
    form.name,
    handleAiGenerated,
    whatsappMessage,
  ]);

  useEffect(() => {
    if (step !== 2) return;
    void maybeAutoGenerateMessages();
  }, [step, channel, maybeAutoGenerateMessages]);

  const reviewFlowItems: ReviewFlowItem[] =
    channel === "whatsapp"
      ? [
          {
            icon: "chat",
            title: "Opening message",
            subtitle:
              getWhatsAppOpeningTemplate(whatsappMessage.templateId)?.name || "WhatsApp template",
            detail: whatsappMessage.body,
          },
          {
            icon: "schedule",
            title: `Follow-up 1 · after ${whatsappMessage.followUpWaitHours}h`,
            subtitle:
              getWhatsAppNoReplyTemplate(1, whatsappMessage.followUpTemplateId)?.name ||
              "No-reply follow-up",
            detail: whatsappMessage.followUpBody,
          },
          {
            icon: "schedule",
            title: `Follow-up 2 · after ${whatsappMessage.followUp2WaitHours}h`,
            subtitle:
              getWhatsAppNoReplyTemplate(2, whatsappMessage.followUp2TemplateId)?.name ||
              "No-reply follow-up",
            detail: whatsappMessage.followUp2Body,
          },
          ...whatsappMessage.replyQuestions
            .map((question, index) => question.trim())
            .filter(Boolean)
            .map((question, index) => ({
              icon: "quiz",
              title: `Qualification question ${index + 1}`,
              subtitle: "Sent after candidate replies",
              detail: question,
            })),
        ]
      : channel === "email"
        ? emailMessageHasContent(emailMessage)
          ? emailMessage.touchpoints
              .filter((tp) => tp.subject.trim() || tp.body.trim())
              .map((tp, index) => ({
                icon: "mail",
                title:
                  index === 0
                    ? tp.subject.trim() || tp.label
                    : `${tp.label} · ${formatGmailWaitConnectorLabel(tp).toLowerCase()}`,
                subtitle: index === 0 ? tp.label : "No-reply follow-up",
                detail: tp.body,
              }))
          : []
        : voiceMessageHasContent(voiceMessage)
          ? [
              {
                icon: "record_voice_over",
                title: "AI voice script",
                detail: voiceMessage.body,
              },
            ]
          : [];

  const touchpointSummary =
    channel === "whatsapp"
      ? `3 automated steps + ${whatsappMessage.replyQuestions.filter((q) => q.trim()).length} qualification question${
          whatsappMessage.replyQuestions.filter((q) => q.trim()).length === 1 ? "" : "s"
        }`
      : channel === "email"
        ? "4 automated emails + AI reply handling"
        : "1 AI voice call per candidate";

  const handleReviewSaveDraft = async () => {
    setReviewError("");
    setReviewSubmitMode("save");
    try {
      const id = await saveDraftFromReview(() => syncSingleChannelDraft(buildSyncPayload()));
      onSaveDraft(id);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setReviewSubmitMode(null);
    }
  };

  const handleReviewLaunch = async () => {
    setReviewError("");
    setReviewSubmitMode("launch");
    try {
      if (
        postQualification.schedulingEnabled &&
        !postQualificationSchedulingReady(postQualification, calendlyAutomation)
      ) {
        setReviewError("Select a Calendly meeting before launching.");
        return;
      }
      if (
        postQualification.screeningEnabled &&
        !postQualificationScreeningReady(postQualification)
      ) {
        setReviewError("Add a voice screening script before launching.");
        return;
      }

      const emailReady = await ensureEmailIntegrationReady(launchNeedsEmail);
      if (!emailReady) return;

      setLaunching(true);
      const overlayStartedAt = Date.now();
      const id = await launchFromReview(
        () => syncSingleChannelDraft(buildSyncPayload()),
        selectedEmailIntegrationId
          ? { emailIntegrationId: selectedEmailIntegrationId }
          : undefined
      );

      const elapsed = Date.now() - overlayStartedAt;
      if (elapsed < LAUNCH_AGENT_MIN_DURATION_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, LAUNCH_AGENT_MIN_DURATION_MS - elapsed)
        );
      }
      onLaunch(id);
    } catch (err) {
      const message = resolveLaunchError(err);
      if (message) {
        setReviewError(message);
      }
    } finally {
      setLaunching(false);
      setReviewSubmitMode(null);
    }
  };

  const calendlyReady = postQualificationSchedulingReady(postQualification, calendlyAutomation);
  const screeningReady = postQualificationScreeningReady(postQualification);

  const canNext =
    (step === 0 &&
      form.name.trim() &&
      form.jobTitle.trim() &&
      (!isHuntlo360 || form.jobDescription.trim().length >= 20)) ||
    (step === 1 && channel) ||
    step === 2 ||
    (isHuntlo360 && step === scheduleStepIndex && calendlyReady) ||
    (step === candidatesStepIndex &&
      selectedIds.length > 0 &&
      (source === "talent_pool" || source === "csv")) ||
    step === reviewStepIndex;

  const goNext = async () => {
    if (step === 0) {
      await persistDetailsStep(1, form);
    } else if (step === 1) {
      await persistChannelStep(2, channel);
      setStep(2);
      await maybeAutoGenerateMessages();
      return;
    } else if (step === 2) {
      await persistMessageStep(isHuntlo360 ? 3 : 3, {
        channel,
        whatsappMessage,
        aiPersonalize,
        message: voiceMessage.body,
        emailMessage,
        emailAutoReplyEnabled: true,
        calendlyAutomation,
        voiceOptions: {
          callObjective: voiceMessage.callObjective,
          voiceTone: voiceMessage.voiceTone,
          callAttempts: voiceMessage.callAttempts,
          attemptGapHours: voiceMessage.attemptGapHours,
        },
      });
    } else if (isHuntlo360 && step === scheduleStepIndex) {
      await persistMessageStep(4, {
        channel,
        whatsappMessage,
        aiPersonalize,
        message: voiceMessage.body,
        emailMessage,
        emailAutoReplyEnabled: true,
        calendlyAutomation,
        voiceOptions: {
          callObjective: voiceMessage.callObjective,
          voiceTone: voiceMessage.voiceTone,
          callAttempts: voiceMessage.callAttempts,
          attemptGapHours: voiceMessage.attemptGapHours,
        },
      });
    } else if (step === candidatesStepIndex) {
      await persistCandidatesStep(isHuntlo360 ? 5 : 4, {
        candidateIds: selectedIds,
        candidateSource: source,
      });
    }
    if (step < flowSteps.length - 1) setStep((s) => s + 1);
  };

  const goBack = async () => {
    if (step === 0) {
      if (form.name.trim() && form.jobTitle.trim()) {
        await persistDetailsStep(0, form);
      }
      onBack();
      return;
    }
    setStep((s) => s - 1);
  };

  return (
    <div className={`dashboard-outreach-builder${launching ? " dashboard-outreach-builder--launching" : ""}${isHuntlo360 ? " dashboard-outreach-builder--huntlo360" : ""}${onReviewStep ? " dashboard-outreach-builder--on-review" : ""}`}>
      {emailIntegrationModal}
      <CampaignLaunchAgentOverlay open={launching} channel={launchOverlayChannel} />
      {isHuntlo360 ? <Huntlo360JourneyBar activePhase={journeyPhase} /> : null}
      <div className="dashboard-outreach-builder-toolbar">
        <div className="dashboard-outreach-builder-header-top">
          <button type="button" className="dashboard-outreach-back-btn" onClick={() => void goBack()}>
            <MaterialIcon name="arrow_back" className="text-sm" />
            {step === 0 ? backToModuleLabel : "Previous step"}
          </button>
          <span className="dashboard-outreach-builder-step-badge">
            Step {step + 1} of {flowSteps.length}
          </span>
        </div>
      </div>
      <div className="dashboard-outreach-builder-scroll">
      <header className="dashboard-outreach-builder-header dashboard-outreach-builder-header--in-scroll">
        <div className="dashboard-outreach-builder-header-main">
          <h1 className="dashboard-outreach-builder-title">{builderTitle}</h1>
          {!onReviewStep ? (
            <p className="dashboard-outreach-builder-subtitle">{flowMeta[step].description}</p>
          ) : null}
        </div>
      </header>

      <div className="dashboard-outreach-builder-stepper-wrap">
        <OutreachStepper steps={flowSteps} currentStep={step} onStepClick={setStep} />
      </div>

      <div className="dashboard-outreach-builder-body">
        <div className="dashboard-outreach-builder-step-panel">
          {!onReviewStep ? (
            <div className="dashboard-outreach-builder-step-panel-head">
              <h2 className="dashboard-outreach-builder-step-title">{flowMeta[step].title}</h2>
            </div>
          ) : null}

          <div className="dashboard-outreach-builder-step-panel-content">
        {step === 0 ? (
          <div className="dashboard-outreach-form-grid dashboard-outreach-form-grid--details">
            <div className="dashboard-outreach-field">
              <label className={dashboardLabelClass} htmlFor="sc-name">Campaign name</label>
              <input
                id="sc-name"
                className={dashboardInputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. React Developer Bangalore Outreach"
              />
            </div>
            <div className="dashboard-outreach-field">
              <label className={dashboardLabelClass} htmlFor="sc-job">Job title</label>
              <input
                id="sc-job"
                className={dashboardInputClass}
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="e.g. React Developer"
              />
            </div>
            <div className="dashboard-outreach-field dashboard-outreach-field--full">
              <label className={dashboardLabelClass} htmlFor="sc-jd">
                Job description
                {isHuntlo360 ? (
                  <span className="dashboard-outreach-field-hint"> (required for AI messages)</span>
                ) : null}
              </label>
              <textarea
                id="sc-jd"
                className={dashboardTextareaClass}
                rows={6}
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                placeholder={
                  isHuntlo360
                    ? "Paste the job description (at least 20 characters). AI uses this to generate your email or WhatsApp sequence."
                    : "Paste or write the job description. AI will use this for personalization."
                }
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="dashboard-outreach-channel-grid">
            {(["whatsapp", "email", "voice", "linkedin"] as OutreachChannel[])
              .filter((ch) => !isHuntlo360 || ch === "whatsapp" || ch === "email")
              .map((ch) => (
              <ChannelCard
                key={ch}
                channel={ch}
                selected={channel === ch}
                onSelect={() => {
                  setChannel(ch);
                  skipAutoAiRef.current = false;
                  setAiGenerateError("");
                  if (ch === "email" || ch === "whatsapp") {
                    lastAutoAiChannelRef.current = null;
                  }
                  if (ch === "voice") {
                    setVoiceMessage((current) =>
                      voiceMessageHasContent(current)
                        ? current
                        : resolveVoiceSingleChannelMessage()
                    );
                  }
                }}
              />
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          aiGenerating && (channel === "email" || channel === "whatsapp") ? (
            <OutreachAiGeneratingPanel
              channels={[channel]}
              activeChannel={aiGeneratingChannel}
            />
          ) : (
          <>
            {aiGenerateError ? (
              <p className="dashboard-outreach-empty-hint dashboard-outreach-empty-hint--error">
                <MaterialIcon name="error_outline" className="text-sm" />
                {aiGenerateError}
              </p>
            ) : null}
            {channel === "email" || channel === "whatsapp" ? (
              <OutreachGenerateAiBar
                jobTitle={form.jobTitle}
                jobDescription={form.jobDescription}
                channels={channel === "email" ? ["gmail"] : ["whatsapp"]}
                disabled={aiGenerating}
                onGenerated={handleAiGenerated}
              />
            ) : null}
            <MessageEditor
              channel={channel}
              templateId={whatsappMessage.templateId}
            onOpeningTemplateSelect={(tpl) =>
              setWhatsappMessage((current) => ({
                ...current,
                templateId: tpl.id,
                body: tpl.body,
              }))
            }
            followUpTemplateId={whatsappMessage.followUpTemplateId}
            onFollowUpTemplateSelect={(tpl) =>
              setWhatsappMessage((current) => ({
                ...current,
                followUpTemplateId: tpl.id,
                followUpBody: tpl.body,
              }))
            }
            followUpWaitHours={whatsappMessage.followUpWaitHours}
            onFollowUpWaitHoursChange={(hours) =>
              setWhatsappMessage((current) => ({ ...current, followUpWaitHours: hours }))
            }
            followUp2TemplateId={whatsappMessage.followUp2TemplateId}
            onFollowUp2TemplateSelect={(tpl) =>
              setWhatsappMessage((current) => ({
                ...current,
                followUp2TemplateId: tpl.id,
                followUp2Body: tpl.body,
              }))
            }
            followUp2WaitHours={whatsappMessage.followUp2WaitHours}
            onFollowUp2WaitHoursChange={(hours) =>
              setWhatsappMessage((current) => ({ ...current, followUp2WaitHours: hours }))
            }
            replyQuestions={whatsappMessage.replyQuestions}
            onReplyQuestionsChange={(questions) =>
              setWhatsappMessage((current) => ({ ...current, replyQuestions: questions }))
            }
            message={channel === "whatsapp" ? whatsappMessage.body : channel === "voice" ? voiceMessage.body : ""}
            onMessageChange={
              channel === "voice"
                ? (value) => setVoiceMessage((current) => ({ ...current, body: value }))
                : undefined
            }
            callObjective={voiceMessage.callObjective}
            onCallObjectiveChange={(value) =>
              setVoiceMessage((current) => ({ ...current, callObjective: value }))
            }
            voiceTone={voiceMessage.voiceTone}
            onVoiceToneChange={(value) =>
              setVoiceMessage((current) => ({ ...current, voiceTone: value }))
            }
            callAttempts={voiceMessage.callAttempts}
            onCallAttemptsChange={(value) =>
              setVoiceMessage((current) => ({ ...current, callAttempts: value }))
            }
            attemptGap={voiceMessage.attemptGapHours}
            onAttemptGapChange={(value) =>
              setVoiceMessage((current) => ({ ...current, attemptGapHours: value }))
            }
            emailMessage={channel === "email" ? emailMessage : undefined}
            onEmailMessageChange={channel === "email" ? setEmailMessage : undefined}
            calendlyAutomation={
              !isHuntlo360 && (channel === "email" || channel === "whatsapp")
                ? calendlyAutomation
                : undefined
            }
            onCalendlyAutomationChange={
              !isHuntlo360 && (channel === "email" || channel === "whatsapp")
                ? setCalendlyAutomation
                : undefined
            }
          />
          </>
          )
        ) : null}

        {isHuntlo360 && step === scheduleStepIndex ? (
          <div className="dashboard-huntlo360-schedule-step">
            <OutreachEmailReplySetup
              calendlyAutomation={calendlyAutomation}
              onCalendlyAutomationChange={setCalendlyAutomation}
            />
            <p className="dashboard-outreach-empty-hint">
              When candidates show interest, Huntlo sends this Calendly link automatically by email or
              WhatsApp.
            </p>
          </div>
        ) : null}

        {step === candidatesStepIndex ? (
          <CandidateSelectionTable
            candidates={displayCandidates}
            loading={source === "talent_pool" ? poolLoading : false}
            error={source === "talent_pool" ? poolError : ""}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            source={source}
            onSourceChange={handleSourceChange}
            onCsvImport={handleCsvImport}
            onDeleteSelected={handleDeleteSelected}
          />
        ) : null}

        {step === reviewStepIndex ? (
          <CampaignReviewSummary
            campaignName={form.name}
            jobTitle={form.jobTitle}
            candidateCount={selectedIds.length}
            candidateSourceLabel={SOURCE_LABELS[source]}
            mode="single"
            channel={channel}
            touchpointSummary={touchpointSummary}
            flowItems={reviewFlowItems}
            checklist={[
              { label: "Campaign details completed", done: Boolean(form.name.trim() && form.jobTitle.trim()) },
              { label: "Outreach channel selected", done: Boolean(channel) },
              {
                label: "Message sequence configured",
                done:
                  channel === "whatsapp"
                    ? Boolean(whatsappMessage.body.trim())
                    : channel === "email"
                      ? emailMessageHasContent(emailMessage)
                      : voiceMessageHasContent(voiceMessage),
              },
              { label: "Candidates selected", done: selectedIds.length > 0 },
              ...(postQualification.screeningEnabled
                ? [{ label: "Screening script configured", done: screeningReady }]
                : []),
              ...(postQualification.schedulingEnabled
                ? [{ label: "Calendly meeting selected", done: calendlyReady }]
                : []),
              ...(isHuntlo360 && !postQualification.schedulingEnabled
                ? [{ label: "Calendly meeting selected", done: calendlyReady }]
                : []),
              ...(needsSenderSelection
                ? [{ label: "Sender account selected", done: senderReady }]
                : []),
            ]}
            needsEmailSender={launchNeedsEmail}
            emailSenders={emailSenders}
            selectedEmailIntegrationId={selectedEmailIntegrationId}
            onEmailIntegrationChange={setSelectedEmailIntegrationId}
            emailSendersLoading={emailSendersLoading}
            submitting={submittingReview || launching}
            submitMode={reviewSubmitMode}
            error={reviewError}
            onBack={() => setStep(candidatesStepIndex)}
            onSaveDraft={handleReviewSaveDraft}
            onLaunch={handleReviewLaunch}
            postQualification={postQualification}
            onPostQualificationChange={handlePostQualificationChange}
            calendlyAutomation={calendlyAutomation}
            onCalendlyAutomationChange={handleCalendlyAutomationChange}
          />
        ) : null}
          </div>
        </div>
      </div>
      </div>

        {step < reviewStepIndex ? (
          <footer className="dashboard-outreach-builder-footer dashboard-outreach-builder-footer--dock">
            <button type="button" className={dashboardBtnSecondaryClass} onClick={() => void goBack()}>
              Back
            </button>
            <button
              type="button"
              className={dashboardBtnPrimaryClass}
              onClick={() => void goNext()}
              disabled={!canNext || savingDraft || aiGenerating}
            >
              {savingDraft ? "Saving…" : aiGenerating ? "Generating…" : "Continue"}
            </button>
          </footer>
        ) : null}
    </div>
  );
}
