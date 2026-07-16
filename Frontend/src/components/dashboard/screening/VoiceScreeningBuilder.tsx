"use client";

import { useCallback, useEffect, useState } from "react";

import { ScreeningCandidateTable } from "@/components/dashboard/screening/ScreeningCandidateTable";
import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import { VoiceQuestionBuilder } from "@/components/dashboard/screening/QuestionBuilder";
import { ScreeningReviewSummary } from "@/components/dashboard/screening/ScreeningReviewSummary";
import { ScreeningStepper } from "@/components/dashboard/screening/ScreeningStepper";
import { VoiceScreeningConfig } from "@/components/dashboard/screening/VoiceScreeningConfig";
import {
  mockVoiceQuestions,
  mockVoiceScript,
} from "@/components/dashboard/screening/mockData";
import type {
  CallLanguage,
  CandidateSource,
  ScreeningCandidate,
  ScreeningDetailsForm,
  ScreeningQuestion,
  VoiceScriptSections,
  VoiceTone,
} from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { fetchScreeningDraft, type ScreeningDraft, type VoiceScreeningPayload } from "@/lib/screeningApi";
import {
  fetchOutreachModuleCandidatePool,
  importOutreachModuleCandidatesCsv,
  type OutreachCsvImportContact,
} from "@/lib/outreachModuleCampaignsApi";
import type { OutreachCandidate } from "@/components/dashboard/outreach/types";
import { mergeCsvContactsIntoCandidates } from "@/components/dashboard/outreach/mergeCsvContactsIntoCandidates";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

const MIN_JD_LENGTH = 20;

const STEPS = [
  { key: "details", label: "Job description" },
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
  goal: "interest",
  jobDescription: "",
};

function screeningDisplayName(jobTitle: string): string {
  const title = jobTitle.trim();
  return title ? `${title} screening` : "Voice screening";
}

function titleCase(value: string): string {
  const s = value.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

type Props = {
  onBack: () => void;
  onSaveDraft: (payload: VoiceScreeningPayload) => void | Promise<void>;
  onLaunch: (payload: VoiceScreeningPayload) => Promise<string>;
  onLaunchSuccess: (screeningId: string) => void;
  onToast: (msg: string) => void;
  submitting?: boolean;
  /** When set, the builder loads this draft screening and resumes where it left off. */
  draftId?: string;
};

function resumeStepForDraft(draft: ScreeningDraft): number {
  if (
    !draft.details.jobTitle.trim() ||
    draft.details.jobDescription.trim().length < MIN_JD_LENGTH
  ) {
    return 0;
  }
  if (draft.candidateIds.length === 0) return 3;
  return 4;
}

function buildPayload(state: {
  form: ScreeningDetailsForm;
  selectedIds: string[];
  source: CandidateSource;
  language: CallLanguage;
  voiceTone: VoiceTone;
  attempts: number;
  attemptGap: string;
  durationLimit: string;
  script: VoiceScriptSections;
  questions: ScreeningQuestion[];
  launch: boolean;
}): VoiceScreeningPayload {
  return {
    details: state.form,
    candidateIds: state.selectedIds,
    candidateSource: state.source,
    language: state.language,
    voiceTone: state.voiceTone,
    attempts: state.attempts,
    attemptGap: state.attemptGap,
    durationLimit: state.durationLimit,
    script: state.script,
    questions: state.questions,
    launch: state.launch,
  };
}

function toScreeningCandidate(candidate: OutreachCandidate): ScreeningCandidate {
  return {
    id: candidate.id,
    name: candidate.name,
    role: candidate.role,
    location: candidate.location,
    experience: candidate.experience,
    matchScore: candidate.matchScore,
    status: candidate.status,
    phone: candidate.phone,
    email: candidate.email,
  };
}

export function VoiceScreeningBuilder({
  onBack,
  onSaveDraft,
  onLaunch,
  onLaunchSuccess,
  onToast,
  submitting = false,
  draftId,
}: Props) {
  const [step, setStep] = useState(0);
  const [draftLoading, setDraftLoading] = useState(Boolean(draftId));
  const [launching, setLaunching] = useState(false);
  const [form, setForm] = useState<ScreeningDetailsForm>(DEFAULT_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [source, setSource] = useState<CandidateSource>("talent_pool");
  const [language, setLanguage] = useState<CallLanguage>("english");
  const [voiceTone, setVoiceTone] = useState<VoiceTone>("professional");
  const [attempts, setAttempts] = useState(2);
  const [attemptGap, setAttemptGap] = useState("4 hours");
  const [durationLimit, setDurationLimit] = useState("5 minutes");
  const [script, setScript] = useState<VoiceScriptSections>({ ...mockVoiceScript });
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(
    () => mockVoiceQuestions.map((q) => ({ ...q }))
  );
  const [poolCandidates, setPoolCandidates] = useState<ScreeningCandidate[]>([]);
  const [csvCandidates, setCsvCandidates] = useState<ScreeningCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState("");

  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;

    const loadDraft = async () => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setDraftLoading(false);
        onToast("Please sign in again");
        return;
      }
      setDraftLoading(true);
      try {
        const { draft } = await fetchScreeningDraft(auth.token, draftId);
        if (cancelled) return;
        setForm({ ...DEFAULT_FORM, ...draft.details });
        setSelectedIds(draft.candidateIds);
        // CSV imports live in the candidate pool, so restore csv drafts from there.
        setSource(draft.candidateSource === "csv" ? "talent_pool" : draft.candidateSource);
        setLanguage(draft.language);
        setVoiceTone(draft.voiceTone);
        setAttempts(draft.attempts);
        setAttemptGap(draft.attemptGap);
        if (draft.durationLimit) setDurationLimit(draft.durationLimit);
        setScript({ ...mockVoiceScript, ...draft.script });
        if (draft.questions.length > 0) {
          setQuestions(draft.questions.map((q) => ({ ...q })));
        }
        setStep(resumeStepForDraft(draft));
      } catch (err) {
        if (!cancelled) {
          onToast(err instanceof Error ? err.message : "Could not load draft screening");
        }
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    };

    void loadDraft();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const loadPoolCandidates = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setCandidatesError("Sign in to load candidates.");
      setPoolCandidates([]);
      return;
    }
    setCandidatesLoading(true);
    setCandidatesError("");
    try {
      const poolSource =
        source === "outreach_interested" ? "outreach_interested" : "talent_pool";
      const pool = await fetchOutreachModuleCandidatePool(auth.token, { source: poolSource });
      setPoolCandidates(pool.map(toScreeningCandidate));
    } catch (err) {
      setCandidatesError(err instanceof Error ? err.message : "Could not load candidates");
      setPoolCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, [source]);

  useEffect(() => {
    if (source === "csv") return;
    void loadPoolCandidates();
  }, [source, loadPoolCandidates]);

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
    const imported = mergeCsvContactsIntoCandidates(result.candidates, contacts).map(
      toScreeningCandidate
    );
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

  const payloadState = {
    form,
    selectedIds,
    source,
    language,
    voiceTone,
    attempts,
    attemptGap,
    durationLimit,
    script,
    questions,
  };

  const canNext =
    (step === 0 &&
      form.jobTitle.trim() &&
      form.jobDescription.trim().length >= MIN_JD_LENGTH) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && selectedIds.length > 0);

  const goNext = () => step < STEPS.length - 1 && setStep((s) => s + 1);
  const goBack = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  const handleLaunch = async () => {
    if (launching || submitting) return;
    setLaunching(true);
    const overlayStartedAt = Date.now();
    try {
      const screeningId = await onLaunch(buildPayload({ ...payloadState, launch: true }));
      const elapsed = Date.now() - overlayStartedAt;
      if (elapsed < LAUNCH_AGENT_MIN_DURATION_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, LAUNCH_AGENT_MIN_DURATION_MS - elapsed)
        );
      }
      onLaunchSuccess(screeningId);
    } catch {
      // Error toast is shown by ScreeningPanel.persistScreening.
    } finally {
      setLaunching(false);
    }
  };

  const launchBusy = launching || submitting;

  if (draftLoading) {
    return (
      <div className="dashboard-screening-builder">
        <header className="dashboard-screening-builder-header">
          <button type="button" className="dashboard-screening-back-btn" onClick={onBack}>
            <MaterialIcon name="arrow_back" className="text-sm" />
            Back to screening
          </button>
          <div className="dashboard-screening-builder-header-copy">
            <h1 className="dashboard-section-title">AI Voice Screening</h1>
            <p className="dashboard-text-body">Loading draft…</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div
      className={`dashboard-screening-builder${
        step === 4 ? " dashboard-screening-builder--on-review" : ""
      }${launchBusy ? " dashboard-screening-builder--launching" : ""}`}
    >
      <CampaignLaunchAgentOverlay open={launching} channel="voice" />
      <header className="dashboard-screening-builder-header">
        <button type="button" className="dashboard-screening-back-btn" onClick={goBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          {step === 0 ? "Back to screening" : "Previous step"}
        </button>
        <div className="dashboard-screening-builder-header-copy">
          <h1 className="dashboard-section-title">AI Voice Screening</h1>
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
            <div className="dashboard-screening-field dashboard-screening-field--full">
              <label className={dashboardLabelClass} htmlFor="v-job">
                Job title
              </label>
              <input
                id="v-job"
                className={dashboardInputClass}
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="e.g. MERN Developer"
              />
            </div>
            <div className="dashboard-screening-field dashboard-screening-field--full">
              <label className={dashboardLabelClass} htmlFor="v-jd">
                Job description
              </label>
              <textarea
                id="v-jd"
                className={dashboardTextareaClass}
                rows={12}
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                placeholder="Paste the full job description. AI will use this to generate screening questions and personalize the voice call."
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
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
          />
        ) : null}

        {step === 2 ? (
          <VoiceQuestionBuilder
            script={script}
            onScriptChange={setScript}
            questions={questions}
            onQuestionsChange={setQuestions}
          />
        ) : null}

        {step === 3 ? (
          <ScreeningCandidateTable
            candidates={displayCandidates}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            source={source}
            onSourceChange={handleSourceChange}
            loading={candidatesLoading}
            error={candidatesError}
            onCsvImport={handleCsvImport}
            onDeleteSelected={handleDeleteSelected}
          />
        ) : null}

        {step === 4 ? (
          <ScreeningReviewSummary
            name={screeningDisplayName(form.jobTitle)}
            jobTitle={form.jobTitle}
            type="voice"
            candidateCount={selectedIds.length}
            questionsCount={questions.length}
            extras={[
              { label: "Call language", value: titleCase(language) },
              { label: "Voice tone", value: titleCase(voiceTone) },
              {
                label: "Call attempts",
                value: `${attempts} ${attempts === 1 ? "attempt" : "attempts"} · ${attemptGap} gap`,
              },
              { label: "Duration limit", value: durationLimit },
            ]}
            onBack={goBack}
            onSaveDraft={() => onSaveDraft(buildPayload({ ...payloadState, launch: false }))}
            onLaunch={() => void handleLaunch()}
            launchLabel={launchBusy ? "Launching…" : "Launch voice screening"}
            launchDisabled={launchBusy}
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
