"use client";

import type { CallLanguage, VoiceTone } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

type Props = {
  language: CallLanguage;
  onLanguageChange: (v: CallLanguage) => void;
  voiceTone: VoiceTone;
  onVoiceToneChange: (v: VoiceTone) => void;
  attempts: number;
  onAttemptsChange: (n: number) => void;
  attemptGap: string;
  onAttemptGapChange: (v: string) => void;
  durationLimit: string;
  onDurationLimitChange: (v: string) => void;
};

export function VoiceScreeningConfig({
  language,
  onLanguageChange,
  voiceTone,
  onVoiceToneChange,
  attempts,
  onAttemptsChange,
  attemptGap,
  onAttemptGapChange,
  durationLimit,
  onDurationLimitChange,
}: Props) {
  return (
    <div className="dashboard-screening-config">
      <div className="dashboard-screening-config-grid">
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="voice-lang">Call language</label>
          <select
            id="voice-lang"
            className={dashboardSelectClass}
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as CallLanguage)}
          >
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="malayalam">Malayalam</option>
            <option value="kannada">Kannada</option>
            <option value="tamil">Tamil</option>
            <option value="telugu">Telugu</option>
          </select>
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="voice-tone">Voice tone</label>
          <select
            id="voice-tone"
            className={dashboardSelectClass}
            value={voiceTone}
            onChange={(e) => onVoiceToneChange(e.target.value as VoiceTone)}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="direct">Direct</option>
          </select>
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="voice-attempts">Call attempts</label>
          <select
            id="voice-attempts"
            className={dashboardSelectClass}
            value={attempts}
            onChange={(e) => onAttemptsChange(Number(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="voice-gap">Gap between attempts</label>
          <select
            id="voice-gap"
            className={dashboardSelectClass}
            value={attemptGap}
            onChange={(e) => onAttemptGapChange(e.target.value)}
          >
            <option value="2 hours">2 hours</option>
            <option value="4 hours">4 hours</option>
            <option value="1 day">1 day</option>
          </select>
        </div>
        <div className="dashboard-screening-field">
          <label className={dashboardLabelClass} htmlFor="voice-duration">Call duration limit</label>
          <select
            id="voice-duration"
            className={dashboardSelectClass}
            value={durationLimit}
            onChange={(e) => onDurationLimitChange(e.target.value)}
          >
            <option value="3 minutes">3 minutes</option>
            <option value="5 minutes">5 minutes</option>
            <option value="10 minutes">10 minutes</option>
          </select>
        </div>
      </div>

      <aside className="dashboard-screening-config-preview">
        <MaterialIcon name="auto_awesome" />
        <p>
          <strong>AI will call</strong> selected candidates, ask screening questions, record responses,
          generate <span className="dashboard-screening-badge dashboard-screening-badge--ai">Auto Transcript</span>{" "}
          and <span className="dashboard-screening-badge dashboard-screening-badge--ai">Smart Scorecard</span>.
        </p>
      </aside>
    </div>
  );
}
