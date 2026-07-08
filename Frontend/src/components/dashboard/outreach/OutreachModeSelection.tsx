"use client";

import { OutreachModeSelectionCard } from "@/components/dashboard/outreach/OutreachModeCard";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectSingle: () => void;
  onSelectMulti: () => void;
};

export function OutreachModeSelection({ open, onClose, onSelectSingle, onSelectMulti }: Props) {
  if (!open) return null;

  return (
    <div className="dashboard-outreach-modal-root" role="presentation">
      <button type="button" className="dashboard-outreach-modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="dashboard-outreach-modal" role="dialog" aria-labelledby="outreach-mode-title">
        <header className="dashboard-outreach-modal-header">
          <div>
            <h2 id="outreach-mode-title" className="dashboard-section-title">
              Choose outreach type
            </h2>
            <p className="dashboard-text-body">Select how you want to reach your candidates.</p>
          </div>
          <button type="button" className="dashboard-outreach-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>
        <div className="dashboard-outreach-selection-grid">
          <OutreachModeSelectionCard
            variant="single"
            title="Single channel campaign"
            description="Reach candidates through one channel with a focused message."
            bestFor="Quick outreach, role-specific messaging, small candidate lists"
            sequencePreview={["whatsapp", "email", "voice"]}
            ctaLabel="Continue with single channel"
            onClick={onSelectSingle}
          />
          <OutreachModeSelectionCard
            variant="multi"
            title="Multi channel campaign"
            description="Build an automated sequence with follow-ups across channels."
            bestFor="Automated nurture, higher response rates, passive candidates"
            sequencePreview={["whatsapp", "email", "whatsapp", "voice"]}
            sequenceArrows
            ctaLabel="Continue with multi channel"
            onClick={onSelectMulti}
          />
        </div>
      </div>
    </div>
  );
}
