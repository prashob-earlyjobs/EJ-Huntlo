"use client";

import { useState } from "react";

import { ScreeningCandidateTable } from "@/components/dashboard/screening/ScreeningCandidateTable";
import { VoiceQuestionBuilder } from "@/components/dashboard/screening/QuestionBuilder";
import { ScreeningReviewSummary } from "@/components/dashboard/screening/ScreeningReviewSummary";
import { ScreeningStepper } from "@/components/dashboard/screening/ScreeningStepper";
import { VoiceScreeningConfig } from "@/components/dashboard/screening/VoiceScreeningConfig";
import {
  mockCandidates,
  mockVoiceQuestions,
  mockVoiceScript,
} from "@/components/dashboard/screening/mockData";
import type {
  CallLanguage,
  CandidateSource,
  ScreeningDetailsForm,
  ScreeningGoal,
  ScreeningQuestion,
  VoiceScriptSections,
  VoiceTone,
} from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

const STEPS = [
  { key: "details", label: "Details" },
  { key: "candidates", label: "Candidates" },
  { key: "config", label: "Configure" },
  { key: "questions", label: "Questions" },
  { key: "review", label: "Review" },
];

const DEFAULT_FORM: ScreeningDetailsForm = {
  name: "",
  jobTitle: "",
  companyName: "",
  location: "",
  experienceRequired: "",
  goal: "interest",
};

type Props = {
  onBack: () => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  onToast: (msg: string) => void;
};

export function VoiceScreeningBuilder({ onBack, onSaveDraft, onLaunch, onToast }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ScreeningDetailsForm>(DEFAULT_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>(["c1", "c2"]);
  const [source, setSource] = useState<CandidateSource>("talent_pool");
  const [language, setLanguage] = useState<CallLanguage>("english");
  const [voiceTone, setVoiceTone] = useState<VoiceTone>("professional");
  const [attempts, setAttempts] = useState(2);
  const [attemptGap, setAttemptGap] = useState("4 hours");
  const [durationLimit, setDurationLimit] = useState("5 minutes");
  const [autoFollowUp, setAutoFollowUp] = useState(true);
  const [consentMessage, setConsentMessage] = useState(true);
  const [script, setScript] = useState<VoiceScriptSections>({ ...mockVoiceScript });
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(
    () => mockVoiceQuestions.map((q) => ({ ...q }))
  );

  const canNext =
    (step === 0 && form.name.trim()) ||
    (step === 1 && selectedIds.length > 0) ||
    step >= 2;

  const goNext = () => step < STEPS.length - 1 && setStep((s) => s + 1);
  const goBack = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  return (
    <div className="dashboard-screening-builder">
      <header className="dashboard-screening-builder-header">
        <button type="button" className="dashboard-screening-back-btn" onClick={goBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          {step === 0 ? "Back to screening" : "Previous step"}
        </button>
        <div>
          <h1 className="dashboard-section-title">AI Voice Screening</h1>
          <p className="dashboard-text-body">Step {step + 1} of {STEPS.length}</p>
        </div>
      </header>

      <ScreeningStepper steps={STEPS} currentStep={step} onStepClick={setStep} />

      <div className="dashboard-screening-builder-body">
        {step === 0 ? (
          <div className="dashboard-screening-form-grid">
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="v-name">Screening name</label>
              <input id="v-name" className={dashboardInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="v-job">Job title</label>
              <input id="v-job" className={dashboardInputClass} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="v-co">Company name</label>
              <input id="v-co" className={dashboardInputClass} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="v-loc">Job location</label>
              <input id="v-loc" className={dashboardInputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="dashboard-screening-field">
              <label className={dashboardLabelClass} htmlFor="v-exp">Experience required</label>
              <input id="v-exp" className={dashboardInputClass} value={form.experienceRequired} onChange={(e) => setForm({ ...form, experienceRequired: e.target.value })} placeholder="e.g. 3+ years" />
            </div>
            <div className="dashboard-screening-field dashboard-screening-field--full">
              <label className={dashboardLabelClass} htmlFor="v-goal">Screening goal</label>
              <select id="v-goal" className={dashboardSelectClass} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as ScreeningGoal })}>
                <option value="interest">Check candidate interest</option>
                <option value="eligibility">Verify basic eligibility</option>
                <option value="communication">Evaluate communication</option>
                <option value="shortlist">Shortlist for interview</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <ScreeningCandidateTable
            candidates={mockCandidates}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            source={source}
            onSourceChange={setSource}
          />
        ) : null}

        {step === 2 ? (
          <VoiceScreeningConfig
            language={language}
            onLanguageChange={setLanguage}
            voiceTone={voiceTone}
            onVoiceToneChange={setVoiceTone}
            attempts={attempts}
            onAttemptsChange={setAttempts}
            attemptGap={attemptGap}
            onAttemptGapChange={setAttemptGap}
            durationLimit={durationLimit}
            onDurationLimitChange={setDurationLimit}
            autoFollowUp={autoFollowUp}
            onAutoFollowUpChange={setAutoFollowUp}
            consentMessage={consentMessage}
            onConsentMessageChange={setConsentMessage}
          />
        ) : null}

        {step === 3 ? (
          <VoiceQuestionBuilder
            script={script}
            onScriptChange={setScript}
            questions={questions}
            onQuestionsChange={setQuestions}
            onGenerateAi={() => onToast("AI questions generated (UI preview)")}
          />
        ) : null}

        {step === 4 ? (
          <ScreeningReviewSummary
            name={form.name}
            type="voice"
            candidateCount={selectedIds.length}
            questionsCount={questions.length}
            extras={[
              { label: "Language", value: language },
              { label: "Attempts", value: String(attempts) },
              { label: "Est. duration", value: durationLimit },
              { label: "Consent", value: consentMessage ? "Enabled" : "Disabled" },
            ]}
            onSaveDraft={onSaveDraft}
            onLaunch={onLaunch}
            launchLabel="Launch voice screening"
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
