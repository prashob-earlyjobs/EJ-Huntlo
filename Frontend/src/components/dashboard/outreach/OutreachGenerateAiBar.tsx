"use client";

import { useState } from "react";

import { GenerateOutreachAiModal } from "@/components/dashboard/GenerateOutreachAiModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { GenerateOutreachChannel, GenerateOutreachFromJdResult } from "@/lib/outreachAiApi";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  jobTitle: string;
  jobDescription: string;
  onGenerated: (result: GenerateOutreachFromJdResult) => void;
  channels: GenerateOutreachChannel[];
  disabled?: boolean;
};

export function OutreachGenerateAiBar({
  jobTitle,
  jobDescription,
  onGenerated,
  channels,
  disabled = false,
}: Props) {
  const [modalChannel, setModalChannel] = useState<GenerateOutreachChannel | null>(null);

  const jdReady = jobDescription.trim().length >= 20;
  const titleReady = jobTitle.trim().length > 0;
  const canGenerate = jdReady && titleReady && !disabled;

  const hint = !titleReady
    ? "Add a job title on the details step to generate with AI."
    : !jdReady
      ? "Add a job description (at least 20 characters) on the details step to generate with AI."
      : "";

  return (
    <>
      <div className="dashboard-outreach-ai-bar">
        <div className="dashboard-outreach-ai-bar-copy">
          <span className="dashboard-outreach-ai-bar-icon" aria-hidden>
            <MaterialIcon name="auto_awesome" />
          </span>
          <div>
            <p className="dashboard-outreach-ai-bar-title">Generate with AI</p>
            <p className="dashboard-outreach-ai-bar-desc">
              {hint || "Create outreach messages tailored to your job description."}
            </p>
          </div>
        </div>
        <div className="dashboard-outreach-ai-bar-actions">
          {channels.includes("gmail") ? (
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} dashboard-outreach-ai-bar-btn`}
              disabled={!canGenerate}
              onClick={() => setModalChannel("gmail")}
            >
              <MaterialIcon name="mail" className="text-sm" />
              Email sequence
            </button>
          ) : null}
          {channels.includes("whatsapp") ? (
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} dashboard-outreach-ai-bar-btn`}
              disabled={!canGenerate}
              onClick={() => setModalChannel("whatsapp")}
            >
              <MaterialIcon name="chat" className="text-sm" />
              WhatsApp sequence
            </button>
          ) : null}
        </div>
      </div>

      <GenerateOutreachAiModal
        open={modalChannel !== null}
        channel={modalChannel ?? "gmail"}
        initialJobTitle={jobTitle}
        initialJobDescription={jobDescription}
        onClose={() => setModalChannel(null)}
        onGenerated={(result) => {
          onGenerated(result);
          setModalChannel(null);
        }}
      />
    </>
  );
}
