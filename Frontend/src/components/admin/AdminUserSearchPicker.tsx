"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders } from "@/lib/auth";

export type AdminUserSearchOption = {
  id: string;
  fullName: string;
  email: string;
};

type Props = {
  apiBase: string;
  token: string;
  value: AdminUserSearchOption | null;
  onChange: (user: AdminUserSearchOption | null) => void;
  disabled?: boolean;
  className?: string;
};

function parseUserOption(raw: unknown): AdminUserSearchOption | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { id?: unknown; fullName?: unknown; email?: unknown };
  const id = row.id != null ? String(row.id).trim() : "";
  if (!id) return null;
  return {
    id,
    fullName: typeof row.fullName === "string" ? row.fullName.trim() : "",
    email: typeof row.email === "string" ? row.email.trim() : "",
  };
}

export function AdminUserSearchPicker({
  apiBase,
  token,
  value,
  onChange,
  disabled = false,
  className = "",
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AdminUserSearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchUsers = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "8", page: "1" });
        const res = await fetch(`${apiBase}/api/users?${params.toString()}`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.users)) {
          setOptions([]);
          return;
        }
        setOptions(
          data.users
            .map(parseUserOption)
            .filter((u: AdminUserSearchOption | null): u is AdminUserSearchOption => u != null)
        );
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBase, token]
  );

  useEffect(() => {
    if (value || disabled) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchUsers(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, value, disabled, searchUsers]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selectOption = (option: AdminUserSearchOption) => {
    onChange(option);
    setQuery("");
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const clearSelection = () => {
    onChange(null);
    setQuery("");
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  if (value) {
    return (
      <div
        className={`admin-user-search-picker admin-user-search-picker--selected ${className}`.trim()}
      >
        <span className="admin-user-search-picker-selected-label" title={`${value.fullName} · ${value.email}`}>
          <span className="font-medium">{value.fullName || "User"}</span>
          {value.email ? (
            <span className="admin-user-search-picker-selected-email">{value.email}</span>
          ) : null}
        </span>
        <button
          type="button"
          className="admin-user-search-picker-clear"
          onClick={clearSelection}
          disabled={disabled}
          aria-label="Clear user filter"
        >
          <MaterialIcon name="close" className="text-base" />
        </button>
      </div>
    );
  }

  const showMenu = open && (loading || options.length > 0 || query.trim().length >= 2);

  return (
    <div ref={rootRef} className={`admin-user-search-picker ${className}`.trim()}>
      <div className="admin-user-search-picker-field">
        <MaterialIcon name="search" className="admin-user-search-picker-icon" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
              e.preventDefault();
              selectOption(options[activeIndex]);
            } else if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          disabled={disabled}
          placeholder="Search user by name or email…"
          className="admin-user-search-picker-input"
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {showMenu ? (
        <ul id={listboxId} className="admin-user-search-picker-menu" role="listbox">
          {loading ? (
            <li className="admin-user-search-picker-menu-empty" role="option">
              Searching…
            </li>
          ) : options.length === 0 ? (
            <li className="admin-user-search-picker-menu-empty" role="option">
              No users found
            </li>
          ) : (
            options.map((option, index) => (
              <li key={option.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`admin-user-search-picker-option${
                    index === activeIndex ? " admin-user-search-picker-option--active" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span className="block font-medium">{option.fullName || "Unnamed user"}</span>
                  {option.email ? (
                    <span className="block text-xs text-[#5f667a]">{option.email}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
