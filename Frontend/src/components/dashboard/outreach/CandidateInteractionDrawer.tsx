"use client";

import { useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignTrackingCandidate } from "@/components/dashboard/outreach/types";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import { fetchOutreachModuleCandidateInteractions } from "@/lib/outreachModuleCampaignsApi";

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

export function CandidateInteractionDrawer({
  campaignId,
  candidate,
  open,
  refreshKey = 0,
  onClose,
  onAction,
}: Props) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const candidateId = String(candidate?.id || "").trim();
    if (!open || !candidateId) {
      setInteractions([]);
      setError("");
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
      try {
        const data = await fetchOutreachModuleCandidateInteractions(
          auth.token,
          campaignId,
          candidateId
        );
        if (!cancelled) {
          setInteractions(data.interactions);
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

  if (!open || !candidate) return null;

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
                <dd>{candidate.lastResponse || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="dashboard-outreach-drawer-section">
            <h4>
              <MaterialIcon name="forum" className="text-sm" />
              Interaction history
            </h4>
            {loading ? (
              <p className="dashboard-outreach-drawer-empty">Loading interactions…</p>
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
                {interactions.map((item) => (
                  <li key={item.id} className="dashboard-outreach-drawer-timeline-item">
                    <span className="dashboard-outreach-drawer-timeline-icon" aria-hidden>
                      <MaterialIcon name={interactionIcon(item.type)} className="text-sm" />
                    </span>
                    <div>
                      <p className="dashboard-outreach-drawer-timeline-title">
                        {item.summary || item.type}
                      </p>
                      {item.at ? (
                        <time className="dashboard-outreach-drawer-timeline-time">
                          {formatInteractionTime(item.at)}
                        </time>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
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
            onClick={() => onAction("interview")}
          >
            Schedule interview
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
