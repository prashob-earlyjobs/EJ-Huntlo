"use client";

import type { ScreeningQuestion, VoiceScriptSections } from "@/components/dashboard/screening/types";
import { SCRIPT_VARIABLES } from "@/components/dashboard/screening/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

function uid() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

type QuestionCardProps = {
  question: ScreeningQuestion;
  index: number;
  showResponseTime?: boolean;
  onChange: (q: ScreeningQuestion) => void;
  onRemove: () => void;
};

export function QuestionCard({
  question,
  index,
  showResponseTime,
  onChange,
  onRemove,
}: QuestionCardProps) {
  return (
    <div className="dashboard-screening-question-card">
      <div className="dashboard-screening-question-card-head">
        <strong>Question {index + 1}</strong>
        <label className="dashboard-screening-question-required">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onChange({ ...question, required: e.target.checked })}
          />
          Required
        </label>
        <button
          type="button"
          className="dashboard-screening-icon-btn dashboard-screening-icon-btn--danger"
          onClick={onRemove}
          aria-label="Remove question"
        >
          <MaterialIcon name="delete" className="text-sm" />
        </button>
      </div>
      <div className="dashboard-screening-field">
        <label className={dashboardLabelClass}>Question text</label>
        <textarea
          className={dashboardTextareaClass}
          rows={2}
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
        />
      </div>
      {question.hint !== undefined || !showResponseTime ? (
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass}>
            {showResponseTime ? "Evaluation criteria" : "Expected answer / evaluation hint"}
          </label>
          <input
            className={dashboardInputClass}
            value={question.hint ?? question.criteriaTag ?? ""}
            onChange={(e) =>
              onChange({
                ...question,
                ...(showResponseTime ? { criteriaTag: e.target.value } : { hint: e.target.value }),
              })
            }
          />
        </div>
      ) : null}
      <div className="dashboard-screening-question-meta">
        {!showResponseTime && question.criteriaTag ? (
          <span className="dashboard-screening-criteria-tag">{question.criteriaTag}</span>
        ) : null}
        <div className="dashboard-screening-field dashboard-screening-field--inline">
          <label className={dashboardLabelClass}>Weight</label>
          <input
            type="number"
            min={1}
            max={100}
            className="dashboard-input dashboard-input-sm"
            value={question.weight}
            onChange={(e) => onChange({ ...question, weight: Number(e.target.value) })}
          />
        </div>
        {showResponseTime ? (
          <div className="dashboard-screening-field dashboard-screening-field--inline">
            <label className={dashboardLabelClass}>Time limit</label>
            <select
              className="dashboard-select"
              value={question.responseTimeLimit ?? "1 minute"}
              onChange={(e) => onChange({ ...question, responseTimeLimit: e.target.value })}
            >
              <option value="30 seconds">30 sec</option>
              <option value="1 minute">1 min</option>
              <option value="2 minutes">2 min</option>
              <option value="3 minutes">3 min</option>
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type VoiceProps = {
  script: VoiceScriptSections;
  onScriptChange: (s: VoiceScriptSections) => void;
  questions: ScreeningQuestion[];
  onQuestionsChange: (q: ScreeningQuestion[]) => void;
};

export function VoiceQuestionBuilder({
  script,
  onScriptChange,
  questions,
  onQuestionsChange,
}: VoiceProps) {
  const addQuestion = () => {
    onQuestionsChange([
      ...questions,
      { id: uid(), text: "", hint: "", criteriaTag: "Custom", weight: 10, required: false },
    ]);
  };

  const updateQuestion = (id: string, q: ScreeningQuestion) => {
    onQuestionsChange(questions.map((x) => (x.id === id ? q : x)));
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    onQuestionsChange(questions.filter((x) => x.id !== id));
  };

  return (
    <div className="dashboard-screening-questions">
      <div className="dashboard-screening-script-sections">
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass}>Opening message</label>
          <textarea
            className={dashboardTextareaClass}
            rows={3}
            value={script.opening}
            onChange={(e) => onScriptChange({ ...script, opening: e.target.value })}
          />
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass}>Job introduction</label>
          <textarea
            className={dashboardTextareaClass}
            rows={2}
            value={script.jobIntro}
            onChange={(e) => onScriptChange({ ...script, jobIntro: e.target.value })}
          />
        </div>
      </div>

      <h4 className="dashboard-screening-questions-title">Screening questions</h4>
      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={i}
          onChange={(updated) => updateQuestion(q.id, updated)}
          onRemove={() => removeQuestion(q.id)}
        />
      ))}

      <button type="button" className="dashboard-btn-secondary" onClick={addQuestion}>
        <MaterialIcon name="add" className="text-sm" />
        Add question
      </button>

      <div className="dashboard-screening-field">
        <label className={dashboardLabelClass}>Closing message</label>
        <textarea
          className={dashboardTextareaClass}
          rows={2}
          value={script.closing}
          onChange={(e) => onScriptChange({ ...script, closing: e.target.value })}
        />
      </div>

      <div className="dashboard-screening-variables">
        <span className={dashboardLabelClass}>Variables</span>
        <div className="dashboard-screening-variable-pills">
          {SCRIPT_VARIABLES.map((v) => (
            <code key={v} className="dashboard-screening-variable-pill">{v}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

type VideoProps = {
  questions: ScreeningQuestion[];
  onQuestionsChange: (q: ScreeningQuestion[]) => void;
  onGenerateAi: () => void;
};

export function VideoQuestionBuilder({ questions, onQuestionsChange, onGenerateAi }: VideoProps) {
  const addQuestion = () => {
    onQuestionsChange([
      ...questions,
      {
        id: uid(),
        text: "",
        criteriaTag: "Communication",
        weight: 10,
        required: false,
        responseTimeLimit: "1 minute",
      },
    ]);
  };

  return (
    <div className="dashboard-screening-questions">
      <div className="dashboard-screening-questions-toolbar">
        <span className="dashboard-screening-badge dashboard-screening-badge--ai">AI Generated</span>
        <button type="button" className="dashboard-btn-secondary" onClick={onGenerateAi}>
          <MaterialIcon name="auto_awesome" className="text-sm" />
          Generate video questions with AI
        </button>
      </div>

      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={i}
          showResponseTime
          onChange={(updated) =>
            onQuestionsChange(questions.map((x) => (x.id === q.id ? updated : x)))
          }
          onRemove={() => {
            if (questions.length > 1) {
              onQuestionsChange(questions.filter((x) => x.id !== q.id));
            }
          }}
        />
      ))}

      <button type="button" className="dashboard-btn-secondary" onClick={addQuestion}>
        <MaterialIcon name="add" className="text-sm" />
        Add question
      </button>
    </div>
  );
}
