"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  OutreachSequencePicker,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/OutreachSequencePicker";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
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
      className="dashboard-modal-overlay z-[120] py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,680px)] w-full max-w-xl flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-outreach-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h3 id="create-outreach-title" className="dashboard-section-title text-lg">
              Create outreach
            </h3>
            <p className="dashboard-text-body mt-1 text-sm">
              Choose an outreach template or start a new sequence.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
            onClick={onClose}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <div className="dashboard-outreach-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
          <OutreachSequencePicker
            variant="modal"
            existingPlans={existingPlans}
            plansLoading={plansLoading}
            templates={templates}
            templatesLoading={templatesLoading}
            onChoose={onChoose}
          />

          {onViewExisting ? (
            <div className="mt-6 border-t border-slate-200 pt-4 text-center">
              <button
                type="button"
                onClick={onViewExisting}
                className="text-sm font-medium text-[#0050cb] hover:underline"
              >
                View and manage existing outreaches
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
