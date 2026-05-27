"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchContactEmailThread,
  type CampaignEmailThreadMessage,
  type ContactEmailThreadResult,
} from "@/lib/campaignEmailThread";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

const POPOVER_WIDTH = 360;
const POPOVER_MAX_HEIGHT = 400;
const VIEWPORT_PAD = 12;
const GAP = 8;

type PopoverPosition = {
  top: number;
  left: number;
  maxHeight: number;
  placement: "below" | "above";
};

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  campaignId: string;
  candidateKey: string;
  contactName: string;
  contactEmail?: string;
  contactSubtitle?: string;
  reloadToken?: number;
};

function formatThreadTime(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function messageBody(msg: CampaignEmailThreadMessage) {
  const text = msg.bodyText.trim() || msg.snippet.trim();
  return text || "(No message body)";
}

function dispositionLabel(
  disposition: ContactEmailThreadResult["replyDisposition"]
): string | null {
  if (disposition === "interested") return "Interested";
  if (disposition === "not_interested") return "Not interested";
  return null;
}

function computePosition(anchor: DOMRect): PopoverPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchor.right - POPOVER_WIDTH;
  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
  if (left + POPOVER_WIDTH > vw - VIEWPORT_PAD) {
    left = vw - POPOVER_WIDTH - VIEWPORT_PAD;
  }

  const spaceBelow = vh - anchor.bottom - GAP - VIEWPORT_PAD;
  const spaceAbove = anchor.top - GAP - VIEWPORT_PAD;

  if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
    return {
      top: anchor.bottom + GAP,
      left,
      maxHeight: Math.min(POPOVER_MAX_HEIGHT, Math.max(120, spaceBelow)),
      placement: "below",
    };
  }

  const maxHeight = Math.min(POPOVER_MAX_HEIGHT, Math.max(120, spaceAbove));
  return {
    top: Math.max(VIEWPORT_PAD, anchor.top - GAP - maxHeight),
    left,
    maxHeight,
    placement: "above",
  };
}

function ThreadMessage({ msg, contactName }: { msg: CampaignEmailThreadMessage; contactName: string }) {
  const fromThem = msg.isFromCandidate;
  return (
    <article
      className={`dashboard-campaign-thread-msg ${
        fromThem ? "dashboard-campaign-thread-msg--inbound" : "dashboard-campaign-thread-msg--outbound"
      }`}
    >
      <header className="dashboard-campaign-thread-msg-head">
        <span className="dashboard-campaign-thread-msg-from">
          {fromThem ? contactName.trim() || "Contact" : "You"}
        </span>
        {msg.fromEmail ? (
          <span className="dashboard-campaign-thread-msg-email">{msg.fromEmail}</span>
        ) : null}
        <time className="dashboard-campaign-thread-msg-time" dateTime={msg.receivedAt}>
          {formatThreadTime(msg.receivedAt)}
        </time>
      </header>
      {msg.subject ? (
        <p className="dashboard-campaign-thread-msg-subject">{msg.subject}</p>
      ) : null}
      <p className="dashboard-campaign-thread-msg-body">{messageBody(msg)}</p>
    </article>
  );
}

export function CampaignEmailThreadPopover({
  open,
  onClose,
  anchorRef,
  campaignId,
  candidateKey,
  contactName,
  contactEmail = "",
  contactSubtitle = "",
  reloadToken = 0,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [data, setData] = useState<ContactEmailThreadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setPosition(computePosition(el.getBoundingClientRect()));
  }, [anchorRef]);

  const load = useCallback(
    async (sync: boolean) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setError("Sign in to view email history.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await fetchContactEmailThread(auth.token, campaignId, candidateKey, {
          sync,
        });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load email thread.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [campaignId, candidateKey]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    void load(true);
  }, [open, load, reloadToken]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError("");
      setLoading(false);
      setPosition(null);
    }
  }, [open]);

  if (!open || !mounted || !position) return null;

  const displayName = contactName.trim() || "Contact";

  const popover = (
    <>
      <div
        ref={popoverRef}
        className={`dashboard-campaign-thread-popover dashboard-campaign-thread-popover--${position.placement}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="campaign-thread-popover-title"
        style={{
          top: position.top,
          left: position.left,
          width: POPOVER_WIDTH,
          maxHeight: position.maxHeight,
        }}
      >
        <div className="dashboard-campaign-thread-popover-head shrink-0">
          <div className="min-w-0 flex-1">
            <h3 id="campaign-thread-popover-title" className="dashboard-section-title text-sm">
              {displayName}
            </h3>
            {contactSubtitle ? (
              <p className="dashboard-campaign-thread-modal-subtitle">{contactSubtitle}</p>
            ) : null}
            {contactEmail ? (
              <p className="dashboard-campaign-thread-modal-email">{contactEmail}</p>
            ) : null}
            {dispositionLabel(data?.replyDisposition) ? (
              <p className="dashboard-campaign-thread-disposition mt-1 text-xs font-medium text-[var(--dash-primary)]">
                {dispositionLabel(data?.replyDisposition)}
              </p>
            ) : data?.autoReplyCount && data.autoReplyCount > 0 ? (
              <p className="mt-1 text-xs text-[var(--dash-on-surface-variant)]">
                AI auto-reply active
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="dashboard-campaign-thread-modal-close"
            aria-label="Close thread"
            onClick={onClose}
          >
            <MaterialIcon name="close" className="text-lg" />
          </button>
        </div>

        <div className="dashboard-campaign-thread-modal-toolbar shrink-0">
          <span className="dashboard-campaign-thread-toolbar-label">
            <MaterialIcon name="forum" className="text-base" />
            Gmail thread
          </span>
          <button
            type="button"
            className={`${dashboardBtnSecondaryClass} px-2 py-0.5 text-xs disabled:opacity-55`}
            disabled={loading}
            onClick={() => void load(true)}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        <div
          className="dashboard-campaign-thread-popover-body dashboard-outreach-scroll overflow-y-auto"
          aria-label="Email thread messages"
        >
          {loading && !data ? (
            <div className="dashboard-campaign-thread-loading px-4 py-6" aria-busy="true">
              <span className="dashboard-reveal-spinner" aria-hidden />
              Loading…
            </div>
          ) : error ? (
            <p
              className="dashboard-campaign-thread-empty dashboard-campaign-thread-empty--error px-4 py-4"
              role="alert"
            >
              {error}
            </p>
          ) : !data?.hasEnrollment ? (
            <p className="dashboard-campaign-thread-empty px-4 py-4">
              Launch the campaign sequence to start a Gmail thread.
            </p>
          ) : data.sentCount === 0 ? (
            <p className="dashboard-campaign-thread-empty px-4 py-4">
              No email sent yet. Wait ~1 minute or refresh.
            </p>
          ) : data.messages.length === 0 ? (
            <p className="dashboard-campaign-thread-empty px-4 py-4">
              No messages yet. Refresh from Gmail.
            </p>
          ) : (
            <div className="dashboard-campaign-thread-messages px-3 py-2">
              {data.hasReply ? (
                <p className="dashboard-campaign-thread-reply-badge" role="status">
                  {data.replyCount} reply{data.replyCount === 1 ? "" : "s"}
                  {data.enrollmentStatus === "paused" ? " · paused" : ""}
                </p>
              ) : null}
              {data.messages.map((msg) => (
                <ThreadMessage key={msg.id} msg={msg} contactName={contactName} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(popover, document.body);
}
