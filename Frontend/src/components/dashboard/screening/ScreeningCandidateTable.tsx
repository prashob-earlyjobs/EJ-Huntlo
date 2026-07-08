"use client";

import { useMemo, useState } from "react";

import type { CandidateSource, ScreeningCandidate } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardInputSmClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

const SOURCE_OPTIONS: { id: CandidateSource; label: string; disabled?: boolean }[] = [
  { id: "talent_pool", label: "From Huntlo Talent Pool" },
  { id: "outreach_interested", label: "From Outreach Interested Candidates" },
  { id: "csv", label: "From Imported CSV/Excel" },
  { id: "cvs", label: "From Uploaded CVs" },
  { id: "existing_pool", label: "From Existing Pool" },
  { id: "ats", label: "From ATS/CRM", disabled: true },
];

type Props = {
  candidates: ScreeningCandidate[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  source: CandidateSource;
  onSourceChange: (source: CandidateSource) => void;
};

export function ScreeningCandidateTable({
  candidates,
  selectedIds,
  onSelectionChange,
  source,
  onSourceChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const locations = useMemo(
    () => [...new Set(candidates.map((c) => c.location))].sort(),
    [candidates]
  );
  const statuses = useMemo(
    () => [...new Set(candidates.map((c) => c.status))].sort(),
    [candidates]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.role.toLowerCase().includes(q)) return false;
      if (locationFilter && c.location !== locationFilter) return false;
      if (experienceFilter && !c.experience.startsWith(experienceFilter)) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [candidates, search, locationFilter, experienceFilter, statusFilter]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      const visible = new Set(filtered.map((c) => c.id));
      onSelectionChange(selectedIds.filter((id) => !visible.has(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...filtered.map((c) => c.id)])]);
    }
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  return (
    <div className="dashboard-screening-candidate-select">
      <div className="dashboard-screening-source-grid">
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`dashboard-screening-source-btn${
              source === opt.id ? " dashboard-screening-source-btn--active" : ""
            }${opt.disabled ? " dashboard-screening-source-btn--disabled" : ""}`}
            onClick={() => !opt.disabled && onSourceChange(opt.id)}
            disabled={opt.disabled}
          >
            {opt.label}
            {opt.disabled ? (
              <span className="dashboard-screening-badge dashboard-screening-badge--muted">Soon</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="dashboard-screening-candidate-filters">
        <div className="dashboard-screening-filter-field dashboard-screening-filter-field--grow">
          <label className={dashboardLabelClass} htmlFor="screening-search">Search</label>
          <div className="dashboard-screening-search-wrap">
            <MaterialIcon name="search" className="dashboard-screening-search-icon" />
            <input
              id="screening-search"
              className={dashboardInputSmClass}
              placeholder="Search by name or skill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="dashboard-screening-filter-field">
          <label className={dashboardLabelClass} htmlFor="screening-loc">Location</label>
          <select
            id="screening-loc"
            className={dashboardSelectClass}
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">All</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="dashboard-screening-filter-field">
          <label className={dashboardLabelClass} htmlFor="screening-exp">Experience</label>
          <select
            id="screening-exp"
            className={dashboardSelectClass}
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="2">2+ yrs</option>
            <option value="3">3+ yrs</option>
            <option value="5">5+ yrs</option>
          </select>
        </div>
        <div className="dashboard-screening-filter-field">
          <label className={dashboardLabelClass} htmlFor="screening-status">Status</label>
          <select
            id="screening-status"
            className={dashboardSelectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.length === 0 ? (
        <p className="dashboard-screening-empty-hint">
          <MaterialIcon name="info" className="text-sm" />
          No candidates selected yet.
        </p>
      ) : (
        <p className="dashboard-screening-selected-count">
          {selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected
        </p>
      )}

      <div className="dashboard-screening-table-wrap">
        <table className="dashboard-screening-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Candidate</th>
              <th>Role</th>
              <th>Location</th>
              <th>Experience</th>
              <th>Match</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="dashboard-screening-table-empty">No candidates match filters.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                  </td>
                  <td>{c.name}</td>
                  <td>{c.role}</td>
                  <td>{c.location}</td>
                  <td>{c.experience}</td>
                  <td><span className="dashboard-screening-match">{c.matchScore}%</span></td>
                  <td>{c.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
