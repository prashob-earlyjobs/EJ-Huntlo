"use client";

import { OutreachScheduleFieldSelect } from "@/components/dashboard/OutreachScheduleFieldSelect";
import type { PillSelectOption } from "@/components/dashboard/OutreachPillSelect";

export type TimePeriod = "AM" | "PM";

const PERIOD_OPTIONS: readonly PillSelectOption<TimePeriod>[] = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

type Props = {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  disabled?: boolean;
  invalid?: boolean;
};

export function OutreachTimePeriodSelect({
  value,
  onChange,
  disabled = false,
  invalid = false,
}: Props) {
  return (
    <OutreachScheduleFieldSelect
      inputId="outreach-schedule-period"
      ariaLabel="AM or PM"
      classNamePrefix="outreach-time-period-select"
      value={value}
      options={PERIOD_OPTIONS}
      onChange={onChange}
      disabled={disabled}
      invalid={invalid}
    />
  );
}
