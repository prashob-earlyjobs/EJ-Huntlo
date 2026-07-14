"use client";

import { ScreeningTypeSelectionCard } from "@/components/dashboard/screening/ScreeningTypeCard";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectVoice: () => void;
  onSelectVideo: () => void;
};

export function ScreeningTypeSelection({ open, onClose, onSelectVoice, onSelectVideo }: Props) {
  if (!open) return null;

  return (
    <div className="dashboard-screening-modal-root" role="presentation">
      <button type="button" className="dashboard-screening-modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="dashboard-screening-modal" role="dialog" aria-labelledby="screening-type-title">
        <header className="dashboard-screening-modal-header">
          <div>
            <h2 id="screening-type-title" className="dashboard-section-title">Choose screening type</h2>
            <p className="dashboard-text-body">Select how AI should screen your candidates.</p>
          </div>
          <button type="button" className="dashboard-screening-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>
        <div className="dashboard-screening-selection-grid">
          <ScreeningTypeSelectionCard
            variant="voice"
            title="AI Voice Screening"
            description="AI calls candidates and conducts a structured phone screening."
            bestFor="High-volume hiring, quick qualification, passive candidates"
            outputs={["AI call", "Response capture", "Transcript", "Scorecard", "Recommendation"]}
            ctaLabel="Continue with voice screening"
            onClick={onSelectVoice}
          />
          <ScreeningTypeSelectionCard
            variant="video"
            title="AI Video Screening"
            description="Candidates record video answers to structured questions."
            bestFor="Communication roles, client-facing jobs, detailed evaluation"
            outputs={["Video response", "Communication evaluation", "Transcript", "Scorecard", "Recommendation"]}
            ctaLabel="Continue with video screening"
            onClick={onSelectVideo}
            locked
          />
        </div>
      </div>
    </div>
  );
}
