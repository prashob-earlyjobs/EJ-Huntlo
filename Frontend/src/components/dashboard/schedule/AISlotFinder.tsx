"use client";

import type { RecommendedSlot } from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { dashboardInputClass, dashboardLabelClass, dashboardSelectClass } from "@/lib/dashboardStyles";

function SlotRecommendationCard({
  slot,
  selected,
  onSelect,
}: {
  slot: RecommendedSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  const badgeLabel =
    slot.badge === "best" ? "Best Slot" : slot.badge === "recommended" ? "AI Recommended" : "Available";

  return (
    <div className={`dashboard-schedule-slot-card${selected ? " dashboard-schedule-slot-card--selected" : ""}`}>
      <div className="dashboard-schedule-slot-card-head">
        <div>
          <strong>{slot.date}, {slot.time} – {slot.endTime}</strong>
          <p>{slot.confidence}% Match</p>
        </div>
        {slot.badge ? (
          <span className={`dashboard-schedule-badge dashboard-schedule-badge--${slot.badge === "best" ? "ai" : "muted"}`}>
            {badgeLabel}
          </span>
        ) : null}
      </div>
      <div className="dashboard-schedule-slot-availability">
        <span className={slot.interviewerAvailable ? "dashboard-schedule-slot-ok" : "dashboard-schedule-slot-warn"}>
          <MaterialIcon name={slot.interviewerAvailable ? "check_circle" : "cancel"} className="text-sm" />
          Interviewer
        </span>
        <span className={slot.candidateAvailable ? "dashboard-schedule-slot-ok" : "dashboard-schedule-slot-warn"}>
          <MaterialIcon name={slot.candidateAvailable ? "check_circle" : "cancel"} className="text-sm" />
          Candidate
        </span>
      </div>
      <button type="button" className="dashboard-btn-secondary dashboard-btn-secondary--sm" onClick={onSelect}>
        {selected ? "Selected" : "Select slot"}
      </button>
    </div>
  );
}

type PlanPreview = {
  candidateCount: number;
  interviewer: string;
  duration: string;
  selectedSlot: string;
  mode: string;
  meetingLinkStatus: string;
};

type Props = {
  slots: RecommendedSlot[];
  selectedSlotId: string;
  onSelectSlot: (id: string) => void;
  preferredTime: string;
  onPreferredTimeChange: (v: string) => void;
  timezone: string;
  onTimezoneChange: (v: string) => void;
  autoPick: boolean;
  onAutoPickChange: (v: boolean) => void;
  avoidBackToBack: boolean;
  onAvoidBackToBackChange: (v: boolean) => void;
  plan: PlanPreview;
  manualDate: string;
  manualStart: string;
  manualEnd: string;
  onManualDateChange: (v: string) => void;
  onManualStartChange: (v: string) => void;
  onManualEndChange: (v: string) => void;
  onAddManualSlot: () => void;
};

export function AISlotFinder({
  slots,
  selectedSlotId,
  onSelectSlot,
  preferredTime,
  onPreferredTimeChange,
  timezone,
  onTimezoneChange,
  autoPick,
  onAutoPickChange,
  avoidBackToBack,
  onAvoidBackToBackChange,
  plan,
  manualDate,
  manualStart,
  manualEnd,
  onManualDateChange,
  onManualStartChange,
  onManualEndChange,
  onAddManualSlot,
}: Props) {
  return (
    <div className="dashboard-schedule-slot-finder">
      <div className="dashboard-schedule-slot-finder-main">
        <header className="dashboard-schedule-slot-finder-header">
          <div>
            <h3 className="dashboard-section-title">AI recommended slots</h3>
            <p className="dashboard-text-body">
              Based on interviewer availability, candidate preference, working hours, and interview duration.
            </p>
          </div>
          <span className="dashboard-schedule-badge dashboard-schedule-badge--ai">AI Recommended</span>
        </header>

        <div className="dashboard-schedule-slot-controls">
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>Date range</label>
            <input type="text" className={dashboardInputClass} value="Jul 3 – Jul 10, 2026" readOnly />
          </div>
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>Preferred time</label>
            <select className={dashboardSelectClass} value={preferredTime} onChange={(e) => onPreferredTimeChange(e.target.value)}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="anytime">Anytime</option>
            </select>
          </div>
          <div className="dashboard-schedule-field">
            <label className={dashboardLabelClass}>Timezone</label>
            <select className={dashboardSelectClass} value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <label className="dashboard-schedule-toggle">
          <input type="checkbox" checked={autoPick} onChange={(e) => onAutoPickChange(e.target.checked)} />
          Auto-pick best slot
        </label>
        <label className="dashboard-schedule-toggle">
          <input type="checkbox" checked={avoidBackToBack} onChange={(e) => onAvoidBackToBackChange(e.target.checked)} />
          Avoid back-to-back interviews
        </label>

        <div className="dashboard-schedule-slots-grid">
          {slots.map((slot) => (
            <SlotRecommendationCard
              key={slot.id}
              slot={slot}
              selected={selectedSlotId === slot.id}
              onSelect={() => onSelectSlot(slot.id)}
            />
          ))}
        </div>

        <div className="dashboard-schedule-manual-slot">
          <h4>Manual slot picker</h4>
          <div className="dashboard-schedule-time-row">
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass}>Date</label>
              <input type="date" className={dashboardInputClass} value={manualDate} onChange={(e) => onManualDateChange(e.target.value)} />
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass}>Start</label>
              <input type="time" className={dashboardInputClass} value={manualStart} onChange={(e) => onManualStartChange(e.target.value)} />
            </div>
            <div className="dashboard-schedule-field">
              <label className={dashboardLabelClass}>End</label>
              <input type="time" className={dashboardInputClass} value={manualEnd} onChange={(e) => onManualEndChange(e.target.value)} />
            </div>
            <button type="button" className="dashboard-btn-secondary" onClick={onAddManualSlot}>Add manual slot</button>
          </div>
        </div>
      </div>

      <aside className="dashboard-schedule-plan-preview">
        <h4>Selected interview plan</h4>
        <dl>
          <div><dt>Candidates</dt><dd>{plan.candidateCount}</dd></div>
          <div><dt>Interviewer</dt><dd>{plan.interviewer}</dd></div>
          <div><dt>Duration</dt><dd>{plan.duration}</dd></div>
          <div><dt>Slot</dt><dd>{plan.selectedSlot}</dd></div>
          <div><dt>Mode</dt><dd>{plan.mode}</dd></div>
          <div><dt>Meeting link</dt><dd>{plan.meetingLinkStatus}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
