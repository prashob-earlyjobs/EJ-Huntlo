"use client";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/lib/dashboardStyles";

type Props = {
  jobTitle: string;
  onJobTitleChange: (value: string) => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  loading: boolean;
  saving: boolean;
  notice: string;
  locked: boolean;
  outreachStatus: string;
  /** Show hint to add JD from Editor scratch flow. */
  showEmptyGuidance: boolean;
  /** User is editing WhatsApp sequence on Editor tab (synced JD). */
  showEditorTabHint: boolean;
  isWhatsApp?: boolean;
};

const MIN_RECOMMENDED_CHARS = 20;

function outreachStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return "Not launched";
}

function outreachStatusClass(status: string) {
  if (status === "active") return "dashboard-campaign-report-status-pill--active";
  if (status === "paused") return "dashboard-campaign-report-status-pill--paused";
  if (status === "completed") return "dashboard-campaign-report-status-pill--completed";
  return "dashboard-campaign-report-status-pill--idle";
}

export function CampaignJobDescriptionPanel({
  jobTitle,
  onJobTitleChange,
  value,
  onChange,
  onSave,
  loading,
  saving,
  notice,
  locked,
  outreachStatus,
  showEmptyGuidance,
  showEditorTabHint,
  isWhatsApp = true,
}: Props) {
  const trimmedTitle = jobTitle.trim();
  const trimmed = value.trim();
  const charCount = trimmed.length;
  const aiReady = trimmedTitle.length > 0 && charCount >= MIN_RECOMMENDED_CHARS;

  return (
    <div className="dashboard-campaign-jd-panel flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-report-toolbar shrink-0">
        <div className="dashboard-campaign-report-toolbar-row">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {isWhatsApp ? (
              <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className="h-6 w-6 shrink-0" />
            ) : (
              <span
                className="dashboard-campaign-jd-toolbar-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"
                aria-hidden
              >
                <MaterialIcon name="auto_awesome" className="text-xl" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="dashboard-campaign-report-title">Job description</h2>
              <p className="dashboard-campaign-report-subtitle">
                {isWhatsApp
                  ? "AI context when candidates ask about the role on WhatsApp"
                  : "Role context for outreach and candidate questions"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {outreachStatus !== "idle" ? (
              <span
                className={`dashboard-campaign-report-status-pill ${outreachStatusClass(outreachStatus)}`}
              >
                {outreachStatusLabel(outreachStatus)}
              </span>
            ) : null}
            {locked ? (
              <span className="dashboard-campaign-jd-readonly-pill">Read-only</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dashboard-campaign-jd-body dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="dashboard-campaign-jd-inner">
          {locked ? (
            <div className="dashboard-campaign-jd-locked-banner" role="status">
              <MaterialIcon name="lock" className="shrink-0 text-base text-amber-700" aria-hidden />
              <p className="text-sm text-amber-950">
                {outreachStatus === "completed"
                  ? "This campaign is completed. The job description cannot be edited."
                  : "Campaign is running. Pause the campaign to edit the job description."}
              </p>
            </div>
          ) : null}

          {loading ? (
            <div
              className="dashboard-campaign-jd-editor-card dashboard-shimmer-block min-h-64"
              aria-busy="true"
              aria-label="Loading job description"
            />
          ) : (
            <>
              {showEmptyGuidance ? (
                <div className="dashboard-campaign-jd-empty">
                  <span className="dashboard-campaign-jd-empty-icon" aria-hidden>
                    <MaterialIcon name="description" className="text-3xl text-[#0050cb]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="dashboard-campaign-jd-empty-title">No job description yet</h3>
                    <p className="dashboard-campaign-jd-empty-text">
                      Paste a job description on the Editor tab when starting from scratch, or enter
                      role details below so the AI can answer candidate questions accurately.
                    </p>
                  </div>
                </div>
              ) : null}

              <section className="dashboard-campaign-jd-section" aria-labelledby="campaign-jd-editor-heading">
                <div className="dashboard-campaign-jd-section-head">
                  <p id="campaign-jd-editor-heading" className="dashboard-label-upper">
                    Role details
                  </p>
                  <p className="dashboard-campaign-jd-section-lead">
                    Include role title, responsibilities, requirements, location, and compensation if
                    relevant. At least {MIN_RECOMMENDED_CHARS} characters recommended.
                  </p>
                </div>

                <div className="dashboard-campaign-jd-editor-card">
                  <label className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label`}>
                    Job title
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => onJobTitleChange(e.target.value)}
                      disabled={locked}
                      placeholder="e.g. Senior Software Engineer"
                      className={`${dashboardInputClass} mt-2 w-full`}
                    />
                  </label>
                  <label className={`${dashboardLabelClass} dashboard-campaign-jd-editor-label mt-4`}>
                    Job description
                    <textarea
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      rows={14}
                      disabled={locked}
                      placeholder="Example: Senior Software Engineer — remote-friendly. 5+ years Node.js, building APIs and integrations. Own features end-to-end. Based in EU time zones preferred."
                      className={`${dashboardTextareaClass} dashboard-campaign-jd-textarea mt-2`}
                      aria-describedby="campaign-jd-char-hint"
                    />
                  </label>
                  <p
                    id="campaign-jd-char-hint"
                    className={`dashboard-campaign-jd-char-hint${aiReady ? " dashboard-campaign-jd-char-hint--ok" : ""}`}
                  >
                    <MaterialIcon
                      name={aiReady ? "check_circle" : "info"}
                      className="text-base shrink-0"
                      aria-hidden
                    />
                    {aiReady
                      ? "Enough detail for AI to answer candidate questions."
                      : !trimmedTitle
                        ? "Add a job title and description for outreach and AI replies."
                        : charCount > 0
                          ? `${MIN_RECOMMENDED_CHARS - charCount} more character${MIN_RECOMMENDED_CHARS - charCount === 1 ? "" : "s"} recommended.`
                          : "Start typing to enable AI role answers."}
                  </p>
                </div>
              </section>

              <section className="dashboard-campaign-jd-section" aria-labelledby="campaign-jd-tips-heading">
                <p id="campaign-jd-tips-heading" className="dashboard-label-upper">
                  Tips
                </p>
                <ul className="dashboard-campaign-jd-tips">
                  <li>
                    <MaterialIcon name="check" className="text-base text-emerald-600" aria-hidden />
                    Mention must-have skills and experience level.
                  </li>
                  <li>
                    <MaterialIcon name="check" className="text-base text-emerald-600" aria-hidden />
                    State location, remote policy, and employment type.
                  </li>
                  <li>
                    <MaterialIcon name="check" className="text-base text-emerald-600" aria-hidden />
                    Keep screening questions on the WhatsApp sequence; use this field for role facts.
                  </li>
                </ul>
              </section>

              <div className="dashboard-campaign-jd-actions">
                <div className="min-w-0 flex-1">
                  {showEditorTabHint ? (
                    <p className="dashboard-campaign-jd-actions-hint">
                      Also save your WhatsApp sequence on the Editor tab when you finish editing
                      messages.
                    </p>
                  ) : null}
                  {notice ? (
                    <p className="dashboard-alert-notice mt-2 text-sm" role="status">
                      {notice}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`${dashboardBtnPrimaryClass} dashboard-campaign-jd-save-btn shrink-0 disabled:opacity-55`}
                  disabled={saving || locked || !trimmedTitle || !trimmed}
                  onClick={onSave}
                >
                  {saving ? "Saving…" : "Save job description"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
