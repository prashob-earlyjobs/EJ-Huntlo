"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  photoUrl: string;
  name: string;
  onClose: () => void;
};

export function ProfilePhotoLightbox({ open, photoUrl, name, onClose }: Props) {
  const src = photoUrl.trim();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close photo"
        className="absolute inset-0 bg-slate-950/75"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,900px)] max-w-[min(90vw,720px)] flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${name} — profile photo (full size)`}
          className="max-h-[min(85vh,860px)] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
