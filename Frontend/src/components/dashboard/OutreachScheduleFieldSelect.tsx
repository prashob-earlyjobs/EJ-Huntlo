"use client";

import Select, {
  type GroupBase,
  type InputProps,
  type StylesConfig,
} from "react-select";

import type { PillSelectOption } from "@/components/dashboard/OutreachPillSelect";

type Props<T extends string> = {
  value: T;
  options: readonly PillSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  inputId: string;
  classNamePrefix: string;
  disabled?: boolean;
  invalid?: boolean;
};

function HiddenSelectInput<T extends string>(
  _props: InputProps<PillSelectOption<T>, false>
) {
  return null;
}

function buildStyles<T extends string>(
  invalid?: boolean
): StylesConfig<PillSelectOption<T>, false, GroupBase<PillSelectOption<T>>> {
  return {
    container: (base) => ({
      ...base,
      width: "100%",
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "2.25rem",
      height: "2.25rem",
      border: `1px solid ${invalid ? "#f87171" : "#e5e7eb"}`,
      borderRadius: "0.5rem",
      backgroundColor: invalid ? "#fef2f2" : "#f3f4f6",
      boxShadow: "none",
      cursor: state.isDisabled ? "default" : "pointer",
      opacity: state.isDisabled ? 0.85 : 1,
      transition: "border-color 0.15s ease, background-color 0.15s ease",
      "&:hover": {
        borderColor: invalid ? "#f87171" : "#d1d5db",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: "2.25rem",
      padding: "0 0.25rem 0 0.5rem",
    }),
    singleValue: (base) => ({
      ...base,
      margin: 0,
      fontSize: "0.9375rem",
      fontWeight: 600,
      color: "#111827",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: "2.25rem",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: "0 0.375rem 0 0",
      color: state.isFocused ? "#4b5563" : "#6b7280",
      "&:hover": {
        color: "#374151",
      },
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 100_001,
    }),
    menu: (base) => ({
      ...base,
      marginTop: "0.25rem",
      borderRadius: "0.5rem",
      border: "1px solid #e5e7eb",
      backgroundColor: "#fff",
      boxShadow:
        "0 4px 6px -1px color-mix(in srgb, #141b2b 8%, transparent), 0 10px 24px -4px color-mix(in srgb, #141b2b 12%, transparent)",
      overflow: "hidden",
      zIndex: 100_001,
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "0.375rem",
      padding: "0.5rem 0.625rem",
      fontSize: "0.875rem",
      fontWeight: state.isSelected ? 600 : 500,
      color: state.isSelected ? "#5b21b6" : "#111827",
      backgroundColor: state.isSelected
        ? "#ede9fe"
        : state.isFocused
          ? "#f3f4f6"
          : "transparent",
      cursor: "pointer",
      "&:active": {
        backgroundColor: state.isSelected ? "#ddd6fe" : "#e5e7eb",
      },
    }),
  };
}

export function OutreachScheduleFieldSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  inputId,
  classNamePrefix,
  disabled = false,
  invalid = false,
}: Props<T>) {
  const selected = options.find((opt) => opt.value === value) ?? options[0] ?? null;
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <Select<PillSelectOption<T>, false>
      inputId={inputId}
      aria-label={ariaLabel}
      classNamePrefix={classNamePrefix}
      value={selected}
      options={[...options]}
      onChange={(opt) => {
        if (opt) onChange(opt.value);
      }}
      styles={buildStyles<T>(invalid)}
      isDisabled={disabled}
      isSearchable={false}
      components={{ Input: HiddenSelectInput }}
      menuPortalTarget={menuPortalTarget}
      menuPosition="fixed"
      menuPlacement="auto"
      blurInputOnSelect
      captureMenuScroll={false}
    />
  );
}
