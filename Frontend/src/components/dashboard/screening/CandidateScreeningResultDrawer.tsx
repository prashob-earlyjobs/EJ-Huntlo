"use client";

import { useEffect, useState } from "react";

import { RecommendationBadge } from "@/components/dashboard/screening/RecommendationBadge";
import { Scorecard } from "@/components/dashboard/screening/Scorecard";
import { TranscriptViewer } from "@/components/dashboard/screening/TranscriptViewer";
import type { ScreeningResultDetail } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

type Props = {
  detail: ScreeningResultDetail | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, note?: string) => void;
};

export function CandidateScreeningResultDrawer({
  detail,
  open,
  onClose,
  onAction,
}: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (!open) {
      setNoteOpen(false);
      setNoteText("");
    }
  }, [open]);

  if (!open || !detail) return null;

  const saveNote = () => {
    const note = noteText.trim();
    if (!note) return;
    onAction("note", note);
    setNoteOpen(false);
    setNoteText("");
  };

  return (
    <>
      <button type="button" className="dashboard-screening-drawer-backdrop" onClick={onClose} aria-label="Close" />
      <aside className="dashboard-screening-drawer" role="dialog" aria-label="Screening result">
        <header className="dashboard-screening-drawer-header">
          <div>
            <h3>{detail.name}</h3>
            <p>{detail.role} · {detail.location} · {detail.experience}</p>
            <div className="dashboard-screening-drawer-score-row">
              {detail.overallScore !== null ? (
                <span className="dashboard-screening-drawer-score">{detail.overallScore}/100</span>
              ) : null}
              <RecommendationBadge recommendation={detail.recommendation} />
            </div>
          </div>
          <button type="button" className="dashboard-screening-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>

        <div className="dashboard-screening-drawer-body">
          <section>
            <h4>AI summary</h4>
            <p className="dashboard-screening-ai-summary">{detail.aiSummary}</p>
          </section>

          {detail.scorecard.length > 0 ? (
            <section>
              <h4>Scorecard</h4>
              <Scorecard
                entries={detail.scorecard}
                overallScore={detail.overallScore ?? undefined}
              />
            </section>
          ) : null}

          {detail.resultDetails.length > 0 ? (
            <section>
              <h4>Screening details</h4>
              <dl className="dashboard-screening-result-details">
                {detail.resultDetails.map((entry) => (
                  <div key={entry.label}>
                    <dt>{entry.label}</dt>
                    <dd>{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <section>
              <h4>Screening details</h4>
              <p className="dashboard-screening-empty-hint">
                No structured call results are available yet.
              </p>
            </section>
          )}

          <section>
            <TranscriptViewer
              type={detail.type}
              transcript={detail.transcript}
              recordingUrl={detail.recordingUrl}
            />
          </section>

          <section>
            <h4>Key insights</h4>
            <ul className="dashboard-screening-insights-list">
              {detail.insights.map((i) => (
                <li key={i}><MaterialIcon name="check_circle" className="text-sm" />{i}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>Red flags / concerns</h4>
            <ul className="dashboard-screening-concerns-list">
              {detail.concerns.map((c) => (
                <li key={c}><MaterialIcon name="warning" className="text-sm" />{c}</li>
              ))}
            </ul>
          </section>

          <section className="dashboard-screening-decision">
            <h4>Recruiter decision</h4>
            <p className="dashboard-screening-decision-hint">
              AI assists — you make the final call.
            </p>
          </section>
        </div>

        <footer className="dashboard-screening-drawer-footer">
          <button type="button" className={dashboardBtnPrimaryClass} onClick={() => onAction("shortlist")}>
            Shortlist
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("interview")}>
            Move to interview scheduling
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("reject")}>
            Reject
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("rescreen")}>
            Request re-screening
          </button>
          <button
            type="button"
            className={dashboardBtnSecondaryClass}
            aria-expanded={noteOpen}
            onClick={() => setNoteOpen((v) => !v)}
          >
            {noteOpen ? "Cancel note" : "Add note"}
          </button>
          {noteOpen ? (
            <div className="dashboard-screening-drawer-note">
              <textarea
                className={dashboardTextareaClass}
                rows={3}
                autoFocus
                placeholder="Write a note about this candidate…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="dashboard-screening-drawer-note-actions">
                <button
                  type="button"
                  className={dashboardBtnPrimaryClass}
                  disabled={!noteText.trim()}
                  onClick={saveNote}
                >
                  Save note
                </button>
              </div>
            </div>
          ) : null}
        </footer>
      </aside>
    </>
  );
}
