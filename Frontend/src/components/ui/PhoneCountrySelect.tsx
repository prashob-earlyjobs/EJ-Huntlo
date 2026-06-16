"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Select, {
  components,
  type GroupBase,
  type MenuListProps,
  type OptionProps,
  type SingleValueProps,
  type StylesConfig,
} from "react-select";
import type { Country } from "react-phone-number-input";

import { PHONE_COUNTRIES } from "@/lib/phoneCountryCodes";

type Variant = "signup" | "dashboard";

export type CountryOption = {
  value: Country;
  label: string;
  flag: string;
  dialCode: string;
  name: string;
};

const COUNTRY_OPTIONS: CountryOption[] = PHONE_COUNTRIES.map((country) => ({
  value: country.iso,
  label: country.name,
  flag: country.flag,
  dialCode: country.dialCode,
  name: country.name,
}));

function CountrySingleValue({ data }: SingleValueProps<CountryOption, false>) {
  return (
    <span className="truncate">
      {data.flag} +{data.dialCode}
    </span>
  );
}

function CountryOptionRow({
  data,
  innerProps,
  innerRef,
  isFocused,
  isSelected,
}: OptionProps<CountryOption, false>) {
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
        isSelected
          ? "bg-blue-50 font-medium text-blue-700"
          : isFocused
            ? "bg-slate-50 text-slate-900"
            : "text-slate-900"
      }`}
    >
      <span className="shrink-0">
        {data.flag} +{data.dialCode}
      </span>
      <span className="truncate text-slate-600">{data.name}</span>
    </div>
  );
}

function MenuSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <input
      ref={inputRef}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search country or code…"
      aria-label="Search countries"
      autoComplete="off"
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchStart={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    />
  );
}

function CountryMenuList({
  menuSearch,
  setMenuSearch,
  menuRootRef,
  ...props
}: MenuListProps<CountryOption, false> & {
  menuSearch: string;
  setMenuSearch: (value: string) => void;
  menuRootRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={menuRootRef}>
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-2">
        <MenuSearchInput value={menuSearch} onChange={setMenuSearch} />
      </div>
      <components.MenuList {...props} />
    </div>
  );
}

function matchesCountrySearch(country: CountryOption, inputValue: string) {
  const query = inputValue.trim().toLowerCase();
  if (!query) return true;

  const dialQuery = query.replace(/\D/g, "");
  return (
    country.name.toLowerCase().includes(query) ||
    country.value.toLowerCase().includes(query) ||
    (dialQuery.length > 0 && country.dialCode.startsWith(dialQuery)) ||
    `+${country.dialCode}`.includes(query.replace(/\s/g, ""))
  );
}

function buildCountrySelectStyles(
  variant: Variant,
  error: boolean
): StylesConfig<CountryOption, false, GroupBase<CountryOption>> {
  const isDashboard = variant === "dashboard";
  const borderDefault = error
    ? "#fca5a5"
    : isDashboard
      ? "color-mix(in srgb, var(--dash-outline, #dadce0) 70%, transparent)"
      : "color-mix(in srgb, #cbd5e1 90%, transparent)";
  const borderFocused = error ? "#ef4444" : isDashboard ? "var(--dash-primary, #0050cb)" : "#3b82f6";
  const focusRing = error
    ? "0 0 0 4px rgba(254, 226, 226, 0.9)"
    : isDashboard
      ? "0 0 0 3px rgba(0, 80, 203, 0.14)"
      : "0 0 0 4px rgba(191, 219, 254, 0.6)";

  return {
    container: (base) => ({
      ...base,
      width: "auto",
      minWidth: "7.25rem",
      maxWidth: "10.5rem",
      flexShrink: 0,
      alignSelf: "stretch",
    }),
    control: (base, state) => ({
      ...base,
      boxSizing: "border-box",
      minHeight: "3rem",
      height: "3rem",
      padding: 0,
      gap: 0,
      alignItems: "center",
      borderRadius: "0.75rem",
      borderWidth: "1px",
      borderColor: state.isFocused ? borderFocused : borderDefault,
      backgroundColor: state.isDisabled ? (isDashboard ? "var(--dash-surface-low, #f8f9fa)" : "#fff") : "#fff",
      boxShadow: state.isFocused ? focusRing : "none",
      fontSize: "0.875rem",
      lineHeight: 1.25,
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.75 : 1,
      "&:hover": {
        borderColor: state.isDisabled ? borderDefault : borderFocused,
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: "100%",
      padding: "0.75rem 0 0.75rem 1rem",
      display: "flex",
      alignItems: "center",
    }),
    singleValue: (base) => ({
      ...base,
      position: "relative",
      top: "auto",
      transform: "none",
      margin: 0,
      maxWidth: "100%",
      lineHeight: 1.25,
      color: "var(--dash-on-surface, #0f172a)",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: "100%",
      padding: "0 0.75rem 0 0.25rem",
      display: "flex",
      alignItems: "center",
      alignSelf: "stretch",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: 0,
      color: state.isDisabled ? "#cbd5e1" : "#64748b",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menu: (base) => ({
      ...base,
      marginTop: "0.25rem",
      minWidth: "17rem",
      borderRadius: "0.75rem",
      border: "1px solid #e2e8f0",
      backgroundColor: "#fff",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
      overflow: "hidden",
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
      maxHeight: "14rem",
    }),
    option: () => ({
      padding: 0,
      backgroundColor: "transparent",
      cursor: "pointer",
    }),
    noOptionsMessage: (base) => ({
      ...base,
      fontSize: "0.875rem",
      color: "#64748b",
    }),
  };
}

type Props = {
  id: string;
  value: Country;
  onChange: (iso: Country) => void;
  disabled?: boolean;
  error?: boolean;
  variant?: Variant;
  onBlur?: () => void;
};

export function PhoneCountrySelect({
  id,
  value,
  onChange,
  disabled = false,
  error = false,
  variant = "signup",
  onBlur,
}: Props) {
  const [menuSearch, setMenuSearch] = useState("");
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement>(null);
  const selected = COUNTRY_OPTIONS.find((option) => option.value === value) ?? null;
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  const filteredOptions = useMemo(() => {
    if (!menuSearch.trim()) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((country) => matchesCountrySearch(country, menuSearch));
  }, [menuSearch]);

  const closeMenu = useCallback(() => {
    setMenuSearch("");
    setMenuIsOpen(false);
  }, []);

  const handleMenuClose = useCallback(() => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (menuRootRef.current?.contains(active) ||
          document.querySelector(".phone-country-select__menu")?.contains(active))
      ) {
        return;
      }

      closeMenu();
      onBlur?.();
    }, 0);
  }, [closeMenu, onBlur]);

  return (
    <Select<CountryOption, false>
      inputId={id}
      instanceId={id}
      aria-label="Country code"
      classNamePrefix="phone-country-select"
      value={selected}
      options={filteredOptions}
      menuIsOpen={menuIsOpen}
      onChange={(option) => {
        if (option) {
          onChange(option.value);
          closeMenu();
        }
      }}
      onMenuOpen={() => {
        setMenuSearch("");
        setMenuIsOpen(true);
      }}
      onMenuClose={handleMenuClose}
      styles={buildCountrySelectStyles(variant, error)}
      components={{
        SingleValue: CountrySingleValue,
        Option: CountryOptionRow,
        MenuList: (props) => (
          <CountryMenuList
            {...props}
            menuSearch={menuSearch}
            setMenuSearch={setMenuSearch}
            menuRootRef={menuRootRef}
          />
        ),
      }}
      isDisabled={disabled}
      isSearchable={false}
      noOptionsMessage={() => "No countries found"}
      menuPortalTarget={menuPortalTarget}
      menuPosition="fixed"
      menuPlacement="auto"
      blurInputOnSelect
      captureMenuScroll={false}
    />
  );
}
