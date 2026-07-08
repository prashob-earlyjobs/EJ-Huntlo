"use client";

import { useState } from "react";

import { ImportCampaignContactsCsvModal } from "@/components/dashboard/ImportCampaignContactsCsvModal";
import type { CandidateSource, OutreachCandidate } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  buildSampleCampaignContactsCsv,
  CSV_MANDATORY_HEADERS,
  parseCsvContacts,
} from "@/lib/campaignCsvImport";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";
import type { OutreachCsvImportContact } from "@/lib/outreachModuleCampaignsApi";

const SOURCE_OPTIONS: { id: CandidateSource; label: string; disabled?: boolean }[] = [
  { id: "csv", label: "From Imported CSV/Excel" },
  { id: "talent_pool", label: "From Huntlo Talent Pool" },
  { id: "cvs", label: "From Uploaded CVs", disabled: true },
  { id: "ats", label: "From ATS/CRM", disabled: true },
];

type Props = {
  candidates: OutreachCandidate[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  source: CandidateSource;
  onSourceChange: (source: CandidateSource) => void;
  loading?: boolean;
  error?: string;
  onCsvImport?: (contacts: OutreachCsvImportContact[]) => Promise<OutreachCandidate[]>;
  onDeleteSelected?: (ids: string[]) => void;
};

export function CandidateSelectionTable({
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
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvParsedContacts, setCsvParsedContacts] = useState<OutreachCsvImportContact[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  const [csvImportError, setCsvImportError] = useState("");

  const isCsvSource = source === "csv";
  const isTalentPool = source === "talent_pool";
  const canSelect = isTalentPool || isCsvSource;

  const allVisibleSelected =
    candidates.length > 0 && candidates.every((c) => selectedIds.includes(c.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      const visible = new Set(candidates.map((c) => c.id));
      onSelectionChange(selectedIds.filter((id) => !visible.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...candidates.map((c) => c.id)]);
      onSelectionChange([...merged]);
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    onDeleteSelected?.(selectedIds);
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
    a.download = "outreach_candidates_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-outreach-candidate-select">
      <div className="dashboard-outreach-source-grid">
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`dashboard-outreach-source-btn${
              source === opt.id ? " dashboard-outreach-source-btn--active" : ""
            }${opt.disabled ? " dashboard-outreach-source-btn--disabled" : ""}`}
            onClick={() => !opt.disabled && onSourceChange(opt.id)}
            disabled={opt.disabled}
          >
            {opt.label}
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
        <p className="dashboard-outreach-empty-hint dashboard-outreach-empty-hint--error">
          <MaterialIcon name="error_outline" className="text-sm" />
          {error}
        </p>
      ) : null}

      {csvImportError ? (
        <p className="dashboard-outreach-empty-hint dashboard-outreach-empty-hint--error">
          <MaterialIcon name="error_outline" className="text-sm" />
          {csvImportError}
        </p>
      ) : null}

      {loading && isTalentPool ? (
        <p className="dashboard-outreach-recent-loading">Loading talent pool…</p>
      ) : null}

      {canSelect ? (
        selectedIds.length === 0 ? (
          <p className="dashboard-outreach-empty-hint">
            <MaterialIcon name="info" className="text-sm" />
            {isCsvSource
              ? "Import a CSV file, then select candidates to continue."
              : "No candidates selected yet. Select candidates to continue."}
          </p>
        ) : (
          <div className="dashboard-outreach-candidate-toolbar">
            <p className="dashboard-outreach-selected-count">
              {isTalentPool ? (
                <span className="dashboard-outreach-badge dashboard-outreach-badge--ai">AI Recommended</span>
              ) : null}
              {selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected
            </p>
            {onDeleteSelected ? (
              <button
                type="button"
                className="dashboard-outreach-candidate-delete-btn"
                onClick={handleDeleteSelected}
                aria-label={`Delete ${selectedIds.length} selected candidate${selectedIds.length === 1 ? "" : "s"}`}
              >
                <MaterialIcon name="delete" />
                Delete selected
              </button>
            ) : null}
          </div>
        )
      ) : (
        <p className="dashboard-outreach-empty-hint">
          <MaterialIcon name="info" className="text-sm" />
          This candidate source is not available yet.
        </p>
      )}

      {canSelect ? (
        <div className="dashboard-outreach-table-wrap">
          <table className="dashboard-outreach-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    disabled={loading || candidates.length === 0}
                    aria-label="Select all visible candidates"
                  />
                </th>
                <th>Candidate</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Location</th>
                <th>Experience</th>
                <th>Match</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && isTalentPool ? (
                <tr>
                  <td colSpan={8} className="dashboard-outreach-table-empty">
                    Loading candidates…
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dashboard-outreach-table-empty">
                    {isCsvSource
                      ? "No imported candidates yet. Upload a CSV file to get started."
                      : "No saved candidates in your talent pool yet."}
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
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
                    <td>
                      <div className="dashboard-outreach-table-contact">
                        <span>{c.email && c.email !== "-" ? c.email : "—"}</span>
                        <span>{c.phone && c.phone !== "-" ? c.phone : "—"}</span>
                      </div>
                    </td>
                    <td>{c.role}</td>
                    <td>{c.location || "—"}</td>
                    <td>{c.experience || "—"}</td>
                    <td>
                      {c.matchScore > 0 ? (
                        <span className="dashboard-outreach-match-score">{c.matchScore}%</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{c.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {isCsvSource && candidates.length > 0 ? (
        <button
          type="button"
          className={`${dashboardBtnSecondaryClass} dashboard-outreach-csv-reimport-btn`}
          onClick={() => setCsvModalOpen(true)}
        >
          <MaterialIcon name="upload_file" className="text-sm" />
          Import another CSV
        </button>
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
