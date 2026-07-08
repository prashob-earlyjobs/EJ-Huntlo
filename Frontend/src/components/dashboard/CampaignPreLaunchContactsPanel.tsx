"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import type { CampaignContact } from "@/lib/campaigns";

type Channel = "gmail" | "whatsapp" | "voice_call";

type Props = {
  channel: Channel;
  contacts: CampaignContact[];
  totalContacts: number;
  page: number;
  totalPages: number;
  loading?: boolean;
  error?: string;
  refreshing?: boolean;
  revealInProgress?: boolean;
  contactsLocked?: boolean;
  removingKey?: string;
  selectable?: boolean;
  selectedKeys?: string[];
  onToggleContact?: (candidateKey: string, selected: boolean) => void;
  onToggleAllOnPage?: (candidateKeys: string[], selected: boolean) => void;
  onPageChange?: (page: number) => void;
  onAddFromSearchHistory?: () => void;
  onUploadCsv?: () => void;
  onRemoveContact?: (candidateKey: string) => void | Promise<void>;
  onRemoveSelectedContacts?: () => void | Promise<void>;
  removingSelected?: boolean;
  /** Dedicated contacts step in new-campaign setup (before sequence editor). */
  setupStep?: boolean;
};

function contactChannelValue(contact: CampaignContact, channel: Channel): string {
  return channel === "gmail" ? contact.email.trim() : contact.phone.trim();
}

function contactReadinessLabel(
  contact: CampaignContact,
  channel: Channel,
  revealInProgress: boolean
): string {
  const value = contactChannelValue(contact, channel);
  if (value) {
    if (channel === "whatsapp") return "Ready for WhatsApp";
    if (channel === "voice_call") return "Ready for AI voice call";
    return "Ready for Email";
  }
  if (revealInProgress) return "Revealing...";
  if (channel === "whatsapp") return "Missing phone";
  if (channel === "voice_call") return "Missing phone";
  return "Missing email";
}

function buildPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

type RemoveConfirm =
  | { kind: "single"; contact: CampaignContact }
  | { kind: "bulk"; count: number };

export function CampaignPreLaunchContactsPanel({
  channel,
  contacts,
  totalContacts,
  page,
  totalPages,
  loading = false,
  error = "",
  refreshing = false,
  revealInProgress = false,
  contactsLocked = false,
  removingKey = "",
  selectable = false,
  selectedKeys = [],
  onToggleContact,
  onToggleAllOnPage,
  onPageChange,
  onAddFromSearchHistory,
  onUploadCsv,
  onRemoveContact,
  onRemoveSelectedContacts,
  removingSelected = false,
  setupStep = false,
}: Props) {
  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirm | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const isWhatsApp = channel === "whatsapp";
  const isVoiceCall = channel === "voice_call";
  const showSelection = selectable && isVoiceCall;
  const selectedKeySet = new Set(selectedKeys);
  const selectableOnPage = contacts
    .filter((contact) => Boolean(contactChannelValue(contact, channel)))
    .map((contact) => contact.candidateKey);
  const allOnPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((key) => selectedKeySet.has(key));
  const someOnPageSelected =
    selectableOnPage.some((key) => selectedKeySet.has(key)) && !allOnPageSelected;
  const pageNumbers = buildPageNumbers(page, totalPages);
  const channelLabel = isVoiceCall ? "AI voice call" : isWhatsApp ? "WhatsApp" : "Gmail";
  const contactFieldLabel = isVoiceCall || isWhatsApp ? "Phone" : "Email";

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  const removeConfirmTitle =
    removeConfirm?.kind === "single"
      ? `Remove ${removeConfirm.contact.name.trim() || "this contact"}?`
      : removeConfirm?.kind === "bulk"
        ? `Remove ${removeConfirm.count} contact${removeConfirm.count === 1 ? "" : "s"}?`
        : "";

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-white p-4">
        <CampaignContactsSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error py-12">
        {error}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {isVoiceCall ? (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600"
              aria-hidden
            >
              <MaterialIcon name="record_voice_over" className="text-base" />
            </span>
          ) : (
            <IntegrationBrandLogo
              provider={isWhatsApp ? "whatsapp" : "gmail"}
              title={channelLabel}
              className="h-6 w-6"
            />
          )}
          <p className="text-sm font-medium text-slate-700">
            Contacts ({totalContacts.toLocaleString()}) - conversations unlock after campaign{" "}
            {isWhatsApp || isVoiceCall ? "start" : "launch"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showSelection && selectedKeys.length > 0 && onRemoveSelectedContacts ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-55"
              disabled={contactsLocked || removingSelected}
              onClick={() => setRemoveConfirm({ kind: "bulk", count: selectedKeys.length })}
            >
              <MaterialIcon name="delete" className="text-base" />
              {removingSelected ? "Deleting..." : `Delete all (${selectedKeys.length})`}
            </button>
          ) : null}
          <button
            type="button"
            className="dashboard-btn-primary inline-flex min-h-9 items-center gap-1.5 px-3 text-xs disabled:opacity-55"
            disabled={contactsLocked || !onAddFromSearchHistory}
            onClick={onAddFromSearchHistory}
          >
            <MaterialIcon name="person_add" className="text-base" />
            Add candidate
          </button>
          <button
            type="button"
            className="dashboard-btn-secondary inline-flex min-h-9 items-center gap-1.5 px-3 text-xs disabled:opacity-55"
            disabled={contactsLocked || !onUploadCsv}
            onClick={onUploadCsv}
          >
            <MaterialIcon name="upload_file" className="text-base" />
            Upload CSV
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-white p-4">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-600">
                {showSelection ? (
                  <th className="w-10 px-3 py-2 font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPageSelected;
                      }}
                      disabled={selectableOnPage.length === 0 || contactsLocked}
                      aria-label="Select all contacts on this page"
                      onChange={(event) => {
                        onToggleAllOnPage?.(selectableOnPage, event.target.checked);
                      }}
                    />
                  </th>
                ) : null}
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">{contactFieldLabel}</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={showSelection ? 7 : 6}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    No contacts yet. Add candidates from search history or upload a CSV.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                <tr key={contact.candidateKey} className="border-t border-slate-100">
                  {showSelection ? (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selectedKeySet.has(contact.candidateKey)}
                        disabled={
                          contactsLocked || !contactChannelValue(contact, channel)
                        }
                        aria-label={`Select ${contact.name.trim() || "contact"}`}
                        onChange={(event) => {
                          onToggleContact?.(contact.candidateKey, event.target.checked);
                        }}
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-slate-800">
                    {contact.name.trim() || "Unnamed contact"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {contactChannelValue(contact, channel) ||
                      (revealInProgress ? "Revealing..." : "-")}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{contact.company || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{contact.role || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {contactReadinessLabel(contact, channel, revealInProgress)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className={`dashboard-table-icon-btn dashboard-table-icon-btn--sm dashboard-table-icon-btn--danger${
                        removingKey === contact.candidateKey
                          ? " dashboard-table-icon-btn--loading"
                          : ""
                      }`}
                      disabled={!onRemoveContact || removingKey === contact.candidateKey}
                      aria-label={
                        removingKey === contact.candidateKey
                          ? `Removing ${contact.name.trim() || "contact"}`
                          : `Remove ${contact.name.trim() || "contact"}`
                      }
                      onClick={() => {
                        if (!onRemoveContact || removingKey === contact.candidateKey) return;
                        setRemoveConfirm({ kind: "single", contact });
                      }}
                    >
                      {removingKey === contact.candidateKey ? (
                        <span className="dashboard-reveal-spinner" aria-hidden />
                      ) : (
                        <MaterialIcon name="delete" className="text-base" aria-hidden />
                      )}
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {setupStep
            ? "You can add contacts now or click Continue to finish sequence setup in the next step."
            : isVoiceCall
              ? "Select contacts with phone numbers, then launch the campaign to start AI voice calls."
              : isWhatsApp
                ? "Start the campaign sequence from the editor/workspace to activate WhatsApp conversations."
                : "Launch the campaign sequence from the editor/workspace to activate Gmail conversations."}
        </p>
        {totalPages > 1 && onPageChange ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={page <= 1 || refreshing}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </button>
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  pageNum === page
                    ? "bg-[#0050cb] text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                disabled={pageNum === page || refreshing}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={page >= totalPages || refreshing}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      {portalMounted && removeConfirm
        ? createPortal(
            <div
              className="dashboard-campaign-voice-agent-delete-modal-overlay"
              role="presentation"
              onClick={() => setRemoveConfirm(null)}
            >
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="campaign-contact-remove-title"
                className="dashboard-campaign-voice-agent-delete-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <h4
                  id="campaign-contact-remove-title"
                  className="dashboard-campaign-voice-agent-delete-modal-title"
                >
                  {removeConfirmTitle}
                </h4>
                <div className="dashboard-campaign-voice-agent-delete-modal-actions">
                  <button
                    type="button"
                    className={`${dashboardBtnSecondaryClass} dashboard-campaign-voice-agent-delete-modal-btn`}
                    onClick={() => setRemoveConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="dashboard-btn-danger dashboard-campaign-voice-agent-delete-modal-btn"
                    onClick={() => {
                      if (removeConfirm.kind === "single") {
                        if (!onRemoveContact) return;
                        const candidateKey = removeConfirm.contact.candidateKey;
                        setRemoveConfirm(null);
                        void onRemoveContact(candidateKey);
                        return;
                      }
                      setRemoveConfirm(null);
                      void onRemoveSelectedContacts?.();
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
