"use client";

import { useState } from "react";

import { EvaluationCriteriaCard } from "@/components/dashboard/screening/EvaluationCriteriaCard";
import { VideoQuestionBuilder } from "@/components/dashboard/screening/QuestionBuilder";
import { ScreeningCandidateTable } from "@/components/dashboard/screening/ScreeningCandidateTable";
import { ScreeningReviewSummary } from "@/components/dashboard/screening/ScreeningReviewSummary";
import { ScreeningStepper } from "@/components/dashboard/screening/ScreeningStepper";
import { VideoScreeningConfig } from "@/components/dashboard/screening/VideoScreeningConfig";
import {
  mockCandidates,
  mockEvaluationCriteria,
  mockVideoQuestions,
} from "@/components/dashboard/screening/mockData";
import type {
  CandidateSource,
  EvaluationCriterion,
  ScreeningDetailsForm,
  ScreeningGoal,
  ScreeningQuestion,
} from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  SCREENING_GOAL_OPTIONS,
  screeningGoalPrompt,
} from "@/lib/screeningGoals";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

const STEPS = [
  { key: "details", label: "Details" },
  { key: "config", label: "Configure" },
  { key: "questions", label: "Questions" },
  { key: "candidates", label: "Candidates" },
  { key: "review", label: "Review" },
];

const DEFAULT_FORM: ScreeningDetailsForm = {
  name: "",
  jobTitle: "",
  companyName: "",
  location: "",
  experienceRequired: "",
  goal: "shortlist",
  jobDescription: "",
};

const DEFAULT_INSTRUCTIONS =
  "Please find a quiet place with good lighting. Answer each question clearly within the time limit. You can review your answers before submitting.";

type Props = {
  onBack: () => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  onToast: (msg: string) => void;
};

export function VideoScreeningBuilder({ onBack, onSaveDraft, onLaunch, onToast }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ScreeningDetailsForm>(DEFAULT_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>(["c1", "c2", "c3"]);
  const [source, setSource] = useState<CandidateSource>("outreach_interested");
  const [language, setLanguage] = useState("english");
  const [responseTime, setResponseTime] = useState("1 minute");
  const [retakeAllowed, setRetakeAllowed] = useState(true);
  const [retakeCount, setRetakeCount] = useState(2);
  const [deadline, setDeadline] = useState("48 hours");
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [emailReminder, setEmailReminder] = useState(true);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [consentMessage, setConsentMessage] = useState(true);
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(
    () => mockVideoQuestions.map((q) => ({ ...q }))
  );
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(
    () => mockEvaluationCriteria.map((c) => ({ ...c }))
  );

  const canNext =
    (step === 0 && form.name.trim()) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && selectedIds.length > 0);

  const goNext = () => step < STEPS.length - 1 && setStep((s) => s + 1);
  const goBack = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  const enabledCriteria = criteria.filter((c) => c.enabled).map((c) => c.label).join(", ");

  return (
    <div
      className={`dashboard-screening-builder${
        step === 4 ? " dashboard-screening-builder--on-review" : ""
      }`}
    >
      <header className="dashboard-screening-builder-header">
        <button type="button" className="dashboard-screening-back-btn" onClick={goBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          {step === 0 ? "Back to screening" : "Previous step"}
        </button>
        <div className="dashboard-screening-builder-header-copy">
          <h1 className="dashboard-section-title">AI Video Screening</h1>
          {step < 4 ? (
            <p className="dashboard-text-body">
              Step {step + 1} of {STEPS.length}
            </p>
          ) : null}
        </div>
      </header>

      {step < 4 ? (
        <ScreeningStepper steps={STEPS} currentStep={step} onStepClick={setStep} />
      ) : null}

      <div className="dashboard-screening-builder-body">
        {step === 0 ? (
          <div className="dashboard-screening-form-grid">
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="vid-name">Screening name</label>
              <input id="vid-name" className={dashboardInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="vid-job">Job title</label>
              <input id="vid-job" className={dashboardInputClass} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="vid-co">Company name</label>
              <input id="vid-co" className={dashboardInputClass} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="vid-loc">Job location</label>
              <input id="vid-loc" className={dashboardInputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="vid-exp">Experience required</label>
              <input id="vid-exp" className={dashboardInputClass} value={form.experienceRequired} onChange={(e) => setForm({ ...form, experienceRequired: e.target.value })} />
            </div>
            <div className="dashboard-screening-field dashboard-screening-field--full">
              <label className={dashboardLabelClass} htmlFor="vid-goal">Screening goal</label>
              <select id="vid-goal" className={dashboardSelectClass} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as ScreeningGoal })}>
                {SCREENING_GOAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="dashboard-screening-goal-prompt" aria-live="polite">
                <p className="dashboard-screening-goal-prompt-label">Call objective preview</p>
                <p className="dashboard-screening-goal-prompt-text">
                  {screeningGoalPrompt(form.goal, {
                    jobTitle: form.jobTitle,
                    companyName: form.companyName,
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <VideoScreeningConfig
            language={language}
            onLanguageChange={setLanguage}
            responseTime={responseTime}
            onResponseTimeChange={setResponseTime}
            retakeAllowed={retakeAllowed}
            onRetakeAllowedChange={setRetakeAllowed}
            retakeCount={retakeCount}
            onRetakeCountChange={setRetakeCount}
            deadline={deadline}
            onDeadlineChange={setDeadline}
            whatsappReminder={whatsappReminder}
            onWhatsappReminderChange={setWhatsappReminder}
            emailReminder={emailReminder}
            onEmailReminderChange={setEmailReminder}
            instructions={instructions}
            onInstructionsChange={setInstructions}
            consentMessage={consentMessage}
            onConsentMessageChange={setConsentMessage}
          />
        ) : null}

        {step === 2 ? (
          <>
            <VideoQuestionBuilder
              questions={questions}
              onQuestionsChange={setQuestions}
              onGenerateAi={() => onToast("AI video questions generated (UI preview)")}
            />
            <EvaluationCriteriaCard criteria={criteria} onChange={setCriteria} />
          </>
        ) : null}

        {step === 3 ? (
          <ScreeningCandidateTable
            candidates={mockCandidates}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            source={source}
            onSourceChange={setSource}
          />
        ) : null}

        {step === 4 ? (
          <ScreeningReviewSummary
            name={form.name}
            jobTitle={form.jobTitle}
            type="video"
            candidateCount={selectedIds.length}
            questionsCount={questions.length}
            extras={[
              { label: "Time per question", value: responseTime },
              { label: "Deadline", value: deadline },
              {
                label: "Reminders",
                value:
                  [whatsappReminder && "WhatsApp", emailReminder && "Email"]
                    .filter(Boolean)
                    .join(", ") || "None",
              },
              { label: "Evaluation criteria", value: enabledCriteria || "—" },
            ]}
            onBack={goBack}
            onSaveDraft={onSaveDraft}
            onLaunch={onLaunch}
            launchLabel="Launch video screening"
          />
        ) : null}
      </div>

      {step < 4 ? (
        <footer className="dashboard-screening-builder-footer">
          <button type="button" className={dashboardBtnSecondaryClass} onClick={goBack}>Back</button>
          <button type="button" className={dashboardBtnPrimaryClass} onClick={goNext} disabled={!canNext}>Continue</button>
        </footer>
      ) : null}
    </div>
  );
}
