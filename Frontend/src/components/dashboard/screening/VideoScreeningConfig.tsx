"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

type Props = {
  language: string;
  onLanguageChange: (v: string) => void;
  responseTime: string;
  onResponseTimeChange: (v: string) => void;
  retakeAllowed: boolean;
  onRetakeAllowedChange: (v: boolean) => void;
  retakeCount: number;
  onRetakeCountChange: (n: number) => void;
  deadline: string;
  onDeadlineChange: (v: string) => void;
  whatsappReminder: boolean;
  onWhatsappReminderChange: (v: boolean) => void;
  emailReminder: boolean;
  onEmailReminderChange: (v: boolean) => void;
  instructions: string;
  onInstructionsChange: (v: string) => void;
  consentMessage: boolean;
  onConsentMessageChange: (v: boolean) => void;
};

export function VideoScreeningConfig({
  language,
  onLanguageChange,
  responseTime,
  onResponseTimeChange,
  retakeAllowed,
  onRetakeAllowedChange,
  retakeCount,
  onRetakeCountChange,
  deadline,
  onDeadlineChange,
  whatsappReminder,
  onWhatsappReminderChange,
  emailReminder,
  onEmailReminderChange,
  instructions,
  onInstructionsChange,
  consentMessage,
  onConsentMessageChange,
}: Props) {
  return (
    <div className="dashboard-screening-config">
      <div className="dashboard-screening-config-grid">
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="video-lang">Screening language</label>
          <select id="video-lang" className={dashboardSelectClass} value={language} onChange={(e) => onLanguageChange(e.target.value)}>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="malayalam">Malayalam</option>
          </select>
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="video-time">Response time per question</label>
          <select id="video-time" className={dashboardSelectClass} value={responseTime} onChange={(e) => onResponseTimeChange(e.target.value)}>
            <option value="30 seconds">30 seconds</option>
            <option value="1 minute">1 minute</option>
            <option value="2 minutes">2 minutes</option>
            <option value="3 minutes">3 minutes</option>
          </select>
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="video-deadline">Deadline to complete</label>
          <select id="video-deadline" className={dashboardSelectClass} value={deadline} onChange={(e) => onDeadlineChange(e.target.value)}>
            <option value="24 hours">24 hours</option>
            <option value="48 hours">48 hours</option>
            <option value="3 days">3 days</option>
            <option value="5 days">5 days</option>
          </select>
        </div>
        {retakeAllowed ? (
          <div className="dashboard-screening-field">
            <label className={dashboardLabelClass} htmlFor="video-retakes">Retakes allowed</label>
            <select id="video-retakes" className={dashboardSelectClass} value={retakeCount} onChange={(e) => onRetakeCountChange(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        ) : null}
      </div>

      <label className="dashboard-screening-toggle">
        <input type="checkbox" checked={retakeAllowed} onChange={(e) => onRetakeAllowedChange(e.target.checked)} />
        <span>Allow retakes</span>
      </label>
      <label className="dashboard-screening-toggle">
        <input type="checkbox" checked={whatsappReminder} onChange={(e) => onWhatsappReminderChange(e.target.checked)} />
        <span>WhatsApp reminder</span>
      </label>
      <label className="dashboard-screening-toggle">
        <input type="checkbox" checked={emailReminder} onChange={(e) => onEmailReminderChange(e.target.checked)} />
        <span>Email reminder</span>
      </label>
      <label className="dashboard-screening-toggle">
        <input type="checkbox" checked={consentMessage} onChange={(e) => onConsentMessageChange(e.target.checked)} />
        <span>Show consent message before recording</span>
      </label>

      <div className="dashboard-screening-field dashboard-screening-field--full">
        <label className={dashboardLabelClass} htmlFor="video-instructions">Candidate instructions</label>
        <textarea
          id="video-instructions"
          className={dashboardTextareaClass}
          rows={4}
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
        />
      </div>

      <aside className="dashboard-screening-config-preview dashboard-screening-config-preview--video">
        <h4>Candidate experience</h4>
        <ol>
          <li>Receives screening link</li>
          <li>Opens screening page</li>
          <li>Reads instructions</li>
          <li>Answers questions on video</li>
          <li>Submits responses</li>
          <li>AI evaluates & generates scorecard</li>
        </ol>
        <MaterialIcon name="videocam" className="dashboard-screening-preview-icon" />
      </aside>
    </div>
  );
}
