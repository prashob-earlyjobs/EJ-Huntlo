"use client";

import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import {
  buildSampleCampaignContactsCsv,
  CSV_MANDATORY_HEADERS,
  parseCsvContacts,
} from "@/lib/campaignCsvImport";
import { getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";
import {
  createScheduleCandidatesBatch,
  fetchScheduleMeetings,
  type CalendlyMeetingOption,
} from "@/lib/scheduleApi";

type Props = {
  onBack: () => void;
  onDone: () => void;
  onToast: (msg: string) => void;
  onGoToIntegrations?: () => void;
};

type ParsedRow = {
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  location: string;
};

export function DirectScheduleCandidatePage({
  onBack,
  onDone,
  onToast,
  onGoToIntegrations,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [meetings, setMeetings] = useState<CalendlyMeetingOption[]>([]);
  const [meetingUri, setMeetingUri] = useState("");
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [error, setError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoadingMeetings(false);
      return;
    }
    void fetchScheduleMeetings(auth.token)
      .then((data) => {
        setMeetings(data.meetings);
        if (data.meetings[0]) setMeetingUri(data.meetings[0].uri);
      })
      .catch(() => setMeetings([]))
      .finally(() => setLoadingMeetings(false));
  }, []);

  const selectedMeeting = meetings.find((m) => m.uri === meetingUri);
  const hasFile = Boolean(csvFileName.trim());
  const hasCsvErrors = csvValidationErrors.length > 0;
  const canImport =
    parsedRows.length > 0 && !hasCsvErrors && Boolean(selectedMeeting) && !busy;

  const handleCsvFileSelected = async (file: File) => {
    setError("");
    try {
      const raw = await file.text();
      const { contacts, errors } = parseCsvContacts(raw);
      setCsvFileName(file.name);
      setParsedRows(
        contacts.map((c) => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
          role: c.role,
          company: c.company,
          location: c.location || "",
        }))
      );
      setCsvValidationErrors(errors);
    } catch (err) {
      setCsvFileName(file.name);
      setParsedRows([]);
      setCsvValidationErrors([
        err instanceof Error ? err.message : "Could not read this CSV file.",
      ]);
    }
  };

  const handleDownloadSample = () => {
    const sample = buildSampleCampaignContactsCsv();
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule_candidates_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setError("Sign in to import candidates.");
      return;
    }
    if (!canImport || !selectedMeeting) return;

    setBusy(true);
    setError("");
    try {
      const result = await createScheduleCandidatesBatch(
        auth.token,
        parsedRows.map((row) => ({
          ...row,
          source: "csv",
          meetingUri: selectedMeeting.uri,
          meetingName: selectedMeeting.name,
          schedulingUrl: selectedMeeting.schedulingUrl,
        })),
        {
          sendLinks: true,
          channels: { email: sendEmail, whatsapp: sendWhatsapp },
        }
      );
      const summary = result.deliverySummary;
      const parts = [`Imported ${result.candidates.length} candidate(s)`];
      if (summary) {
        if (summary.emailSent) parts.push(`${summary.emailSent} email`);
        if (summary.whatsappSent) parts.push(`${summary.whatsappSent} WhatsApp`);
        if (summary.failed) parts.push(`${summary.failed} failed to send`);
      }
      onToast(parts.join(" · "));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import candidates.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-schedule-import">
      <button type="button" className="dashboard-schedule-back-btn" onClick={onBack}>
        <MaterialIcon name="arrow_back" className="text-sm" />
        Back to schedule
      </button>

      <header className="dashboard-schedule-import-header">
        <div>
          <h1 className="dashboard-section-title">Import candidates for scheduling</h1>
          <p className="dashboard-text-body dashboard-schedule-import-lead">
            Upload a CSV, pick a Calendly meeting, and send scheduling links by email and/or WhatsApp.
            Bookings sync automatically when candidates schedule.
          </p>
        </div>
      </header>

      <div className="dashboard-schedule-import-layout">
        <div className="dashboard-schedule-import-main">
          <section className="dashboard-schedule-import-card">
            <div className="dashboard-schedule-import-card-head">
              <span className="dashboard-schedule-import-step">1</span>
              <div>
                <h2 className="dashboard-schedule-import-card-title">Calendly meeting</h2>
                <p className="dashboard-schedule-import-card-desc">
                  All imported candidates will use this meeting type for scheduling links.
                </p>
              </div>
            </div>

            {loadingMeetings ? (
              <p className="dashboard-text-body">Loading Calendly meetings…</p>
            ) : meetings.length === 0 ? (
              <div className="dashboard-schedule-import-empty">
                <MaterialIcon name="link_off" />
                <p>Connect Calendly under Integrations before importing candidates.</p>
                {onGoToIntegrations ? (
                  <button
                    type="button"
                    className={dashboardBtnPrimaryClass}
                    onClick={onGoToIntegrations}
                  >
                    Connect Calendly
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="dashboard-schedule-field">
                <label className={dashboardLabelClass} htmlFor="schedule-import-meeting">
                  Meeting type
                </label>
                <select
                  id="schedule-import-meeting"
                  className={dashboardSelectClass}
                  value={meetingUri}
                  onChange={(e) => setMeetingUri(e.target.value)}
                >
                  {meetings.map((m) => (
                    <option key={m.uri} value={m.uri}>
                      {m.name}
                      {m.durationMinutes ? ` · ${m.durationMinutes} min` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="dashboard-schedule-import-card">
            <div className="dashboard-schedule-import-card-head">
              <span className="dashboard-schedule-import-step">2</span>
              <div>
                <h2 className="dashboard-schedule-import-card-title">Upload CSV</h2>
                <p className="dashboard-schedule-import-card-desc">
                  Use the same column format as campaign and screening imports.
                </p>
              </div>
            </div>

            <div className="dashboard-campaign-csv-modal-section">
              <p className="dashboard-label-upper">Required columns</p>
              <div className="dashboard-campaign-csv-header-chips">
                {CSV_MANDATORY_HEADERS.map((header) => (
                  <span
                    key={header}
                    className="dashboard-campaign-csv-header-chip dashboard-campaign-csv-header-chip--required"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="dashboard-campaign-csv-upload-zone"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="dashboard-campaign-csv-upload-zone-icon" aria-hidden>
                <MaterialIcon name="upload_file" className="text-2xl" />
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
                if (file) void handleCsvFileSelected(file);
                e.currentTarget.value = "";
              }}
            />

            <div className="dashboard-schedule-import-sample-row">
              <button
                type="button"
                className={`${dashboardBtnSecondaryClass} dashboard-campaign-csv-sample-btn`}
                disabled={busy}
                onClick={handleDownloadSample}
              >
                <MaterialIcon name="download" className="text-base" />
                Download sample CSV
              </button>
            </div>

            {hasFile ? (
              <div className="dashboard-campaign-csv-modal-section dashboard-schedule-import-file-status">
                <p className="dashboard-label-upper">File status</p>
                <div className="dashboard-campaign-csv-file-pill">
                  <MaterialIcon name="insert_drive_file" className="shrink-0 text-lg text-[#0050cb]" />
                  <span className="min-w-0 truncate font-medium text-[#141b2b]">{csvFileName}</span>
                </div>
                {hasCsvErrors ? (
                  <div className="dashboard-campaign-csv-status dashboard-campaign-csv-status--error">
                    <MaterialIcon name="error_outline" className="shrink-0 text-lg" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="dashboard-campaign-csv-status-title">Fix these issues</p>
                      <ul className="dashboard-campaign-csv-status-list">
                        {csvValidationErrors.map((err, i) => (
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
                        {parsedRows.length} candidate{parsedRows.length === 1 ? "" : "s"} validated.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          {parsedRows.length > 0 && !hasCsvErrors ? (
            <section className="dashboard-schedule-import-card">
              <h2 className="dashboard-schedule-import-card-title dashboard-schedule-import-card-title--solo">
                Preview
              </h2>
              <div className="dashboard-schedule-table-wrap">
                <table className="dashboard-schedule-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, index) => (
                      <tr key={`${row.email}-${index}`}>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>{row.phone}</td>
                        <td>{row.role}</td>
                        <td>{row.company}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 ? (
                <p className="dashboard-schedule-import-more">
                  +{parsedRows.length - 10} more row(s) in this file
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="dashboard-schedule-import-aside">
          <div className="dashboard-schedule-import-summary">
            <h3 className="dashboard-schedule-import-summary-title">Import summary</h3>
            <dl className="dashboard-schedule-import-summary-dl">
              <div>
                <dt>Meeting</dt>
                <dd>{selectedMeeting?.name || "—"}</dd>
              </div>
              <div>
                <dt>CSV file</dt>
                <dd>{csvFileName || "Not uploaded"}</dd>
              </div>
              <div>
                <dt>Candidates</dt>
                <dd>{parsedRows.length > 0 && !hasCsvErrors ? parsedRows.length : "—"}</dd>
              </div>
            </dl>

            {error ? <p className="dashboard-alert-error">{error}</p> : null}

            <div className="dashboard-schedule-import-channels">
              <h4 className="dashboard-schedule-reminder-label">Send Calendly link via</h4>
              <label className="dashboard-schedule-toggle">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={busy}
                />
                Email
              </label>
              <label className="dashboard-schedule-toggle">
                <input
                  type="checkbox"
                  checked={sendWhatsapp}
                  onChange={(e) => setSendWhatsapp(e.target.checked)}
                  disabled={busy}
                />
                WhatsApp
              </label>
            </div>

            <div className="dashboard-schedule-import-summary-actions">
              <button
                type="button"
                className={dashboardBtnSecondaryClass}
                onClick={onBack}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={dashboardBtnPrimaryClass}
                onClick={() => void handleImport()}
                disabled={!canImport}
              >
                <ButtonLoadingContent loading={busy} loadingLabel="Sending">
                  <>
                    <MaterialIcon name="send" className="text-base" />
                    Import &amp; send links
                  </>
                </ButtonLoadingContent>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
