"use client";

import { useMemo, useLayoutEffect, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  VOICE_AGENT_PROMPT_VARIABLES,
  VOICE_CALL_PROMPT_ADDITIONAL_QUESTIONS_HEADER,
  buildResultPromptFromFields,
  mergeAdditionalQuestionsIntoCallPrompt,
  mergeScreeningQuestionsIntoResultFields,
  parseAdditionalQuestionsFromCallPrompt,
  voiceAgentVariableHint,
} from "@/lib/voiceAgentPrompt";
import type { VoiceAgentConfigRecord } from "@/lib/campaigns";
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
const MAX_RESULT_AGENT_ROWS = 12;
const MAX_CANDIDATE_QUESTIONS = 10;

type VoiceAgentSetupStep = "call" | "questions" | "result";

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
    lead: "Set the objective, opening line, and agent instructions.",
  },
  {
    id: "questions",
    label: "Questions",
    title: "Screening questions",
    lead: `Optional — up to ${MAX_CANDIDATE_QUESTIONS} questions for interested candidates.`,
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
};

function createEmptyResultFieldRow(): ResultAgentFieldRow {
  return { columnName: "", expectedValue: "" };
}

const DEFAULT_RESULT_AGENT_FIELDS: ResultAgentFieldRow[] = [
  { columnName: "summary", expectedValue: "under 50 words" },
  {
    columnName: "candidate_status",
    expectedValue: "Confirmed Candidate, Wrong Person, Unable To Verify, or Call Disconnected",
  },
  {
    columnName: "interest_level",
    expectedValue: "Interested, Not Interested, Requested Callback, or Unclear",
  },
  { columnName: "callback_requested", expectedValue: "Yes or No" },
  { columnName: "callback_time", expectedValue: "callback time or Not provided" },
  { columnName: "candidate_questions", expectedValue: "array of question strings" },
  {
    columnName: "final_outcome",
    expectedValue:
      "Interested, Not Interested, Callback Scheduled, Wrong Person, Incomplete Call, or Unable To Determine",
  },
];

function voiceAgentFieldsFromConfig(
  config?: VoiceAgentConfigRecord | null
): ResultAgentFieldRow[] {
  if (config?.resultFields?.length) {
    return config.resultFields.map((row) => ({ ...row }));
  }
  return DEFAULT_RESULT_AGENT_FIELDS.map((row) => ({ ...row }));
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
  initialConfig?: VoiceAgentConfigRecord | null;
  onSaveAndContinue?: (payload: VoiceAgentEditorPayload) => void | Promise<void>;
};

export function CampaignVoiceAgentEditor({
  locked = false,
  outreachStatus = "idle",
  initialConfig = null,
  onSaveAndContinue,
}: Props) {
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
    parseAdditionalQuestionsFromCallPrompt(initialCallPrompt)
  );
  const [resultFields, setResultFields] = useState<ResultAgentFieldRow[]>(() =>
    voiceAgentFieldsFromConfig(initialConfig)
  );
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const callPromptRef = useRef<HTMLTextAreaElement>(null);
  const callPromptInsertMetaRef = useRef<{
    cursor: number;
    scrollTop: number | "bottom";
  } | null>(null);

  useEffect(() => setPortalMounted(true), []);

  useEffect(() => {
    setCallPrompt((prev) => mergeAdditionalQuestionsIntoCallPrompt(prev, candidateQuestions));
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
    if (!callPromptModalOpen) return;
    const frame = window.requestAnimationFrame(() => callPromptRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [callPromptModalOpen]);

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
    if (locked || resultFields.length <= 1) return;
    setResultFields((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const addCandidateQuestion = () => {
    if (locked || candidateQuestions.length >= MAX_CANDIDATE_QUESTIONS) return;
    setCandidateQuestions((prev) => [...prev, ""]);
  };

  const updateCandidateQuestion = (index: number, value: string) => {
    setCandidateQuestions((prev) =>
      prev.map((question, questionIndex) => (questionIndex === index ? value : question))
    );
  };

  const removeCandidateQuestion = (index: number) => {
    if (locked) return;
    setCandidateQuestions((prev) => prev.filter((_, questionIndex) => questionIndex !== index));
  };

  const closeCallPromptModal = () => {
    setCandidateQuestions(parseAdditionalQuestionsFromCallPrompt(callPrompt));
    setCallPromptModalOpen(false);
  };

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

  const filledCandidateQuestions = useMemo(
    () => candidateQuestions.map((question) => question.trim()).filter(Boolean),
    [candidateQuestions]
  );

  const setupStepIndex = SETUP_STEPS.findIndex((step) => step.id === setupStep);
  const currentStep = SETUP_STEPS[setupStepIndex] ?? SETUP_STEPS[0];

  const goToSetupStep = (step: VoiceAgentSetupStep) => {
    setSetupStep(step);
  };

  const canProceedFromCallStep = locked || callStepReady;

  const buildPayload = (): VoiceAgentEditorPayload => {
    const mergedResultFields = mergeScreeningQuestionsIntoResultFields(
      filledCandidateQuestions,
      resultFields.map((row) => ({
        columnName: row.columnName.trim(),
        expectedValue: row.expectedValue.trim(),
      }))
    );

    return {
      callObjective: trimmedCallObjective,
      introductoryStatement: trimmedIntroductoryStatement,
      callPrompt: mergeAdditionalQuestionsIntoCallPrompt(trimmedCallPrompt, candidateQuestions),
      resultFields: mergedResultFields,
      resultPrompt: buildResultPromptFromFields(mergedResultFields),
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

  const insertCallPromptVariable = (variable: string) => {
    if (locked) return;
    const token = `{${variable}}`;
    const el = callPromptRef.current;
    if (!el) {
      setCallPrompt((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? callPrompt.length;
    const end = el.selectionEnd ?? callPrompt.length;
    const insertingAtEnd = start === callPrompt.length && end === callPrompt.length;
    const next = callPrompt.slice(0, start) + token + callPrompt.slice(end);
    callPromptInsertMetaRef.current = {
      cursor: start + token.length,
      scrollTop: insertingAtEnd ? "bottom" : el.scrollTop,
    };
    setCallPrompt(next);
  };

  useLayoutEffect(() => {
    const meta = callPromptInsertMetaRef.current;
    const el = callPromptRef.current;
    if (!meta || !el) return;
    callPromptInsertMetaRef.current = null;
    el.focus();
    el.setSelectionRange(meta.cursor, meta.cursor);
    if (meta.scrollTop === "bottom") {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTop = meta.scrollTop;
    }
  }, [callPrompt]);

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
            <header className="dashboard-campaign-voice-agent-step-panel-head">
              <h3 className="dashboard-campaign-voice-agent-step-panel-title">
                {currentStep.title}
              </h3>
              <p className="dashboard-campaign-voice-agent-step-panel-lead">{currentStep.lead}</p>
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
                  <MaterialIcon
                    name={locked ? "visibility" : "edit"}
                    className="shrink-0 text-base"
                    aria-hidden
                  />
                </button>
              </div>
            </>
          ) : null}

          {setupStep === "questions" ? (
            <>
              <div className="dashboard-campaign-voice-agent-questions-toolbar">
                <p className="dashboard-campaign-voice-agent-field-hint m-0">
                  {filledCandidateQuestions.length} / {MAX_CANDIDATE_QUESTIONS} questions
                </p>
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

              {candidateQuestions.length === 0 ? (
                <div className="dashboard-campaign-voice-agent-questions-empty">
                  <p className="dashboard-campaign-voice-agent-questions-empty-text m-0">
                    No questions added. Skip this step or add screening questions for interested
                    candidates.
                  </p>
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
              ) : (
                <ul className="dashboard-campaign-voice-agent-questions-list">
                  {candidateQuestions.map((question, index) => (
                    <li
                      key={`candidate-question-${index}`}
                      className="dashboard-campaign-voice-agent-question-row"
                    >
                      <span className="dashboard-campaign-voice-agent-question-index" aria-hidden>
                        {index + 1}
                      </span>
                      <label className="dashboard-campaign-voice-agent-question-field">
                        <span className="sr-only">Question {index + 1}</span>
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => updateCandidateQuestion(index, e.target.value)}
                          disabled={locked}
                          placeholder="e.g. Are you open to relocating for this role?"
                          className={`${dashboardInputClass} dashboard-input-sm w-full`}
                        />
                      </label>
                      <button
                        type="button"
                        className="dashboard-table-icon-btn dashboard-table-icon-btn--danger"
                        disabled={locked}
                        onClick={() => removeCandidateQuestion(index)}
                        aria-label={`Remove question ${index + 1}`}
                      >
                        <MaterialIcon name="close" className="text-base" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}

          {setupStep === "result" ? (
            <>
              <div className="dashboard-campaign-voice-agent-questions-toolbar">
                <p className="dashboard-campaign-voice-agent-field-hint m-0">
                  Up to {MAX_RESULT_AGENT_ROWS} columns
                </p>
                <button
                  type="button"
                  className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-result-add-btn`}
                  disabled={locked || resultFields.length >= MAX_RESULT_AGENT_ROWS}
                  onClick={addResultFieldRow}
                >
                  <MaterialIcon name="add" className="text-base" aria-hidden />
                  Add row
                </button>
              </div>

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
                    {resultFields.map((row, index) => (
                      <tr key={`result-field-${index}`}>
                        <td className="dashboard-campaign-voice-agent-result-col-no">{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={row.columnName}
                            onChange={(e) =>
                              updateResultField(index, { columnName: e.target.value })
                            }
                            disabled={locked}
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
                          <button
                            type="button"
                            className="dashboard-table-icon-btn dashboard-table-icon-btn--danger"
                            disabled={locked || resultFields.length <= 1}
                            onClick={() => removeResultFieldRow(index)}
                            aria-label={`Remove row ${index + 1}`}
                          >
                            <MaterialIcon name="close" className="text-base" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
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
              onClick={() =>
                setSetupStep(setupStep === "result" ? "questions" : "call")
              }
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
              onClick={() => setSetupStep("questions")}
            >
              Continue
              <MaterialIcon name="arrow_forward" className="text-base" aria-hidden />
            </button>
          ) : setupStep === "questions" ? (
            <button
              type="button"
              className={`${dashboardBtnPrimaryClass} dashboard-campaign-voice-agent-proceed-btn`}
              disabled={!canProceedFromCallStep}
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
              {saveBusy ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  Save and continue
                  <MaterialIcon name="arrow_forward" className="text-base" aria-hidden />
                </>
              )}
            </button>
          )}
        </div>
      </footer>

      {portalMounted && callPromptModalOpen
        ? createPortal(
            <div
              className="dashboard-modal-overlay z-[130] py-6"
              role="presentation"
              onClick={closeCallPromptModal}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="voice-call-prompt-modal-title"
                className="dashboard-modal dashboard-campaign-voice-agent-prompt-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="dashboard-campaign-voice-agent-prompt-modal-head">
                  <h4 id="voice-call-prompt-modal-title" className="dashboard-campaign-voice-agent-prompt-modal-title">
                    {locked ? "View call prompt" : "Edit call prompt"}
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
                <p
                  id="voice-call-prompt-modal-hint"
                  className="dashboard-campaign-voice-agent-field-hint dashboard-campaign-voice-agent-field-hint--compact m-0"
                >
                  {locked
                    ? "Read-only view of the agent instructions saved for this campaign."
                    : "Customize the full agent instructions. Placeholders resolve when you save the agent."}
                </p>
                <textarea
                  ref={callPromptRef}
                  value={callPrompt}
                  onChange={(e) => setCallPrompt(e.target.value)}
                  disabled={locked}
                  minLength={MIN_CALL_PROMPT_CHARS}
                  rows={18}
                  placeholder="Describe the agent persona, conversation context, and step-by-step call flow…"
                  className={`${dashboardTextareaClass} dashboard-campaign-jd-textarea dashboard-campaign-voice-agent-prompt-textarea dashboard-campaign-voice-agent-prompt-modal-textarea mt-3 w-full`}
                  aria-describedby={
                    locked ? "voice-call-prompt-modal-hint" : "voice-call-prompt-modal-variables"
                  }
                />
                {!locked ? (
                  <div
                    id="voice-call-prompt-modal-variables"
                    className="dashboard-campaign-voice-agent-variable-chips"
                  >
                    <div className="dashboard-campaign-voice-agent-variable-chips-row">
                      {VOICE_AGENT_PROMPT_VARIABLES.map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          title={voiceAgentVariableHint(variable)}
                          onClick={() => insertCallPromptVariable(variable)}
                          className="dashboard-campaign-voice-agent-variable-chip"
                        >
                          {variable}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="dashboard-campaign-voice-agent-prompt-modal-actions">
                  <button
                    type="button"
                    className={`${dashboardBtnPrimaryClass} dashboard-campaign-voice-agent-prompt-modal-done`}
                    disabled={!locked && trimmedCallPrompt.length < MIN_CALL_PROMPT_CHARS}
                    onClick={closeCallPromptModal}
                  >
                    {locked ? "Close" : "Done"}
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
