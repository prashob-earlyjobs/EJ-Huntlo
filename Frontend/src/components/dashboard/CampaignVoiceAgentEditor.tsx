"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER,
  DEFAULT_SCREENING_QUESTION_COUNT,
  MAX_SCREENING_QUESTIONS,
  DEFAULT_OUTCOME_RESULT_FIELDS,
  DEFAULT_SCREENING_RESULT_FIELDS,
  applyScreeningQuestionCountToCallObjective,
  buildDefaultScreeningQuestionsForEditor,
  buildResultPromptFromFields,
  getAutoScreeningLinkedQuestion,
  getDefaultScreeningQuestionLabel,
  isAutoScreeningResultField,
  isFixedDefaultResultField,
  prepareScreeningQuestionsForStorage,
  resolveInitialScreeningQuestions,
  syncResultFieldsWithScreeningQuestions,
  syncScreeningQuestionsIntoCallPrompt,
} from "@/lib/voiceAgentPrompt";
import type { VoiceAgentConfigRecord } from "@/lib/campaigns";
import {
  buildVoiceCallRetryCountOptions,
  DEFAULT_ENABLED_VOICE_CALL_RETRY_CONFIG,
  DEFAULT_VOICE_CALL_RETRY_CONFIG,
  isVoiceCallRetryEnabled,
  normalizeVoiceCallRetryConfig,
  VOICE_CALL_RETRY_INTERVAL_OPTIONS,
  type VoiceCallRetryConfig,
} from "@/lib/voiceCallRetryConfig";
import {
  VOICE_CALL_INTRO_DEFAULT,
  VOICE_CALL_OBJECTIVE_DEFAULT,
  VOICE_CALL_PROMPT_DEFAULT,
} from "@/lib/defaultVoiceCallPrompt";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

export {
  VOICE_CALL_INTRO_DEFAULT,
  VOICE_CALL_OBJECTIVE_DEFAULT,
  VOICE_CALL_PROMPT_DEFAULT,
  VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER,
};

const MIN_CALL_OBJECTIVE_CHARS = 10;
const MIN_CALL_INTRO_CHARS = 10;
const MIN_CALL_PROMPT_CHARS = 50;
const MAX_RESULT_AGENT_ROWS = 24;
const MAX_CANDIDATE_QUESTIONS = MAX_SCREENING_QUESTIONS;

type VoiceAgentSetupStep = "call" | "result";

const SETUP_STEPS: Array<{
  id: VoiceAgentSetupStep;
  label: string;
  title: string;
  lead: string;
}> = [
  {
    id: "call",
    label: "Call setup",
    title: "Call agent",
    lead: "Set the objective, opening line, agent instructions, screening questions, and retry settings.",
  },
  {
    id: "result",
    label: "Results",
    title: "Result columns",
    lead: "Define what gets captured after each call.",
  },
];

export type ResultAgentFieldRow = {
  columnName: string;
  expectedValue: string;
};

export type VoiceAgentEditorPayload = {
  callObjective: string;
  introductoryStatement: string;
  callPrompt: string;
  resultFields: ResultAgentFieldRow[];
  resultPrompt: string;
  retryConfig: VoiceCallRetryConfig;
};

const DEFAULT_RESULT_AGENT_FIELDS: ResultAgentFieldRow[] = [
  ...DEFAULT_OUTCOME_RESULT_FIELDS,
  ...DEFAULT_SCREENING_RESULT_FIELDS,
].map((row) => ({ ...row }));

function createEmptyResultFieldRow(): ResultAgentFieldRow {
  return { columnName: "", expectedValue: "" };
}

function voiceAgentFieldsFromConfig(
  config?: VoiceAgentConfigRecord | null,
  screeningQuestions: string[] = []
): ResultAgentFieldRow[] {
  const base =
    config?.resultFields?.length
      ? config.resultFields.map((row) => ({ ...row }))
      : DEFAULT_RESULT_AGENT_FIELDS.map((row) => ({ ...row }));
  return syncResultFieldsWithScreeningQuestions(screeningQuestions, base);
}

function callPromptSummaryLine(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Default call prompt configured";
  const firstMeaningfulLine =
    trimmed.split("\n").find((line) => line.trim().replace(/^[-*]\s*/, "").length > 0)?.trim() ||
    trimmed.split("\n")[0]?.trim() ||
    trimmed;
  const compact = firstMeaningfulLine.replace(/^=+\s*|\s*=+$/g, "").trim() || firstMeaningfulLine;
  const hasMore =
    trimmed.includes("\n") || trimmed.length > compact.length || compact.length > 72;
  const preview = compact.length > 72 ? `${compact.slice(0, 72).trimEnd()}...` : compact;
  return hasMore && !preview.endsWith("...") ? `${preview}...` : preview;
}

type Props = {
  locked?: boolean;
  outreachStatus?: string;
  jobTitle?: string;
  initialConfig?: VoiceAgentConfigRecord | null;
  onSaveAndContinue?: (payload: VoiceAgentEditorPayload) => void | Promise<void>;
};

export function CampaignVoiceAgentEditor({
  locked = false,
  outreachStatus = "idle",
  jobTitle = "",
  initialConfig = null,
  onSaveAndContinue,
}: Props) {
  const roleLabel = jobTitle.trim();
  const initialCallPrompt = initialConfig?.callPrompt?.trim() || VOICE_CALL_PROMPT_DEFAULT;
  const [setupStep, setSetupStep] = useState<VoiceAgentSetupStep>("call");
  const [saveBusy, setSaveBusy] = useState(false);
  const [callPromptModalOpen, setCallPromptModalOpen] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [callObjective, setCallObjective] = useState(
    () => initialConfig?.callObjective?.trim() || VOICE_CALL_OBJECTIVE_DEFAULT
  );
  const [introductoryStatement, setIntroductoryStatement] = useState(
    () => initialConfig?.introductoryStatement?.trim() || VOICE_CALL_INTRO_DEFAULT
  );
  const [callPrompt, setCallPrompt] = useState(() => initialCallPrompt);
  const [candidateQuestions, setCandidateQuestions] = useState(() =>
    resolveInitialScreeningQuestions(initialCallPrompt, roleLabel)
  );
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editingQuestionDraft, setEditingQuestionDraft] = useState("");
  const [pendingDeleteQuestionIndex, setPendingDeleteQuestionIndex] = useState<number | null>(
    null
  );
  const [resultFields, setResultFields] = useState<ResultAgentFieldRow[]>(() =>
    voiceAgentFieldsFromConfig(
      initialConfig,
      prepareScreeningQuestionsForStorage(resolveInitialScreeningQuestions(initialCallPrompt, roleLabel)).filter(Boolean)
    )
  );
  const [retryConfig, setRetryConfig] = useState<VoiceCallRetryConfig>(() =>
    normalizeVoiceCallRetryConfig(initialConfig?.retryConfig)
  );
  const retryCountOptions = useMemo(() => buildVoiceCallRetryCountOptions(), []);
  const retryEnabled = isVoiceCallRetryEnabled(retryConfig);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const questionEditRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setPortalMounted(true), []);

  useEffect(() => {
    const storageQuestions = prepareScreeningQuestionsForStorage(candidateQuestions).filter(Boolean);
    setCallPrompt((prev) => syncScreeningQuestionsIntoCallPrompt(prev, candidateQuestions));
    setCallObjective((prev) =>
      applyScreeningQuestionCountToCallObjective(prev, storageQuestions.length)
    );
    setResultFields((prev) => syncResultFieldsWithScreeningQuestions(storageQuestions, prev));
  }, [candidateQuestions]);

  useEffect(() => {
    editorBodyRef.current?.scrollTo({ top: 0 });
  }, [setupStep]);

  useEffect(() => {
    if (!callPromptModalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCallPromptModal();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [callPromptModalOpen]);

  useEffect(() => {
    if (editingQuestionIndex === null) return;
    const frame = window.requestAnimationFrame(() => questionEditRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [editingQuestionIndex]);

  useEffect(() => {
    if (editingQuestionIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelEditingQuestion();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingQuestionIndex, editingQuestionDraft, candidateQuestions]);

  const updateResultField = (
    index: number,
    patch: Partial<ResultAgentFieldRow>
  ) => {
    setResultFields((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  };

  const addResultFieldRow = () => {
    if (locked || resultFields.length >= MAX_RESULT_AGENT_ROWS) return;
    setResultFields((prev) => [...prev, createEmptyResultFieldRow()]);
  };

  const removeResultFieldRow = (index: number) => {
    const row = resultFields[index];
    if (locked || !row || isFixedDefaultResultField(row)) return;

    if (isAutoScreeningResultField(row)) {
      const linkedQuestion = getAutoScreeningLinkedQuestion(row);
      if (linkedQuestion) {
        const questionIndex = candidateQuestions.findIndex(
          (question, questionIndex) =>
            questionIndex >= DEFAULT_SCREENING_QUESTION_COUNT &&
            question.trim().toLowerCase() === linkedQuestion.toLowerCase()
        );
        if (questionIndex >= 0) {
          removeCandidateQuestion(questionIndex);
          return;
        }
      }
    }

    setResultFields((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const addCandidateQuestion = () => {
    if (locked || candidateQuestions.length >= MAX_CANDIDATE_QUESTIONS) return;
    const nextIndex = candidateQuestions.length;
    setCandidateQuestions((prev) => [...prev, ""]);
    setEditingQuestionIndex(nextIndex);
    setEditingQuestionDraft("");
  };

  const updateCandidateQuestion = (index: number, value: string) => {
    setCandidateQuestions((prev) =>
      prev.map((question, questionIndex) => (questionIndex === index ? value : question))
    );
  };

  const startEditingQuestion = (index: number) => {
    if (locked) return;
    setEditingQuestionIndex(index);
    setEditingQuestionDraft(candidateQuestions[index] ?? "");
  };

  const saveEditingQuestion = () => {
    if (editingQuestionIndex === null) return;
    updateCandidateQuestion(editingQuestionIndex, editingQuestionDraft);
    setEditingQuestionIndex(null);
    setEditingQuestionDraft("");
  };

  const cancelEditingQuestion = () => {
    if (editingQuestionIndex === null) return;
    const hadContent = Boolean(candidateQuestions[editingQuestionIndex]?.trim());
    const draftHasContent = Boolean(editingQuestionDraft.trim());
    if (!hadContent && !draftHasContent) {
      setCandidateQuestions((prev) =>
        prev.filter((_, questionIndex) => questionIndex !== editingQuestionIndex)
      );
    }
    setEditingQuestionIndex(null);
    setEditingQuestionDraft("");
  };

  const removeCandidateQuestion = (index: number) => {
    if (locked) return;
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
      setEditingQuestionDraft("");
    } else if (editingQuestionIndex !== null && index < editingQuestionIndex) {
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
    setCandidateQuestions((prev) => prev.filter((_, questionIndex) => questionIndex !== index));
  };

  const requestDeleteCandidateQuestion = (index: number) => {
    if (locked) return;
    setPendingDeleteQuestionIndex(index);
  };

  const resetCandidateQuestions = () => {
    if (locked) return;
    setEditingQuestionIndex(null);
    setEditingQuestionDraft("");
    setCandidateQuestions(buildDefaultScreeningQuestionsForEditor(roleLabel));
  };

  const closeCallPromptModal = () => {
    setCallPromptModalOpen(false);
  };

  useEffect(() => {
    if (pendingDeleteQuestionIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDeleteQuestionIndex(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pendingDeleteQuestionIndex]);

  const trimmedCallObjective = callObjective.trim();
  const trimmedIntroductoryStatement = introductoryStatement.trim();
  const trimmedCallPrompt = callPrompt.trim();

  const callStepReady = useMemo(
    () =>
      trimmedCallObjective.length >= MIN_CALL_OBJECTIVE_CHARS &&
      trimmedIntroductoryStatement.length >= MIN_CALL_INTRO_CHARS &&
      trimmedCallPrompt.length >= MIN_CALL_PROMPT_CHARS,
    [trimmedCallObjective, trimmedIntroductoryStatement, trimmedCallPrompt]
  );

  const resultFieldsReady = useMemo(
    () =>
      resultFields.every(
        (row) => row.columnName.trim().length > 0 && row.expectedValue.trim().length > 0
      ),
    [resultFields]
  );

  const resultStepReady = useMemo(
    () => callStepReady && resultFieldsReady,
    [callStepReady, resultFieldsReady]
  );

  const storedCandidateQuestions = useMemo(
    () => prepareScreeningQuestionsForStorage(candidateQuestions),
    [candidateQuestions]
  );

  const filledCandidateQuestions = useMemo(
    () => storedCandidateQuestions.map((question) => question.trim()).filter(Boolean),
    [storedCandidateQuestions]
  );

  const defaultQuestionsMatch = useMemo(() => {
    const defaults = buildDefaultScreeningQuestionsForEditor(roleLabel);
    if (candidateQuestions.length !== defaults.length) return false;
    return candidateQuestions.every(
      (question, index) => question.trim() === defaults[index]?.trim()
    );
  }, [candidateQuestions, roleLabel]);

  const confirmDeleteCandidateQuestion = () => {
    if (pendingDeleteQuestionIndex === null) return;
    const index = pendingDeleteQuestionIndex;
    setPendingDeleteQuestionIndex(null);
    removeCandidateQuestion(index);
  };

  const setupStepIndex = SETUP_STEPS.findIndex((step) => step.id === setupStep);
  const currentStep = SETUP_STEPS[setupStepIndex] ?? SETUP_STEPS[0];

  const goToSetupStep = (step: VoiceAgentSetupStep) => {
    if (step === "result" && !locked && !callStepReady) return;
    setSetupStep(step);
  };

  const canProceedFromCallStep = locked || callStepReady;

  const buildPayload = (): VoiceAgentEditorPayload => {
    const storageQuestions = prepareScreeningQuestionsForStorage(filledCandidateQuestions).filter(Boolean);
    const mergedResultFields = syncResultFieldsWithScreeningQuestions(storageQuestions, resultFields);

    return {
      callObjective: applyScreeningQuestionCountToCallObjective(
        trimmedCallObjective,
        filledCandidateQuestions.length
      ),
      introductoryStatement: trimmedIntroductoryStatement,
      callPrompt: syncScreeningQuestionsIntoCallPrompt(trimmedCallPrompt, candidateQuestions),
      resultFields: mergedResultFields,
      resultPrompt: buildResultPromptFromFields(mergedResultFields),
      retryConfig: normalizeVoiceCallRetryConfig(retryConfig),
    };
  };

  const handleSaveAndContinue = async () => {
    if (!onSaveAndContinue || locked || !resultStepReady || saveBusy) return;
    setSaveBusy(true);
    try {
      await onSaveAndContinue(buildPayload());
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="dashboard-campaign-voice-agent-editor flex min-h-0 flex-1 flex-col">
      <div
        ref={editorBodyRef}
        className="dashboard-campaign-voice-agent-editor-body min-h-0 flex-1"
      >
        <div className="dashboard-campaign-voice-agent-editor-inner">
          {locked ? (
            <div className="dashboard-campaign-jd-locked-banner" role="status">
              <MaterialIcon
                name="lock"
                className="shrink-0 text-base text-amber-700"
                aria-hidden
              />
              <p className="text-sm text-amber-950">
                {outreachStatus === "completed"
                  ? "This campaign is completed. Agent settings cannot be edited."
                  : "Campaign is running. Pause the campaign to edit agent settings."}
              </p>
            </div>
          ) : null}

          <div className="dashboard-campaign-voice-agent-stepper" aria-label="Voice agent setup">
            <ol className="dashboard-campaign-voice-agent-stepper-list">
              {SETUP_STEPS.map((step, index) => {
                const isActive = setupStep === step.id;
                const isComplete = index < setupStepIndex;
                return (
                  <li
                    key={step.id}
                    className={[
                      "dashboard-campaign-voice-agent-stepper-item",
                      isActive ? "is-active" : "",
                      isComplete ? "is-complete" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className="dashboard-campaign-voice-agent-stepper-content"
                      onClick={() => goToSetupStep(step.id)}
                      disabled={step.id === "result" && !locked && !callStepReady}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span className="dashboard-campaign-voice-agent-stepper-dot">
                        {isComplete && !isActive ? (
                          <MaterialIcon name="check" className="text-xs" aria-hidden />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="dashboard-campaign-voice-agent-stepper-label">
                        {step.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="dashboard-campaign-voice-agent-step-panel">
            <header
              className={`dashboard-campaign-voice-agent-step-panel-head${
                setupStep === "result"
                  ? " dashboard-campaign-voice-agent-step-panel-head--with-action"
                  : ""
              }`}
            >
              <div className="dashboard-campaign-voice-agent-step-panel-head-text">
                <h3 className="dashboard-campaign-voice-agent-step-panel-title">
                  {currentStep.title}
                </h3>
                <p className="dashboard-campaign-voice-agent-step-panel-lead">{currentStep.lead}</p>
              </div>
              {setupStep === "result" ? (
                <button
                  type="button"
                  className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-result-add-btn shrink-0`}
                  disabled={locked || resultFields.length >= MAX_RESULT_AGENT_ROWS}
                  onClick={addResultFieldRow}
                >
                  <MaterialIcon name="add" className="text-base" aria-hidden />
                  Add row
                </button>
              ) : null}
            </header>

            <div className="dashboard-campaign-voice-agent-step-panel-body">
          {setupStep === "call" ? (
            <>
              <label className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label`}>
                What is the objective of the call?
                <span className="dashboard-campaign-voice-agent-required">*</span>
                <input
                  type="text"
                  value={callObjective}
                  onChange={(e) => setCallObjective(e.target.value)}
                  disabled={locked}
                  required
                  minLength={MIN_CALL_OBJECTIVE_CHARS}
                  placeholder="What is the objective of this call"
                  className={`${dashboardInputClass} mt-2 w-full`}
                />
              </label>

              <label className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label`}>
                Introductory statement
                <span className="dashboard-campaign-voice-agent-required">*</span>
                <input
                  type="text"
                  value={introductoryStatement}
                  onChange={(e) => setIntroductoryStatement(e.target.value)}
                  disabled={locked}
                  required
                  minLength={MIN_CALL_INTRO_CHARS}
                  placeholder={VOICE_CALL_INTRO_DEFAULT}
                  aria-describedby="voice-call-intro-helper"
                  className={`${dashboardInputClass} mt-2 w-full`}
                />
                <p
                  id="voice-call-intro-helper"
                  className="dashboard-campaign-voice-agent-field-hint mt-1.5"
                >
                  Use{" "}
                  <code className="dashboard-campaign-voice-agent-code">{"{greeting}"}</code> and{" "}
                  <code className="dashboard-campaign-voice-agent-code">{"{callee_name}"}</code>{" "}
                  for dynamic values.
                </p>
              </label>

              <div>
                <div
                  id="voice-call-prompt-label"
                  className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label`}
                >
                  Call prompt
                  <span className="dashboard-campaign-voice-agent-required">*</span>
                </div>
                <button
                  type="button"
                  id="voice-call-prompt"
                  aria-labelledby="voice-call-prompt-label"
                  aria-haspopup="dialog"
                  aria-expanded={callPromptModalOpen}
                  onClick={() => setCallPromptModalOpen(true)}
                  className="dashboard-campaign-voice-agent-prompt-summary mt-2 w-full"
                >
                  <span className="dashboard-campaign-voice-agent-prompt-summary-text">
                    {callPromptSummaryLine(trimmedCallPrompt)}
                  </span>
                  <span className="dashboard-campaign-voice-agent-prompt-summary-action">
                    View full prompt
                    <MaterialIcon name="chevron_right" className="text-base" aria-hidden />
                  </span>
                </button>
              </div>

              <div className="dashboard-campaign-voice-agent-step-section">
                <div className="dashboard-campaign-voice-agent-step-section-head">
                  <h4 className="dashboard-campaign-voice-agent-step-section-title">
                    Screening questions
                  </h4>
                  <p className="dashboard-campaign-voice-agent-field-hint m-0">
                    Standard questions asked after a candidate shows interest. Edit, remove, or add
                    up to {MAX_CANDIDATE_QUESTIONS}. The candidate&apos;s name is added
                    automatically on the first question during the call.
                  </p>
                </div>

                <div className="dashboard-campaign-voice-agent-questions-toolbar">
                  <p className="dashboard-campaign-voice-agent-field-hint m-0">
                    {filledCandidateQuestions.length} / {MAX_CANDIDATE_QUESTIONS} questions
                  </p>
                  <div className="dashboard-campaign-voice-agent-questions-toolbar-actions">
                    {!defaultQuestionsMatch && candidateQuestions.length > 0 ? (
                      <button
                        type="button"
                        className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-questions-reset-btn`}
                        disabled={locked}
                        onClick={resetCandidateQuestions}
                      >
                        <MaterialIcon name="restart_alt" className="text-base" aria-hidden />
                        Reset defaults
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-questions-add-btn`}
                      disabled={locked || candidateQuestions.length >= MAX_CANDIDATE_QUESTIONS}
                      onClick={addCandidateQuestion}
                    >
                      <MaterialIcon name="add" className="text-base" aria-hidden />
                      Add question
                    </button>
                  </div>
                </div>

                {candidateQuestions.length === 0 ? (
                  <div className="dashboard-campaign-voice-agent-questions-empty">
                    <MaterialIcon
                      name="quiz"
                      className="dashboard-campaign-voice-agent-questions-empty-icon"
                      aria-hidden
                    />
                    <p className="dashboard-campaign-voice-agent-questions-empty-text m-0">
                      No screening questions yet. Restore the standard set or add your own.
                    </p>
                    <div className="dashboard-campaign-voice-agent-questions-empty-actions">
                      <button
                        type="button"
                        className={`${dashboardBtnPrimaryClass} dashboard-campaign-voice-agent-questions-add-btn`}
                        disabled={locked}
                        onClick={resetCandidateQuestions}
                      >
                        <MaterialIcon name="restart_alt" className="text-base" aria-hidden />
                        Restore defaults
                      </button>
                      <button
                        type="button"
                        className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-questions-add-btn`}
                        disabled={locked}
                        onClick={addCandidateQuestion}
                      >
                        <MaterialIcon name="add" className="text-base" aria-hidden />
                        Add question
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="dashboard-campaign-voice-agent-questions-list">
                    {candidateQuestions.map((question, index) => {
                      const topicLabel =
                        getDefaultScreeningQuestionLabel(index) ??
                        (index >= DEFAULT_SCREENING_QUESTION_COUNT ? "Custom" : null);
                      const isEditing = editingQuestionIndex === index;
                      const displayText = question.trim();

                      if (isEditing) {
                        return (
                          <li
                            key={`candidate-question-${index}`}
                            className="dashboard-campaign-voice-agent-question-row dashboard-campaign-voice-agent-question-row--editing"
                          >
                            <span
                              className="dashboard-campaign-voice-agent-question-index"
                              aria-hidden
                            >
                              {index + 1}
                            </span>
                            <div className="dashboard-campaign-voice-agent-question-edit-panel">
                              {topicLabel ? (
                                <span className="dashboard-campaign-voice-agent-question-topic">
                                  {topicLabel}
                                </span>
                              ) : null}
                              <label className="dashboard-campaign-voice-agent-question-field">
                                <span className="sr-only">Edit question {index + 1}</span>
                                <textarea
                                  ref={questionEditRef}
                                  value={editingQuestionDraft}
                                  onChange={(e) => setEditingQuestionDraft(e.target.value)}
                                  rows={3}
                                  placeholder="e.g. How many years of relevant experience do you have?"
                                  className={`${dashboardTextareaClass} dashboard-campaign-voice-agent-question-textarea w-full`}
                                />
                              </label>
                              <div className="dashboard-campaign-voice-agent-question-edit-actions">
                                <div
                                  className="dashboard-campaign-voice-agent-question-action-toolbar"
                                  role="group"
                                  aria-label={`Edit question ${index + 1} actions`}
                                >
                                  <button
                                    type="button"
                                    className="dashboard-campaign-voice-agent-question-action-btn dashboard-campaign-voice-agent-question-action-btn--save"
                                    onClick={saveEditingQuestion}
                                    title="Save question"
                                    aria-label={`Save question ${index + 1}`}
                                  >
                                    <MaterialIcon name="check" className="text-base" aria-hidden />
                                  </button>
                                  <span
                                    className="dashboard-campaign-voice-agent-question-action-divider"
                                    aria-hidden
                                  />
                                  <button
                                    type="button"
                                    className="dashboard-campaign-voice-agent-question-action-btn dashboard-campaign-voice-agent-question-action-btn--cancel"
                                    onClick={cancelEditingQuestion}
                                    title="Cancel editing"
                                    aria-label={`Cancel editing question ${index + 1}`}
                                  >
                                    <MaterialIcon name="close" className="text-base" aria-hidden />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li
                          key={`candidate-question-${index}`}
                          className="dashboard-campaign-voice-agent-question-row"
                        >
                          <span
                            className="dashboard-campaign-voice-agent-question-index"
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <div className="dashboard-campaign-voice-agent-question-content">
                            {topicLabel ? (
                              <span className="dashboard-campaign-voice-agent-question-topic">
                                {topicLabel}
                              </span>
                            ) : null}
                            <p
                              className={[
                                "dashboard-campaign-voice-agent-question-text",
                                displayText ? "" : "dashboard-campaign-voice-agent-question-text--empty",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {displayText || "No question text yet"}
                            </p>
                          </div>
                          {!locked ? (
                            <div
                              className="dashboard-campaign-voice-agent-question-action-toolbar"
                              role="group"
                              aria-label={`Question ${index + 1} actions`}
                            >
                              <button
                                type="button"
                                className="dashboard-campaign-voice-agent-question-action-btn dashboard-campaign-voice-agent-question-action-btn--edit"
                                onClick={() => startEditingQuestion(index)}
                                title="Edit question"
                                aria-label={`Edit question ${index + 1}`}
                              >
                                <MaterialIcon name="edit" className="text-base" aria-hidden />
                              </button>
                              <span
                                className="dashboard-campaign-voice-agent-question-action-divider"
                                aria-hidden
                              />
                              <button
                                type="button"
                                className="dashboard-campaign-voice-agent-question-action-btn dashboard-campaign-voice-agent-question-action-btn--delete"
                                onClick={() => requestDeleteCandidateQuestion(index)}
                                title="Remove question"
                                aria-label={`Remove question ${index + 1}`}
                              >
                                <MaterialIcon name="delete_outline" className="text-base" aria-hidden />
                              </button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="dashboard-campaign-voice-agent-step-section">
                <div className="dashboard-campaign-voice-agent-step-section-head">
                  <h4 className="dashboard-campaign-voice-agent-step-section-title">
                    Call schedule
                  </h4>
                  <p className="dashboard-campaign-voice-agent-field-hint m-0">
                    Configure automatic retries for contacts who don&apos;t connect.
                  </p>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={retryEnabled}
                    disabled={locked}
                    onChange={(event) => {
                      setRetryConfig(
                        event.target.checked
                          ? { ...DEFAULT_ENABLED_VOICE_CALL_RETRY_CONFIG }
                          : { ...DEFAULT_VOICE_CALL_RETRY_CONFIG }
                      );
                    }}
                  />
                  <span>
                    <span className="text-sm font-medium text-slate-800">
                      Retry when call doesn&apos;t connect
                    </span>
                    <p className="dashboard-campaign-voice-agent-field-hint mt-1.5 m-0">
                      Automatically retry contacts with status{" "}
                      <code className="dashboard-campaign-voice-agent-code">NOT_CONNECTED</code> after
                      the interval you choose.
                    </p>
                  </span>
                </label>

                {retryEnabled ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label`}>
                      Max retries
                      <select
                        value={retryConfig.maxRetryCount}
                        disabled={locked}
                        className={`${dashboardInputClass} mt-2 w-full`}
                        onChange={(event) => {
                          const maxRetryCount = Number(event.target.value);
                          setRetryConfig((prev) =>
                            normalizeVoiceCallRetryConfig({
                              ...prev,
                              maxRetryCount,
                            })
                          );
                        }}
                      >
                        {retryCountOptions.map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label`}>
                      Wait between retries
                      <select
                        value={retryConfig.retryIntervalHours}
                        disabled={locked}
                        className={`${dashboardInputClass} mt-2 w-full`}
                        onChange={(event) => {
                          const retryIntervalHours = Number(event.target.value);
                          setRetryConfig((prev) =>
                            normalizeVoiceCallRetryConfig({
                              ...prev,
                              retryIntervalHours,
                            })
                          );
                        }}
                      >
                        {VOICE_CALL_RETRY_INTERVAL_OPTIONS.map((hours) => (
                          <option key={hours} value={hours}>
                            {hours} hours
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <p className="dashboard-campaign-voice-agent-field-hint mt-4 m-0">
                    No retries — each contact is called once. Hunar may still apply your organization
                    default if configured.
                  </p>
                )}
              </div>
            </>
          ) : null}

          {setupStep === "result" ? (
            <>
              <div className="dashboard-campaign-voice-agent-result-table-wrap">
                <table className="dashboard-campaign-voice-agent-result-table">
                  <thead>
                    <tr>
                      <th scope="col" className="dashboard-campaign-voice-agent-result-col-no">
                        #
                      </th>
                      <th scope="col">Column name</th>
                      <th scope="col">Expected values</th>
                      <th
                        scope="col"
                        className="dashboard-campaign-voice-agent-result-col-action"
                        aria-label="Remove row"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {resultFields.map((row, index) => {
                      const isFixedRow = isFixedDefaultResultField(row);
                      return (
                      <tr key={`result-field-${index}`}>
                        <td className="dashboard-campaign-voice-agent-result-col-no">{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={row.columnName}
                            onChange={(e) =>
                              updateResultField(index, { columnName: e.target.value })
                            }
                            disabled={locked || isFixedRow}
                            placeholder="e.g. Interest level"
                            className={`${dashboardInputClass} dashboard-input-sm dashboard-campaign-voice-agent-result-cell-input`}
                            aria-label={`Column name row ${index + 1}`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={row.expectedValue}
                            onChange={(e) =>
                              updateResultField(index, { expectedValue: e.target.value })
                            }
                            disabled={locked}
                            placeholder="e.g. High, Medium, Low"
                            className={`${dashboardInputClass} dashboard-input-sm dashboard-campaign-voice-agent-result-cell-input`}
                            aria-label={`Expected values row ${index + 1}`}
                          />
                        </td>
                        <td className="dashboard-campaign-voice-agent-result-col-action">
                          {!isFixedRow ? (
                            <button
                              type="button"
                              className="dashboard-table-icon-btn dashboard-table-icon-btn--danger"
                              disabled={locked}
                              onClick={() => removeResultFieldRow(index)}
                              aria-label={`Remove row ${index + 1}`}
                            >
                              <MaterialIcon name="close" className="text-base" aria-hidden />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
            </div>
          </div>
        </div>
      </div>

      <footer className="dashboard-campaign-voice-agent-editor-footer">
        <div className="dashboard-campaign-voice-agent-editor-footer-start">
          {setupStep !== "call" ? (
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-proceed-btn`}
              onClick={() => setSetupStep("call")}
            >
              <MaterialIcon name="arrow_back" className="text-base" aria-hidden />
              Back
            </button>
          ) : null}
        </div>
        <div className="dashboard-campaign-voice-agent-editor-footer-end">
          {setupStep === "call" ? (
            <button
              type="button"
              className={`${dashboardBtnPrimaryClass} dashboard-campaign-voice-agent-proceed-btn`}
              disabled={!canProceedFromCallStep}
              title={
                !canProceedFromCallStep
                  ? "Complete all required call agent fields to continue"
                  : locked
                    ? "View next step"
                    : undefined
              }
              onClick={() => setSetupStep("result")}
            >
              Continue
              <MaterialIcon name="arrow_forward" className="text-base" aria-hidden />
            </button>
          ) : locked ? (
            <p className="dashboard-campaign-voice-agent-field-hint m-0 text-right">
              View only — pause the campaign to edit and save.
            </p>
          ) : (
            <button
              type="button"
              className={`${dashboardBtnPrimaryClass} dashboard-campaign-voice-agent-proceed-btn`}
              disabled={locked || !resultStepReady || saveBusy || !onSaveAndContinue}
              title={
                locked
                  ? "Campaign is locked"
                  : !resultStepReady
                    ? "Complete all required voice agent fields to save"
                    : !onSaveAndContinue
                      ? "Save is not available"
                      : undefined
              }
              onClick={() => void handleSaveAndContinue()}
            >
              <ButtonLoadingContent loading={saveBusy} loadingLabel="Saving">
                <>
                  Save and continue
                  <MaterialIcon name="arrow_forward" className="text-base" aria-hidden />
                </>
              </ButtonLoadingContent>
            </button>
          )}
        </div>
      </footer>

      {portalMounted && callPromptModalOpen
        ? createPortal(
            <div
              className="dashboard-campaign-voice-agent-prompt-modal-overlay"
              role="presentation"
              onClick={closeCallPromptModal}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="voice-call-prompt-modal-title"
                className="dashboard-campaign-voice-agent-prompt-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="dashboard-campaign-voice-agent-prompt-modal-head">
                  <h4 id="voice-call-prompt-modal-title" className="dashboard-campaign-voice-agent-prompt-modal-title">
                    Call prompt
                  </h4>
                  <button
                    type="button"
                    className="dashboard-campaign-voice-agent-prompt-modal-close"
                    aria-label="Close"
                    onClick={closeCallPromptModal}
                  >
                    <MaterialIcon name="close" className="text-xl" aria-hidden />
                  </button>
                </div>
                <div className="dashboard-campaign-voice-agent-prompt-modal-body">
                  <div
                    className="dashboard-campaign-voice-agent-prompt-modal-scroll"
                    tabIndex={0}
                    role="document"
                    aria-labelledby="voice-call-prompt-modal-title"
                  >
                    <pre className="dashboard-campaign-voice-agent-prompt-modal-content">
                      {callPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {portalMounted && pendingDeleteQuestionIndex !== null
        ? createPortal(
            <div
              className="dashboard-campaign-voice-agent-delete-modal-overlay"
              role="presentation"
              onClick={() => setPendingDeleteQuestionIndex(null)}
            >
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="voice-agent-delete-question-title"
                className="dashboard-campaign-voice-agent-delete-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <h4
                  id="voice-agent-delete-question-title"
                  className="dashboard-campaign-voice-agent-delete-modal-title"
                >
                  Delete question {pendingDeleteQuestionIndex + 1}?
                </h4>
                <p className="dashboard-campaign-voice-agent-delete-modal-message">
                  This question will be removed from the screening flow.
                </p>
                <div className="dashboard-campaign-voice-agent-delete-modal-actions">
                  <button
                    type="button"
                    className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-delete-modal-btn`}
                    onClick={() => setPendingDeleteQuestionIndex(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="dashboard-btn-danger dashboard-campaign-voice-agent-delete-modal-btn"
                    onClick={confirmDeleteCandidateQuestion}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
