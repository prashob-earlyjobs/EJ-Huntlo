"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CampaignReviewSummary } from "@/components/dashboard/outreach/CampaignReviewSummary";
import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import { CandidateSelectionTable } from "@/components/dashboard/outreach/CandidateSelectionTable";
import { MessageEditor } from "@/components/dashboard/outreach/MessageEditor";
import { OutreachEmailReplySetup } from "@/components/dashboard/outreach/OutreachEmailReplySetup";
import { Huntlo360JourneyBar } from "@/components/dashboard/huntlo360/Huntlo360JourneyBar";
import { OutreachAiGeneratingPanel } from "@/components/dashboard/outreach/OutreachAiGeneratingPanel";
import { useOutreachBuilderChrome } from "@/components/dashboard/outreach/OutreachBuilderChrome";
import {
  channelsMissingAiMessages,
  buildMultiChannelReviewFlowItems,
  buildPersonalizeTabGroups,
  decodeEmailStepMessage,
  decodeVoiceStepMessage,
  decodeWhatsAppStepMessage,
  encodeEmailStepMessage,
  encodeWhatsAppStepMessage,
  findPersonalizeTabIndexForStep,
  mergeAiIntoExistingSequence,
  mergeStepMessagesFromSteps,
  mergeVoiceStepMessage,
  mergeWhatsAppAiIntoSequence,
} from "@/components/dashboard/outreach/outreachModuleAiApply";
import { SequenceBuilder } from "@/components/dashboard/outreach/SequenceBuilder";
import { useEmailIntegrationLaunchGuard } from "@/components/dashboard/outreach/useEmailIntegrationLaunchGuard";
import { useCampaignEmailSenders } from "@/components/dashboard/outreach/useCampaignEmailSenders";
import { useOutreachBuilderDraft } from "@/components/dashboard/outreach/useOutreachBuilderDraft";
import { mergeCsvContactsIntoCandidates } from "@/components/dashboard/outreach/mergeCsvContactsIntoCandidates";
import { useOutreachCandidatePool } from "@/components/dashboard/outreach/useOutreachCandidatePool";
import { OutreachStepper } from "@/components/dashboard/outreach/OutreachStepper";
import {
  buildStepMessagesPayload,
  createDefaultMultiSequenceSteps,
  ensureVoiceStepDefaults,
  pruneStepMessages,
  remapStepMessagesByIndex,
  sequenceStepsEquivalent,
} from "@/components/dashboard/outreach/outreachSequenceHelpers";
import {
  buildResumeAiPersonalize,
  buildResumeSequenceSteps,
  buildResumeStepMessages,
  buildResumeWhatsappReplyQuestions,
} from "@/components/dashboard/outreach/outreachResumeHelpers";
import type {
  CampaignDetailsForm,
  CandidateSource,
  OutreachCandidate,
  SequenceStep,
} from "@/components/dashboard/outreach/types";
import { getChannelLabel } from "@/components/dashboard/outreach/ChannelCard";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchOutreachModuleCampaign,
  importOutreachModuleCandidatesCsv,
  type OutreachCsvImportContact,
} from "@/lib/outreachModuleCampaignsApi";
import { generateOutreachSequenceFromJd } from "@/lib/outreachAiApi";
import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";
import type { WhatsAppTouchpointDraft } from "@/lib/whatsappOutreach";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

const STEPS = [
  { key: "details", label: "Details" },
  { key: "sequence", label: "Sequence" },
  { key: "personalize", label: "Personalize" },
  { key: "candidates", label: "Candidates" },
  { key: "review", label: "Review" },
];

const HUNTLO360_STEPS = [
  { key: "details", label: "Details" },
  { key: "sequence", label: "Sequence" },
  { key: "personalize", label: "Messages" },
  { key: "schedule", label: "Schedule" },
  { key: "candidates", label: "Candidates" },
  { key: "launch", label: "Launch" },
];

type BuilderVariant = "outreach" | "huntlo360";

const DEFAULT_FORM: CampaignDetailsForm = {
  name: "",
  jobTitle: "",
  jobDescription: "",
  goal: "interest",
};

const SOURCE_LABELS: Record<CandidateSource, string> = {
  talent_pool: "Huntlo Talent Pool",
  csv: "Imported CSV",
  cvs: "Uploaded CVs",
  ats: "ATS / CRM",
};

type Props = {
  variant?: BuilderVariant;
  onBack: () => void;
  onSaveDraft: (campaignId: string) => void;
  onLaunch: (campaignId: string) => void;
  onDraftSaved?: () => void;
  resumeCampaignId?: string;
  initialStep?: number;
  initialForm?: CampaignDetailsForm;
  initialSelectedIds?: string[];
  initialSource?: CandidateSource;
  initialSequenceSteps?: SequenceStep[];
  initialStepMessages?: Record<string, string>;
  initialAiPersonalize?: boolean;
  initialWhatsappReplyQuestions?: string[];
  initialCalendlyAutomation?: import("@/lib/campaigns").CampaignCalendlyAutomation;
};

export function MultiChannelBuilder({
  variant = "outreach",
  onBack,
  onSaveDraft,
  onLaunch,
  onDraftSaved,
  resumeCampaignId,
  initialStep = 0,
  initialForm = DEFAULT_FORM,
  initialSelectedIds = [],
  initialSource = "csv",
  initialSequenceSteps,
  initialStepMessages = {},
  initialAiPersonalize = true,
  initialWhatsappReplyQuestions = [],
  initialCalendlyAutomation,
}: Props) {
  const isHuntlo360 = variant === "huntlo360";
  const flowSteps = isHuntlo360 ? HUNTLO360_STEPS : STEPS;
  const reviewStepIndex = isHuntlo360 ? 5 : 4;
  const candidatesStepIndex = isHuntlo360 ? 4 : 3;
  const scheduleStepIndex = isHuntlo360 ? 3 : -1;
  const personalizeStepIndex = 2;
  const sequenceStepIndex = 1;
  const backToModuleLabel = isHuntlo360 ? "Back to Huntlo 360" : "Back to outreach";
  const builderTitle = isHuntlo360 ? "Huntlo 360 flow" : "Multi channel campaign";

  const [step, setStep] = useState(initialStep);
  const journeyPhase =
    step <= sequenceStepIndex ? "outreach" : step <= candidatesStepIndex ? "schedule" : ("track" as const);
  const [form, setForm] = useState<CampaignDetailsForm>(initialForm);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [source, setSource] = useState<CandidateSource>(initialSource);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(() =>
    initialSequenceSteps?.length ? initialSequenceSteps : createDefaultMultiSequenceSteps()
  );
  const [stepMessages, setStepMessages] = useState<Record<string, string>>(() =>
    ensureVoiceStepDefaults(
      initialSequenceSteps?.length ? initialSequenceSteps : createDefaultMultiSequenceSteps(),
      initialStepMessages
    )
  );
  const [aiPersonalize, setAiPersonalize] = useState(initialAiPersonalize);
  const [whatsappReplyQuestions, setWhatsappReplyQuestions] = useState<string[]>(
    initialWhatsappReplyQuestions
  );
  const [calendlyAutomation, setCalendlyAutomation] = useState(
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
  const [activeTab, setActiveTab] = useState(0);
  const [csvCandidates, setCsvCandidates] = useState<OutreachCandidate[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitMode, setReviewSubmitMode] = useState<"save" | "launch" | null>(null);
  const [launching, setLaunching] = useState(false);
  const [stepNavigating, setStepNavigating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingChannel, setAiGeneratingChannel] = useState<"email" | "whatsapp" | null>(null);
  const [aiGenerateError, setAiGenerateError] = useState("");
  const builderHydratedRef = useRef(false);
  const sequenceSaveSkipRef = useRef(true);
  const sequenceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ensureEmailIntegrationReady, resolveLaunchError, modal: emailIntegrationModal } =
    useEmailIntegrationLaunchGuard();
  const launchNeedsEmail = useMemo(
    () => sequenceSteps.some((step) => step.channel === "email"),
    [sequenceSteps]
  );
  const launchNeedsCalendlySetup = useMemo(
    () => sequenceSteps.some((step) => step.channel === "email" || step.channel === "whatsapp"),
    [sequenceSteps]
  );
  const launchOverlayChannel = useMemo<"gmail" | "whatsapp">(() => {
    if (sequenceSteps.some((step) => step.channel === "email")) return "gmail";
    if (sequenceSteps.some((step) => step.channel === "whatsapp")) return "whatsapp";
    return "gmail";
  }, [sequenceSteps]);
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
    campaignId,
    savingDraft,
    autoSavingSequence,
    submittingReview,
    persistDetailsStep,
    persistSequenceStep,
    persistPersonalizeStep,
    persistCandidatesStep,
    syncMultiChannelDraft,
    saveDraftFromReview,
    launchFromReview,
  } = useOutreachBuilderDraft({
    mode: "multi",
    form,
    step,
    sourceModule: isHuntlo360 ? "huntlo360" : "outreach",
    initialCampaignId: resumeCampaignId ?? null,
    onDraftSaved,
  });

  const clearSequenceSaveTimer = useCallback(() => {
    if (sequenceSaveTimerRef.current) {
      clearTimeout(sequenceSaveTimerRef.current);
      sequenceSaveTimerRef.current = null;
    }
  }, []);

  const applySavedSequenceSteps = useCallback(
    (savedSteps: SequenceStep[] | null | undefined, previousSteps: SequenceStep[]) => {
      if (!savedSteps?.length) return;
      if (sequenceStepsEquivalent(previousSteps, savedSteps)) return;
      sequenceSaveSkipRef.current = true;
      setSequenceSteps(savedSteps);
      setStepMessages((messages) => remapStepMessagesByIndex(previousSteps, savedSteps, messages));
    },
    []
  );

  const persistCurrentStep = useCallback(
    async (targetStep: number) => {
      if (step === 0) {
        if (form.name.trim() && form.jobTitle.trim()) {
          await persistDetailsStep(targetStep, form);
        }
        return;
      }

      if (step === sequenceStepIndex) {
        if (sequenceSteps.length === 0) return;
        const savedSteps = await persistSequenceStep(targetStep, sequenceSteps, { silent: true });
        applySavedSequenceSteps(savedSteps, sequenceSteps);
        return;
      }

      if (step === personalizeStepIndex) {
        await persistPersonalizeStep(
          isHuntlo360 ? scheduleStepIndex : candidatesStepIndex,
          {
            aiPersonalize,
            stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
            whatsappReplyQuestions,
            emailAutoReplyEnabled: true,
            calendlyAutomation,
          }
        );
        return;
      }

      if (isHuntlo360 && step === scheduleStepIndex) {
        await persistPersonalizeStep(candidatesStepIndex, {
          aiPersonalize,
          stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
          whatsappReplyQuestions,
          emailAutoReplyEnabled: true,
          calendlyAutomation,
        });
        return;
      }

      if (step === candidatesStepIndex && selectedIds.length > 0) {
        await persistCandidatesStep(reviewStepIndex, {
          candidateIds: selectedIds,
          candidateSource: source,
        });
      }
    },
    [
      step,
      form,
      sequenceSteps,
      aiPersonalize,
      stepMessages,
      whatsappReplyQuestions,
      selectedIds,
      source,
      isHuntlo360,
      personalizeStepIndex,
      scheduleStepIndex,
      candidatesStepIndex,
      reviewStepIndex,
      calendlyAutomation,
      persistDetailsStep,
      persistSequenceStep,
      persistPersonalizeStep,
      persistCandidatesStep,
      applySavedSequenceSteps,
    ]
  );

  const {
    candidates: poolCandidates,
    loading: poolLoading,
    error: poolError,
  } = useOutreachCandidatePool(step === candidatesStepIndex && source === "talent_pool");

  useEffect(() => {
    if (!campaignId || builderHydratedRef.current) return;

    const activeCampaignId = campaignId;
    let cancelled = false;

    async function hydrateBuilder() {
      const auth = getStoredAuth();
      if (!auth?.token) return;

      try {
        const campaign = await fetchOutreachModuleCampaign(auth.token, activeCampaignId);
        if (cancelled) return;

        const savedSteps = buildResumeSequenceSteps(campaign);
        if (savedSteps.length > 0) {
          sequenceSaveSkipRef.current = true;
          setSequenceSteps(savedSteps);
        }

        const stepsForDefaults =
          savedSteps.length > 0 ? savedSteps : createDefaultMultiSequenceSteps();
        setStepMessages(
          ensureVoiceStepDefaults(stepsForDefaults, buildResumeStepMessages(campaign))
        );

        setAiPersonalize(buildResumeAiPersonalize(campaign));
        setWhatsappReplyQuestions(buildResumeWhatsappReplyQuestions(campaign));
      } catch {
        // Keep local defaults when hydration fails.
      } finally {
        if (!cancelled) {
          builderHydratedRef.current = true;
        }
      }
    }

    void hydrateBuilder();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleSequenceStepsChange = useCallback((nextSteps: SequenceStep[]) => {
    setStepMessages((messages) =>
      ensureVoiceStepDefaults(nextSteps, pruneStepMessages(nextSteps, messages))
    );
    setSequenceSteps(nextSteps);
  }, []);

  useEffect(() => {
    if (!campaignId || sequenceSteps.length === 0 || step !== sequenceStepIndex) return;

    if (sequenceSaveSkipRef.current) {
      sequenceSaveSkipRef.current = false;
      return;
    }

    clearSequenceSaveTimer();
    sequenceSaveTimerRef.current = setTimeout(() => {
      void persistSequenceStep(1, sequenceSteps, { silent: true });
    }, 600);

    return clearSequenceSaveTimer;
  }, [
    campaignId,
    step,
    sequenceSteps,
    persistSequenceStep,
    applySavedSequenceSteps,
    clearSequenceSaveTimer,
  ]);

  useEffect(() => clearSequenceSaveTimer, [clearSequenceSaveTimer]);

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

  const generateMessagesForSequence = useCallback(
    async (steps: SequenceStep[], existingMessages: Record<string, string> = {}) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Sign in to generate messages with AI.");
      }

      const jobDescription = form.jobDescription.trim();
      const jobTitle = form.jobTitle.trim();
      if (jobDescription.length < 20) {
        throw new Error("Add a job description (at least 20 characters) on the details step.");
      }
      if (!jobTitle) {
        throw new Error("Add a job title on the details step.");
      }

      const channels = channelsMissingAiMessages(steps, existingMessages, {
        whatsappReplyQuestions,
      });
      if (channels.size === 0) return;

      let nextSteps = steps;
      let mergedMessages: Record<string, string> = {};
      let gmailTouchpoints: OutreachTouchpointDraft[] | undefined;
      let whatsappTouchpoints: WhatsAppTouchpointDraft[] | undefined;

      if (channels.has("email")) {
        setAiGeneratingChannel("email");
        const result = await generateOutreachSequenceFromJd(auth.token, jobDescription, {
          channel: "gmail",
          jobTitle,
          planName: form.name.trim() || undefined,
        });
        if (result.channel === "gmail") {
          gmailTouchpoints = result.touchpoints;
          if (!form.name.trim() && result.planName.trim()) {
            setForm((current) => ({ ...current, name: result.planName.trim() }));
          }
        }
      }

      if (channels.has("whatsapp")) {
        setAiGeneratingChannel("whatsapp");
        const result = await generateOutreachSequenceFromJd(auth.token, jobDescription, {
          channel: "whatsapp",
          jobTitle,
          planName: form.name.trim() || undefined,
        });
        if (result.channel === "whatsapp") {
          whatsappTouchpoints = result.touchpoints;
          if (!form.name.trim() && result.planName.trim()) {
            setForm((current) => ({ ...current, name: result.planName.trim() }));
          }
        }
      }

      if (whatsappTouchpoints?.length) {
        const waResult = mergeWhatsAppAiIntoSequence(nextSteps, whatsappTouchpoints);
        nextSteps = waResult.sequenceSteps;
        mergedMessages = { ...mergedMessages, ...waResult.messages };
        if (waResult.replyQuestions.length > 0) {
          setWhatsappReplyQuestions(waResult.replyQuestions);
        }
      }

      if (gmailTouchpoints?.length) {
        mergedMessages = {
          ...mergedMessages,
          ...mergeAiIntoExistingSequence(nextSteps, { gmailTouchpoints }),
        };
      }

      const stepsExpanded =
        nextSteps.length !== steps.length ||
        nextSteps.some((step, index) => step.id !== steps[index]?.id);

      if (stepsExpanded) {
        sequenceSaveSkipRef.current = true;
        setSequenceSteps(nextSteps);
        setStepMessages((current) => ({
          ...pruneStepMessages(nextSteps, current),
          ...mergedMessages,
        }));
        await persistSequenceStep(personalizeStepIndex, nextSteps, { silent: true });
      } else if (Object.keys(mergedMessages).length > 0) {
        setStepMessages((current) => ({ ...current, ...mergedMessages }));
      }

      if (Object.keys(mergedMessages).length > 0 || stepsExpanded) {
        setAiPersonalize(true);
        setActiveTab(0);
      }
    },
    [form.jobDescription, form.jobTitle, form.name, persistSequenceStep, whatsappReplyQuestions]
  );

  const displayCandidates = source === "csv" ? csvCandidates : poolCandidates;

  const reviewFlowItems = useMemo(
    () => buildMultiChannelReviewFlowItems(sequenceSteps, stepMessages, whatsappReplyQuestions),
    [sequenceSteps, stepMessages, whatsappReplyQuestions]
  );

  const buildSyncPayload = useCallback(
    () => ({
      form,
      sequenceSteps,
      aiPersonalize,
      stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
      whatsappReplyQuestions,
      emailAutoReplyEnabled: true,
      calendlyAutomation,
      candidateIds: selectedIds,
      candidateSource: source,
    }),
    [
      form,
      sequenceSteps,
      aiPersonalize,
      stepMessages,
      whatsappReplyQuestions,
      calendlyAutomation,
      selectedIds,
      source,
    ]
  );

  const handleReviewSaveDraft = async () => {
    setReviewError("");
    setReviewSubmitMode("save");
    try {
      const id = await saveDraftFromReview(() => syncMultiChannelDraft(buildSyncPayload()));
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
      isHuntlo360 &&
      (!calendlyAutomation.enabled || !String(calendlyAutomation.schedulingUrl || "").trim())
    ) {
      setReviewError("Select a Calendly meeting on the Schedule step before launching.");
      return;
    }

      const emailReady = await ensureEmailIntegrationReady(launchNeedsEmail);
      if (!emailReady) return;

      setLaunching(true);
      const overlayStartedAt = Date.now();
      const id = await launchFromReview(
        () => syncMultiChannelDraft(buildSyncPayload()),
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

  const calendlyReady =
    Boolean(calendlyAutomation.enabled) &&
    Boolean(String(calendlyAutomation.schedulingUrl || "").trim());

  const canNext =
    (step === 0 &&
      form.name.trim() &&
      form.jobTitle.trim() &&
      (!isHuntlo360 || form.jobDescription.trim().length >= 20)) ||
    (step === sequenceStepIndex && sequenceSteps.length > 0) ||
    step === personalizeStepIndex ||
    (isHuntlo360 && step === scheduleStepIndex && calendlyReady) ||
    (step === candidatesStepIndex &&
      selectedIds.length > 0 &&
      (source === "talent_pool" || source === "csv")) ||
    step === reviewStepIndex;

  const goNext = async () => {
    clearSequenceSaveTimer();
    if (step === 0) {
      await persistDetailsStep(1, form);
      setStep(1);
      return;
    }

    if (step === sequenceStepIndex) {
      setStepNavigating(true);
      try {
        const savedSteps = await persistSequenceStep(personalizeStepIndex, sequenceSteps);
        const stepsForAi = savedSteps?.length ? savedSteps : sequenceSteps;
        const messagesForAi = mergeStepMessagesFromSteps(
          stepsForAi,
          savedSteps?.length
            ? remapStepMessagesByIndex(sequenceSteps, savedSteps, stepMessages)
            : stepMessages
        );

        applySavedSequenceSteps(savedSteps, sequenceSteps);
        setStep(personalizeStepIndex);

        const missingChannels = channelsMissingAiMessages(stepsForAi, messagesForAi, {
          whatsappReplyQuestions,
        });
        if (missingChannels.size > 0) {
          setAiGenerating(true);
          setAiGenerateError("");
          try {
            await generateMessagesForSequence(stepsForAi, messagesForAi);
          } catch (err) {
            setAiGenerateError(
              err instanceof Error ? err.message : "Could not generate messages with AI."
            );
          } finally {
            setAiGenerating(false);
            setAiGeneratingChannel(null);
          }
        } else if (savedSteps?.length) {
          setStepMessages((current) =>
            mergeStepMessagesFromSteps(
              stepsForAi,
              remapStepMessagesByIndex(sequenceSteps, savedSteps, current)
            )
          );
        }
      } finally {
        setStepNavigating(false);
      }
      return;
    }

    if (step === personalizeStepIndex) {
      await persistPersonalizeStep(isHuntlo360 ? scheduleStepIndex : candidatesStepIndex, {
        aiPersonalize,
        stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
        whatsappReplyQuestions,
        emailAutoReplyEnabled: true,
        calendlyAutomation,
      });
    } else if (isHuntlo360 && step === scheduleStepIndex) {
      await persistPersonalizeStep(candidatesStepIndex, {
        aiPersonalize,
        stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
        whatsappReplyQuestions,
        emailAutoReplyEnabled: true,
        calendlyAutomation,
      });
    } else if (step === candidatesStepIndex) {
      await persistCandidatesStep(reviewStepIndex, {
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

    clearSequenceSaveTimer();
    const targetStep = step - 1;
    setStepNavigating(true);
    try {
      await persistCurrentStep(targetStep);
      setStep(targetStep);
    } finally {
      setStepNavigating(false);
    }
  };

  const handleStepClick = async (targetStep: number) => {
    if (targetStep === step || stepNavigating) return;

    clearSequenceSaveTimer();
    setStepNavigating(true);
    try {
      await persistCurrentStep(targetStep);
      setStep(targetStep);
    } finally {
      setStepNavigating(false);
    }
  };

  const personalizeTabs = useMemo(
    () => buildPersonalizeTabGroups(sequenceSteps),
    [sequenceSteps]
  );
  const activePersonalizeTab = personalizeTabs[activeTab] ?? personalizeTabs[0];
  const firstWhatsAppStepId = useMemo(
    () => sequenceSteps.find((step) => step.channel === "whatsapp")?.id ?? null,
    [sequenceSteps]
  );

  useEffect(() => {
    if (activeTab >= personalizeTabs.length) {
      setActiveTab(Math.max(0, personalizeTabs.length - 1));
    }
  }, [activeTab, personalizeTabs.length]);

  const handleEditSequenceMessage = async (stepId: string) => {
    setActiveTab(findPersonalizeTabIndexForStep(sequenceSteps, stepId));

    clearSequenceSaveTimer();
    if (sequenceSteps.length > 0) {
      const savedSteps = await persistSequenceStep(personalizeStepIndex, sequenceSteps, { silent: true });
      applySavedSequenceSteps(savedSteps, sequenceSteps);
    }
    setStep(personalizeStepIndex);
  };

  const handleActiveTabChange = (index: number) => {
    setActiveTab(index);
  };

  const { setChrome } = useOutreachBuilderChrome();

  useEffect(() => {
    setChrome({
      title: builderTitle,
      stepLabel: `Step ${step + 1} of ${flowSteps.length}`,
    });
    return () => setChrome(null);
  }, [step, setChrome, builderTitle, flowSteps.length]);

  return (
    <div className={`dashboard-outreach-builder${launching ? " dashboard-outreach-builder--launching" : ""}${isHuntlo360 ? " dashboard-outreach-builder--huntlo360" : ""}`}>
      {emailIntegrationModal}
      <CampaignLaunchAgentOverlay open={launching} channel={launchOverlayChannel} />
      {isHuntlo360 ? <Huntlo360JourneyBar activePhase={journeyPhase} /> : null}
      <div className="dashboard-outreach-builder-toolbar">
        <div className="dashboard-outreach-builder-header-top">
          <button type="button" className="dashboard-outreach-back-btn" onClick={() => void goBack()}>
            <MaterialIcon name="arrow_back" className="text-sm" />
            {step === 0 ? backToModuleLabel : "Previous step"}
          </button>
        </div>
      </div>
      <div className="dashboard-outreach-builder-scroll">
      <OutreachStepper
        steps={flowSteps}
        currentStep={step}
        onStepClick={(index) => void handleStepClick(index)}
        disabled={stepNavigating || savingDraft}
      />

      <div className="dashboard-outreach-builder-body">
        <div className="dashboard-outreach-builder-step-panel">
          <div className="dashboard-outreach-builder-step-panel-content">
        {step === 0 ? (
          <div className="dashboard-outreach-form-grid dashboard-outreach-form-grid--details">
            <div className="dashboard-outreach-field">
              <label className={dashboardLabelClass} htmlFor="mc-name">Campaign name</label>
              <input
                id="mc-name"
                className={dashboardInputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. React Developer Bangalore Outreach"
              />
            </div>
            <div className="dashboard-outreach-field">
              <label className={dashboardLabelClass} htmlFor="mc-job">Job title</label>
              <input
                id="mc-job"
                className={dashboardInputClass}
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="e.g. React Developer"
              />
            </div>
            <div className="dashboard-outreach-field dashboard-outreach-field--full">
              <label className={dashboardLabelClass} htmlFor="mc-jd">
                Job description
                {isHuntlo360 ? (
                  <span className="dashboard-outreach-field-hint"> (required for AI messages)</span>
                ) : null}
              </label>
              <textarea
                id="mc-jd"
                className={dashboardTextareaClass}
                rows={6}
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                placeholder={
                  isHuntlo360
                    ? "Paste the job description (at least 20 characters). AI uses this to generate your sequence."
                    : "Paste or write the job description. AI will use this for personalization."
                }
              />
            </div>
          </div>
        ) : null}

        {step === sequenceStepIndex ? (
          <>
            <div
              className="dashboard-outreach-sequence-autosave-slot"
              aria-live="polite"
              aria-atomic="true"
            >
              {autoSavingSequence ? (
                <p className="dashboard-outreach-sequence-autosave">Saving sequence…</p>
              ) : null}
            </div>
            <SequenceBuilder
              steps={sequenceSteps}
              onStepsChange={handleSequenceStepsChange}
              onEditMessage={(stepId) => void handleEditSequenceMessage(stepId)}
              allowedChannels={isHuntlo360 ? ["whatsapp", "email"] : undefined}
            />
          </>
        ) : null}

        {step === personalizeStepIndex ? (
          aiGenerating ? (
            <OutreachAiGeneratingPanel
              channels={sequenceSteps.map((s) => s.channel)}
              activeChannel={aiGeneratingChannel}
            />
          ) : (
          <div className="dashboard-outreach-personalize">
            {aiGenerateError ? (
              <p className="dashboard-outreach-empty-hint dashboard-outreach-empty-hint--error">
                <MaterialIcon name="error_outline" className="text-sm" />
                {aiGenerateError}
              </p>
            ) : null}
            <div className="dashboard-outreach-personalize-tabs" role="tablist">
              {personalizeTabs.map((group, i) => {
                const stepId = group.step.id;
                const hasContent =
                  group.step.channel === "whatsapp"
                    ? Boolean(decodeWhatsAppStepMessage(stepMessages[stepId] ?? "").body.trim()) ||
                      (stepId === firstWhatsAppStepId &&
                        whatsappReplyQuestions.some((question) => question.trim()))
                    : group.step.channel === "email"
                      ? Boolean(decodeEmailStepMessage(stepMessages[stepId] ?? "").body.trim())
                      : group.step.channel === "voice"
                        ? Boolean(decodeVoiceStepMessage(stepMessages[stepId] ?? "").body.trim())
                        : Boolean(stepMessages[stepId]?.trim());

                return (
                  <button
                    key={group.step.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === i}
                    className={`dashboard-outreach-personalize-tab${
                      activeTab === i ? " dashboard-outreach-personalize-tab--active" : ""
                    }`}
                    onClick={() => handleActiveTabChange(i)}
                  >
                    {group.label}
                    {hasContent ? (
                      <span className="dashboard-outreach-personalize-tab-dot" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {activePersonalizeTab?.kind === "step" ? (
              activePersonalizeTab.step.channel === "whatsapp" ? (
                <MessageEditor
                  channel="whatsapp"
                  showAutomatedFollowUps={false}
                  whatsappStepTitle={activePersonalizeTab.step.label}
                  whatsappStepDescription="Template for this sequence step. Timing and follow-ups come from your sequence."
                  templateId={
                    decodeWhatsAppStepMessage(
                      stepMessages[activePersonalizeTab.step.id] ?? ""
                    ).templateId
                  }
                  onOpeningTemplateSelect={(tpl) => {
                    const stepId = activePersonalizeTab.step.id;
                    setStepMessages((current) => ({
                      ...current,
                      [stepId]: encodeWhatsAppStepMessage(tpl.body, tpl.id),
                    }));
                  }}
                  replyQuestions={
                    activePersonalizeTab.step.id === firstWhatsAppStepId
                      ? whatsappReplyQuestions
                      : undefined
                  }
                  onReplyQuestionsChange={
                    activePersonalizeTab.step.id === firstWhatsAppStepId
                      ? setWhatsappReplyQuestions
                      : undefined
                  }
                  message={
                    decodeWhatsAppStepMessage(stepMessages[activePersonalizeTab.step.id] ?? "")
                      .body
                  }
                />
              ) : (
                <MessageEditor
                  channel={activePersonalizeTab.step.channel}
                  message={
                    activePersonalizeTab.step.channel === "email"
                      ? decodeEmailStepMessage(
                          stepMessages[activePersonalizeTab.step.id] ?? ""
                        ).body
                      : activePersonalizeTab.step.channel === "voice"
                        ? decodeVoiceStepMessage(stepMessages[activePersonalizeTab.step.id] ?? "")
                            .body
                        : stepMessages[activePersonalizeTab.step.id] ?? ""
                  }
                  subject={
                    activePersonalizeTab.step.channel === "email"
                      ? decodeEmailStepMessage(
                          stepMessages[activePersonalizeTab.step.id] ?? ""
                        ).subject
                      : undefined
                  }
                  callObjective={
                    activePersonalizeTab.step.channel === "voice"
                      ? decodeVoiceStepMessage(stepMessages[activePersonalizeTab.step.id] ?? "")
                          .callObjective
                      : undefined
                  }
                  voiceTone={
                    activePersonalizeTab.step.channel === "voice"
                      ? decodeVoiceStepMessage(stepMessages[activePersonalizeTab.step.id] ?? "")
                          .voiceTone
                      : undefined
                  }
                  callAttempts={
                    activePersonalizeTab.step.channel === "voice"
                      ? decodeVoiceStepMessage(stepMessages[activePersonalizeTab.step.id] ?? "")
                          .callAttempts
                      : undefined
                  }
                  attemptGap={
                    activePersonalizeTab.step.channel === "voice"
                      ? decodeVoiceStepMessage(stepMessages[activePersonalizeTab.step.id] ?? "")
                          .attemptGapHours
                      : undefined
                  }
                  onCallObjectiveChange={
                    activePersonalizeTab.step.channel === "voice"
                      ? (callObjective) => {
                          const stepId = activePersonalizeTab.step.id;
                          setStepMessages((current) =>
                            mergeVoiceStepMessage(current, stepId, { callObjective })
                          );
                        }
                      : undefined
                  }
                  onVoiceToneChange={
                    activePersonalizeTab.step.channel === "voice"
                      ? (voiceTone) => {
                          const stepId = activePersonalizeTab.step.id;
                          setStepMessages((current) =>
                            mergeVoiceStepMessage(current, stepId, { voiceTone })
                          );
                        }
                      : undefined
                  }
                  onCallAttemptsChange={
                    activePersonalizeTab.step.channel === "voice"
                      ? (callAttempts) => {
                          const stepId = activePersonalizeTab.step.id;
                          setStepMessages((current) =>
                            mergeVoiceStepMessage(current, stepId, { callAttempts })
                          );
                        }
                      : undefined
                  }
                  onAttemptGapChange={
                    activePersonalizeTab.step.channel === "voice"
                      ? (attemptGapHours) => {
                          const stepId = activePersonalizeTab.step.id;
                          setStepMessages((current) =>
                            mergeVoiceStepMessage(current, stepId, { attemptGapHours })
                          );
                        }
                      : undefined
                  }
                  onSubjectChange={
                    activePersonalizeTab.step.channel === "email"
                      ? (subject) => {
                          const stepId = activePersonalizeTab.step.id;
                          const { body } = decodeEmailStepMessage(stepMessages[stepId] ?? "");
                          setStepMessages((current) => ({
                            ...current,
                            [stepId]: encodeEmailStepMessage(subject, body),
                          }));
                        }
                      : undefined
                  }
                  onMessageChange={(value) =>
                    setStepMessages((current) => {
                      const stepId = activePersonalizeTab.step.id;
                      if (activePersonalizeTab.step.channel === "email") {
                        const { subject } = decodeEmailStepMessage(current[stepId] ?? "");
                        return {
                          ...current,
                          [stepId]: encodeEmailStepMessage(subject, value),
                        };
                      }
                      if (activePersonalizeTab.step.channel === "voice") {
                        return mergeVoiceStepMessage(current, stepId, { body: value });
                      }
                      return {
                        ...current,
                        [stepId]: value,
                      };
                    })
                  }
                />
              )
            ) : null}
            {launchNeedsCalendlySetup && !isHuntlo360 ? (
              <OutreachEmailReplySetup
                calendlyAutomation={calendlyAutomation}
                onCalendlyAutomationChange={setCalendlyAutomation}
              />
            ) : null}
          </div>
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
            mode="multi"
            channels={sequenceSteps.map((s) => getChannelLabel(s.channel))}
            steps={sequenceSteps}
            whatsappReplyQuestions={whatsappReplyQuestions}
            flowItems={reviewFlowItems}
            estimatedDuration="~4 days"
            touchpointSummary={`${sequenceSteps.length} step sequence`}
            checklist={[
              { label: "Campaign details completed", done: Boolean(form.name.trim() && form.jobTitle.trim()) },
              { label: "Sequence configured", done: sequenceSteps.length > 0 },
              { label: "Candidates selected", done: selectedIds.length > 0 },
              ...(isHuntlo360
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
          />
        ) : null}
          </div>
        </div>
      </div>
      </div>

        {step < reviewStepIndex ? (
          <footer className="dashboard-outreach-builder-footer dashboard-outreach-builder-footer--dock">
            <button type="button" className={dashboardBtnSecondaryClass} onClick={() => void goBack()} disabled={stepNavigating}>
              Back
            </button>
            <button
              type="button"
              className={dashboardBtnPrimaryClass}
              onClick={() => void goNext()}
              disabled={!canNext || savingDraft || stepNavigating || aiGenerating}
            >
              {savingDraft || stepNavigating
                ? "Saving…"
                : aiGenerating
                  ? "Generating…"
                  : "Continue"}
            </button>
          </footer>
        ) : null}
    </div>
  );
}
