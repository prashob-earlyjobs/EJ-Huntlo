"use client";

import { useMemo, useState } from "react";

import { AISlotFinder } from "@/components/dashboard/schedule/AISlotFinder";
import { InviteReminderSettings } from "@/components/dashboard/schedule/InviteReminderSettings";
import { InterviewerSetup } from "@/components/dashboard/schedule/InterviewerSetup";
import { ScheduleCandidateTable } from "@/components/dashboard/schedule/ScheduleCandidateTable";
import { ScheduleReviewSummary } from "@/components/dashboard/schedule/ScheduleReviewSummary";
import { InterviewStepper } from "@/components/dashboard/schedule/StatusBadge";
import {
  mockAvailableSlots,
  mockCandidates,
  mockInterviewers,
  mockInviteMessage,
} from "@/components/dashboard/schedule/mockData";
import type {
  CandidateSource,
  InterviewDetailsForm,
  InterviewMode,
  InterviewType,
} from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/lib/dashboardStyles";

const STEPS = [
  { key: "details", label: "Details" },
  { key: "candidates", label: "Candidates" },
  { key: "interviewer", label: "Interviewer" },
  { key: "slots", label: "AI Slots" },
  { key: "invite", label: "Invite" },
  { key: "review", label: "Review" },
];

const DEFAULT_FORM: InterviewDetailsForm = {
  name: "",
  jobTitle: "",
  companyName: "",
  interviewType: "technical",
  mode: "google_meet",
  duration: "30 minutes",
  location: "",
  meetingLink: "https://meet.google.com/mock-link",
};

const MODE_LABELS: Record<InterviewMode, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  phone: "Phone Call",
  in_person: "In-person",
};

const TYPE_LABELS: Record<InterviewType, string> = {
  hr: "HR Round",
  technical: "Technical Round",
  manager: "Manager Round",
  final: "Final Round",
  client: "Client Round",
  custom: "Custom",
};

type Props = {
  onBack: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  onToast: (msg: string) => void;
};

export function ScheduleInterviewBuilder({ onBack, onSaveDraft, onSchedule, onToast }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<InterviewDetailsForm>(DEFAULT_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>(["c1"]);
  const [source, setSource] = useState<CandidateSource>("shortlisted");
  const [interviewerId, setInterviewerId] = useState(mockInterviewers[0].id);
  const [workingDays, setWorkingDays] = useState(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [buffer, setBuffer] = useState("15");
  const [maxPerDay, setMaxPerDay] = useState(4);
  const [selectedSlotId, setSelectedSlotId] = useState(mockAvailableSlots[0].id);
  const [preferredTime, setPreferredTime] = useState("afternoon");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [autoPick, setAutoPick] = useState(true);
  const [avoidBackToBack, setAvoidBackToBack] = useState(true);
  const [manualDate, setManualDate] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [inviteMessage, setInviteMessage] = useState(mockInviteMessage);
  const [emailInvite, setEmailInvite] = useState(true);
  const [whatsappInvite, setWhatsappInvite] = useState(true);
  const [calendarInvite, setCalendarInvite] = useState(true);
  const [reminder24h, setReminder24h] = useState(true);
  const [reminder6h, setReminder6h] = useState(true);
  const [reminder1h, setReminder1h] = useState(true);
  const [reminder15m, setReminder15m] = useState(false);
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [emailReminder, setEmailReminder] = useState(true);
  const [askConfirm, setAskConfirm] = useState(true);
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [autoCancel, setAutoCancel] = useState(false);
  const [markPending, setMarkPending] = useState(true);

  const interviewer = mockInterviewers.find((i) => i.id === interviewerId) ?? mockInterviewers[0];
  const selectedSlot = mockAvailableSlots.find((s) => s.id === selectedSlotId) ?? mockAvailableSlots[0];
  const isOnline = form.mode !== "in_person" && form.mode !== "phone";

  const canNext =
    (step === 0 && form.name.trim()) ||
    (step === 1 && selectedIds.length > 0) ||
    step >= 2;

  const goNext = () => step < STEPS.length - 1 && setStep((s) => s + 1);
  const goBack = () => (step === 0 ? onBack() : setStep((s) => s - 1));

  const plan = useMemo(
    () => ({
      candidateCount: selectedIds.length,
      interviewer: interviewer.name,
      duration: form.duration,
      selectedSlot: `${selectedSlot.date}, ${selectedSlot.time} – ${selectedSlot.endTime}`,
      mode: MODE_LABELS[form.mode],
      meetingLinkStatus: isOnline ? "Mock link ready" : "N/A",
    }),
    [selectedIds.length, interviewer.name, form.duration, form.mode, selectedSlot, isOnline]
  );

  const reviewExtras = [
    { label: "Interview name", value: form.name || "Untitled" },
    { label: "Job title", value: form.jobTitle || "-" },
    { label: "Candidates", value: String(selectedIds.length) },
    { label: "Interview type", value: TYPE_LABELS[form.interviewType] },
    { label: "Mode", value: MODE_LABELS[form.mode] },
    { label: "Interviewer", value: interviewer.name },
    { label: "Date & time", value: plan.selectedSlot },
    { label: "Duration", value: form.duration },
    { label: "Reminders", value: [reminder24h && "24h", reminder6h && "6h", reminder1h && "1h"].filter(Boolean).join(", ") || "None" },
    { label: "Invite channels", value: [emailInvite && "Email", whatsappInvite && "WhatsApp", calendarInvite && "Calendar"].filter(Boolean).join(", ") },
    { label: "Calendar sync", value: interviewer.calendarStatus === "connected" ? "Connected" : "Manual availability" },
  ];

  return (
    <div className="dashboard-schedule-builder">
      <header className="dashboard-schedule-builder-header">
        <button type="button" className="dashboard-schedule-back-btn" onClick={goBack}>
          <MaterialIcon name="arrow_back" className="text-sm" />
          {step === 0 ? "Back to schedule" : "Previous step"}
        </button>
        <div>
          <h1 className="dashboard-section-title">Schedule interview</h1>
          <p className="dashboard-text-body">Step {step + 1} of {STEPS.length}</p>
        </div>
      </header>

      <InterviewStepper steps={STEPS} currentStep={step} onStepClick={setStep} />

      <div className="dashboard-schedule-builder-body">
        {step === 0 ? (
          <div className="dashboard-schedule-form-grid">
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass} htmlFor="int-name">Interview name</label>
              <input id="int-name" className={dashboardInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass} htmlFor="int-job">Job title</label>
              <input id="int-job" className={dashboardInputClass} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass} htmlFor="int-co">Company name</label>
              <input id="int-co" className={dashboardInputClass} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass} htmlFor="int-type">Interview type</label>
              <select id="int-type" className={dashboardSelectClass} value={form.interviewType} onChange={(e) => setForm({ ...form, interviewType: e.target.value as InterviewType })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass} htmlFor="int-mode">Interview mode</label>
              <select id="int-mode" className={dashboardSelectClass} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as InterviewMode })}>
                {Object.entries(MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass} htmlFor="int-dur">Duration</label>
              <select id="int-dur" className={dashboardSelectClass} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                <option value="15 minutes">15 minutes</option>
                <option value="30 minutes">30 minutes</option>
                <option value="45 minutes">45 minutes</option>
                <option value="60 minutes">60 minutes</option>
              </select>
            </div>
            {form.mode === "in_person" ? (
              <div className="dashboard-schedule-field dashboard-schedule-field--full">
                <label className={dashboardLabelClass} htmlFor="int-loc">Location</label>
                <input id="int-loc" className={dashboardInputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            ) : null}
            {isOnline ? (
              <div className="dashboard-schedule-field dashboard-schedule-field--full">
                <label className={dashboardLabelClass} htmlFor="int-link">Meeting link (mock)</label>
                <input id="int-link" className={dashboardInputClass} value={form.meetingLink} onChange={(e) => setForm({ ...form, meetingLink: e.target.value })} />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <ScheduleCandidateTable
            candidates={mockCandidates}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            source={source}
            onSourceChange={setSource}
          />
        ) : null}

        {step === 2 ? (
          <InterviewerSetup
            interviewers={mockInterviewers}
            selectedId={interviewerId}
            onSelect={setInterviewerId}
            workingDays={workingDays}
            onWorkingDaysChange={setWorkingDays}
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            buffer={buffer}
            onBufferChange={setBuffer}
            maxPerDay={maxPerDay}
            onMaxPerDayChange={setMaxPerDay}
            onConnectCalendar={(p) => onToast(`${p} calendar connect (UI preview)`)}
          />
        ) : null}

        {step === 3 ? (
          <AISlotFinder
            slots={mockAvailableSlots}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            preferredTime={preferredTime}
            onPreferredTimeChange={setPreferredTime}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            autoPick={autoPick}
            onAutoPickChange={setAutoPick}
            avoidBackToBack={avoidBackToBack}
            onAvoidBackToBackChange={setAvoidBackToBack}
            plan={plan}
            manualDate={manualDate}
            manualStart={manualStart}
            manualEnd={manualEnd}
            onManualDateChange={setManualDate}
            onManualStartChange={setManualStart}
            onManualEndChange={setManualEnd}
            onAddManualSlot={() => onToast("Manual slot added (UI preview)")}
          />
        ) : null}

        {step === 4 ? (
          <InviteReminderSettings
            message={inviteMessage}
            onMessageChange={setInviteMessage}
            emailInvite={emailInvite}
            onEmailInviteChange={setEmailInvite}
            whatsappInvite={whatsappInvite}
            onWhatsappInviteChange={setWhatsappInvite}
            calendarInvite={calendarInvite}
            onCalendarInviteChange={setCalendarInvite}
            reminder24h={reminder24h}
            onReminder24hChange={setReminder24h}
            reminder6h={reminder6h}
            onReminder6hChange={setReminder6h}
            reminder1h={reminder1h}
            onReminder1hChange={setReminder1h}
            reminder15m={reminder15m}
            onReminder15mChange={setReminder15m}
            whatsappReminder={whatsappReminder}
            onWhatsappReminderChange={setWhatsappReminder}
            emailReminder={emailReminder}
            onEmailReminderChange={setEmailReminder}
            askConfirm={askConfirm}
            onAskConfirmChange={setAskConfirm}
            allowReschedule={allowReschedule}
            onAllowRescheduleChange={setAllowReschedule}
            autoCancel={autoCancel}
            onAutoCancelChange={setAutoCancel}
            markPending={markPending}
            onMarkPendingChange={setMarkPending}
          />
        ) : null}

        {step === 5 ? (
          <ScheduleReviewSummary extras={reviewExtras} onSaveDraft={onSaveDraft} onSchedule={onSchedule} />
        ) : null}
      </div>

      {step < 5 ? (
        <footer className="dashboard-schedule-builder-footer">
          <button type="button" className={dashboardBtnSecondaryClass} onClick={goBack}>Back</button>
          <button type="button" className={dashboardBtnPrimaryClass} onClick={goNext} disabled={!canNext}>Continue</button>
        </footer>
      ) : null}
    </div>
  );
}
