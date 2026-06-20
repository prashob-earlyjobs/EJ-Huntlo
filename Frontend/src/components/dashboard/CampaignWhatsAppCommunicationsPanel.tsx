"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";

import { CampaignPreLaunchContactsPanel } from "@/components/dashboard/CampaignPreLaunchContactsPanel";
import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { CampaignWorkspaceEmptyState } from "@/components/dashboard/CampaignWorkspaceEmptyState";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchCampaignWhatsAppThreadMessages,
  fetchCampaignWhatsAppConversations,
  formatWhatsAppMessageTime,
  markCampaignWhatsAppThreadRead,
  sendCampaignWhatsAppSessionMessage,
  type WhatsAppContactThread,
  type WhatsAppMessageStatus,
  type WhatsAppThreadMessage,
} from "@/lib/campaignWhatsAppApi";

type Props = {
  campaignId: string;
  /** Open this contact thread when set (URL deep link). */
  initialContactKey?: string | null;
  /** Bump to refetch (e.g. after campaign launch). */
  refreshKey?: number;
  revealInProgress?: boolean;
  /** Disable add/remove contacts (active or completed campaign). */
  contactsLocked?: boolean;
  onAddFromSearchHistory?: () => void;
  onUploadCsv?: () => void;
  onRemoveCandidate?: (candidateKey: string) => Promise<void> | void;
};

const THREAD_PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;

type MessagePageState = {
  page: number;
  hasMore: boolean;
  loading: boolean;
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

function sessionWindowNote(thread: WhatsAppContactThread | null): string {
  if (!thread?.contact.phone.trim()) {
    return "Add a phone number to message this contact.";
  }
  const hasInbound = thread.messages.some((m) => m.direction === "inbound");
  if (!hasInbound) {
    return "You can reply with free text after the candidate sends a WhatsApp message (24-hour window).";
  }
  if (thread.sessionWindow.canReply && thread.sessionWindow.expiresAt) {
    const expires = formatWhatsAppMessageTime(thread.sessionWindow.expiresAt);
    return `Free-form replies allowed until ${expires} (24 hours after their last message).`;
  }
  return "The 24-hour reply window has expired.";
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
  initialContactKey = null,
  refreshKey = 0,
  revealInProgress = false,
  contactsLocked = false,
  onAddFromSearchHistory,
  onUploadCsv,
  onRemoveCandidate,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [threads, setThreads] = useState<WhatsAppContactThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversationsVersion, setConversationsVersion] = useState(0);
  const [error, setError] = useState("");
  const [outreachStatus, setOutreachStatus] = useState("idle");
  const [threadCount, setThreadCount] = useState(0);
  const [threadPage, setThreadPage] = useState(1);
  const [hasMoreThreads, setHasMoreThreads] = useState(false);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [messagePageByThread, setMessagePageByThread] = useState<Record<string, MessagePageState>>(
    {}
  );
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [removingKey, setRemovingKey] = useState<string>("");
  const threadListRef = useRef<HTMLUListElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const loadingOlderRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const scrollMessagesToBottom = useCallback(() => {
    const run = (attempt = 0) => {
      const el = messageListRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
      const atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 8;
      if (!atBottom && attempt < 4) {
        requestAnimationFrame(() => run(attempt + 1));
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => run(0));
    });
  }, []);

  const loadConversations = useCallback(async (
    page = 1,
    append = false,
    options?: { soft?: boolean }
  ) => {
    if (append) setLoadingMoreThreads(true);
    else if (options?.soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }
      const data = await fetchCampaignWhatsAppConversations(auth.token, campaignId, {
        threadPage: page,
        threadPageSize: THREAD_PAGE_SIZE,
        messagePageSize: MESSAGE_PAGE_SIZE,
      });
      setThreads((prev) => {
        if (!append) return data.threads;
        const byKey = new Map(prev.map((t) => [t.contactKey, t]));
        for (const thread of data.threads) {
          byKey.set(thread.contactKey, thread);
        }
        return Array.from(byKey.values());
      });
      setOutreachStatus(data.outreachStatus);
      setThreadCount(data.threadCount);
      setThreadPage(data.threadPage);
      setHasMoreThreads(data.hasMoreThreads);
      setMessagePageByThread((prev) => {
        const next = { ...prev };
        for (const thread of data.threads) {
          if (append && next[thread.contactKey]) continue;
          next[thread.contactKey] = {
            page: 1,
            hasMore: thread.hasMoreMessages,
            loading: false,
          };
        }
        return next;
      });
      setConversationsVersion((v) => v + 1);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      if (!append && !options?.soft) setThreads([]);
      setError(err instanceof Error ? err.message : "Failed to load conversations.");
    } finally {
      if (append) setLoadingMoreThreads(false);
      else if (options?.soft) setRefreshing(false);
      else setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
  }, [campaignId]);

  useEffect(() => {
    void loadConversations(1, false, { soft: hasLoadedOnceRef.current });
  }, [loadConversations, refreshKey]);

  useEffect(() => {
    const key = String(initialContactKey || "").trim();
    if (!key) return;
    setSelectedKey(key);
  }, [initialContactKey]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (!q) return true;
      const name = t.contact.name.toLowerCase();
      const phone = t.contact.phone.toLowerCase();
      const company = t.contact.company.toLowerCase();
      return name.includes(q) || phone.includes(q) || company.includes(q);
    });
  }, [threads, search]);

  const activeKey = selectedKey ?? filteredThreads[0]?.contactKey ?? null;
  const activeThread = filteredThreads.find((t) => t.contactKey === activeKey) ?? null;
  const activeLastMessageId = activeThread?.messages.at(-1)?.id ?? null;
  const totalPages = Math.max(1, Math.ceil(threadCount / THREAD_PAGE_SIZE));

  useEffect(() => {
    setDraftText("");
    setSendError("");
  }, [activeKey]);

  useEffect(() => {
    if (loading || refreshing) return;
    if (!activeKey || !activeThread?.messages.length) return;
    if (loadingOlderRef.current) return;
    scrollMessagesToBottom();
  }, [
    loading,
    refreshing,
    activeKey,
    activeThread?.messages.length,
    activeLastMessageId,
    conversationsVersion,
    scrollMessagesToBottom,
  ]);

  const markThreadRead = useCallback(
    async (candidateKey: string) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.contactKey === candidateKey ? { ...t, unreadCount: 0 } : t
        )
      );

      try {
        const auth = getStoredAuth();
        if (!auth?.token) return;
        const result = await markCampaignWhatsAppThreadRead(
          auth.token,
          campaignId,
          candidateKey
        );
        setThreads((prev) =>
          prev.map((t) =>
            t.contactKey === candidateKey
              ? {
                  ...t,
                  unreadCount: result.unreadCount,
                  lastReadAt: result.lastReadAt,
                }
              : t
          )
        );
      } catch {
        void loadConversations(1, false, { soft: true });
      }
    },
    [campaignId, loadConversations]
  );

  useEffect(() => {
    if (!activeKey || !activeThread || activeThread.unreadCount === 0) return;
    void markThreadRead(activeKey);
  }, [activeKey, activeThread, markThreadRead]);

  const canCompose =
    outreachStatus !== "completed" &&
    Boolean(activeThread?.contact.phone.trim()) &&
    Boolean(activeThread?.sessionWindow.canReply);

  const loadOlderMessages = useCallback(async () => {
    if (!activeThread) return;
    const pageState = messagePageByThread[activeThread.contactKey];
    if (!pageState || !pageState.hasMore || pageState.loading) return;

    loadingOlderRef.current = true;
    setMessagePageByThread((prev) => ({
      ...prev,
      [activeThread.contactKey]: {
        ...pageState,
        loading: true,
      },
    }));
    try {
      const auth = getStoredAuth();
      if (!auth?.token) throw new Error("Please sign in again.");
      const nextPage = pageState.page + 1;
      const result = await fetchCampaignWhatsAppThreadMessages(
        auth.token,
        campaignId,
        activeThread.contactKey,
        { page: nextPage, pageSize: MESSAGE_PAGE_SIZE }
      );
      const container = messageListRef.current;
      const previousHeight = container?.scrollHeight ?? 0;
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.contactKey !== activeThread.contactKey) return thread;
          const seen = new Set(thread.messages.map((m) => m.id));
          const older = result.messages.filter((m) => !seen.has(m.id));
          return { ...thread, messages: [...older, ...thread.messages] };
        })
      );
      requestAnimationFrame(() => {
        const current = messageListRef.current;
        if (!current) return;
        const newHeight = current.scrollHeight;
        const delta = newHeight - previousHeight;
        if (delta > 0) current.scrollTop += delta;
        loadingOlderRef.current = false;
      });
      setMessagePageByThread((prev) => ({
        ...prev,
        [activeThread.contactKey]: {
          page: result.page,
          hasMore: result.hasMore,
          loading: false,
        },
      }));
    } catch {
      loadingOlderRef.current = false;
      setMessagePageByThread((prev) => ({
        ...prev,
        [activeThread.contactKey]: {
          ...pageState,
          loading: false,
        },
      }));
    }
  }, [activeThread, campaignId, messagePageByThread]);

  const handleThreadListScroll = useCallback(
    (event: UIEvent<HTMLUListElement>) => {
      if (!hasMoreThreads || loadingMoreThreads) return;
      const target = event.currentTarget;
      const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
      if (nearBottom) {
        void loadConversations(threadPage + 1, true);
      }
    },
    [hasMoreThreads, loadingMoreThreads, loadConversations, threadPage]
  );

  const handleMessageScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!activeThread) return;
      const state = messagePageByThread[activeThread.contactKey];
      if (!state || !state.hasMore || state.loading) return;
      if (event.currentTarget.scrollTop < 100) {
        void loadOlderMessages();
      }
    },
    [activeThread, loadOlderMessages, messagePageByThread]
  );

  const handleSendMessage = useCallback(async () => {
    const text = draftText.trim();
    if (!text || !activeThread || !canCompose || sending) return;

    setSending(true);
    setSendError("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }
      const result = await sendCampaignWhatsAppSessionMessage(
        auth.token,
        campaignId,
        activeThread.contactKey,
        text
      );
      setDraftText("");
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.contactKey !== activeThread.contactKey) return thread;
          const messages = [...thread.messages, result.message];
          const lastMessage = result.message;
          return {
            ...thread,
            messages,
            sessionWindow: result.sessionWindow,
            lastPreview: lastMessage.body ? `You: ${lastMessage.body}` : "Message sent",
            lastTimeLabel: lastMessage.sentAt,
            unreadCount: result.unreadCount ?? 0,
            lastReadAt: result.lastReadAt ?? thread.lastReadAt,
          };
        })
      );
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [activeThread, campaignId, canCompose, draftText, sending]);

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
      <CampaignWorkspaceEmptyState
        icon="error_outline"
        title="Could not load conversations"
        description={error}
        actions={[
          {
            label: "Retry",
            onClick: () => void loadConversations(),
          },
        ]}
      />
    );
  }

  if (threads.length === 0) {
    return (
      <CampaignWorkspaceEmptyState
        brand="whatsapp"
        title="No contacts yet"
        description="Add candidates to this campaign to view WhatsApp conversations and manage replies in one place."
        actions={[
          {
            label: "Add from search history",
            disabled: contactsLocked,
            onClick: onAddFromSearchHistory,
          },
          {
            label: "Upload CSV",
            disabled: contactsLocked,
            onClick: onUploadCsv,
          },
        ]}
      />
    );
  }

  if (outreachStatus === "idle") {
    return (
      <CampaignPreLaunchContactsPanel
        channel="whatsapp"
        contacts={threads.map((thread) => thread.contact)}
        totalContacts={threadCount}
        page={threadPage}
        totalPages={totalPages}
        refreshing={refreshing}
        revealInProgress={revealInProgress}
        contactsLocked={contactsLocked}
        removingKey={removingKey}
        onPageChange={(pageNum) => void loadConversations(pageNum, false, { soft: true })}
        onAddFromSearchHistory={onAddFromSearchHistory}
        onUploadCsv={onUploadCsv}
        onRemoveContact={
          onRemoveCandidate
            ? async (candidateKey) => {
                if (removingKey === candidateKey) return;
                setRemovingKey(candidateKey);
                try {
                  await onRemoveCandidate(candidateKey);
                } finally {
                  setRemovingKey("");
                }
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="dashboard-campaign-wa-comms flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-wa-comms-toolbar shrink-0">
        <div className="dashboard-outreach-gmail-bar dashboard-campaign-wa-comms-bar shrink-0 border-b-0">
          <div className="dashboard-outreach-gmail-bar-heading flex min-w-0 items-center gap-2.5">
            <span className="dashboard-campaign-sequence-toolbar-icon shrink-0" aria-hidden>
              <IntegrationBrandLogo
                provider="whatsapp"
                title="WhatsApp"
                className="h-[22px] w-[22px]"
              />
            </span>
            <div className="min-w-0">
              <h2 className="dashboard-campaign-report-title truncate">WhatsApp conversations</h2>
              <p className="dashboard-campaign-report-subtitle truncate">
                {threadCount} conversation{threadCount === 1 ? "" : "s"} · View and reply to
                candidate messages
              </p>
            </div>
          </div>
          <div className="dashboard-outreach-gmail-bar-actions flex shrink-0 flex-wrap items-center justify-end gap-2">
            {outreachStatus === "active" ? (
              <span className="dashboard-campaign-wa-comms-preview-pill dashboard-campaign-wa-comms-live-pill">
                Sequence active
              </span>
            ) : outreachStatus === "completed" ? (
              <span className="dashboard-campaign-wa-comms-preview-pill bg-slate-100 text-slate-600">
                Campaign completed
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              onClick={() => void loadConversations(1, false, { soft: true })}
              disabled={refreshing}
              aria-label="Refresh conversations"
            >
              <MaterialIcon
                name="refresh"
                className={`text-base${refreshing ? " animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <div className="mt-0 flex flex-wrap items-center gap-2 sm:mt-2">
          <label className="dashboard-campaign-wa-comms-search relative min-w-48 flex-1">
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
        </div>
      </div>

      <div className="dashboard-campaign-wa-comms-layout flex min-h-0 flex-1">
        <aside
          className={`dashboard-campaign-wa-comms-list flex min-h-0 w-full min-w-0 flex-col border-slate-200 md:w-[min(100%,320px)] md:max-w-[38%] md:border-r${
            selectedKey ? " hidden md:flex" : ""
          }`}
        >
          <ul
            ref={threadListRef}
            className="dashboard-campaign-wa-comms-list-scroll min-h-0 flex-1 overflow-y-auto"
            onScroll={handleThreadListScroll}
          >
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
          {loadingMoreThreads ? (
            <div className="border-t border-slate-200 px-3 py-2 text-center text-xs text-slate-500">
              Loading more conversations...
            </div>
          ) : null}
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

              <div
                ref={messageListRef}
                className="dashboard-campaign-wa-comms-messages min-h-0 flex-1 overflow-y-auto"
                onScroll={handleMessageScroll}
              >
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
                    {messagePageByThread[activeThread.contactKey]?.loading ? (
                      <div className="mb-3 text-center text-xs text-slate-500">
                        Loading older messages...
                      </div>
                    ) : null}
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
                  <MaterialIcon name="info" className="dashboard-campaign-wa-comms-composer-note-icon shrink-0" />
                  {sessionWindowNote(activeThread)}
                </p>
                {sendError ? (
                  <p className="dashboard-campaign-wa-comms-composer-error text-sm text-red-600 px-1 pb-1">
                    {sendError}
                  </p>
                ) : null}
                <div
                  className={`dashboard-campaign-wa-comms-composer-row${canCompose ? "" : " opacity-60"}`}
                >
                  <input
                    type="text"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    disabled={!canCompose || sending}
                    placeholder={
                      canCompose ? "Type a message…" : "Reply unavailable"
                    }
                    className="dashboard-campaign-wa-comms-composer-input flex-1"
                    aria-label="WhatsApp message"
                  />
                  <button
                    type="button"
                    disabled={!canCompose || sending || !draftText.trim()}
                    className="dashboard-campaign-wa-comms-send"
                    aria-label="Send message"
                    onClick={() => void handleSendMessage()}
                  >
                    <MaterialIcon
                      name={sending ? "hourglass_empty" : "send"}
                    />
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
