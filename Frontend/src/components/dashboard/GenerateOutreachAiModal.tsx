"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { generateOutreachSequenceFromJd } from "@/lib/outreachAiApi";
import {
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";
import type { OutreachTouchpointDraft } from "@/lib/outreachTemplates";

type Props = {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  onGenerated: (result: {
    touchpoints: OutreachTouchpointDraft[];
    planName: string;
  }) => void;
};

export function GenerateOutreachAiModal({ open, onClose, onBack, onGenerated }: Props) {
  const [mounted, setMounted] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [planName, setPlanName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !generating) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, generating, onClose]);

  useEffect(() => {
    if (!open) {
      setError("");
      setGenerating(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const jd = jobDescription.trim();
    if (jd.length < 20) {
      setError("Paste a job description (at least 20 characters).");
      return;
    }
    const auth = getStoredAuth();
    if (!auth?.token) {
      setError("Sign in to generate with AI.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const result = await generateOutreachSequenceFromJd(auth.token, jd, {
        planName: planName.trim() || undefined,
      });
      onGenerated({
        touchpoints: result.touchpoints,
        planName: result.planName,
      });
      setJobDescription("");
      setPlanName("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate sequence. Try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="dashboard-modal-overlay z-[130] py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !generating) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-outreach-ai-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            {onBack ? (
              <button
                type="button"
                className="mb-3 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                onClick={onBack}
                disabled={generating}
                aria-label="Back"
              >
                <MaterialIcon name="arrow_back" className="text-base" />
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                aria-hidden
              >
                <MaterialIcon name="auto_awesome" className="text-xl" />
              </span>
              <h3 id="generate-outreach-ai-title" className="dashboard-section-title text-lg">
                Generate with AI
              </h3>
            </div>
            <p className="dashboard-text-body mt-2 text-sm text-slate-600">
              Paste the job description. We&apos;ll create a 4-step outreach sequence tailored to
              the role—interest, experience, salary, and a final follow-up.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <label className={`${dashboardLabelClass} block`}>
              Job description
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={12}
                className={`${dashboardInputClass} mt-2 w-full resize-y font-normal leading-relaxed`}
                placeholder="Paste the full JD: role title, responsibilities, requirements, location, company, compensation hints…"
                disabled={generating}
                autoFocus
              />
            </label>

            <label className={`${dashboardLabelClass} mt-4 block`}>
              Sequence name{" "}
              <span className="font-normal text-slate-500">(optional)</span>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className={`${dashboardInputClass} mt-2 w-full`}
                placeholder="e.g. Senior React Developer outreach"
                disabled={generating}
              />
            </label>

            {error ? (
              <p className="dashboard-alert-warning mt-4 text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || jobDescription.trim().length < 20}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#0050cb] bg-[#0050cb] px-5 text-sm font-medium text-white transition hover:bg-[#003d99] disabled:opacity-55"
            >
              {generating ? (
                <>
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                  Generating…
                </>
              ) : (
                <>
                  <MaterialIcon name="auto_awesome" className="text-base" />
                  Generate sequence
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
