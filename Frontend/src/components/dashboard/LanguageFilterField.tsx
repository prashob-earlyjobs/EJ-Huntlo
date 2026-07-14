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

export function LanguageFilterField({ value, onChange, disabled = false }: Props) {
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
        .map((lang) => lang.trim())
        .filter(Boolean)
        .filter(
          (lang, index, list) =>
            list.findIndex((x) => x.toLowerCase() === lang.toLowerCase()) === index
        ),
    [value]
  );

  const selectedLower = useMemo(
    () => new Set(selected.map((lang) => lang.toLowerCase())),
    [selected]
  );

  const trimmedQuery = query.trim();
  const showList =
    open &&
    trimmedQuery.length >= MIN_QUERY_LENGTH &&
    (loading || fetchedFor === trimmedQuery);

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
        filterType: "languages",
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

  const addLanguage = (language: string) => {
    const trimmed = language.trim();
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

  const removeLanguage = (language: string) => {
    onChange(selected.filter((lang) => lang !== language));
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
        {selected.map((language) => (
          <span
            key={language}
            className="dashboard-chip dashboard-chip--selected"
            title={language}
          >
            <span className="dashboard-chip-label">{language}</span>
            <button
              type="button"
              className="dashboard-chip-remove"
              aria-label={`Remove ${language}`}
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeLanguage(language);
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
              ? "Add another language"
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
              removeLanguage(selected[selected.length - 1]);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions.length > 0) {
                addLanguage(suggestions[0]);
              }
            }
          }}
          autoComplete="off"
          aria-label="Languages"
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
          {loading ? (
            <li
              className="dashboard-filter-country-option dashboard-filter-location-status"
              role="presentation"
            >
              Searching languages…
            </li>
          ) : suggestions.length > 0 ? (
            suggestions.map((language) => (
              <li key={language} role="option">
                <button
                  type="button"
                  className="dashboard-filter-country-option"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addLanguage(language);
                  }}
                >
                  {language}
                </button>
              </li>
            ))
          ) : (
            <li
              className="dashboard-filter-country-option dashboard-filter-location-status"
              role="presentation"
            >
              No languages found
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
