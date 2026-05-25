"use client";

import Select, { type GroupBase, type StylesConfig } from "react-select";

import type { PillSelectOption } from "@/components/dashboard/OutreachPillSelect";

type Props<T extends string> = {
  value: T;
  options: readonly PillSelectOption<T>[];
  onChange?: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  isSearchable?: boolean;
};

function buildFieldStyles<T extends string>(): StylesConfig<
  PillSelectOption<T>,
  false,
  GroupBase<PillSelectOption<T>>
> {
  return {
    container: (base) => ({
      ...base,
      width: "100%",
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "1.625rem",
      borderRadius: "0.375rem",
      borderColor: state.isFocused
        ? "var(--dash-primary, #0050cb)"
        : "color-mix(in srgb, var(--dash-outline, #dadce0) 70%, transparent)",
      backgroundColor: state.isDisabled ? "#f8f9fa" : "#fff",
      boxShadow: state.isFocused ? "0 0 0 1px var(--dash-primary, #0050cb)" : "none",
      fontSize: "0.8125rem",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      "&:hover": {
        borderColor: state.isDisabled
          ? base.borderColor
          : "color-mix(in srgb, var(--dash-primary, #0050cb) 45%, transparent)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 0.4375rem",
    }),
    singleValue: (base, state) => ({
      ...base,
      margin: 0,
      fontSize: "0.8125rem",
      lineHeight: 1.35,
      color: state.isDisabled ? "#80868b" : "var(--dash-on-surface, #202124)",
    }),
    placeholder: (base) => ({
      ...base,
      margin: 0,
      fontSize: "0.8125rem",
      color: "#80868b",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "0.8125rem",
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
      padding: "0 0.375rem",
      color: state.isDisabled ? "#bdc1c6" : "#5f6368",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menu: (base) => ({
      ...base,
      marginTop: "0.25rem",
      borderRadius: "0.5rem",
      border: "1px solid #e8eaed",
      backgroundColor: "#fff",
      boxShadow: "0 8px 24px rgba(32, 33, 36, 0.12)",
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "0.3125rem",
      padding: "0.4375rem 0.5rem",
      fontSize: "0.8125rem",
      fontWeight: state.isSelected ? 600 : 400,
      color: state.isSelected ? "var(--dash-primary, #0050cb)" : "#202124",
      backgroundColor: state.isSelected
        ? "#e8f0fe"
        : state.isFocused
          ? "#f8f9fa"
          : "transparent",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
  };
}

export function OutreachFieldSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  isSearchable = false,
}: Props<T>) {
  const selected = options.find((opt) => opt.value === value) ?? null;
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <Select<PillSelectOption<T>, false>
      inputId={`outreach-field-${ariaLabel.replace(/\s+/g, "-").toLowerCase()}`}
      aria-label={ariaLabel}
      classNamePrefix="outreach-field-select"
      value={selected}
      options={[...options]}
      onChange={(opt) => {
        if (opt && onChange) onChange(opt.value);
      }}
      styles={buildFieldStyles<T>()}
      isDisabled={disabled}
      isSearchable={isSearchable}
      menuPortalTarget={menuPortalTarget}
      menuPosition="fixed"
      menuPlacement="auto"
      blurInputOnSelect
      captureMenuScroll={false}
    />
  );
}
