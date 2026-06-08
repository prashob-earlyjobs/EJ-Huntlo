"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { lockPageScroll, unlockPageScroll } from "@/lib/lockPageScroll";
import { MaterialIcon } from "./MaterialIcon";

type Props = {
  open: boolean;
  onEdit: () => void;
  onContinue: () => void;
};

export function HeroSearchPromptWarningModal({
  open,
  onEdit,
  onContinue,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEdit();
    };
    window.addEventListener("keydown", onKeyDown);
    lockPageScroll();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      unlockPageScroll();
    };
  }, [open, onEdit]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="landing-hero-prompt-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-hero-prompt-modal-title"
      aria-describedby="landing-hero-prompt-modal-desc"
    >
      <button
        type="button"
        className="landing-hero-prompt-modal-backdrop"
        aria-label="Close dialog"
        onClick={onEdit}
      />
      <div className="landing-hero-prompt-modal-panel" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="landing-hero-prompt-modal-close"
          aria-label="Close"
          onClick={onEdit}
        >
          <MaterialIcon name="close" className="text-[20px]" />
        </button>

        <div className="landing-hero-prompt-modal-icon" aria-hidden>
          <MaterialIcon name="tips_and_updates" className="text-[22px]" />
        </div>

        <h3 id="landing-hero-prompt-modal-title" className="landing-hero-prompt-modal-title">
          This prompt may affect your results
        </h3>

        <p id="landing-hero-prompt-modal-desc" className="landing-hero-prompt-modal-message">
          Searches work best when you mention a role, skills, location, and experience level.
          Your prompt may not make all of these clear — continuing can return broader matches.
        </p>

        <div className="landing-hero-prompt-modal-actions">
          <button type="button" className="landing-hero-prompt-modal-btn-secondary" onClick={onEdit}>
            Refine prompt
          </button>
          <button type="button" className="landing-hero-prompt-modal-btn-primary" onClick={onContinue}>
            Continue search
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
