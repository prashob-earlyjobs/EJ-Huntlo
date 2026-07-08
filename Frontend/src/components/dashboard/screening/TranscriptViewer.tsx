"use client";

import type { ScreeningType } from "@/components/dashboard/screening/types";
import { mockVideoTranscript, mockVoiceTranscript } from "@/components/dashboard/screening/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  type: ScreeningType;
};

export function TranscriptViewer({ type }: Props) {
  if (type === "voice") {
    return (
      <div className="dashboard-screening-transcript">
        <h4>
          <MaterialIcon name="description" className="text-sm" />
          Call transcript
          <span className="dashboard-screening-badge dashboard-screening-badge--ai">Auto Transcript</span>
        </h4>
        {mockVoiceTranscript.length === 0 ? (
          <p className="dashboard-screening-empty-hint">No transcript available.</p>
        ) : (
          <div className="dashboard-screening-transcript-lines">
            {mockVoiceTranscript.map((line, i) => (
              <p key={i} className={`dashboard-screening-transcript-line dashboard-screening-transcript-line--${line.speaker.toLowerCase()}`}>
                <strong>{line.speaker}:</strong> {line.text}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-screening-transcript">
      <h4>
        <MaterialIcon name="description" className="text-sm" />
        Video responses
        <span className="dashboard-screening-badge dashboard-screening-badge--ai">Auto Transcript</span>
      </h4>
      {mockVideoTranscript.map((item, i) => (
        <div key={i} className="dashboard-screening-video-answer">
          <p className="dashboard-screening-video-question">
            <strong>Q{i + 1}:</strong> {item.question}
          </p>
          <p className="dashboard-screening-video-response">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}
