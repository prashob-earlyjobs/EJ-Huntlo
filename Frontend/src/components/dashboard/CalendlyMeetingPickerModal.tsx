"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type CalendlyMeetingOption = {
  uri: string;
  name: string;
  schedulingUrl: string;
  durationMinutes: number;
  kind: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  options: CalendlyMeetingOption[];
  selectedUri: string;
  error?: string;
  onClose: () => void;
  onSubmit: (meeting: CalendlyMeetingOption) => void;
  onRetry?: () => void;
};

export function CalendlyMeetingPickerModal({
  open,
  loading = false,
  options,
  selectedUri,
  error = "",
  onClose,
  onSubmit,
  onRetry,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [currentUri, setCurrentUri] = useState(selectedUri);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCurrentUri(selectedUri || options[0]?.uri || "");
  }, [open, selectedUri, options]);

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

  const selected = options.find((o) => o.uri === currentUri) || null;

  return createPortal(
    <div
      className="dashboard-modal-overlay z-[130] py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="dashboard-modal mx-auto flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendly-meeting-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-6 py-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
            aria-hidden
          >
            <MaterialIcon name="calendar_month" className="text-xl" />
          </span>
          <div className="min-w-0">
            <h3 id="calendly-meeting-picker-title" className="dashboard-section-title text-lg">
              Select Calendly meeting type
            </h3>
            <p className="dashboard-text-body mt-2 text-sm text-slate-600">
              Huntlo can automatically include this meeting link in follow-up emails when a
              candidate appears interested.
            </p>
          </div>
        </div>

        <div className="dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-2" aria-hidden>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`calendly-skeleton-${index}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="dashboard-shimmer h-4 w-44 rounded" />
                  <div className="dashboard-shimmer mt-2 h-3 w-28 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="dashboard-alert-error text-sm">{error}</p>
              {onRetry ? (
                <button
                  type="button"
                  className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-55"
                  onClick={onRetry}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : options.length === 0 ? (
            <p className="dashboard-text-body text-sm">
              No active meeting types found in Calendly. Create at least one active event type and
              try again.
            </p>
          ) : (
            <div className="space-y-2">
              {options.map((opt) => {
                const active = opt.uri === currentUri;
                return (
                  <button
                    key={opt.uri}
                    type="button"
                    className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-[#0050cb] bg-[#f8f9ff]"
                        : "border-slate-200 bg-white hover:border-[#0050cb]/40 hover:bg-[#f8f9ff]"
                    }`}
                    onClick={() => setCurrentUri(opt.uri)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#141b2b]">
                        {opt.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {opt.durationMinutes > 0 ? `${opt.durationMinutes} min` : "Duration n/a"}
                        {opt.kind ? ` · ${opt.kind}` : ""}
                      </span>
                    </span>
                    {active ? (
                      <MaterialIcon name="check_circle" className="shrink-0 text-base text-[#0050cb]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-55"
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center rounded-md border border-[#0050cb] bg-[#0050cb] px-5 text-sm font-medium text-white transition hover:bg-[#003d99] disabled:opacity-55"
            disabled={loading || !selected}
            onClick={() => {
              if (selected) onSubmit(selected);
            }}
          >
            Use this meeting
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
