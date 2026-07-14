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
  disabled?: boolean;
};

export function LocationRegionField({ value, onChange, disabled = false }: Props) {
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
        .map((loc) => loc.trim())
        .filter(Boolean)
        .filter(
          (loc, index, list) =>
            list.findIndex((x) => x.toLowerCase() === loc.toLowerCase()) === index
        ),
    [value]
  );

  const selectedLower = useMemo(
    () => new Set(selected.map((loc) => loc.toLowerCase())),
    [selected]
  );

  const trimmedQuery = query.trim();
  const showList =
    open &&
    trimmedQuery.length >= MIN_QUERY_LENGTH &&
    (loading || fetchedFor === trimmedQuery);

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
        filterType: "region",
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
  }, [query, selectedLower]);

  const addLocation = (location: string) => {
    const trimmed = location.trim();
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

  const removeLocation = (location: string) => {
    onChange(selected.filter((loc) => loc !== location));
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
        {selected.map((location) => (
          <span
            key={location}
            className="dashboard-chip dashboard-chip--selected"
            title={location}
          >
            <span className="dashboard-chip-label">{location}</span>
            <button
              type="button"
              className="dashboard-chip-remove"
              aria-label={`Remove ${location}`}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeLocation(location);
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
          placeholder={
            selected.length > 0
              ? "Add another location"
              : "Type at least 3 letters to search"
          }
          className={`dashboard-filter-country-input ${dashboardInputClass}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (showList || trimmedQuery.length >= MIN_QUERY_LENGTH) {
              setOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "Backspace" && !query && selected.length > 0) {
              e.preventDefault();
              removeLocation(selected[selected.length - 1]);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions.length > 0) {
                addLocation(suggestions[0]);
                return;
              }
              const typed = query.trim();
              if (typed) {
                addLocation(typed);
              }
            }
          }}
          autoComplete="off"
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
        >
          {loading ? (
            <li
              className="dashboard-filter-country-option dashboard-filter-location-status"
              role="presentation"
            >
              Searching locations…
            </li>
          ) : suggestions.length > 0 ? (
            suggestions.map((location) => (
              <li key={location} role="option">
                <button
                  type="button"
                  className="dashboard-filter-country-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addLocation(location)}
                >
                  {location}
                </button>
              </li>
            ))
          ) : (
            <li
              className="dashboard-filter-country-option dashboard-filter-location-status"
              role="presentation"
            >
              No locations found
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
