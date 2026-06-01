"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatSendTimeLabel,
  parseSendTime12,
  sendTimeFrom12Parts,
  type SendTime12Parts,
} from "@/lib/outreachSchedule";

type Props = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function minuteLabel(n: number): string {
  return String(n).padStart(2, "0");
}

export function OutreachTimePicker({ value, onChange, ariaLabel, disabled = false }: Props) {
  const panelId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SendTime12Parts>(() => parseSendTime12(value));
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const displayLabel = formatSendTimeLabel(value);

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelWidth = 220;
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - panelWidth - 8);
    }
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left,
      width: panelWidth,
      zIndex: 10050,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (open) setDraft(parseSendTime12(value));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const applyDraft = () => {
    onChange(sendTimeFrom12Parts(draft));
    setOpen(false);
  };

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={ariaLabel}
            className="dashboard-outreach-time-panel"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="dashboard-outreach-time-panel-fields">
              <label className="dashboard-outreach-time-field">
                <span className="dashboard-outreach-time-field-label">Hour</span>
                <select
                  value={draft.hour12}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, hour12: Number(e.target.value) }))
                  }
                  className="dashboard-outreach-time-field-select"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dashboard-outreach-time-field">
                <span className="dashboard-outreach-time-field-label">Min</span>
                <select
                  value={draft.minute}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, minute: Number(e.target.value) }))
                  }
                  className="dashboard-outreach-time-field-select"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {minuteLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className="dashboard-outreach-time-period"
              role="group"
              aria-label="AM or PM"
            >
              {(["AM", "PM"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  className={`dashboard-outreach-time-period-btn${
                    draft.period === period ? " dashboard-outreach-time-period-btn--active" : ""
                  }`}
                  onClick={() => setDraft((prev) => ({ ...prev, period }))}
                >
                  {period}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="dashboard-outreach-time-apply"
              onClick={applyDraft}
            >
              Done
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <span className="dashboard-outreach-time-picker" onMouseDown={(e) => e.stopPropagation()}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="dashboard-outreach-start-chip dashboard-outreach-start-chip--select dashboard-outreach-start-chip--time-trigger"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        {displayLabel}
      </button>
      {panel}
    </span>
  );
}

export function OutreachTimePickerLabel({ value }: { value: string }) {
  return <span>{formatSendTimeLabel(value)}</span>;
}
