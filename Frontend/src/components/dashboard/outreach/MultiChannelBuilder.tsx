"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CampaignReviewSummary } from "@/components/dashboard/outreach/CampaignReviewSummary";
import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import { CandidateSelectionTable } from "@/components/dashboard/outreach/CandidateSelectionTable";
import { MessageEditor } from "@/components/dashboard/outreach/MessageEditor";
import { OutreachAiGeneratingPanel } from "@/components/dashboard/outreach/OutreachAiGeneratingPanel";
import { useOutreachBuilderChrome } from "@/components/dashboard/outreach/OutreachBuilderChrome";
import {
  channelsMissingAiMessages,
  applyWhatsAppMessageToSequence,
  buildPersonalizeTabGroups,
  decodeEmailStepMessage,
  encodeEmailStepMessage,
  findPersonalizeTabIndexForStep,
  mergeAiIntoExistingSequence,
  mergeStepMessagesFromSteps,
  mergeWhatsAppAiIntoSequence,
  readWhatsAppFromSequenceSteps,
} from "@/components/dashboard/outreach/outreachModuleAiApply";
import { SequenceBuilder } from "@/components/dashboard/outreach/SequenceBuilder";
import { useEmailIntegrationLaunchGuard } from "@/components/dashboard/outreach/useEmailIntegrationLaunchGuard";
import { useOutreachBuilderDraft } from "@/components/dashboard/outreach/useOutreachBuilderDraft";
import { mergeCsvContactsIntoCandidates } from "@/components/dashboard/outreach/mergeCsvContactsIntoCandidates";
import { useOutreachCandidatePool } from "@/components/dashboard/outreach/useOutreachCandidatePool";
import { OutreachStepper } from "@/components/dashboard/outreach/OutreachStepper";
import {
  buildStepMessagesPayload,
  createDefaultMultiSequenceSteps,
  pruneStepMessages,
  remapStepMessagesByIndex,
} from "@/components/dashboard/outreach/outreachSequenceHelpers";
import {
  buildResumeAiPersonalize,
  buildResumeSequenceSteps,
  buildResumeStepMessages,
  buildResumeWhatsappReplyQuestions,
} from "@/components/dashboard/outreach/outreachDraftResume";
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
import {
  resolveWhatsAppSingleChannelMessage,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
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
};

export function MultiChannelBuilder({
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
}: Props) {
  const [step, setStep] = useState(initialStep);
  const [form, setForm] = useState<CampaignDetailsForm>(initialForm);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [source, setSource] = useState<CandidateSource>(initialSource);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(() =>
    initialSequenceSteps?.length ? initialSequenceSteps : createDefaultMultiSequenceSteps()
  );
  const [stepMessages, setStepMessages] = useState<Record<string, string>>(initialStepMessages);
  const [aiPersonalize, setAiPersonalize] = useState(initialAiPersonalize);
  const [whatsappReplyQuestions, setWhatsappReplyQuestions] = useState<string[]>(
    initialWhatsappReplyQuestions
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
  const launchOverlayChannel = useMemo<"gmail" | "whatsapp">(() => {
    if (sequenceSteps.some((step) => step.channel === "email")) return "gmail";
    if (sequenceSteps.some((step) => step.channel === "whatsapp")) return "whatsapp";
    return "gmail";
  }, [sequenceSteps]);

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

      if (step === 1) {
        if (sequenceSteps.length === 0) return;
        const savedSteps = await persistSequenceStep(targetStep, sequenceSteps, { silent: true });
        applySavedSequenceSteps(savedSteps, sequenceSteps);
        return;
      }

      if (step === 2) {
        await persistPersonalizeStep(targetStep, {
          aiPersonalize,
          stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
          whatsappReplyQuestions,
        });
        return;
      }

      if (step === 3 && selectedIds.length > 0) {
        await persistCandidatesStep(targetStep, {
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
  } = useOutreachCandidatePool(step === 3 && source === "talent_pool");

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

        const savedMessages = buildResumeStepMessages(campaign);
        if (Object.keys(savedMessages).length > 0) {
          setStepMessages(savedMessages);
        }

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
    setStepMessages((messages) => pruneStepMessages(nextSteps, messages));
    setSequenceSteps(nextSteps);
  }, []);

  useEffect(() => {
    if (!campaignId || sequenceSteps.length === 0 || step !== 1) return;

    if (sequenceSaveSkipRef.current) {
      sequenceSaveSkipRef.current = false;
      return;
    }

    clearSequenceSaveTimer();
    sequenceSaveTimerRef.current = setTimeout(() => {
      void (async () => {
        const savedSteps = await persistSequenceStep(1, sequenceSteps, { silent: true });
        applySavedSequenceSteps(savedSteps, sequenceSteps);
      })();
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
    if (step !== 3 || source !== "csv" || initialSelectedIds.length === 0) return;
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
        await persistSequenceStep(2, nextSteps, { silent: true });
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

  const buildSyncPayload = useCallback(
    () => ({
      form,
      sequenceSteps,
      aiPersonalize,
      stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
      whatsappReplyQuestions,
      candidateIds: selectedIds,
      candidateSource: source,
    }),
    [form, sequenceSteps, aiPersonalize, stepMessages, whatsappReplyQuestions, selectedIds, source]
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
      const emailReady = await ensureEmailIntegrationReady(launchNeedsEmail);
      if (!emailReady) return;

      setLaunching(true);
      const overlayStartedAt = Date.now();
      const id = await launchFromReview(() => syncMultiChannelDraft(buildSyncPayload()));

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

  const canNext =
    (step === 0 && form.name.trim() && form.jobTitle.trim()) ||
    (step === 1 && sequenceSteps.length > 0) ||
    step === 2 ||
    (step === 3 &&
      selectedIds.length > 0 &&
      (source === "talent_pool" || source === "csv")) ||
    step === 4;

  const goNext = async () => {
    clearSequenceSaveTimer();
    if (step === 0) {
      await persistDetailsStep(1, form);
      setStep(1);
      return;
    }

    if (step === 1) {
      setStepNavigating(true);
      try {
        const savedSteps = await persistSequenceStep(2, sequenceSteps);
        const stepsForAi = savedSteps?.length ? savedSteps : sequenceSteps;
        const messagesForAi = mergeStepMessagesFromSteps(
          stepsForAi,
          savedSteps?.length
            ? remapStepMessagesByIndex(sequenceSteps, savedSteps, stepMessages)
            : stepMessages
        );

        applySavedSequenceSteps(savedSteps, sequenceSteps);
        setStep(2);

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

    if (step === 2) {
      await persistPersonalizeStep(3, {
        aiPersonalize,
        stepMessages: buildStepMessagesPayload(sequenceSteps, stepMessages),
        whatsappReplyQuestions,
      });
    } else if (step === 3) {
      await persistCandidatesStep(4, {
        candidateIds: selectedIds,
        candidateSource: source,
      });
    }

    if (step < STEPS.length - 1) setStep((s) => s + 1);
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
  const whatsappMessage = useMemo(
    () => readWhatsAppFromSequenceSteps(sequenceSteps, stepMessages, whatsappReplyQuestions),
    [sequenceSteps, stepMessages, whatsappReplyQuestions]
  );

  const patchWhatsappMessage = useCallback(
    (patch: Parameters<typeof resolveWhatsAppSingleChannelMessage>[0]) => {
      const next = resolveWhatsAppSingleChannelMessage({
        ...readWhatsAppFromSequenceSteps(sequenceSteps, stepMessages, whatsappReplyQuestions),
        ...patch,
      });
      setWhatsappReplyQuestions(next.replyQuestions);
      const result = applyWhatsAppMessageToSequence(sequenceSteps, stepMessages, next);
      setSequenceSteps(result.sequenceSteps);
      setStepMessages(result.stepMessages);
    },
    [sequenceSteps, stepMessages, whatsappReplyQuestions]
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
      const savedSteps = await persistSequenceStep(2, sequenceSteps, { silent: true });
      applySavedSequenceSteps(savedSteps, sequenceSteps);
    }
    setStep(2);
  };

  const handleActiveTabChange = (index: number) => {
    setActiveTab(index);
  };

  const { setChrome } = useOutreachBuilderChrome();

  useEffect(() => {
    setChrome({
      title: "Multi channel campaign",
      stepLabel: `Step ${step + 1} of ${STEPS.length}`,
    });
    return () => setChrome(null);
  }, [step, setChrome]);

  return (
    <div className={`dashboard-outreach-builder${launching ? " dashboard-outreach-builder--launching" : ""}`}>
      {emailIntegrationModal}
      <CampaignLaunchAgentOverlay open={launching} channel={launchOverlayChannel} />
      <header className="dashboard-outreach-builder-header">
        <button type="button" className="dashboard-outreach-back-btn" onClick={() => void goBack()}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          {step === 0 ? "Back to outreach" : "Previous step"}
        </button>
      </header>

      <OutreachStepper
        steps={STEPS}
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
              <label className={dashboardLabelClass} htmlFor="mc-jd">Job description</label>
              <textarea
                id="mc-jd"
                className={dashboardTextareaClass}
                rows={6}
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                placeholder="Paste or write the job description. AI will use this for personalization."
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <>
            {autoSavingSequence ? (
              <p className="dashboard-outreach-sequence-autosave" aria-live="polite">
                Saving sequence…
              </p>
            ) : null}
            <SequenceBuilder
              steps={sequenceSteps}
              onStepsChange={handleSequenceStepsChange}
              onEditMessage={(stepId) => void handleEditSequenceMessage(stepId)}
            />
          </>
        ) : null}

        {step === 2 ? (
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
              {personalizeTabs.map((group, i) => (
                <button
                  key={group.kind === "whatsapp" ? "whatsapp" : group.step.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === i}
                  className={`dashboard-outreach-personalize-tab${
                    activeTab === i ? " dashboard-outreach-personalize-tab--active" : ""
                  }`}
                  onClick={() => handleActiveTabChange(i)}
                >
                  {group.label}
                  {(group.kind === "whatsapp"
                    ? group.stepIndices.some((stepIndex) =>
                        Boolean(stepMessages[sequenceSteps[stepIndex]?.id]?.trim())
                      ) || whatsappReplyQuestions.some((question) => question.trim())
                    : Boolean(stepMessages[group.step.id]?.trim())) ? (
                    <span className="dashboard-outreach-personalize-tab-dot" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
            {activePersonalizeTab?.kind === "whatsapp" ? (
              <MessageEditor
                channel="whatsapp"
                templateId={whatsappMessage.templateId}
                onOpeningTemplateSelect={(tpl) =>
                  patchWhatsappMessage({ templateId: tpl.id, body: tpl.body })
                }
                followUpTemplateId={whatsappMessage.followUpTemplateId}
                onFollowUpTemplateSelect={(tpl) =>
                  patchWhatsappMessage({ followUpTemplateId: tpl.id, followUpBody: tpl.body })
                }
                followUpWaitHours={whatsappMessage.followUpWaitHours}
                onFollowUpWaitHoursChange={(hours) =>
                  patchWhatsappMessage({ followUpWaitHours: hours })
                }
                followUp2TemplateId={whatsappMessage.followUp2TemplateId}
                onFollowUp2TemplateSelect={(tpl) =>
                  patchWhatsappMessage({ followUp2TemplateId: tpl.id, followUp2Body: tpl.body })
                }
                followUp2WaitHours={whatsappMessage.followUp2WaitHours}
                onFollowUp2WaitHoursChange={(hours) =>
                  patchWhatsappMessage({ followUp2WaitHours: hours })
                }
                replyQuestions={whatsappMessage.replyQuestions}
                onReplyQuestionsChange={(questions) =>
                  patchWhatsappMessage({ replyQuestions: questions })
                }
                message={whatsappMessage.body}
              />
            ) : activePersonalizeTab?.kind === "step" ? (
              <MessageEditor
                channel={activePersonalizeTab.step.channel}
                message={
                  activePersonalizeTab.step.channel === "email"
                    ? decodeEmailStepMessage(
                        stepMessages[activePersonalizeTab.step.id] ?? ""
                      ).body
                    : stepMessages[activePersonalizeTab.step.id] ?? ""
                }
                subject={
                  activePersonalizeTab.step.channel === "email"
                    ? decodeEmailStepMessage(
                        stepMessages[activePersonalizeTab.step.id] ?? ""
                      ).subject
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
                    return {
                      ...current,
                      [stepId]: value,
                    };
                  })
                }
              />
            ) : null}
          </div>
          )
        ) : null}

        {step === 3 ? (
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

        {step === 4 ? (
          <CampaignReviewSummary
            campaignName={form.name}
            jobTitle={form.jobTitle}
            candidateCount={selectedIds.length}
            candidateSourceLabel={SOURCE_LABELS[source]}
            mode="multi"
            channels={sequenceSteps.map((s) => getChannelLabel(s.channel))}
            steps={sequenceSteps}
            estimatedDuration="~4 days"
            touchpointSummary={`${sequenceSteps.length} step sequence`}
            checklist={[
              { label: "Campaign details completed", done: Boolean(form.name.trim() && form.jobTitle.trim()) },
              { label: "Sequence configured", done: sequenceSteps.length > 0 },
              { label: "Candidates selected", done: selectedIds.length > 0 },
            ]}
            submitting={submittingReview || launching}
            submitMode={reviewSubmitMode}
            error={reviewError}
            onBack={() => setStep(3)}
            onSaveDraft={handleReviewSaveDraft}
            onLaunch={handleReviewLaunch}
          />
        ) : null}
          </div>

        {step < 4 ? (
          <footer className="dashboard-outreach-builder-footer">
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
      </div>
    </div>
  );
}
