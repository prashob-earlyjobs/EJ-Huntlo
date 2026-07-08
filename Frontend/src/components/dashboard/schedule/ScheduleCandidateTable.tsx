"use client";

import { useMemo, useState } from "react";

import type { CandidateSource, ScheduleCandidate } from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardInputSmClass, dashboardLabelClass, dashboardSelectClass } from "@/lib/dashboardStyles";

const SOURCES: { id: CandidateSource; label: string; disabled?: boolean }[] = [
  { id: "screened", label: "From AI Screened Candidates" },
  { id: "outreach_interested", label: "From Outreach Interested Candidates" },
  { id: "shortlisted", label: "From Shortlisted Candidates" },
  { id: "csv", label: "From Imported CSV/Excel" },
  { id: "existing_pool", label: "From Existing Pool" },
  { id: "ats", label: "From ATS/CRM", disabled: true },
];

type Props = {
  candidates: ScheduleCandidate[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  source: CandidateSource;
  onSourceChange: (s: CandidateSource) => void;
};

export function ScheduleCandidateTable({
  candidates,
  selectedIds,
  onSelectionChange,
  source,
  onSourceChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const locations = useMemo(() => [...new Set(candidates.map((c) => c.location))].sort(), [candidates]);
  const statuses = useMemo(() => [...new Set(candidates.map((c) => c.status))].sort(), [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.role.toLowerCase().includes(q)) return false;
      if (locationFilter && c.location !== locationFilter) return false;
      if (scoreFilter && c.screeningScore < Number(scoreFilter)) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [candidates, search, locationFilter, scoreFilter, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  return (
    <div className="dashboard-schedule-candidate-select">
      <div className="dashboard-schedule-source-grid">
        {SOURCES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`dashboard-schedule-source-btn${
              source === opt.id ? " dashboard-schedule-source-btn--active" : ""
            }${opt.disabled ? " dashboard-schedule-source-btn--disabled" : ""}`}
            onClick={() => !opt.disabled && onSourceChange(opt.id)}
            disabled={opt.disabled}
          >
            {opt.label}
            {opt.disabled ? <span className="dashboard-schedule-badge dashboard-schedule-badge--muted">Soon</span> : null}
          </button>
        ))}
      </div>

      <div className="dashboard-schedule-candidate-filters">
        <div className="dashboard-schedule-filter-field dashboard-schedule-filter-field--grow">
          <label className={dashboardLabelClass} htmlFor="sched-search">Search</label>
          <div className="dashboard-schedule-search-wrap">
            <MaterialIcon name="search" className="dashboard-schedule-search-icon" />
            <input id="sched-search" className={dashboardInputSmClass} placeholder="Search by name or skill" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="dashboard-schedule-filter-field">
          <label className={dashboardLabelClass} htmlFor="sched-loc">Location</label>
          <select id="sched-loc" className={dashboardSelectClass} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="dashboard-schedule-filter-field">
          <label className={dashboardLabelClass} htmlFor="sched-score">Min score</label>
          <select id="sched-score" className={dashboardSelectClass} value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)}>
            <option value="">All</option>
            <option value="70">70+</option>
            <option value="80">80+</option>
            <option value="90">90+</option>
          </select>
        </div>
        <div className="dashboard-schedule-filter-field">
          <label className={dashboardLabelClass} htmlFor="sched-st">Status</label>
          <select id="sched-st" className={dashboardSelectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {selectedIds.length === 0 ? (
        <p className="dashboard-schedule-empty-hint"><MaterialIcon name="info" className="text-sm" /> No candidates selected yet.</p>
      ) : (
        <p className="dashboard-schedule-selected-count">{selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected</p>
      )}

      <div className="dashboard-schedule-table-wrap">
        <table className="dashboard-schedule-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={() => {
                if (allSelected) onSelectionChange(selectedIds.filter((id) => !filtered.some((c) => c.id === id)));
                else onSelectionChange([...new Set([...selectedIds, ...filtered.map((c) => c.id)])]);
              }} aria-label="Select all" /></th>
              <th>Candidate</th><th>Role</th><th>Location</th><th>Experience</th><th>Score</th><th>Status</th><th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => onSelectionChange(selectedIds.includes(c.id) ? selectedIds.filter((x) => x !== c.id) : [...selectedIds, c.id])} /></td>
                <td>{c.name}</td><td>{c.role}</td><td>{c.location}</td><td>{c.experience}</td>
                <td><span className="dashboard-schedule-match">{c.screeningScore}%</span></td>
                <td>{c.status}</td><td>{c.availability}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
