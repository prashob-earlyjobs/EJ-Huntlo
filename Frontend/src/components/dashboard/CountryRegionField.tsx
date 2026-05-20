"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { COUNTRY_OPTIONS } from "@/lib/countryOptions";
import { dashboardInputClass } from "@/lib/dashboardStyles";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

export function CountryRegionField({ value, onChange, disabled = false }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () =>
      value
        .map((c) => c.trim())
        .filter(Boolean)
        .filter(
          (country, index, list) =>
            list.findIndex((x) => x.toLowerCase() === country.toLowerCase()) === index
        ),
    [value]
  );

  const selectedLower = useMemo(
    () => new Set(selected.map((c) => c.toLowerCase())),
    [selected]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = COUNTRY_OPTIONS.filter((country) => !selectedLower.has(country.toLowerCase()));
    if (!q) return pool.slice(0, 12);
    return pool.filter((country) => country.toLowerCase().includes(q)).slice(0, 12);
  }, [query, selectedLower]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const addCountry = (country: string) => {
    const trimmed = country.trim();
    if (!trimmed) return;
    if (selectedLower.has(trimmed.toLowerCase())) return;
    onChange([...selected, trimmed]);
    setQuery("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeCountry = (country: string) => {
    onChange(selected.filter((c) => c !== country));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div ref={rootRef} className="relative mt-1">
      <div
        className={`dashboard-filter-country-field${disabled ? " dashboard-filter-country-field--disabled" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((country) => (
          <span key={country} className="dashboard-chip dashboard-chip--selected">
            <span className="dashboard-chip-label">{country}</span>
            <button
              type="button"
              className="dashboard-chip-remove"
              aria-label={`Remove ${country}`}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeCountry(country);
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
          placeholder={selected.length > 0 ? "Add another country" : "Type to search countries"}
          className={`dashboard-filter-country-input ${dashboardInputClass}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              e.preventDefault();
              removeCountry(selected[selected.length - 1]);
              return;
            }
            if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              addCountry(suggestions[0]);
            }
          }}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
        />
      </div>

      {open && suggestions.length > 0 ? (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="dashboard-filter-country-list"
        >
          {suggestions.map((country) => (
            <li key={country} role="option">
              <button
                type="button"
                className="dashboard-filter-country-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addCountry(country)}
              >
                {country}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
