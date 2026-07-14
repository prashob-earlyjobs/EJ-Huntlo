"use client";

import { useCallback, useEffect, useState } from "react";

import { StatusBadge } from "@/components/dashboard/schedule/StatusBadge";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import {
  fetchScheduleCandidates,
  sendScheduleCandidateLink,
  type ScheduleCandidateRow,
} from "@/lib/scheduleApi";

type Props = {
  onToast?: (message: string) => void;
};

export function ScheduleDirectCandidatesSection({ onToast }: Props) {
  const [candidates, setCandidates] = useState<ScheduleCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState("");

  const load = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchScheduleCandidates(auth.token);
      setCandidates(data.candidates);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResend = async (row: ScheduleCandidateRow) => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    setSendingId(row.id);
    try {
      const result = await sendScheduleCandidateLink(auth.token, row.id);
      const parts = [];
      if (result.emailSent) parts.push("email");
      if (result.whatsappSent) parts.push("WhatsApp");
      onToast?.(
        parts.length
          ? `Scheduling link sent via ${parts.join(" and ")}`
          : "Link updated — check integrations if delivery failed"
      );
      void load();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not send scheduling link.");
    } finally {
      setSendingId("");
    }
  };

  if (loading) {
    return <p className="dashboard-text-body">Loading imported candidates…</p>;
  }

  if (candidates.length === 0) return null;

  return (
    <section>
      <div className="dashboard-outreach-tracking-section-head">
        <h2 className="dashboard-schedule-subsection-title">Imported candidates</h2>
        <button type="button" className={dashboardBtnSecondaryClass} onClick={() => void load()}>
          Refresh
        </button>
      </div>
      <div className="dashboard-schedule-table-wrap">
        <table className="dashboard-schedule-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {candidates.map((row) => (
              <tr key={row.id}>
                <td>{row.name || "—"}</td>
                <td>{row.email || "—"}</td>
                <td>{row.role || "—"}</td>
                <td>
                  <StatusBadge
                    status={
                      row.status === "scheduled"
                        ? "confirmed"
                        : row.status === "canceled"
                          ? "cancelled"
                          : row.status === "link_sent"
                            ? "pending"
                            : "pending"
                    }
                  />
                </td>
                <td>
                  {row.status !== "scheduled" ? (
                    <button
                      type="button"
                      className={dashboardBtnSecondaryClass}
                      disabled={sendingId === row.id}
                      onClick={() => void handleResend(row)}
                    >
                      {sendingId === row.id ? "Sending…" : "Send link"}
                    </button>
                  ) : (
                    <span className="dashboard-text-body">
                      <MaterialIcon name="check_circle" className="text-sm" /> Booked
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
