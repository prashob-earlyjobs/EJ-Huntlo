"use client";

import { OutreachPillSelect } from "@/components/dashboard/OutreachPillSelect";
import {
  formatSoonestDateLabel,
  START_MODE_OPTIONS,
  startModeShowsSendTime,
  startModeShowsSoonestDate,
  type StartScheduleMode,
} from "@/lib/outreachStartSchedule";

function ScheduleStaticChip({ label }: { label: string }) {
  return (
    <span className="dashboard-outreach-start-chip dashboard-outreach-start-chip--static">
      {label}
    </span>
  );
}

type SendTimeOption = { value: string; label: string };
type TimezoneOption = { value: string; label: string };

type Props = {
  mode: StartScheduleMode;
  afterDays: number;
  soonestAt: string;
  sendTime: string;
  timezone: string;
  locked?: boolean;
  sendTimeOptions: readonly SendTimeOption[];
  timezoneOptions: readonly TimezoneOption[];
  onModeChange: (mode: StartScheduleMode) => void;
  onAfterDaysChange: (days: number) => void;
  onSoonestAtChange: (isoLocal: string) => void;
  onSendTimeChange: (time: string) => void;
  onTimezoneChange: (tz: string) => void;
};

export function OutreachStartScheduleBar({
  mode,
  afterDays,
  soonestAt,
  sendTime,
  timezone,
  locked = false,
  sendTimeOptions,
  timezoneOptions,
  onModeChange,
  onAfterDaysChange,
  onSoonestAtChange,
  onSendTimeChange,
  onTimezoneChange,
}: Props) {
  const modeLabel = START_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
  const showSendAt = startModeShowsSendTime(mode);
  const showSoonestDate = startModeShowsSoonestDate(mode);
  const sendTimeLabel =
    sendTimeOptions.find((o) => o.value === sendTime)?.label ?? sendTime;

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
          {mode === "after" ? (
            <>
              <ScheduleStaticChip label={String(afterDays)} />
              <ScheduleStaticChip label="business days" />
            </>
          ) : null}
          {showSoonestDate ? (
            <ScheduleStaticChip label={formatSoonestDateLabel(soonestAt)} />
          ) : null}
          {showSendAt ? (
            <>
              <span className="dashboard-outreach-start-muted">Send @</span>
              <ScheduleStaticChip label={sendTimeLabel} />
              <ScheduleStaticChip label={timezone} />
            </>
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

          {mode === "after" ? (
            <>
              <input
                type="number"
                min={1}
                value={afterDays}
                onChange={(e) => {
                  onAfterDaysChange(Math.max(1, Number(e.target.value) || 1));
                }}
                className="dashboard-outreach-start-chip dashboard-outreach-start-chip--input"
                aria-label="Business days to wait"
              />
              <span className="dashboard-outreach-start-chip dashboard-outreach-start-chip--static">
                business days
              </span>
            </>
          ) : null}

          {showSoonestDate ? (
            <input
              type="datetime-local"
              value={soonestAt}
              onChange={(e) => onSoonestAtChange(e.target.value)}
              className="dashboard-outreach-start-chip dashboard-outreach-start-chip--datetime"
              aria-label="Soonest send date and time"
            />
          ) : null}

          {showSendAt && !showSoonestDate ? (
            <>
              <span className="dashboard-outreach-start-muted">Send @</span>
              <OutreachPillSelect
                value={sendTime}
                options={sendTimeOptions}
                onChange={onSendTimeChange}
                ariaLabel="Send time"
              />
              <OutreachPillSelect
                value={timezone}
                options={timezoneOptions}
                onChange={onTimezoneChange}
                ariaLabel="Timezone"
                compact
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
