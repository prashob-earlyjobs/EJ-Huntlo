"use client";

import { useCallback, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { getStoredAuth } from "@/lib/auth";
import {
  fetchScheduleReminderSettings,
  updateScheduleReminderSettings,
  type ScheduleReminderSettings,
} from "@/lib/scheduleApi";

type Props = {
  onToast?: (message: string) => void;
  embedded?: boolean;
};

type ReminderOptionProps = {
  checked: boolean;
  disabled?: boolean;
  icon?: string;
  label: string;
  hint?: string;
  onChange: (checked: boolean) => void;
};

function ReminderOption({
  checked,
  disabled = false,
  icon,
  label,
  hint,
  onChange,
}: ReminderOptionProps) {
  return (
    <label
      className={`dashboard-schedule-reminder-option${
        checked ? " dashboard-schedule-reminder-option--on" : ""
      }${disabled ? " dashboard-schedule-reminder-option--disabled" : ""}`}
    >
      <input
        type="checkbox"
        className="dashboard-schedule-reminder-option-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="dashboard-schedule-reminder-option-body">
        {icon ? (
          <span className="dashboard-schedule-reminder-option-icon" aria-hidden>
            <MaterialIcon name={icon} />
          </span>
        ) : null}
        <span className="dashboard-schedule-reminder-option-text">
          <span className="dashboard-schedule-reminder-option-label">{label}</span>
          {hint ? <span className="dashboard-schedule-reminder-option-hint">{hint}</span> : null}
        </span>
        <span className="dashboard-schedule-reminder-option-check" aria-hidden>
          <MaterialIcon name={checked ? "check_circle" : "radio_button_unchecked"} />
        </span>
      </span>
    </label>
  );
}

function ReminderSettingsSkeleton({ embedded }: { embedded: boolean }) {
  return (
    <div
      className={
        embedded
          ? "dashboard-schedule-reminder-settings"
          : "dashboard-schedule-reminder-settings dashboard-schedule-reminder-settings--page"
      }
    >
      <div className="dashboard-schedule-reminder-layout">
        <div className="dashboard-schedule-reminder-main">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dashboard-schedule-reminder-card dashboard-schedule-reminder-card--skeleton">
              <div className="dashboard-schedule-reminder-skeleton-head" />
              <div className="dashboard-schedule-reminder-skeleton-line" />
              <div className="dashboard-schedule-reminder-skeleton-line dashboard-schedule-reminder-skeleton-line--short" />
            </div>
          ))}
        </div>
        {!embedded ? (
          <aside className="dashboard-schedule-reminder-aside">
            <div className="dashboard-schedule-reminder-info dashboard-schedule-reminder-card--skeleton">
              <div className="dashboard-schedule-reminder-skeleton-head" />
              <div className="dashboard-schedule-reminder-skeleton-line" />
              <div className="dashboard-schedule-reminder-skeleton-line" />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function ScheduleReminderSettingsPanel({ onToast, embedded = true }: Props) {
  const [settings, setSettings] = useState<ScheduleReminderSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchScheduleReminderSettings(auth.token);
      setSettings(data.settings);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!savedFlash || saving) return;
    const timer = window.setTimeout(() => setSavedFlash(false), 2200);
    return () => window.clearTimeout(timer);
  }, [savedFlash, saving]);

  const save = async (patch: Partial<ScheduleReminderSettings>) => {
    const auth = getStoredAuth();
    if (!auth?.token || !settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      const data = await updateScheduleReminderSettings(auth.token, next);
      setSettings(data.settings);
      setSavedFlash(true);
      onToast?.("Reminder settings saved");
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "Could not save reminder settings.");
      void load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ReminderSettingsSkeleton embedded={embedded} />;
  }

  if (!settings) return null;

  const hasReminderWindow =
    settings.reminder24h || settings.reminder6h || settings.reminder1h || settings.reminder15m;
  const hasReminderChannel = settings.reminderEmail || settings.reminderWhatsapp;
  const hasInviteChannel = settings.inviteEmail || settings.inviteWhatsapp;

  const mainCards = (
    <>
      <section className="dashboard-schedule-reminder-card">
        <header className="dashboard-schedule-reminder-card-head">
          <span className="dashboard-schedule-reminder-card-icon" aria-hidden>
            <MaterialIcon name="schedule" />
          </span>
          <div>
            <h2 className="dashboard-schedule-reminder-card-title">When to remind</h2>
            <p className="dashboard-schedule-reminder-card-desc">
              Huntlo sends you a heads-up before each confirmed interview on your calendar.
            </p>
          </div>
        </header>
        <div className="dashboard-schedule-reminder-options">
          <ReminderOption
            checked={settings.reminder24h}
            label="24 hours before"
            hint="Day-before reminder"
            onChange={(reminder24h) => void save({ reminder24h })}
            disabled={saving}
          />
          <ReminderOption
            checked={settings.reminder6h}
            label="6 hours before"
            onChange={(reminder6h) => void save({ reminder6h })}
            disabled={saving}
          />
          <ReminderOption
            checked={settings.reminder1h}
            label="1 hour before"
            onChange={(reminder1h) => void save({ reminder1h })}
            disabled={saving}
          />
          <ReminderOption
            checked={settings.reminder15m}
            label="15 minutes before"
            hint="Last-minute nudge"
            onChange={(reminder15m) => void save({ reminder15m })}
            disabled={saving}
          />
        </div>
        {!hasReminderWindow ? (
          <p className="dashboard-schedule-reminder-card-note">
            <MaterialIcon name="info" className="text-sm" />
            Select at least one reminder time to receive notifications.
          </p>
        ) : null}
      </section>

      <section className="dashboard-schedule-reminder-card">
        <header className="dashboard-schedule-reminder-card-head">
          <span className="dashboard-schedule-reminder-card-icon" aria-hidden>
            <MaterialIcon name="campaign" />
          </span>
          <div>
            <h2 className="dashboard-schedule-reminder-card-title">Notify me via</h2>
            <p className="dashboard-schedule-reminder-card-desc">
              Uses your connected email or WhatsApp under Integrations.
            </p>
          </div>
        </header>
        <div className="dashboard-schedule-reminder-options dashboard-schedule-reminder-options--channels">
          <ReminderOption
            checked={settings.reminderEmail}
            icon="mail"
            label="Email"
            hint="Sent to your account email"
            onChange={(reminderEmail) => void save({ reminderEmail })}
            disabled={saving}
          />
          <ReminderOption
            checked={settings.reminderWhatsapp}
            icon="chat"
            label="WhatsApp"
            hint="Requires an active WhatsApp session"
            onChange={(reminderWhatsapp) => void save({ reminderWhatsapp })}
            disabled={saving}
          />
        </div>
        {!hasReminderChannel ? (
          <p className="dashboard-schedule-reminder-card-note">
            <MaterialIcon name="info" className="text-sm" />
            Turn on at least one channel to receive interview reminders.
          </p>
        ) : null}
      </section>

      <section className="dashboard-schedule-reminder-card">
        <header className="dashboard-schedule-reminder-card-head">
          <span className="dashboard-schedule-reminder-card-icon" aria-hidden>
            <MaterialIcon name="send" />
          </span>
          <div>
            <h2 className="dashboard-schedule-reminder-card-title">Candidate invite channels</h2>
            <p className="dashboard-schedule-reminder-card-desc">
              Default channels when importing CSV candidates or resending Calendly links.
            </p>
          </div>
        </header>
        <div className="dashboard-schedule-reminder-options dashboard-schedule-reminder-options--channels">
          <ReminderOption
            checked={settings.inviteEmail}
            icon="mail"
            label="Email"
            onChange={(inviteEmail) => void save({ inviteEmail })}
            disabled={saving}
          />
          <ReminderOption
            checked={settings.inviteWhatsapp}
            icon="chat"
            label="WhatsApp"
            onChange={(inviteWhatsapp) => void save({ inviteWhatsapp })}
            disabled={saving}
          />
        </div>
        {!hasInviteChannel ? (
          <p className="dashboard-schedule-reminder-card-note dashboard-schedule-reminder-card-note--warn">
            <MaterialIcon name="warning" className="text-sm" />
            No invite channels selected — CSV import will not send links automatically.
          </p>
        ) : null}
      </section>
    </>
  );

  return (
    <section
      className={
        embedded
          ? "dashboard-schedule-reminder-settings"
          : "dashboard-schedule-reminder-settings dashboard-schedule-reminder-settings--page"
      }
    >
      {embedded ? (
        <>
          <div className="dashboard-outreach-tracking-section-head">
            <h2 className="dashboard-schedule-subsection-title">Interview reminders</h2>
            {saving ? (
              <span className="dashboard-schedule-reminder-status">
                <MaterialIcon name="sync" className="dashboard-schedule-reminder-status-icon" />
                Saving…
              </span>
            ) : null}
          </div>
          <p className="dashboard-text-body dashboard-schedule-reminder-lead">
            Get notified before upcoming interviews via your connected email or WhatsApp.
          </p>
        </>
      ) : (
        <div className="dashboard-schedule-reminder-toolbar">
          <p className="dashboard-schedule-reminder-toolbar-hint">
            Changes save automatically when you toggle an option.
          </p>
          {saving ? (
            <span className="dashboard-schedule-reminder-status">
              <MaterialIcon name="sync" className="dashboard-schedule-reminder-status-icon" />
              Saving…
            </span>
          ) : savedFlash ? (
            <span className="dashboard-schedule-reminder-status dashboard-schedule-reminder-status--saved">
              <MaterialIcon name="check" className="text-sm" />
              Saved
            </span>
          ) : null}
        </div>
      )}

      <div className="dashboard-schedule-reminder-layout">
        <div className="dashboard-schedule-reminder-main">{mainCards}</div>

        {!embedded ? (
          <aside className="dashboard-schedule-reminder-aside">
            <div className="dashboard-schedule-reminder-info">
              <h3 className="dashboard-schedule-reminder-info-title">How it works</h3>
              <ul className="dashboard-schedule-reminder-info-list">
                <li>
                  <MaterialIcon name="event" className="text-sm" />
                  Reminders fire for confirmed Calendly bookings synced to Schedule.
                </li>
                <li>
                  <MaterialIcon name="link" className="text-sm" />
                  Invite channels apply to CSV import and manual link resends.
                </li>
                <li>
                  <MaterialIcon name="hub" className="text-sm" />
                  Outreach campaigns use their own channel settings when sending links.
                </li>
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
