"use client";

import { OutreachPillSelect } from "@/components/dashboard/OutreachPillSelect";
import { OutreachScheduledAtPicker } from "@/components/dashboard/OutreachScheduledAtPicker";
import type { OutreachTimezoneCode } from "@/lib/outreachSchedule";
import {
  formatScheduledDateLabel,
  START_MODE_OPTIONS,
  startModeShowsScheduledDate,
  type StartScheduleMode,
} from "@/lib/outreachStartSchedule";

function ScheduleStaticChip({ label }: { label: string }) {
  return (
    <span className="dashboard-outreach-start-chip dashboard-outreach-start-chip--static">
      {label}
    </span>
  );
}

type Props = {
  mode: StartScheduleMode;
  scheduledAt: string;
  timezone: OutreachTimezoneCode;
  locked?: boolean;
  onModeChange: (mode: StartScheduleMode) => void;
  onScheduledAtChange: (isoLocal: string) => void;
  onTimezoneChange: (tz: OutreachTimezoneCode) => void;
};

export function OutreachStartScheduleBar({
  mode,
  scheduledAt,
  timezone,
  locked = false,
  onModeChange,
  onScheduledAtChange,
  onTimezoneChange,
}: Props) {
  const modeLabel = START_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
  const showScheduledDate = startModeShowsScheduledDate(mode);

  return (
    <div
      className={`dashboard-outreach-start-pill-bar${
        locked ? " dashboard-outreach-start-pill-bar--locked" : ""
      }`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span className="dashboard-outreach-start-prefix">Start</span>

      {locked ? (
        <>
          <ScheduleStaticChip label={modeLabel} />
          {showScheduledDate ? (
            <ScheduleStaticChip label={formatScheduledDateLabel(scheduledAt)} />
          ) : null}
        </>
      ) : (
        <>
          <OutreachPillSelect
            value={mode}
            options={START_MODE_OPTIONS}
            onChange={onModeChange}
            ariaLabel="When to begin outreach"
          />

          {showScheduledDate ? (
            <OutreachScheduledAtPicker
              value={scheduledAt}
              timezone={timezone}
              onChange={onScheduledAtChange}
              onTimezoneChange={onTimezoneChange}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
