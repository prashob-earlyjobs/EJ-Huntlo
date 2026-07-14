"use client";

import { useId, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardInputClass } from "@/lib/dashboardStyles";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function FilterChipField({
  value,
  onChange,
  placeholder = "Type and press Enter",
  disabled = false,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () =>
      value
        .map((item) => item.trim())
        .filter(Boolean)
        .filter(
          (item, index, list) =>
            list.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index
        ),
    [value]
  );

  const selectedLower = useMemo(
    () => new Set(selected.map((item) => item.toLowerCase())),
    [selected]
  );

  const addItem = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (selectedLower.has(trimmed.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...selected, trimmed]);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeItem = (item: string) => {
    onChange(selected.filter((x) => x !== item));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="relative mt-1">
      <div
        className={`dashboard-filter-country-field dashboard-filter-location-field${
          disabled ? " dashboard-filter-country-field--disabled" : ""
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((item) => (
          <span key={item} className="dashboard-chip dashboard-chip--selected" title={item}>
            <span className="dashboard-chip-label">{item}</span>
            <button
              type="button"
              className="dashboard-chip-remove"
              aria-label={`Remove ${item}`}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item);
              }}
            >
              <MaterialIcon name="close" className="text-[9px]" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={listId}
          type="text"
          disabled={disabled}
          aria-label={ariaLabel}
          placeholder={
            selected.length > 0 ? "Add another" : placeholder
          }
          className={`dashboard-filter-country-input ${dashboardInputClass}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => {
            if (query.trim()) addItem(query);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              return;
            }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              e.preventDefault();
              removeItem(selected[selected.length - 1]);
              return;
            }
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              if (query.trim()) addItem(query.replace(/,+$/, ""));
            }
          }}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
