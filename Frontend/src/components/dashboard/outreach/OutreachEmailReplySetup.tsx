"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CalendlyMeetingPickerModal,
  type CalendlyMeetingOption,
} from "@/components/dashboard/CalendlyMeetingPickerModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

type Props = {
  calendlyAutomation: CampaignCalendlyAutomation;
  onCalendlyAutomationChange: (value: CampaignCalendlyAutomation) => void;
  disabled?: boolean;
};

export function OutreachEmailReplySetup({
  calendlyAutomation,
  onCalendlyAutomationChange,
  disabled = false,
}: Props) {
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [calendlyLoading, setCalendlyLoading] = useState(false);
  const [calendlyError, setCalendlyError] = useState("");
  const [meetings, setMeetings] = useState<CalendlyMeetingOption[]>([]);

  const loadCalendlyStatus = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    try {
      const res = await fetch(`${apiBase()}/api/integrations/calendly/status`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { connected?: boolean };
      setCalendlyConnected(Boolean(data.connected));
    } catch {
      setCalendlyConnected(false);
    }
  }, []);

  const loadMeetings = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setCalendlyError("Sign in to connect Calendly.");
      return;
    }
    setCalendlyLoading(true);
    setCalendlyError("");
    try {
      const res = await fetch(`${apiBase()}/api/integrations/calendly/links`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = (await res.json()) as {
        links?: CalendlyMeetingOption[];
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || "Could not load Calendly meetings.");
      }
      setMeetings(Array.isArray(data.links) ? data.links : []);
      if (!data.links?.length) {
        setCalendlyError("No meeting types found on your Calendly account.");
      }
    } catch (err) {
      setCalendlyError(err instanceof Error ? err.message : "Could not load Calendly meetings.");
      setMeetings([]);
    } finally {
      setCalendlyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendlyStatus();
  }, [loadCalendlyStatus]);

  const openPicker = async () => {
    setPickerOpen(true);
    await loadMeetings();
  };

  const handleMeetingSubmit = (meeting: CalendlyMeetingOption) => {
    onCalendlyAutomationChange({
      enabled: true,
      meetingUri: meeting.uri,
      meetingName: meeting.name,
      schedulingUrl: meeting.schedulingUrl,
      durationMinutes: meeting.durationMinutes,
      kind: meeting.kind,
    });
    setPickerOpen(false);
  };

  const calendlyOn = Boolean(calendlyAutomation.enabled && calendlyAutomation.schedulingUrl?.trim());

  return (
    <>
      <div className="dashboard-outreach-message-block dashboard-outreach-message-block--reply">
        <div className="dashboard-outreach-message-block-head">
          <span className="dashboard-outreach-message-step-num dashboard-outreach-message-step-num--reply">
            <MaterialIcon name="smart_toy" className="text-base" />
          </span>
          <div className="dashboard-outreach-message-block-copy">
            <span className="dashboard-outreach-message-block-eyebrow">If candidate replies</span>
            <h3 className="dashboard-outreach-message-block-title">AI email replies</h3>
            <p className="dashboard-outreach-message-block-desc">
              Huntlo reads candidate replies and drafts contextual responses using your job
              description — up to three exchanges before inviting them to book a call.
            </p>
          </div>
        </div>

        <div
          className={`dashboard-outreach-calendly-rail-card${
            calendlyOn ? " dashboard-outreach-calendly-rail-card--on" : ""
          }`}
        >
            <div className="dashboard-outreach-calendly-rail-card-head">
              <img
                src="/integrations/calendly_logo.png"
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-contain"
              />
              <div className="min-w-0 flex-1">
                <div className="dashboard-outreach-calendly-rail-card-label-row">
                  <span className="dashboard-outreach-calendly-rail-card-label">Calendly</span>
                  <button
                    type="button"
                    className={`dashboard-outreach-calendly-toggle${
                      calendlyOn ? " dashboard-outreach-calendly-toggle--on" : ""
                    }`}
                    role="switch"
                    aria-checked={calendlyOn}
                    disabled={disabled || !calendlyConnected}
                    onClick={() => {
                      if (calendlyOn) {
                        onCalendlyAutomationChange({ ...calendlyAutomation, enabled: false });
                      } else {
                        void openPicker();
                      }
                    }}
                  >
                    <span className="dashboard-outreach-calendly-toggle-knob" />
                  </button>
                </div>
                <p className="dashboard-outreach-calendly-rail-card-meeting">
                  {calendlyOn && calendlyAutomation.meetingName
                    ? calendlyAutomation.meetingName
                    : calendlyConnected
                      ? "Include a scheduling link on the final AI reply."
                      : "Connect Calendly in Integrations to add a scheduling link."}
                </p>
              </div>
            </div>
            {calendlyConnected ? (
              <button
                type="button"
                className={`${dashboardBtnSecondaryClass} mt-3`}
                disabled={disabled || calendlyLoading}
                onClick={() => void openPicker()}
              >
                {calendlyLoading
                  ? "Loading meetings…"
                  : calendlyOn
                    ? "Change meeting type"
                    : "Select meeting type"}
              </button>
            ) : null}
            {calendlyError ? (
              <p className="dashboard-outreach-empty-hint dashboard-outreach-empty-hint--error mt-2">
                {calendlyError}
              </p>
            ) : null}
        </div>
      </div>

      <CalendlyMeetingPickerModal
        open={pickerOpen}
        loading={calendlyLoading}
        options={meetings}
        selectedUri={calendlyAutomation.meetingUri || ""}
        error={calendlyError}
        onClose={() => setPickerOpen(false)}
        onSubmit={handleMeetingSubmit}
        onRetry={() => void loadMeetings()}
      />
    </>
  );
}
