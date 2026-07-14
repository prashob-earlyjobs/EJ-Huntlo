"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardInputClass } from "@/lib/dashboardStyles";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: readonly string[];
  "aria-label"?: string;
};

export function FilterChipField({
  value,
  onChange,
  placeholder = "Type and press Enter",
  disabled = false,
  suggestions,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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

  const suggestionPool = useMemo(() => {
    if (!suggestions?.length) return [];
    return suggestions.filter((item) => !selectedLower.has(item.toLowerCase()));
  }, [suggestions, selectedLower]);

  const filteredSuggestions = useMemo(() => {
    if (!suggestionPool.length) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [...suggestionPool];
    return suggestionPool.filter((item) => item.toLowerCase().includes(q));
  }, [query, suggestionPool]);

  const canAddCustom = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return false;
    if (selectedLower.has(trimmed.toLowerCase())) return false;
    return !suggestionPool.some((item) => item.toLowerCase() === trimmed.toLowerCase());
  }, [query, selectedLower, suggestionPool]);

  useEffect(() => {
    if (!open || !suggestions?.length) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, suggestions]);

  const addItem = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (selectedLower.has(trimmed.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...selected, trimmed]);
    setQuery("");
    setOpen(Boolean(suggestions?.length));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeItem = (item: string) => {
    onChange(selected.filter((x) => x !== item));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const showSuggestions = Boolean(suggestions?.length) && open && !disabled;
  const hasDropdownRows = filteredSuggestions.length > 0 || canAddCustom;

  return (
    <div ref={rootRef} className="relative mt-1">
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
          placeholder={selected.length > 0 ? "Add another" : placeholder}
          className={`dashboard-filter-country-input ${dashboardInputClass}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (suggestions?.length) setOpen(true);
          }}
          onFocus={() => {
            if (suggestions?.length) setOpen(true);
          }}
          onBlur={() => {
            if (suggestions?.length) return;
            if (query.trim()) addItem(query);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
              return;
            }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              e.preventDefault();
              removeItem(selected[selected.length - 1]);
              return;
            }
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const trimmed = query.replace(/,+$/, "").trim();
              if (!trimmed) return;
              const match = filteredSuggestions.find(
                (item) => item.toLowerCase() === trimmed.toLowerCase()
              );
              if (match) {
                addItem(match);
                return;
              }
              if (filteredSuggestions.length > 0 && e.key === "Enter" && !canAddCustom) {
                addItem(filteredSuggestions[0]);
                return;
              }
              addItem(trimmed);
            }
          }}
          autoComplete="off"
          aria-autocomplete={suggestions?.length ? "list" : undefined}
          aria-expanded={suggestions?.length ? open : undefined}
          aria-controls={suggestions?.length ? `${listId}-listbox` : undefined}
        />
      </div>

      {showSuggestions && hasDropdownRows ? (
        <ul id={`${listId}-listbox`} role="listbox" className="dashboard-filter-country-list">
          {canAddCustom ? (
            <li role="option">
              <button
                type="button"
                className="dashboard-filter-country-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addItem(query)}
              >
                Add “{query.trim()}”
              </button>
            </li>
          ) : null}
          {filteredSuggestions.map((item) => (
            <li key={item} role="option">
              <button
                type="button"
                className="dashboard-filter-country-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addItem(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
