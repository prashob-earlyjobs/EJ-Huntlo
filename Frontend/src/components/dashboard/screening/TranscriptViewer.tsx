"use client";

import type {
  ScreeningTranscriptLine,
  ScreeningType,
} from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  type: ScreeningType;
  transcript: ScreeningTranscriptLine[];
  recordingUrl?: string;
};

export function TranscriptViewer({ type, transcript, recordingUrl }: Props) {
  if (type === "voice") {
    return (
      <div className="dashboard-screening-transcript">
        <h4>
          <MaterialIcon name="description" className="text-sm" />
          Call transcript
          <span className="dashboard-screening-badge dashboard-screening-badge--ai">Auto Transcript</span>
        </h4>
        {recordingUrl ? (
          <audio
            className="dashboard-screening-call-recording"
            controls
            preload="none"
            src={recordingUrl}
          >
            Your browser does not support audio playback.
          </audio>
        ) : null}
        {transcript.length === 0 ? (
          <p className="dashboard-screening-empty-hint">
            Hunar has not provided a transcript for this call.
          </p>
        ) : (
          <div className="dashboard-screening-transcript-lines">
            {transcript.map((line, i) => (
              <p key={i} className="dashboard-screening-transcript-line">
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
      {transcript.length === 0 ? (
        <p className="dashboard-screening-empty-hint">No video transcript is available.</p>
      ) : (
        transcript.map((line, i) => (
          <p key={i} className="dashboard-screening-transcript-line">
            <strong>{line.speaker}:</strong> {line.text}
          </p>
        ))
      )}
    </div>
  );
}
