"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchCampaignWhatsAppConversations,
  formatWhatsAppMessageTime,
  type WhatsAppContactThread,
  type WhatsAppMessageStatus,
  type WhatsAppThreadMessage,
} from "@/lib/campaignWhatsAppApi";

type FilterKey = "all" | "interested" | "not_interested" | "awaiting";

type Props = {
  campaignId: string;
  /** Bump to refetch (e.g. after campaign launch). */
  refreshKey?: number;
  revealInProgress?: boolean;
};

function contactInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function statusIcon(status?: WhatsAppMessageStatus) {
  if (!status) return null;
  if (status === "failed") {
    return (
      <MaterialIcon
        name="error_outline"
        className="dashboard-campaign-wa-msg-status--failed text-sm"
      />
    );
  }
  if (status === "pending") {
    return <MaterialIcon name="schedule" className="dashboard-campaign-wa-msg-status text-sm" />;
  }
  if (status === "sent") {
    return <MaterialIcon name="done" className="dashboard-campaign-wa-msg-status text-sm" />;
  }
  if (status === "delivered") {
    return <MaterialIcon name="done_all" className="dashboard-campaign-wa-msg-status text-sm" />;
  }
  return (
    <MaterialIcon
      name="done_all"
      className="dashboard-campaign-wa-msg-status dashboard-campaign-wa-msg-status--read text-sm"
    />
  );
}

function MessageFailureInfo({ errorMessage }: { errorMessage: string }) {
  const reason = errorMessage.trim() || "Delivery failed. No additional details were returned.";
  return (
    <span className="dashboard-campaign-wa-msg-fail-info">
      <button
        type="button"
        className="dashboard-campaign-wa-msg-fail-btn"
        aria-label={`Failure reason: ${reason}`}
      >
        <MaterialIcon name="info" className="text-sm" />
      </button>
      <span className="dashboard-campaign-wa-msg-fail-tooltip" role="tooltip">
        <span className="dashboard-campaign-wa-msg-fail-tooltip-title">Failure reason</span>
        <span className="dashboard-campaign-wa-msg-fail-tooltip-body">{reason}</span>
      </span>
    </span>
  );
}

function threadStatusLabel(status: WhatsAppContactThread["threadStatus"]) {
  switch (status) {
    case "replied":
      return "Replied";
    case "awaiting":
      return "Awaiting reply";
    case "failed":
      return "Delivery failed";
    case "no_phone":
      return "No phone";
    default:
      return "";
  }
}

export function CampaignWhatsAppCommunicationsPanel({
  campaignId,
  refreshKey = 0,
  revealInProgress = false,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [threads, setThreads] = useState<WhatsAppContactThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outreachStatus, setOutreachStatus] = useState("idle");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }
      const data = await fetchCampaignWhatsAppConversations(auth.token, campaignId);
      setThreads(data.threads);
      setOutreachStatus(data.outreachStatus);
    } catch (err) {
      setThreads([]);
      setError(err instanceof Error ? err.message : "Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations, refreshKey]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      const disposition = t.enrollment?.replyDisposition || "unknown";
      if (filter === "interested" && disposition !== "interested") return false;
      if (filter === "not_interested" && disposition !== "not_interested") return false;
      if (
        filter === "awaiting" &&
        (disposition === "interested" || disposition === "not_interested")
      ) {
        return false;
      }
      if (!q) return true;
      const name = t.contact.name.toLowerCase();
      const phone = t.contact.phone.toLowerCase();
      const company = t.contact.company.toLowerCase();
      return name.includes(q) || phone.includes(q) || company.includes(q);
    });
  }, [threads, filter, search]);

  const activeKey = selectedKey ?? filteredThreads[0]?.contactKey ?? null;
  const activeThread = filteredThreads.find((t) => t.contactKey === activeKey) ?? null;

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "interested", label: "Interested" },
    { key: "not_interested", label: "Not Interested" },
    { key: "awaiting", label: "Awaiting Reply" },
  ];

  if (loading) {
    return (
      <div className="dashboard-campaign-wa-comms flex min-h-0 flex-1 flex-col">
        <div className="dashboard-campaign-wa-comms-layout flex min-h-0 flex-1">
          <div className="dashboard-campaign-wa-comms-list border-r border-slate-200 p-4">
            <CampaignContactsSkeleton rows={8} />
          </div>
          <div className="dashboard-campaign-wa-comms-thread hidden flex-1 p-6 md:flex md:items-center md:justify-center">
            <p className="dashboard-text-body text-sm text-slate-500">Loading conversations…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
        <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error text-center">
          {error}
        </p>
        <button
          type="button"
          className="dashboard-btn-secondary text-sm"
          onClick={() => void loadConversations()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="dashboard-campaign-workspace-placeholder-wrap flex flex-1 flex-col items-center justify-center py-16">
        <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className="mb-3 h-10 w-10" />
        <p className="dashboard-campaign-workspace-placeholder max-w-md text-center">
          No contacts yet. Add candidates from Session Results to view WhatsApp conversations
          for this campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-campaign-wa-comms flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-wa-comms-toolbar shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className="h-6 w-6" />
            <p className="dashboard-campaign-wa-comms-summary">
              {threads.length} conversation{threads.length === 1 ? "" : "s"}
            </p>
          </div>
          {outreachStatus === "active" ? (
            <span className="dashboard-campaign-wa-comms-preview-pill dashboard-campaign-wa-comms-live-pill">
              Sequence active
            </span>
          ) : null}
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => void loadConversations()}
            aria-label="Refresh conversations"
          >
            <MaterialIcon name="refresh" className="text-base" />
            Refresh
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="dashboard-campaign-wa-comms-search relative min-w-[12rem] flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, company…"
              className="dashboard-campaign-wa-comms-search-input w-full"
            />
          </label>
          <div
            className="dashboard-campaign-wa-comms-filters"
            role="tablist"
            aria-label="Filter conversations"
          >
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={filter === opt.key}
                className={`dashboard-campaign-wa-comms-filter${filter === opt.key ? " dashboard-campaign-wa-comms-filter--active" : ""}`}
                onClick={() => setFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-campaign-wa-comms-layout flex min-h-0 flex-1">
        <aside
          className={`dashboard-campaign-wa-comms-list flex min-h-0 w-full min-w-0 flex-col border-slate-200 md:w-[min(100%,320px)] md:max-w-[38%] md:border-r${
            selectedKey ? " hidden md:flex" : ""
          }`}
        >
          <ul className="dashboard-campaign-wa-comms-list-scroll min-h-0 flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                No conversations match your filters.
              </li>
            ) : (
              filteredThreads.map((thread) => {
                const active = thread.contactKey === activeKey;
                const name = thread.contact.name.trim() || "Unnamed contact";
                const subtitle = [thread.contact.role, thread.contact.company]
                  .filter(Boolean)
                  .join(" · ");
                const timeShort = formatWhatsAppMessageTime(thread.lastTimeLabel);
                return (
                  <li key={thread.contactKey}>
                    <button
                      type="button"
                      className={`dashboard-campaign-wa-comms-list-item w-full text-left${active ? " dashboard-campaign-wa-comms-list-item--active" : ""}`}
                      onClick={() => setSelectedKey(thread.contactKey)}
                    >
                      <span className="dashboard-campaign-wa-comms-list-avatar" aria-hidden>
                        {contactInitial(name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="dashboard-campaign-wa-comms-list-name truncate">
                            {name}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500">{timeShort}</span>
                        </span>
                        {subtitle ? (
                          <span className="dashboard-campaign-wa-comms-list-meta truncate block">
                            {subtitle}
                          </span>
                        ) : null}
                        <span className="dashboard-campaign-wa-comms-list-preview truncate block">
                          {thread.lastPreview}
                        </span>
                        <span
                          className={`dashboard-campaign-wa-comms-list-badge dashboard-campaign-wa-comms-list-badge--${thread.threadStatus}`}
                        >
                          {threadStatusLabel(thread.threadStatus)}
                        </span>
                      </span>
                      {thread.unreadCount > 0 ? (
                        <span
                          className="dashboard-campaign-wa-comms-unread"
                          aria-label={`${thread.unreadCount} unread`}
                        >
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <div
          className={`dashboard-campaign-wa-comms-thread min-h-0 min-w-0 flex-1 flex-col bg-[#e5ddd5] ${
            selectedKey ? "flex" : "hidden md:flex"
          }`}
        >
          {!activeThread ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <MaterialIcon name="forum" className="text-4xl text-slate-400" />
              <p className="text-sm text-slate-600">Select a contact to view the conversation</p>
            </div>
          ) : (
            <>
              <header className="dashboard-campaign-wa-comms-thread-head shrink-0">
                <button
                  type="button"
                  className="dashboard-campaign-wa-comms-back md:hidden"
                  onClick={() => setSelectedKey(null)}
                  aria-label="Back to conversations"
                >
                  <MaterialIcon name="arrow_back" className="text-xl" />
                </button>
                <span className="dashboard-campaign-wa-comms-thread-avatar" aria-hidden>
                  {contactInitial(activeThread.contact.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="dashboard-campaign-wa-comms-thread-name truncate">
                    {activeThread.contact.name.trim() || "Unnamed contact"}
                  </p>
                  <p className="dashboard-campaign-wa-comms-thread-meta truncate">
                    {activeThread.contact.phone.trim() ||
                      (revealInProgress ? "Revealing phone…" : "No phone on file")}
                    {activeThread.contact.role || activeThread.contact.company
                      ? ` · ${[activeThread.contact.role, activeThread.contact.company].filter(Boolean).join(" · ")}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`dashboard-campaign-wa-comms-thread-status dashboard-campaign-wa-comms-thread-status--${activeThread.threadStatus}`}
                >
                  {threadStatusLabel(activeThread.threadStatus)}
                </span>
              </header>

              <div className="dashboard-campaign-wa-comms-messages min-h-0 flex-1 overflow-y-auto">
                {activeThread.messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                    <MaterialIcon name="chat_bubble_outline" className="text-4xl text-slate-500" />
                    <p className="max-w-xs text-sm text-slate-600">
                      {activeThread.threadStatus === "no_phone"
                        ? "Add a phone number for this contact to receive WhatsApp outreach."
                        : "No messages sent yet. Launch the campaign sequence to start outreach."}
                    </p>
                  </div>
                ) : (
                  <div className="dashboard-campaign-wa-comms-messages-inner">
                    {activeThread.messages.map((msg: WhatsAppThreadMessage) => (
                      <div
                        key={msg.id}
                        className={`dashboard-campaign-wa-msg dashboard-campaign-wa-msg--${msg.direction}`}
                      >
                        {msg.sequenceStep ? (
                          <span className="dashboard-campaign-wa-msg-step">{msg.sequenceStep}</span>
                        ) : null}
                        <div
                          className={`dashboard-campaign-wa-msg-bubble${
                            msg.status === "failed" ? " dashboard-campaign-wa-msg-bubble--failed" : ""
                          }`}
                        >
                          <p className="dashboard-campaign-wa-msg-text">{msg.body}</p>
                          <span className="dashboard-campaign-wa-msg-meta">
                            <span>{formatWhatsAppMessageTime(msg.sentAt)}</span>
                            {msg.direction === "outbound" && msg.status !== "failed"
                              ? statusIcon(msg.status)
                              : null}
                            {msg.status === "failed" ? (
                              <MessageFailureInfo errorMessage={msg.errorMessage || ""} />
                            ) : null}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <footer className="dashboard-campaign-wa-comms-composer shrink-0">
                <p className="dashboard-campaign-wa-comms-composer-note">
                  <MaterialIcon name="info" className="text-base shrink-0" />
                  Inbound replies will appear here when Meta webhooks are connected.
                </p>
                <div className="dashboard-campaign-wa-comms-composer-row opacity-60">
                  <input
                    type="text"
                    disabled
                    placeholder="Type a message…"
                    className="dashboard-campaign-wa-comms-composer-input flex-1"
                    aria-disabled
                  />
                  <button
                    type="button"
                    disabled
                    className="dashboard-campaign-wa-comms-send"
                    aria-label="Send message"
                  >
                    <MaterialIcon name="send" className="text-lg" />
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
