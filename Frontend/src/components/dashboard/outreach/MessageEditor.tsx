"use client";

import {
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";
import type { OutreachChannel, VoiceTone } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  mockEmailBody,
  mockEmailSubject,
  mockVoiceScript,
} from "@/components/dashboard/outreach/mockData";
import {
  createWhatsAppReplyQuestionPlaceholder,
  MAX_WHATSAPP_REPLY_QUESTIONS,
  WHATSAPP_MESSAGE_MAX_LENGTH,
  WHATSAPP_NO_REPLY_TEMPLATES,
  WHATSAPP_OPENING_TEMPLATES,
  type WhatsAppMessageTemplate,
} from "@/lib/whatsappOutreach";
import type { EmailSingleChannelMessage } from "@/lib/emailSingleChannelOutreach";

function WhatsAppTemplateSelector({
  templates,
  selectedId,
  onSelect,
  ariaLabel,
  selectId,
}: {
  templates: WhatsAppMessageTemplate[];
  selectedId?: string;
  onSelect: (template: WhatsAppMessageTemplate) => void;
  ariaLabel: string;
  selectId: string;
}) {
  const selected =
    templates.find((tpl) => tpl.id === selectedId) ?? templates[0] ?? null;

  return (
    <div className="dashboard-outreach-wa-template-picker">
      <select
        id={selectId}
        className={`${dashboardSelectClass} dashboard-outreach-wa-template-select`}
        value={selected?.id ?? ""}
        onChange={(e) => {
          const tpl = templates.find((t) => t.id === e.target.value);
          if (tpl) onSelect(tpl);
        }}
        aria-label={ariaLabel}
      >
        {templates.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>
            {tpl.name}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="dashboard-outreach-wa-template-preview">
          <p className="dashboard-outreach-wa-template-preview-desc">{selected.description}</p>
          <pre className="dashboard-outreach-wa-message-preview">{selected.body}</pre>
        </div>
      ) : null}
    </div>
  );
}

function WhatsAppNoReplyFollowUp({
  slot,
  selectedId,
  waitHours,
  onSelectTemplate,
  onWaitHoursChange,
  selectId,
  isLast = false,
}: {
  slot: 1 | 2;
  selectedId?: string;
  waitHours: number;
  onSelectTemplate: (template: WhatsAppMessageTemplate) => void;
  onWaitHoursChange: (hours: number) => void;
  selectId: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`dashboard-outreach-message-block dashboard-outreach-message-block--followup${
        isLast ? " dashboard-outreach-message-block--last" : ""
      }`}
    >
      <div className="dashboard-outreach-message-block-head">
        <span className="dashboard-outreach-message-step-num">{slot + 1}</span>
        <div className="dashboard-outreach-message-block-copy">
          <span className="dashboard-outreach-message-block-eyebrow">If no reply</span>
          <h3 className="dashboard-outreach-message-block-title">Follow-up {slot}</h3>
          <p className="dashboard-outreach-message-block-desc">
            Sent automatically when the candidate does not respond.
          </p>
        </div>
      </div>

      <div className="dashboard-outreach-wa-timing">
        <MaterialIcon name="schedule" className="dashboard-outreach-wa-timing-icon" />
        <span className="dashboard-outreach-wa-timing-label">Send after</span>
        <input
          type="number"
          min={1}
          value={waitHours}
          onChange={(e) => onWaitHoursChange(Math.max(1, Number(e.target.value) || 1))}
          className="dashboard-outreach-wa-timing-input"
          aria-label={`Follow-up ${slot} wait hours`}
        />
        <span className="dashboard-outreach-wa-timing-suffix">hours with no response</span>
      </div>

      <div className="dashboard-outreach-message-block-field">
        <label className={dashboardLabelClass} htmlFor={selectId}>
          Template
        </label>
        <WhatsAppTemplateSelector
          selectId={selectId}
          templates={WHATSAPP_NO_REPLY_TEMPLATES[slot]}
          selectedId={selectedId}
          onSelect={onSelectTemplate}
          ariaLabel={`Follow-up ${slot} WhatsApp template`}
        />
      </div>
    </div>
  );
}

function EmailFollowUpBlock({
  slot,
  label,
  subject,
  body,
  waitDays,
  onSubjectChange,
  onBodyChange,
  onWaitDaysChange,
  isOpening = false,
  isLast = false,
}: {
  slot: number;
  label: string;
  subject: string;
  body: string;
  waitDays: number;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onWaitDaysChange?: (days: number) => void;
  isOpening?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`dashboard-outreach-message-block dashboard-outreach-message-block--followup${
        isOpening ? " dashboard-outreach-message-block--opening" : ""
      }${isLast ? " dashboard-outreach-message-block--last" : ""}`}
    >
      <div className="dashboard-outreach-message-block-head">
        <span
          className={`dashboard-outreach-message-step-num${
            isOpening ? " dashboard-outreach-message-step-num--opening" : ""
          }`}
        >
          {isOpening ? <MaterialIcon name="mail" className="text-base" /> : slot}
        </span>
        <div className="dashboard-outreach-message-block-copy">
          <span className="dashboard-outreach-message-block-eyebrow">
            {isOpening ? "Step 1" : "If no reply"}
          </span>
          <h3 className="dashboard-outreach-message-block-title">{label}</h3>
          <p className="dashboard-outreach-message-block-desc">
            {isOpening
              ? "The first email sent to each candidate."
              : "Sent automatically when the candidate does not respond."}
          </p>
        </div>
      </div>

      {!isOpening && onWaitDaysChange ? (
        <div className="dashboard-outreach-wa-timing">
          <MaterialIcon name="schedule" className="dashboard-outreach-wa-timing-icon" />
          <span className="dashboard-outreach-wa-timing-label">Send after</span>
          <input
            type="number"
            min={1}
            value={waitDays}
            onChange={(e) => onWaitDaysChange(Math.max(1, Number(e.target.value) || 1))}
            className="dashboard-outreach-wa-timing-input"
            aria-label={`${label} wait days`}
          />
          <span className="dashboard-outreach-wa-timing-suffix">days with no response</span>
        </div>
      ) : null}

      <div className="dashboard-outreach-message-block-field">
        <label className={dashboardLabelClass} htmlFor={`email-subject-${slot}`}>
          Subject
        </label>
        <input
          id={`email-subject-${slot}`}
          className={dashboardInputClass}
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
      </div>

      <div className="dashboard-outreach-message-block-field">
        <label className={dashboardLabelClass} htmlFor={`email-body-${slot}`}>
          Email body
        </label>
        <textarea
          id={`email-body-${slot}`}
          className={dashboardTextareaClass}
          rows={8}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function WhatsAppReplyQuestionsPanel({
  questions,
  onChange,
}: {
  questions: string[];
  onChange: (questions: string[]) => void;
}) {
  const safeQuestions = questions.length > 0 ? questions : [""];

  const updateQuestion = (index: number, value: string) => {
    const next = [...safeQuestions];
    next[index] = value;
    onChange(next);
  };

  const addQuestion = () => {
    if (safeQuestions.length >= MAX_WHATSAPP_REPLY_QUESTIONS) return;
    onChange([
      ...safeQuestions,
      createWhatsAppReplyQuestionPlaceholder(safeQuestions.length + 1),
    ]);
  };

  const removeQuestion = (index: number) => {
    if (safeQuestions.length <= 1) return;
    onChange(safeQuestions.filter((_, i) => i !== index));
  };

  return (
    <div className="dashboard-outreach-message-block dashboard-outreach-message-block--reply">
      <div className="dashboard-outreach-message-block-head">
        <span className="dashboard-outreach-message-step-num dashboard-outreach-message-step-num--reply">
          <MaterialIcon name="quiz" className="text-base" />
        </span>
        <div className="dashboard-outreach-message-block-copy">
          <span className="dashboard-outreach-message-block-eyebrow">If candidate replies</span>
          <h3 className="dashboard-outreach-message-block-title">Additional questions to candidate</h3>
          <p className="dashboard-outreach-message-block-desc">
            Questions are sent one at a time, in order, after each candidate response.
          </p>
        </div>
      </div>

      <div className="dashboard-outreach-reply-questions">
        {safeQuestions.map((question, index) => (
          <div key={index} className="dashboard-outreach-reply-question">
            <div className="dashboard-outreach-reply-question-head">
              <label className={dashboardLabelClass} htmlFor={`wa-reply-question-${index}`}>
                Question {index + 1}
              </label>
              {safeQuestions.length > 1 ? (
                <button
                  type="button"
                  className="dashboard-outreach-reply-question-remove"
                  onClick={() => removeQuestion(index)}
                  aria-label={`Remove question ${index + 1}`}
                >
                  <MaterialIcon name="close" className="text-sm" />
                  Remove
                </button>
              ) : null}
            </div>
            <textarea
              id={`wa-reply-question-${index}`}
              className={dashboardTextareaClass}
              rows={3}
              value={question}
              onChange={(e) => updateQuestion(index, e.target.value)}
              maxLength={WHATSAPP_MESSAGE_MAX_LENGTH}
              placeholder={createWhatsAppReplyQuestionPlaceholder(index + 1)}
            />
            <p className="dashboard-outreach-wa-char-count">
              {question.length.toLocaleString()} / {WHATSAPP_MESSAGE_MAX_LENGTH.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {safeQuestions.length < MAX_WHATSAPP_REPLY_QUESTIONS ? (
        <button
          type="button"
          className={`${dashboardBtnSecondaryClass} dashboard-outreach-reply-question-add`}
          onClick={addQuestion}
        >
          <MaterialIcon name="add" className="text-sm" />
          Add question
        </button>
      ) : null}
    </div>
  );
}

type Props = {
  channel: OutreachChannel;
  templateId?: string;
  onOpeningTemplateSelect?: (template: WhatsAppMessageTemplate) => void;
  followUpTemplateId?: string;
  onFollowUpTemplateSelect?: (template: WhatsAppMessageTemplate) => void;
  followUpWaitHours?: number;
  onFollowUpWaitHoursChange?: (hours: number) => void;
  followUp2TemplateId?: string;
  onFollowUp2TemplateSelect?: (template: WhatsAppMessageTemplate) => void;
  followUp2WaitHours?: number;
  onFollowUp2WaitHoursChange?: (hours: number) => void;
  replyQuestions?: string[];
  onReplyQuestionsChange?: (questions: string[]) => void;
  message?: string;
  onMessageChange?: (value: string) => void;
  subject?: string;
  onSubjectChange?: (value: string) => void;
  emailMessage?: EmailSingleChannelMessage;
  onEmailMessageChange?: (message: EmailSingleChannelMessage) => void;
  voiceTone?: VoiceTone;
  onVoiceToneChange?: (tone: VoiceTone) => void;
  callAttempts?: number;
  onCallAttemptsChange?: (n: number) => void;
  attemptGap?: number;
  onAttemptGapChange?: (n: number) => void;
  callObjective?: string;
  onCallObjectiveChange?: (value: string) => void;
};

export function MessageEditor({
  channel,
  templateId,
  onOpeningTemplateSelect,
  followUpTemplateId,
  onFollowUpTemplateSelect,
  followUpWaitHours = 48,
  onFollowUpWaitHoursChange,
  followUp2TemplateId,
  onFollowUp2TemplateSelect,
  followUp2WaitHours = 96,
  onFollowUp2WaitHoursChange,
  replyQuestions = [],
  onReplyQuestionsChange,
  message = "",
  onMessageChange,
  subject = mockEmailSubject,
  onSubjectChange,
  emailMessage,
  onEmailMessageChange,
  voiceTone = "professional",
  onVoiceToneChange,
  callAttempts = 2,
  onCallAttemptsChange,
  attemptGap = 4,
  onAttemptGapChange,
  callObjective = "Confirm interest in the role",
  onCallObjectiveChange,
}: Props) {
  return (
    <div className="dashboard-outreach-message-editor">
      <div className="dashboard-outreach-message-editor-main">
        {channel === "whatsapp" ? (
          <div className="dashboard-outreach-message-flow">
            <div className="dashboard-outreach-message-block dashboard-outreach-message-block--opening">
              <div className="dashboard-outreach-message-block-head">
                <span className="dashboard-outreach-message-step-num dashboard-outreach-message-step-num--opening">
                  <MaterialIcon name="chat" className="text-base" />
                </span>
                <div className="dashboard-outreach-message-block-copy">
                  <span className="dashboard-outreach-message-block-eyebrow">Step 1</span>
                  <h3 className="dashboard-outreach-message-block-title">Opening message</h3>
                  <p className="dashboard-outreach-message-block-desc">
                    The first approved WhatsApp template sent to each candidate.
                  </p>
                </div>
              </div>
              <div className="dashboard-outreach-message-block-field">
                <label className={dashboardLabelClass} htmlFor="wa-opening-template">
                  Template
                </label>
                <WhatsAppTemplateSelector
                  selectId="wa-opening-template"
                  templates={WHATSAPP_OPENING_TEMPLATES}
                  selectedId={templateId}
                  onSelect={(tpl) => onOpeningTemplateSelect?.(tpl)}
                  ariaLabel="Opening WhatsApp template"
                />
              </div>
            </div>

            <div className="dashboard-outreach-message-followups">
              <div className="dashboard-outreach-message-followups-head">
                <MaterialIcon name="autorenew" className="dashboard-outreach-message-followups-icon" />
                <div>
                  <h3 className="dashboard-outreach-message-followups-title">Automated follow-ups</h3>
                  <p className="dashboard-outreach-message-followups-desc">
                    Two no-reply messages are sent on schedule if the candidate does not respond.
                  </p>
                </div>
              </div>

              <div className="dashboard-outreach-message-timeline">
                <WhatsAppNoReplyFollowUp
                  slot={1}
                  selectId="wa-followup-1-template"
                  selectedId={followUpTemplateId}
                  waitHours={followUpWaitHours}
                  onSelectTemplate={(tpl) => onFollowUpTemplateSelect?.(tpl)}
                  onWaitHoursChange={(hours) => onFollowUpWaitHoursChange?.(hours)}
                />
                <WhatsAppNoReplyFollowUp
                  slot={2}
                  selectId="wa-followup-2-template"
                  selectedId={followUp2TemplateId}
                  waitHours={followUp2WaitHours}
                  onSelectTemplate={(tpl) => onFollowUp2TemplateSelect?.(tpl)}
                  onWaitHoursChange={(hours) => onFollowUp2WaitHoursChange?.(hours)}
                  isLast
                />
              </div>
            </div>

            <WhatsAppReplyQuestionsPanel
              questions={replyQuestions}
              onChange={(questions) => onReplyQuestionsChange?.(questions)}
            />
          </div>
        ) : null}

        {channel === "email" ? (
          emailMessage && onEmailMessageChange ? (
            <div className="dashboard-outreach-message-flow">
              <EmailFollowUpBlock
                slot={1}
                label={emailMessage.touchpoints[0]?.label || "Introduction"}
                subject={emailMessage.touchpoints[0]?.subject || ""}
                body={emailMessage.touchpoints[0]?.body || ""}
                waitDays={0}
                isOpening
                onSubjectChange={(value) =>
                  onEmailMessageChange({
                    touchpoints: emailMessage.touchpoints.map((tp, index) =>
                      index === 0 ? { ...tp, subject: value } : tp
                    ),
                  })
                }
                onBodyChange={(value) =>
                  onEmailMessageChange({
                    touchpoints: emailMessage.touchpoints.map((tp, index) =>
                      index === 0 ? { ...tp, body: value } : tp
                    ),
                  })
                }
              />

              <div className="dashboard-outreach-message-followups">
                <div className="dashboard-outreach-message-followups-head">
                  <MaterialIcon name="autorenew" className="dashboard-outreach-message-followups-icon" />
                  <div>
                    <h3 className="dashboard-outreach-message-followups-title">Automated follow-ups</h3>
                    <p className="dashboard-outreach-message-followups-desc">
                      Three no-reply emails are sent on schedule if the candidate does not respond.
                    </p>
                  </div>
                </div>

                <div className="dashboard-outreach-message-timeline">
                  {emailMessage.touchpoints.slice(1).map((touchpoint, index) => {
                    const slot = index + 2;
                    const touchpointIndex = index + 1;
                    return (
                      <EmailFollowUpBlock
                        key={touchpoint.order}
                        slot={slot}
                        label={touchpoint.label}
                        subject={touchpoint.subject}
                        body={touchpoint.body}
                        waitDays={touchpoint.waitDays}
                        isLast={slot === 4}
                        onSubjectChange={(value) =>
                          onEmailMessageChange({
                            touchpoints: emailMessage.touchpoints.map((tp, i) =>
                              i === touchpointIndex ? { ...tp, subject: value } : tp
                            ),
                          })
                        }
                        onBodyChange={(value) =>
                          onEmailMessageChange({
                            touchpoints: emailMessage.touchpoints.map((tp, i) =>
                              i === touchpointIndex ? { ...tp, body: value } : tp
                            ),
                          })
                        }
                        onWaitDaysChange={(days) =>
                          onEmailMessageChange({
                            touchpoints: emailMessage.touchpoints.map((tp, i) =>
                              i === touchpointIndex ? { ...tp, waitDays: days } : tp
                            ),
                          })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="dashboard-outreach-field">
                <label className={dashboardLabelClass} htmlFor="email-subject">
                  Subject
                </label>
                <input
                  id="email-subject"
                  className={dashboardInputClass}
                  value={onSubjectChange ? subject : subject || mockEmailSubject}
                  onChange={(e) => onSubjectChange?.(e.target.value)}
                />
              </div>
              <div className="dashboard-outreach-field">
                <label className={dashboardLabelClass} htmlFor="email-body">
                  Email body
                </label>
                <textarea
                  id="email-body"
                  className={dashboardTextareaClass}
                  rows={10}
                  value={onMessageChange ? message : message || mockEmailBody}
                  onChange={(e) => onMessageChange?.(e.target.value)}
                />
              </div>
            </>
          )
        ) : null}

        {channel === "voice" ? (
          <>
            <div className="dashboard-outreach-field">
              <label className={dashboardLabelClass} htmlFor="call-objective">
                Call objective
              </label>
              <input
                id="call-objective"
                className={dashboardInputClass}
                value={callObjective}
                onChange={(e) => onCallObjectiveChange?.(e.target.value)}
              />
            </div>
            <div className="dashboard-outreach-field">
              <label className={dashboardLabelClass} htmlFor="voice-script">
                Script
              </label>
              <textarea
                id="voice-script"
                className={dashboardTextareaClass}
                rows={8}
                value={message || mockVoiceScript}
                onChange={(e) => onMessageChange?.(e.target.value)}
              />
            </div>
            <div className="dashboard-outreach-field-row">
              <div className="dashboard-outreach-field">
                <label className={dashboardLabelClass} htmlFor="voice-tone">
                  Voice tone
                </label>
                <select
                  id="voice-tone"
                  className={dashboardSelectClass}
                  value={voiceTone}
                  onChange={(e) => onVoiceToneChange?.(e.target.value as VoiceTone)}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div className="dashboard-outreach-field">
                <label className={dashboardLabelClass} htmlFor="call-attempts">
                  Attempts
                </label>
                <input
                  id="call-attempts"
                  type="number"
                  min={1}
                  max={5}
                  className={dashboardInputClass}
                  value={callAttempts}
                  onChange={(e) => onCallAttemptsChange?.(Number(e.target.value))}
                />
              </div>
              <div className="dashboard-outreach-field">
                <label className={dashboardLabelClass} htmlFor="attempt-gap">
                  Gap (hours)
                </label>
                <input
                  id="attempt-gap"
                  type="number"
                  min={1}
                  max={48}
                  className={dashboardInputClass}
                  value={attemptGap}
                  onChange={(e) => onAttemptGapChange?.(Number(e.target.value))}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
