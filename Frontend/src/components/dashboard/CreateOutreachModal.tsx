"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  OutreachSequencePicker,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/OutreachSequencePicker";
import type { OutreachTemplateListItem } from "@/lib/outreachTemplates";

export type { CreateOutreachChoice, ExistingOutreachPlanOption };

type Props = {
  open: boolean;
  existingPlans: ExistingOutreachPlanOption[];
  plansLoading?: boolean;
  templates: OutreachTemplateListItem[];
  templatesLoading?: boolean;
  onClose: () => void;
  onChoose: (choice: CreateOutreachChoice) => void;
  onViewExisting?: () => void;
};

export function CreateOutreachModal({
  open,
  existingPlans,
  plansLoading = false,
  templates,
  templatesLoading = false,
  onClose,
  onChoose,
  onViewExisting,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const content = (
    <div
      className="dashboard-modal-overlay dashboard-create-outreach-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-outreach-title"
    >
      <button
        type="button"
        className="dashboard-create-outreach-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="dashboard-modal dashboard-create-outreach-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dashboard-create-outreach-modal-header">
          <h2 id="create-outreach-title" className="dashboard-create-outreach-modal-title">
            Create outreach
          </h2>
          <button type="button" onClick={onClose} className="dashboard-create-outreach-close">
            Close
          </button>
        </header>

        <div className="dashboard-create-outreach-body dashboard-outreach-scroll">
          <OutreachSequencePicker
            existingPlans={existingPlans}
            plansLoading={plansLoading}
            templates={templates}
            templatesLoading={templatesLoading}
            lead="Choose an outreach template"
            onChoose={onChoose}
          />

          {onViewExisting ? (
            <footer className="dashboard-create-outreach-footer">
              <button
                type="button"
                onClick={onViewExisting}
                className="dashboard-create-outreach-footer-link"
              >
                View and manage existing outreaches
              </button>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
