"use client";

import { INVITE_VARIABLES, mockInviteMessage } from "@/components/dashboard/schedule/mockData";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardLabelClass, dashboardTextareaClass } from "@/lib/dashboardStyles";

function renderPreview(text: string) {
  return text
    .replace(/\{\{candidate_first_name\}\}/g, "Rahul")
    .replace(/\{\{job_title\}\}/g, "React Developer")
    .replace(/\{\{company_name\}\}/g, "TechCorp India")
    .replace(/\{\{interview_date\}\}/g, "Today, Jul 3")
    .replace(/\{\{interview_time\}\}/g, "4:30 PM")
    .replace(/\{\{meeting_link\}\}/g, "https://meet.google.com/abc-defg-hij")
    .replace(/\{\{interviewer_name\}\}/g, "Arjun Menon");
}

type Props = {
  message: string;
  onMessageChange: (v: string) => void;
  emailInvite: boolean;
  onEmailInviteChange: (v: boolean) => void;
  whatsappInvite: boolean;
  onWhatsappInviteChange: (v: boolean) => void;
  calendarInvite: boolean;
  onCalendarInviteChange: (v: boolean) => void;
  reminder24h: boolean;
  onReminder24hChange: (v: boolean) => void;
  reminder6h: boolean;
  onReminder6hChange: (v: boolean) => void;
  reminder1h: boolean;
  onReminder1hChange: (v: boolean) => void;
  reminder15m: boolean;
  onReminder15mChange: (v: boolean) => void;
  whatsappReminder: boolean;
  onWhatsappReminderChange: (v: boolean) => void;
  emailReminder: boolean;
  onEmailReminderChange: (v: boolean) => void;
  askConfirm: boolean;
  onAskConfirmChange: (v: boolean) => void;
  allowReschedule: boolean;
  onAllowRescheduleChange: (v: boolean) => void;
  autoCancel: boolean;
  onAutoCancelChange: (v: boolean) => void;
  markPending: boolean;
  onMarkPendingChange: (v: boolean) => void;
};

export function InviteReminderSettings({
  message = mockInviteMessage,
  onMessageChange,
  emailInvite,
  onEmailInviteChange,
  whatsappInvite,
  onWhatsappInviteChange,
  calendarInvite,
  onCalendarInviteChange,
  reminder24h,
  onReminder24hChange,
  reminder6h,
  onReminder6hChange,
  reminder1h,
  onReminder1hChange,
  reminder15m,
  onReminder15mChange,
  whatsappReminder,
  onWhatsappReminderChange,
  emailReminder,
  onEmailReminderChange,
  askConfirm,
  onAskConfirmChange,
  allowReschedule,
  onAllowRescheduleChange,
  autoCancel,
  onAutoCancelChange,
  markPending,
  onMarkPendingChange,
}: Props) {
  return (
    <div className="dashboard-schedule-invite-layout">
      <div className="dashboard-schedule-invite-main">
        <h4 className="dashboard-schedule-subsection-title">Invite channels</h4>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={emailInvite} onChange={(e) => onEmailInviteChange(e.target.checked)} /> Email invite</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={whatsappInvite} onChange={(e) => onWhatsappInviteChange(e.target.checked)} /> WhatsApp invite</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={calendarInvite} onChange={(e) => onCalendarInviteChange(e.target.checked)} /> Calendar invite</label>

        <div className="dashboard-schedule-field">
          <label className={dashboardLabelClass} htmlFor="invite-msg">Invite message</label>
          <textarea id="invite-msg" className={dashboardTextareaClass} rows={6} value={message} onChange={(e) => onMessageChange(e.target.value)} />
        </div>

        <div className="dashboard-schedule-variables">
          <span className={dashboardLabelClass}>Variables</span>
          <div className="dashboard-schedule-variable-pills">
            {INVITE_VARIABLES.map((v) => <code key={v} className="dashboard-schedule-variable-pill">{v}</code>)}
          </div>
        </div>

        <h4 className="dashboard-schedule-subsection-title">
          Reminder settings
          <span className="dashboard-schedule-badge dashboard-schedule-badge--ai">Smart Reminder</span>
        </h4>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={reminder24h} onChange={(e) => onReminder24hChange(e.target.checked)} /> 24 hours before</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={reminder6h} onChange={(e) => onReminder6hChange(e.target.checked)} /> 6 hours before</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={reminder1h} onChange={(e) => onReminder1hChange(e.target.checked)} /> 1 hour before</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={reminder15m} onChange={(e) => onReminder15mChange(e.target.checked)} /> 15 minutes before</label>

        <h4 className="dashboard-schedule-subsection-title">Reminder channels</h4>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={whatsappReminder} onChange={(e) => onWhatsappReminderChange(e.target.checked)} /> WhatsApp</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={emailReminder} onChange={(e) => onEmailReminderChange(e.target.checked)} /> Email</label>
        <label className="dashboard-schedule-toggle dashboard-schedule-toggle--disabled">
          <input type="checkbox" disabled /> SMS <span className="dashboard-schedule-badge dashboard-schedule-badge--muted">Soon</span>
        </label>

        <h4 className="dashboard-schedule-subsection-title">Candidate confirmation</h4>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={askConfirm} onChange={(e) => onAskConfirmChange(e.target.checked)} /> Ask candidate to confirm availability</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={allowReschedule} onChange={(e) => onAllowRescheduleChange(e.target.checked)} /> Allow candidate to request reschedule</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={autoCancel} onChange={(e) => onAutoCancelChange(e.target.checked)} /> Auto-cancel if no confirmation (mock)</label>
        <label className="dashboard-schedule-toggle"><input type="checkbox" checked={markPending} onChange={(e) => onMarkPendingChange(e.target.checked)} /> Mark as pending if no response</label>
      </div>

      <aside className="dashboard-schedule-invite-preview">
        <h4><MaterialIcon name="visibility" className="text-sm" /> Invite preview</h4>
        <p>Candidate: <strong>Rahul Nair</strong></p>
        <div className="dashboard-schedule-preview-body">{renderPreview(message)}</div>
      </aside>
    </div>
  );
}
