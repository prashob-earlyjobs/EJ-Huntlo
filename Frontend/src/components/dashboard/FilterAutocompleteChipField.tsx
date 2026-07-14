"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardInputClass } from "@/lib/dashboardStyles";
import { fetchFilterAutocomplete } from "@/lib/filterAutocompleteApi";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  filterType: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  searchingLabel?: string;
  emptyLabel?: string;
  addAnotherPlaceholder?: string;
};

/** Shared chip autocomplete + custom entry for Future Jobs filter autocomplete types. */
export function FilterAutocompleteChipField({
  value,
  onChange,
  filterType,
  disabled = false,
  placeholder = "Type at least 3 letters to search",
  "aria-label": ariaLabel = "Filter",
  searchingLabel = "Searching…",
  emptyLabel = "No results — press Enter to add custom",
  addAnotherPlaceholder = "Add another",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedFor, setFetchedFor] = useState("");

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

  const trimmedQuery = query.trim();
  const canAddCustom =
    trimmedQuery.length > 0 && !selectedLower.has(trimmedQuery.toLowerCase());

  const showList =
    open &&
    !disabled &&
    trimmedQuery.length >= MIN_QUERY_LENGTH &&
    (loading || fetchedFor === trimmedQuery || canAddCustom);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      setFetchedFor("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchFilterAutocomplete({
        filterType,
        query: q,
        limit: 10,
        signal: controller.signal,
      })
        .then((items) => {
          if (controller.signal.aborted) return;
          setSuggestions(
            items.filter((item) => !selectedLower.has(item.toLowerCase())).slice(0, 10)
          );
          setFetchedFor(q);
          setOpen(true);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setFetchedFor(q);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selectedLower, filterType]);

  const addItem = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (selectedLower.has(trimmed.toLowerCase())) {
      setQuery("");
      setSuggestions([]);
      setFetchedFor("");
      setOpen(false);
      return;
    }
    onChange([...selected, trimmed]);
    setQuery("");
    setSuggestions([]);
    setFetchedFor("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeItem = (item: string) => {
    onChange(selected.filter((x) => x !== item));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

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
                e.preventDefault();
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
          placeholder={selected.length > 0 ? addAnotherPlaceholder : placeholder}
          className={`dashboard-filter-country-input ${dashboardInputClass}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (trimmedQuery.length >= MIN_QUERY_LENGTH) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
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
              const exact = suggestions.find(
                (item) => item.toLowerCase() === trimmed.toLowerCase()
              );
              if (exact) {
                addItem(exact);
                return;
              }
              addItem(trimmed);
            }
          }}
          autoComplete="off"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={`${listId}-listbox`}
        />
      </div>

      {showList ? (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="dashboard-filter-country-list"
          style={{ zIndex: 40 }}
        >
          {canAddCustom ? (
            <li role="option">
              <button
                type="button"
                className="dashboard-filter-country-option"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addItem(trimmedQuery);
                }}
              >
                Add “{trimmedQuery}”
              </button>
            </li>
          ) : null}
          {loading ? (
            <li
              className="dashboard-filter-country-option dashboard-filter-location-status"
              role="presentation"
            >
              {searchingLabel}
            </li>
          ) : suggestions.length > 0 ? (
            suggestions.map((item) => (
              <li key={item} role="option">
                <button
                  type="button"
                  className="dashboard-filter-country-option"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addItem(item);
                  }}
                >
                  {item}
                </button>
              </li>
            ))
          ) : fetchedFor === trimmedQuery ? (
            <li
              className="dashboard-filter-country-option dashboard-filter-location-status"
              role="presentation"
            >
              {emptyLabel}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
