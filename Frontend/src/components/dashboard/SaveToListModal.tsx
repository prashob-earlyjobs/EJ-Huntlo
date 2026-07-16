"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Select, {
  components,
  type GroupBase,
  type OptionProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";

const GENERAL_VALUE = "__general__";
const NEW_LIST_VALUE = "__new__";

export type SaveToListOption = {
  id: string;
  name: string;
};

type ListSelectOption = {
  value: string;
  label: string;
  description?: string;
  isGeneral?: boolean;
};

type Props = {
  open: boolean;
  candidateName?: string;
  candidateCount?: number;
  lists: SaveToListOption[];
  listsLoading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: { listId: string } | { newListName: string }) => void | Promise<void>;
};

function buildSelectStyles(
  accented: boolean
): StylesConfig<ListSelectOption, false, GroupBase<ListSelectOption>> {
  return {
    container: (base) => ({ ...base, width: "100%" }),
    control: (base, state) => ({
      ...base,
      minHeight: "2.75rem",
      borderRadius: "0.625rem",
      borderWidth: 2,
      borderColor: accented
        ? "color-mix(in srgb, var(--dash-primary, #0050cb) 45%, transparent)"
        : state.isFocused
          ? "var(--dash-primary, #0050cb)"
          : "#e2e8f0",
      backgroundColor: accented ? "#f8f9ff" : state.isDisabled ? "#f8f9fa" : "#fff",
      boxShadow: accented
        ? "0 0 0 1px rgba(0, 80, 203, 0.12)"
        : state.isFocused
          ? "0 0 0 3px rgba(0, 80, 203, 0.12)"
          : "none",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.7 : 1,
      "&:hover": {
        borderColor: state.isDisabled
          ? base.borderColor
          : "color-mix(in srgb, var(--dash-primary, #0050cb) 45%, transparent)",
      },
    }),
    valueContainer: (base) => ({ ...base, padding: "0.2rem 0.85rem" }),
    singleValue: (base) => ({
      ...base,
      margin: 0,
      fontSize: "0.875rem",
      fontWeight: 600,
      color: "#141b2b",
    }),
    placeholder: (base) => ({
      ...base,
      margin: 0,
      fontSize: "0.875rem",
      color: "#94a3b8",
    }),
    input: (base) => ({ ...base, margin: 0, padding: 0, fontSize: "0.875rem" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: "0 0.7rem",
      color: "#64748b",
    }),
    loadingIndicator: (base) => ({
      ...base,
      color: "var(--dash-primary, #0050cb)",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 10_000 }),
    menu: (base) => ({
      ...base,
      marginTop: 8,
      borderRadius: "0.75rem",
      border: "1px solid #e8eaed",
      boxShadow: "0 12px 32px rgba(20, 27, 43, 0.14)",
      overflow: "hidden",
      zIndex: 10_000,
    }),
    menuList: (base) => ({ ...base, padding: 6, maxHeight: 240 }),
    option: (base, state) => ({
      ...base,
      borderRadius: 8,
      padding: "10px 10px",
      fontSize: "0.875rem",
      fontWeight: state.isSelected ? 600 : 450,
      color: state.isSelected ? "var(--dash-primary, #0050cb)" : "#141b2b",
      backgroundColor: state.isSelected
        ? "#e8f0fe"
        : state.isFocused
          ? "#f8f9fa"
          : "transparent",
      cursor: "pointer",
    }),
    noOptionsMessage: (base) => ({
      ...base,
      fontSize: "0.8125rem",
      color: "#80868b",
      padding: "12px",
    }),
  };
}

function ListOption(props: OptionProps<ListSelectOption, false>) {
  const { data, isSelected } = props;
  return (
    <components.Option {...props}>
      <span className="flex w-full items-center gap-2.5">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
            data.isGeneral
              ? "border-[#0050cb]/15 bg-[#0050cb]/10 text-[#0050cb]"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
          aria-hidden
        >
          <MaterialIcon name={data.isGeneral ? "inbox" : "folder"} className="text-[17px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{data.label}</span>
          {data.description ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
              {data.description}
            </span>
          ) : null}
        </span>
        {isSelected ? (
          <MaterialIcon name="check_circle" className="shrink-0 text-lg text-[#0050cb]" aria-hidden />
        ) : null}
      </span>
    </components.Option>
  );
}

export function SaveToListModal({
  open,
  candidateName = "",
  candidateCount = 1,
  lists,
  listsLoading = false,
  submitting = false,
  onClose,
  onConfirm,
}: Props) {
  const titleId = useId();
  const selectId = useId();
  const newNameId = useId();
  const [mounted, setMounted] = useState(false);
  const [choice, setChoice] = useState<string>("");
  const [selected, setSelected] = useState<ListSelectOption | null>(null);
  const [newName, setNewName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const wasOpenRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isNew = choice === NEW_LIST_VALUE;
  const selectStyles = useMemo(() => buildSelectStyles(!isNew), [isNew]);

  const listOptions = useMemo((): ListSelectOption[] => {
    const sorted = [...lists].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return [
      {
        value: GENERAL_VALUE,
        label: "General",
        description: "Default saved list",
        isGeneral: true,
      },
      ...sorted.map((list) => ({
        value: list.id,
        label: list.name,
      })),
    ];
  }, [lists]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setChoice(GENERAL_VALUE);
      setSelected(null);
      setNewName("");
      setSubmitError("");
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setNewName("");
    setSubmitError("");
    // Always default to General — ignore last-used / newly created list.
    const general =
      listOptions.find((o) => o.value === GENERAL_VALUE) ?? listOptions[0] ?? null;
    setSelected(general);
    setChoice(general?.value ?? GENERAL_VALUE);
  }, [open, listOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open || !isNew) return;
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open, isNew]);

  if (!open || !mounted) return null;

  const trimmedNew = newName.trim();
  const canSubmit =
    !submitting && (isNew ? Boolean(trimmedNew) : Boolean(selected?.value));

  const handlePickExisting = (next: SingleValue<ListSelectOption>) => {
    if (!next) return;
    setSelected(next);
    setChoice(next.value);
    setSubmitError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError("");
    try {
      if (isNew) {
        await onConfirm({ newListName: trimmedNew });
        return;
      }
      if (!selected) return;
      await onConfirm({
        listId: selected.value === GENERAL_VALUE ? "" : selected.value,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not save candidate. Please try again."
      );
    }
  };

  const content = (
    <div
      className="dashboard-modal-overlay dashboard-add-campaign-overlay z-[120]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="dashboard-modal dashboard-save-list-modal mx-auto flex w-full max-w-lg flex-col p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dashboard-add-campaign-header flex shrink-0 items-start justify-between border-b border-slate-200">
          <div className="min-w-0">
            <h3 id={titleId} className="dashboard-section-title text-lg">
              Save to list
            </h3>
            <p className="dashboard-text-body dashboard-add-campaign-subtitle text-sm">
              {candidateCount > 1 ? (
                <>
                  Save{" "}
                  <span className="font-semibold text-[#141b2b]">
                    {candidateCount} candidates
                  </span>{" "}
                  into a list.
                </>
              ) : candidateName ? (
                <>
                  Save <span className="font-semibold text-[#141b2b]">{candidateName}</span> into a
                  list.
                </>
              ) : (
                "Pick an existing list or create a new one."
              )}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="dashboard-add-campaign-form flex min-h-0 flex-1 flex-col"
        >
          <div className="dashboard-add-campaign-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="dashboard-add-campaign-scroll-inner !gap-4">
              <label
                className={`dashboard-add-campaign-create-option flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2.5 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0050cb]/35${
                  isNew
                    ? " dashboard-add-campaign-create-option--active"
                    : " border-[#0050cb]/35 bg-gradient-to-r from-[#f0f6ff] to-[#f8f9ff] hover:border-[#0050cb]/55 hover:from-[#e8f1ff] hover:to-[#f3f7ff]"
                }${submitting ? " cursor-not-allowed opacity-55" : ""}`}
              >
                <input
                  type="radio"
                  name="save-list-mode"
                  value={NEW_LIST_VALUE}
                  checked={isNew}
                  onChange={() => {
                    setChoice(NEW_LIST_VALUE);
                    setSubmitError("");
                  }}
                  disabled={submitting}
                  className="sr-only"
                />
                <span className="dashboard-add-campaign-create-option-icon shrink-0" aria-hidden>
                  <MaterialIcon name="add" className="text-[20px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#141b2b]">Create new list</span>
                    <span className="dashboard-add-campaign-create-badge">New</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {candidateCount > 1
                      ? "Make a fresh list and save these candidates into it"
                      : "Make a fresh list and save this candidate into it"}
                  </span>
                </span>
                {isNew ? (
                  <MaterialIcon name="check_circle" className="text-lg text-[#0050cb]" aria-hidden />
                ) : (
                  <MaterialIcon
                    name="chevron_right"
                    className="text-lg text-[#0050cb]/55"
                    aria-hidden
                  />
                )}
              </label>

              <div>
                <p className="dashboard-add-campaign-existing-label !mb-2">
                  Or choose an existing list
                </p>
                <button
                  type="button"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onFocus={() => {
                    if (isNew && selected) setChoice(selected.value);
                  }}
                />
                <Select<ListSelectOption, false>
                  inputId={selectId}
                  instanceId={selectId}
                  options={listOptions}
                  value={isNew ? null : selected}
                  onChange={handlePickExisting}
                  onMenuOpen={() => {
                    if (!isNew) return;
                    setChoice(selected?.value ?? "");
                  }}
                  isDisabled={submitting}
                  isLoading={listsLoading}
                  isSearchable
                  isClearable={false}
                  placeholder="Select a list…"
                  noOptionsMessage={() => "No lists match your search"}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  menuPosition="fixed"
                  styles={selectStyles}
                  classNamePrefix="save-to-list-select"
                  components={{ Option: ListOption }}
                  filterOption={(option, rawInput) => {
                    const q = rawInput.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      option.label.toLowerCase().includes(q) ||
                      Boolean(option.data.description?.toLowerCase().includes(q))
                    );
                  }}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Type to search — works well when you have many lists.
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-add-campaign-footer shrink-0">
            {isNew ? (
              <label
                htmlFor={newNameId}
                className={`${dashboardLabelClass} dashboard-add-campaign-footer-section block`}
              >
                List name
                <input
                  ref={nameInputRef}
                  id={newNameId}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`${dashboardInputClass} dashboard-add-campaign-field dashboard-add-campaign-name-input mt-1 w-full`}
                  placeholder="e.g. Senior engineers shortlist"
                  disabled={submitting}
                  maxLength={80}
                  autoComplete="off"
                />
              </label>
            ) : null}

            {submitError ? (
              <p className="dashboard-alert-warning" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="dashboard-confirm-modal-footer dashboard-add-campaign-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={`${dashboardBtnSecondaryClass} dashboard-add-campaign-btn`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`${dashboardBtnPrimaryClass} dashboard-add-campaign-btn`}
              >
                <ButtonLoadingContent loading={submitting} loadingLabel="Saving">
                  <MaterialIcon name="bookmark" className="text-base" />
                  {isNew
                    ? "Create & save"
                    : candidateCount > 1
                      ? `Save ${candidateCount}`
                      : "Save candidate"}
                </ButtonLoadingContent>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
