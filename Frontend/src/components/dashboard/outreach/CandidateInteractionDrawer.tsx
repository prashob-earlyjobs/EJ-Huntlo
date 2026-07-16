"use client";

import { useEffect, useState } from "react";

import { CandidateInteractionTimelineSkeleton } from "@/components/dashboard/outreach/CandidateInteractionTimelineSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignScheduledInterview, CampaignTrackingCandidate } from "@/components/dashboard/outreach/types";
import { getStoredAuth } from "@/lib/auth";
import { formatResponsePreview } from "@/lib/formatResponsePreview";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import {
  fetchOutreachModuleCandidateConversation,
  fetchOutreachModuleCandidateInteractions,
  type OutreachConversationMessage,
} from "@/lib/outreachModuleCampaignsApi";

type Interaction = {
  id: string;
  type: string;
  summary: string;
  content: unknown;
  at: string | null;
};

type Props = {
  campaignId: string;
  candidate: CampaignTrackingCandidate | null;
  open: boolean;
  refreshKey?: number;
  calendlyEnabled?: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
};

function formatInteractionTime(at: string | null) {
  if (!at) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(at));
  } catch {
    return at;
  }
}

function interactionIcon(type: string) {
  if (type === "whatsapp" || type === "message") return "chat";
  if (type === "email") return "mail";
  if (type === "voice" || type === "call") return "record_voice_over";
  if (type === "note") return "sticky_note_2";
  if (type === "action") return "bolt";
  return "history";
}

function conversationChannelForType(type: string) {
  const key = String(type || "").trim().toLowerCase();
  if (key === "whatsapp" || key === "message" || key === "chat") return "whatsapp";
  if (key === "email" || key === "mail") return "email";
  if (key === "voice" || key === "call") return "voice";
  if (key === "note" || key === "action") return key;
  return "";
}

function channelLabel(channel: string) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "Email";
  if (channel === "voice") return "Voice call";
  if (channel === "note") return "Note";
  if (channel === "action") return "Action";
  return "Conversation";
}

function ConversationShimmer() {
  return (
    <div className="dashboard-outreach-drawer-conversation" aria-busy="true">
      <div className="dashboard-outreach-drawer-message dashboard-outreach-drawer-message--out">
        <div className="dashboard-shimmer h-3 w-40 max-w-full rounded" />
        <div className="dashboard-shimmer mt-2 h-3 w-28 rounded" />
      </div>
      <div className="dashboard-outreach-drawer-message dashboard-outreach-drawer-message--in">
        <div className="dashboard-shimmer h-3 w-36 max-w-full rounded" />
        <div className="dashboard-shimmer mt-2 h-3 w-24 rounded" />
      </div>
      <div className="dashboard-outreach-drawer-message dashboard-outreach-drawer-message--out">
        <div className="dashboard-shimmer h-3 w-44 max-w-full rounded" />
      </div>
    </div>
  );
}

export function CandidateInteractionDrawer({
  campaignId,
  candidate,
  open,
  refreshKey = 0,
  calendlyEnabled = false,
  onClose,
  onAction,
}: Props) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [scheduledInterview, setScheduledInterview] = useState<CampaignScheduledInterview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
  const [conversationChannel, setConversationChannel] = useState("");
  const [conversationMessages, setConversationMessages] = useState<OutreachConversationMessage[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState("");

  useEffect(() => {
    const candidateId = String(candidate?.id || "").trim();
    if (!open || !candidateId) {
      setInteractions([]);
      setScheduledInterview(null);
      setError("");
      setSelectedInteractionId(null);
      setConversationChannel("");
      setConversationMessages([]);
      setConversationError("");
      return;
    }

    let cancelled = false;

    async function load() {
      const auth = getStoredAuth();
      if (!auth?.token) {
        if (!cancelled) setError("Sign in to view interactions.");
        return;
      }

      setLoading(true);
      setError("");
      setSelectedInteractionId(null);
      setConversationMessages([]);
      setConversationError("");
      try {
        const data = await fetchOutreachModuleCandidateInteractions(
          auth.token,
          campaignId,
          candidateId
        );
        if (!cancelled) {
          setInteractions(data.interactions);
          setScheduledInterview(data.scheduledInterview);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load interactions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, candidate?.id, campaignId, refreshKey]);

  useEffect(() => {
    const candidateId = String(candidate?.id || "").trim();
    if (!open || !candidateId || !selectedInteractionId || !conversationChannel) {
      return;
    }

    let cancelled = false;

    async function loadConversation() {
      const auth = getStoredAuth();
      if (!auth?.token) {
        if (!cancelled) setConversationError("Sign in to view conversation.");
        return;
      }

      setConversationLoading(true);
      setConversationError("");
      try {
        const data = await fetchOutreachModuleCandidateConversation(
          auth.token,
          campaignId,
          candidateId,
          conversationChannel
        );
        if (!cancelled) {
          setConversationMessages(data.messages);
        }
      } catch (err) {
        if (!cancelled) {
          setConversationError(
            err instanceof Error ? err.message : "Failed to load conversation."
          );
          setConversationMessages([]);
        }
      } finally {
        if (!cancelled) setConversationLoading(false);
      }
    }

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [open, candidate?.id, campaignId, selectedInteractionId, conversationChannel]);

  if (!open || !candidate) return null;

  const handleSelectInteraction = (item: Interaction) => {
    const channel = conversationChannelForType(item.type);
    if (!channel) return;
    if (selectedInteractionId === item.id) {
      setSelectedInteractionId(null);
      setConversationChannel("");
      setConversationMessages([]);
      setConversationError("");
      return;
    }
    setSelectedInteractionId(item.id);
    setConversationChannel(channel);
    setConversationMessages([]);
    setConversationError("");
  };

  return (
    <>
      <button
        type="button"
        className="dashboard-outreach-drawer-backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="dashboard-outreach-drawer" role="dialog" aria-label="Candidate interactions">
        <header className="dashboard-outreach-drawer-header">
          <div>
            <h3>{candidate.name}</h3>
            <p>{candidate.role}</p>
          </div>
          <button type="button" className="dashboard-outreach-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>

        <div className="dashboard-outreach-drawer-body">
          <section className="dashboard-outreach-drawer-section">
            <h4>
              <MaterialIcon name="person" className="text-sm" />
              Status
            </h4>
            <dl className="dashboard-outreach-drawer-meta">
              <div>
                <dt>Channel</dt>
                <dd>{candidate.channel || "—"}</dd>
              </div>
              <div>
                <dt>Last step</dt>
                <dd>{candidate.lastStep || "—"}</dd>
              </div>
              <div>
                <dt>Interest</dt>
                <dd>{candidate.interest || "—"}</dd>
              </div>
              <div>
                <dt>Last response</dt>
                <dd>{formatResponsePreview(candidate.lastResponse, 500)}</dd>
              </div>
            </dl>
          </section>

          {scheduledInterview ? (
            <section className="dashboard-outreach-drawer-section">
              <h4>
                <MaterialIcon name="event" className="text-sm" />
                Scheduled interview
              </h4>
              <dl className="dashboard-outreach-drawer-meta">
                <div>
                  <dt>Meeting</dt>
                  <dd>{scheduledInterview.eventName || "Interview"}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>
                    {scheduledInterview.startTime
                      ? formatInteractionTime(scheduledInterview.startTime)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{scheduledInterview.status === "active" ? "Scheduled" : "Canceled"}</dd>
                </div>
              </dl>
              {scheduledInterview.rescheduleUrl ? (
                <a
                  href={scheduledInterview.rescheduleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="dashboard-btn-secondary dashboard-btn-secondary--sm"
                >
                  Open in Calendly
                </a>
              ) : null}
            </section>
          ) : null}

          <section className="dashboard-outreach-drawer-section">
            <h4>
              <MaterialIcon name="forum" className="text-sm" />
              Interaction history
            </h4>
            {loading ? (
              <CandidateInteractionTimelineSkeleton />
            ) : error ? (
              <p className="dashboard-outreach-drawer-empty dashboard-outreach-drawer-empty--error">
                {error}
              </p>
            ) : interactions.length === 0 ? (
              <p className="dashboard-outreach-drawer-empty">
                No interactions recorded yet for this candidate.
              </p>
            ) : (
              <ol className="dashboard-outreach-drawer-timeline">
                {interactions.map((item) => {
                  const canOpen = Boolean(conversationChannelForType(item.type));
                  const isSelected = selectedInteractionId === item.id;
                  return (
                    <li key={item.id} className="dashboard-outreach-drawer-timeline-item">
                      <button
                        type="button"
                        className={`dashboard-outreach-drawer-timeline-btn${
                          isSelected ? " is-selected" : ""
                        }${canOpen ? "" : " is-static"}`}
                        onClick={() => handleSelectInteraction(item)}
                        disabled={!canOpen}
                        aria-pressed={isSelected}
                        aria-label={
                          canOpen
                            ? `${isSelected ? "Hide" : "View"} ${item.summary || item.type} conversation`
                            : item.summary || item.type
                        }
                      >
                        <span className="dashboard-outreach-drawer-timeline-icon" aria-hidden>
                          <MaterialIcon name={interactionIcon(item.type)} className="text-sm" />
                        </span>
                        <span className="dashboard-outreach-drawer-timeline-copy">
                          <span className="dashboard-outreach-drawer-timeline-title">
                            {item.summary || item.type}
                          </span>
                          {item.at ? (
                            <time className="dashboard-outreach-drawer-timeline-time">
                              {formatInteractionTime(item.at)}
                            </time>
                          ) : null}
                          {canOpen ? (
                            <span className="dashboard-outreach-drawer-timeline-hint">
                              {isSelected ? "Hide conversation" : "View conversation"}
                            </span>
                          ) : null}
                        </span>
                        {canOpen ? (
                          <MaterialIcon
                            name={isSelected ? "expand_less" : "chevron_right"}
                            className="text-sm dashboard-outreach-drawer-timeline-chevron"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {selectedInteractionId && conversationChannel ? (
            <section className="dashboard-outreach-drawer-section">
              <h4>
                <MaterialIcon name={interactionIcon(conversationChannel)} className="text-sm" />
                {channelLabel(conversationChannel)} conversation
              </h4>
              {conversationLoading ? (
                <ConversationShimmer />
              ) : conversationError ? (
                <p className="dashboard-outreach-drawer-empty dashboard-outreach-drawer-empty--error">
                  {conversationError}
                </p>
              ) : conversationMessages.length === 0 ? (
                <p className="dashboard-outreach-drawer-empty">
                  No conversation details available for this step yet.
                </p>
              ) : (
                <div className="dashboard-outreach-drawer-conversation">
                  {conversationMessages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`dashboard-outreach-drawer-message dashboard-outreach-drawer-message--${
                        msg.direction === "inbound" ? "in" : "out"
                      }`}
                    >
                      <header className="dashboard-outreach-drawer-message-head">
                        <span>
                          {msg.direction === "inbound" ? candidate.name || "Candidate" : "You"}
                        </span>
                        {msg.at ? (
                          <time dateTime={msg.at}>{formatInteractionTime(msg.at)}</time>
                        ) : null}
                      </header>
                      {msg.subject ? (
                        <p className="dashboard-outreach-drawer-message-subject">{msg.subject}</p>
                      ) : null}
                      <p className="dashboard-outreach-drawer-message-body whitespace-pre-wrap">
                        {msg.body || "—"}
                      </p>
                      {msg.recordingUrl ? (
                        <a
                          href={msg.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="dashboard-outreach-drawer-message-link"
                        >
                          Open recording
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <footer className="dashboard-outreach-drawer-footer">
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            onClick={() => onAction("screening")}
          >
            Move to screening
          </button>
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={() => onAction(calendlyEnabled ? "send_scheduling_link" : "interview")}
          >
            {calendlyEnabled ? "Send Calendly link" : "Schedule interview"}
          </button>
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={() => onAction("not_interested")}
          >
            Mark not interested
          </button>
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            onClick={() => onAction("note")}
          >
            Add note
          </button>
        </footer>
      </aside>
    </>
  );
}
