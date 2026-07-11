"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { StatusBadge } from "@/components/dashboard/schedule/StatusBadge";
import type { InterviewDetail } from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

type Props = {
  interview: InterviewDetail | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
};

export function InterviewDetailsDrawer({ interview, open, onClose, onAction }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open || !interview) return null;

  const isCalendlyBooking = interview.screeningScore === 0 && interview.phone === "—";

  return createPortal(
    <>
      <button type="button" className="dashboard-schedule-drawer-backdrop" onClick={onClose} aria-label="Close" />
      <aside className="dashboard-page dashboard-schedule-drawer" role="dialog" aria-label="Interview details">
        <header className="dashboard-schedule-drawer-header">
          <div>
            <h3>{interview.candidate}</h3>
            <p>{interview.role}</p>
            <div className="dashboard-schedule-drawer-meta">
              <StatusBadge status={interview.status} />
              <span>{interview.dateTime}</span>
            </div>
          </div>
          <button type="button" className="dashboard-schedule-icon-btn" onClick={onClose}>
            <MaterialIcon name="close" />
          </button>
        </header>

        <div className="dashboard-schedule-drawer-body">
          <section>
            <h4>Interview info</h4>
            <dl className="dashboard-schedule-drawer-dl">
              <div>
                <dt>Type</dt>
                <dd>{interview.interviewType}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{interview.mode}</dd>
              </div>
              <div>
                <dt>Host</dt>
                <dd>{interview.interviewer}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{interview.duration}</dd>
              </div>
              <div>
                <dt>{interview.location ? "Location" : "Meeting link"}</dt>
                <dd className="dashboard-schedule-drawer-link">
                  {interview.location || interview.meetingLink ? (
                    /^https?:\/\//i.test(interview.location || interview.meetingLink) ? (
                      <a href={interview.location || interview.meetingLink} target="_blank" rel="noreferrer">
                        {interview.location || interview.meetingLink}
                      </a>
                    ) : (
                      interview.location || interview.meetingLink
                    )
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h4>Candidate info</h4>
            <dl className="dashboard-schedule-drawer-dl">
              {interview.phone !== "—" ? (
                <div>
                  <dt>Phone</dt>
                  <dd>{interview.phone}</dd>
                </div>
              ) : null}
              <div>
                <dt>Email</dt>
                <dd>{interview.email}</dd>
              </div>
              {interview.candidateLocation !== "—" ? (
                <div>
                  <dt>Location</dt>
                  <dd>{interview.candidateLocation}</dd>
                </div>
              ) : null}
              {!isCalendlyBooking && interview.screeningScore > 0 ? (
                <div>
                  <dt>Screening score</dt>
                  <dd>{interview.screeningScore}%</dd>
                </div>
              ) : null}
              <div>
                <dt>Source</dt>
                <dd>{interview.candidateStatus}</dd>
              </div>
            </dl>
          </section>

          {!isCalendlyBooking ? (
            <>
              <section>
                <h4>Invite status</h4>
                <ul className="dashboard-schedule-invite-status">
                  <li>
                    <MaterialIcon
                      name={interview.emailSent ? "check_circle" : "radio_button_unchecked"}
                      className="text-sm"
                    />{" "}
                    Email sent
                  </li>
                  <li>
                    <MaterialIcon
                      name={interview.whatsappSent ? "check_circle" : "radio_button_unchecked"}
                      className="text-sm"
                    />{" "}
                    WhatsApp sent
                  </li>
                  <li>
                    <MaterialIcon
                      name={interview.calendarInviteSent ? "check_circle" : "radio_button_unchecked"}
                      className="text-sm"
                    />{" "}
                    Calendar invite sent
                  </li>
                  <li>
                    <MaterialIcon
                      name={interview.candidateConfirmed ? "check_circle" : "schedule"}
                      className="text-sm"
                    />
                    {interview.candidateConfirmed ? "Candidate confirmed" : "Pending confirmation"}
                  </li>
                </ul>
              </section>

              <section>
                <h4>Reminder timeline</h4>
                <ul className="dashboard-schedule-timeline">
                  <li>24h reminder scheduled</li>
                  <li>6h reminder scheduled</li>
                  <li>1h reminder scheduled</li>
                </ul>
              </section>

              <section>
                <h4>Activity timeline</h4>
                <ul className="dashboard-schedule-timeline">
                  <li>Interview created</li>
                  <li>Invite sent</li>
                  {interview.candidateConfirmed ? <li>Candidate confirmed</li> : null}
                  <li>Reminder sent</li>
                </ul>
              </section>
            </>
          ) : null}
        </div>

        <footer className="dashboard-schedule-drawer-footer">
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("reschedule")}>
            Reschedule
          </button>
          <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("cancel")}>
            Cancel interview
          </button>
          {!isCalendlyBooking ? (
            <>
              <button type="button" className={dashboardBtnPrimaryClass} onClick={() => onAction("completed")}>
                Mark completed
              </button>
              <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("noshow")}>
                Mark no-show
              </button>
              <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("next_round")}>
                Move to next round
              </button>
              <button type="button" className={dashboardBtnSecondaryClass} onClick={() => onAction("note")}>
                Add note
              </button>
            </>
          ) : null}
        </footer>
      </aside>
    </>,
    document.body
  );
}
