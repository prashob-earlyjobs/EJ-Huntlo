"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

type Props = {
  open: boolean;
  busy?: boolean;
  mandatoryHeaders: readonly string[];
  fileName?: string;
  validationErrors?: string[];
  readyCount?: number;
  onClose: () => void;
  onFileSelect: (file: File) => void | Promise<void>;
  onDownloadSample: () => void;
  onImport: () => void;
};

export function ImportCampaignContactsCsvModal({
  open,
  busy = false,
  mandatoryHeaders,
  fileName = "",
  validationErrors = [],
  readyCount = 0,
  onClose,
  onFileSelect,
  onDownloadSample,
  onImport,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, busy]);

  if (!open || !mounted) return null;

  const hasErrors = validationErrors.length > 0;
  const hasFile = Boolean(fileName.trim());
  const canImport = hasFile && !hasErrors && readyCount > 0 && !busy;

  const content = (
    <div
      className="dashboard-modal-overlay z-[120] py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="dashboard-modal dashboard-campaign-csv-modal mx-auto flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden p-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-campaign-csv-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dashboard-campaign-csv-modal-header shrink-0">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="dashboard-campaign-csv-modal-icon" aria-hidden>
              <MaterialIcon name="upload_file" className="text-[22px]" />
            </span>
            <div className="min-w-0">
              <h3 id="import-campaign-csv-title" className="dashboard-section-title text-lg">
                Import contacts from CSV
              </h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Upload a spreadsheet to add multiple candidates to this campaign at once.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dashboard-campaign-csv-modal-close"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            <MaterialIcon name="close" className="text-xl" />
          </button>
        </div>

        <div className="dashboard-campaign-csv-modal-body dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto">
          <section className="dashboard-campaign-csv-modal-section">
            <p className="dashboard-label-upper">Required columns</p>
            <div className="dashboard-campaign-csv-header-chips">
              {mandatoryHeaders.map((header) => (
                <span
                  key={header}
                  className="dashboard-campaign-csv-header-chip dashboard-campaign-csv-header-chip--required"
                >
                  {header}
                </span>
              ))}
            </div>
          </section>

          <section className="dashboard-campaign-csv-modal-section">
            <p className="dashboard-label-upper">Upload file</p>
            <button
              type="button"
              className="dashboard-campaign-csv-upload-zone"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="dashboard-campaign-csv-upload-zone-icon" aria-hidden>
                <MaterialIcon name="description" className="text-2xl" />
              </span>
              <span className="dashboard-campaign-csv-upload-zone-title">
                {hasFile ? "Choose a different file" : "Select CSV file"}
              </span>
              <span className="dashboard-campaign-csv-upload-zone-meta">
                .csv · UTF-8 recommended
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFileSelect(file);
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              className={`${dashboardBtnSecondaryClass} dashboard-campaign-csv-sample-btn mt-3`}
              disabled={busy}
              onClick={onDownloadSample}
            >
              <MaterialIcon name="download" className="text-base" />
              Download sample CSV
            </button>
          </section>

          {hasFile ? (
            <section className="dashboard-campaign-csv-modal-section">
              <p className="dashboard-label-upper">File status</p>
              <div className="dashboard-campaign-csv-file-pill">
                <MaterialIcon name="insert_drive_file" className="shrink-0 text-lg text-[#0050cb]" />
                <span className="min-w-0 truncate font-medium text-[#141b2b]">{fileName}</span>
              </div>
              {hasErrors ? (
                <div className="dashboard-campaign-csv-status dashboard-campaign-csv-status--error">
                  <MaterialIcon name="error_outline" className="shrink-0 text-lg" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="dashboard-campaign-csv-status-title">Fix these issues</p>
                    <ul className="dashboard-campaign-csv-status-list">
                      {validationErrors.map((err, i) => (
                        <li key={`${err}-${i}`}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="dashboard-campaign-csv-status dashboard-campaign-csv-status--success">
                  <MaterialIcon name="check_circle" className="shrink-0 text-lg" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="dashboard-campaign-csv-status-title">Ready to import</p>
                    <p className="dashboard-campaign-csv-status-text">
                      {readyCount} contact{readyCount === 1 ? "" : "s"} validated and ready to add.
                    </p>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>

        <div className="dashboard-campaign-csv-modal-footer shrink-0">
          <button
            type="button"
            className={`${dashboardBtnSecondaryClass} dashboard-campaign-csv-footer-btn`}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${dashboardBtnPrimaryClass} dashboard-campaign-csv-footer-btn`}
            disabled={!canImport}
            onClick={onImport}
          >
            {busy ? (
              <>
                <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                Importing…
              </>
            ) : (
              <>
                <MaterialIcon name="upload" className="text-base" />
                Import contacts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
