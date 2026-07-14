"use client";

import { useMemo, useState } from "react";

import { ImportCampaignContactsCsvModal } from "@/components/dashboard/ImportCampaignContactsCsvModal";
import type { CandidateSource, ScreeningCandidate } from "@/components/dashboard/screening/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  buildSampleCampaignContactsCsv,
  CSV_MANDATORY_HEADERS,
  parseCsvContacts,
} from "@/lib/campaignCsvImport";
import type { OutreachCsvImportContact } from "@/lib/outreachModuleCampaignsApi";
import {
  dashboardBtnPrimaryClass,
  dashboardInputSmClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

const SOURCE_OPTIONS: { id: CandidateSource; label: string; disabled?: boolean }[] = [
  { id: "talent_pool", label: "From Huntlo Talent Pool" },
  { id: "outreach_interested", label: "From Outreach Interested Candidates" },
  { id: "csv", label: "From Imported CSV/Excel" },
  { id: "cvs", label: "From Uploaded CVs", disabled: true },
  { id: "existing_pool", label: "From Existing Pool", disabled: true },
  { id: "ats", label: "From ATS/CRM", disabled: true },
];

function hasPhone(phone?: string) {
  const trimmed = String(phone || "").trim();
  return trimmed.length > 0 && trimmed !== "-";
}

function formatContact(phone?: string, email?: string) {
  const p = String(phone || "").trim();
  const e = String(email || "").trim();
  const phoneLabel = p && p !== "-" ? p : "—";
  const emailLabel = e && e !== "-" ? e : "—";
  return { phoneLabel, emailLabel };
}

type Props = {
  candidates: ScreeningCandidate[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  source: CandidateSource;
  onSourceChange: (source: CandidateSource) => void;
  loading?: boolean;
  error?: string;
  onCsvImport?: (contacts: OutreachCsvImportContact[]) => Promise<ScreeningCandidate[]>;
  onDeleteSelected?: (ids: string[]) => void;
};

export function ScreeningCandidateTable({
  candidates,
  selectedIds,
  onSelectionChange,
  source,
  onSourceChange,
  loading = false,
  error = "",
  onCsvImport,
  onDeleteSelected,
}: Props) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvParsedContacts, setCsvParsedContacts] = useState<OutreachCsvImportContact[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  const [csvImportError, setCsvImportError] = useState("");

  const isCsvSource = source === "csv";
  const isPoolSource = source === "talent_pool" || source === "outreach_interested";
  const canSelect = isPoolSource || isCsvSource;

  const locations = useMemo(
    () => [...new Set(candidates.map((c) => c.location).filter(Boolean))].sort(),
    [candidates]
  );
  const statuses = useMemo(
    () => [...new Set(candidates.map((c) => c.status).filter(Boolean))].sort(),
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

  const handleCsvFileSelected = async (file: File) => {
    if (!file) return;
    setCsvImportError("");
    try {
      const raw = await file.text();
      const { contacts, errors } = parseCsvContacts(raw);
      const mapped: OutreachCsvImportContact[] = contacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        company: contact.company,
        location: contact.location,
      }));
      setCsvFileName(file.name);
      setCsvParsedContacts(mapped);
      setCsvValidationErrors(errors);
    } catch (err) {
      setCsvFileName(file.name);
      setCsvParsedContacts([]);
      setCsvValidationErrors([
        err instanceof Error ? err.message : "Could not read this CSV file.",
      ]);
    }
  };

  const handleCsvImport = async () => {
    if (!onCsvImport || csvParsedContacts.length === 0 || csvValidationErrors.length > 0) return;
    setCsvImportBusy(true);
    setCsvImportError("");
    try {
      const imported = await onCsvImport(csvParsedContacts);
      onSelectionChange(imported.map((c) => c.id));
      setCsvModalOpen(false);
      setCsvFileName("");
      setCsvParsedContacts([]);
      setCsvValidationErrors([]);
    } catch (err) {
      setCsvImportError(err instanceof Error ? err.message : "Could not import CSV candidates.");
    } finally {
      setCsvImportBusy(false);
    }
  };

  const handleDownloadSample = () => {
    const sample = buildSampleCampaignContactsCsv();
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "screening_candidates_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedWithoutPhone = selectedIds.filter((id) => {
    const row = candidates.find((c) => c.id === id);
    return row && !hasPhone(row.phone);
  }).length;

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

      {isCsvSource ? (
        <div className="dashboard-outreach-csv-import-bar">
          <div>
            <p className="dashboard-outreach-csv-import-title">Import candidates from CSV</p>
            <p className="dashboard-outreach-csv-import-desc">
              Upload a file with name, email, phone, role, and company columns.
            </p>
          </div>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            onClick={() => setCsvModalOpen(true)}
          >
            <MaterialIcon name="upload_file" className="text-sm" />
            Upload CSV
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="dashboard-screening-empty-hint">
          <MaterialIcon name="error_outline" className="text-sm" />
          {error}
        </p>
      ) : null}

      {csvImportError ? (
        <p className="dashboard-screening-empty-hint">
          <MaterialIcon name="error_outline" className="text-sm" />
          {csvImportError}
        </p>
      ) : null}

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

      {loading && isPoolSource ? (
        <p className="dashboard-text-body">Loading candidates…</p>
      ) : null}

      {!canSelect ? (
        <p className="dashboard-screening-empty-hint">
          <MaterialIcon name="info" className="text-sm" />
          This candidate source is not available yet.
        </p>
      ) : selectedIds.length === 0 ? (
        <p className="dashboard-screening-empty-hint">
          <MaterialIcon name="info" className="text-sm" />
          {isCsvSource
            ? "Import a CSV file, then select candidates to continue."
            : "No candidates selected yet."}
        </p>
      ) : (
        <div className="dashboard-screening-selected-row">
          <p className="dashboard-screening-selected-count">
            {selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected
          </p>
          {onDeleteSelected && isCsvSource ? (
            <button
              type="button"
              className="dashboard-btn-secondary dashboard-btn-secondary--sm"
              onClick={() => onDeleteSelected(selectedIds)}
            >
              Remove selected
            </button>
          ) : null}
        </div>
      )}

      {selectedWithoutPhone > 0 ? (
        <p className="dashboard-screening-empty-hint">
          <MaterialIcon name="warning" className="text-sm" />
          {selectedWithoutPhone} selected candidate{selectedWithoutPhone === 1 ? "" : "s"} missing a phone number — they will be skipped when calls are placed.
        </p>
      ) : null}

      {canSelect ? (
        <div className="dashboard-screening-table-wrap">
          <table className="dashboard-screening-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    disabled={loading || filtered.length === 0}
                    aria-label="Select all"
                  />
                </th>
                <th>Candidate</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Match</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="dashboard-screening-table-empty">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dashboard-screening-table-empty">
                    {isCsvSource
                      ? "No imported candidates yet. Upload a CSV to get started."
                      : source === "outreach_interested"
                        ? "No interested candidates from outreach campaigns yet."
                        : "No candidates match filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const { phoneLabel } = formatContact(c.phone, c.email);
                  const missingPhone = !hasPhone(c.phone);
                  return (
                    <tr key={c.id} className={missingPhone ? "dashboard-screening-table-row--muted" : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleOne(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td>{c.name}</td>
                      <td>{phoneLabel}</td>
                      <td>{c.role}</td>
                      <td>{c.location}</td>
                      <td>{c.experience}</td>
                      <td><span className="dashboard-screening-match">{c.matchScore}%</span></td>
                      <td>{c.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <ImportCampaignContactsCsvModal
        open={csvModalOpen}
        busy={csvImportBusy}
        mandatoryHeaders={CSV_MANDATORY_HEADERS}
        fileName={csvFileName}
        validationErrors={csvValidationErrors}
        readyCount={csvParsedContacts.length}
        onClose={() => {
          if (csvImportBusy) return;
          setCsvModalOpen(false);
        }}
        onFileSelect={handleCsvFileSelected}
        onDownloadSample={handleDownloadSample}
        onImport={() => void handleCsvImport()}
      />
    </div>
  );
}
