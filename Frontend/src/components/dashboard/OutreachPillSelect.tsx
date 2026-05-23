"use client";

import Select, { type GroupBase, type StylesConfig } from "react-select";

export type PillSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: readonly PillSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  compact?: boolean;
  disabled?: boolean;
};

function buildChipStyles<T extends string>(
  compact?: boolean
): StylesConfig<PillSelectOption<T>, false, GroupBase<PillSelectOption<T>>> {
  return {
    container: (base) => ({
      ...base,
      display: "inline-block",
      verticalAlign: "middle",
      width: "auto",
      minWidth: compact ? "2.75rem" : 0,
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "1.625rem",
      height: "1.625rem",
      minWidth: compact ? "2.75rem" : "auto",
      border: "none",
      borderRadius: "999px",
      backgroundColor: state.isDisabled
        ? "#f3f4f6"
        : state.isFocused
          ? "#e5e7eb"
          : "#f3f4f6",
      boxShadow: "none",
      cursor: state.isDisabled ? "default" : "pointer",
      opacity: state.isDisabled ? 0.85 : 1,
      transition: "background-color 0.15s ease",
      "&:hover": {
        backgroundColor: state.isDisabled ? "#f3f4f6" : "#e5e7eb",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: "1.625rem",
      padding: "0 0.25rem 0 0.625rem",
    }),
    singleValue: (base) => ({
      ...base,
      margin: 0,
      fontSize: "0.8125rem",
      fontWeight: 500,
      lineHeight: 1.2,
      color: "#111827",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "0.8125rem",
    }),
    placeholder: (base) => ({
      ...base,
      margin: 0,
      fontSize: "0.8125rem",
      color: "#6b7280",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: "1.625rem",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: "0 0.5rem 0 0.125rem",
      color: state.isFocused ? "#4b5563" : "#6b7280",
      "&:hover": {
        color: "#374151",
      },
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menu: (base) => ({
      ...base,
      marginTop: "0.25rem",
      borderRadius: "0.625rem",
      border: "1px solid #e5e7eb",
      backgroundColor: "#fff",
      boxShadow:
        "0 4px 6px -1px color-mix(in srgb, #141b2b 8%, transparent), 0 10px 24px -4px color-mix(in srgb, #141b2b 12%, transparent)",
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "0.375rem",
      padding: "0.5rem 0.625rem",
      fontSize: "0.8125rem",
      fontWeight: state.isSelected ? 600 : 500,
      lineHeight: 1.3,
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

export function OutreachPillSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  compact = false,
  disabled = false,
}: Props<T>) {
  const selected = options.find((opt) => opt.value === value) ?? null;
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <Select<PillSelectOption<T>, false>
      inputId={`outreach-pill-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}`}
      aria-label={ariaLabel}
      classNamePrefix="outreach-pill-select"
      value={selected}
      options={[...options]}
      onChange={(opt) => {
        if (opt) onChange(opt.value);
      }}
      styles={buildChipStyles<T>(compact)}
      isDisabled={disabled}
      isSearchable={false}
      menuPortalTarget={menuPortalTarget}
      menuPosition="fixed"
      menuPlacement="auto"
      blurInputOnSelect
      captureMenuScroll={false}
    />
  );
}
