"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import { ConfirmModal } from "@/components/dashboard/ConfirmModal";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { OutreachFieldSelect } from "@/components/dashboard/OutreachFieldSelect";
import { OutreachPillSelect } from "@/components/dashboard/OutreachPillSelect";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
} from "@/lib/dashboardStyles";
import {
  insertTextIntoField,
  OUTREACH_MERGE_FIELDS,
} from "@/lib/outreachMergeFields";
import {
  createEmptyTouchpoint,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";
import {
  defaultSoonestAtLocal,
  inferAfterDays,
  inferStartMode,
  mergeSendTimeIntoSoonestAt,
  soonestAtFromWaitDays,
  touchpointScheduleLabel,
  waitDaysForStartMode,
  type StartScheduleMode,
} from "@/lib/outreachStartSchedule";
import { OutreachStartScheduleBar } from "@/components/dashboard/OutreachStartScheduleBar";

type CalendlyMeetingOption = {
  uri: string;
  name: string;
  schedulingUrl: string;
  durationMinutes: number;
  kind: string;
};

type CalendlyAutomationDraft = {
  enabled?: boolean;
  meetingUri?: string;
  meetingName?: string;
  schedulingUrl?: string;
  durationMinutes?: number;
  kind?: string;
};

function calendlyMeetingFromAutomation(
  automation?: CalendlyAutomationDraft
): CalendlyMeetingOption | null {
  if (!automation?.enabled || !automation.meetingUri?.trim() || !automation.meetingName?.trim()) {
    return null;
  }
  return {
    uri: automation.meetingUri.trim(),
    name: automation.meetingName.trim(),
    schedulingUrl: automation.schedulingUrl?.trim() || "",
    durationMinutes: Number(automation.durationMinutes || 0),
    kind: automation.kind?.trim() || "",
  };
}

type Props = {
  planId?: string | "new";
  initialPlanName: string;
  initialTouchpoints: OutreachTouchpointDraft[];
  initialCalendlyAutomation?: CalendlyAutomationDraft;
  /** Hide standalone header when nested under campaign workspace. */
  embedded?: boolean;
  /** Lock Start / Wait schedule pills when sequence came from template or saved plan. */
  lockSchedule?: boolean;
  /** Read-only editor (active or completed campaign). */
  editorLocked?: boolean;
  /** Campaign workspace controls (embedded mode). */
  campaignOutreachStatus?: "idle" | "active" | "paused" | "completed";
  hasCampaignContacts?: boolean;
  hasSequence?: boolean;
  launchBusy?: boolean;
  onLaunchCampaign?: () => void | Promise<void>;
  onPauseCampaign?: () => void | Promise<void>;
  onResumeCampaign?: () => void | Promise<void>;
  onCancel: () => void;
  onGoToIntegrations?: () => void;
  /** When set (campaign editor), persist interview link on the campaign immediately. */
  saveCalendlyToCampaign?: (automation: CalendlyAutomationDraft) => void | Promise<void>;
  onSaved: (
    message: string,
    plan?: {
      id: string;
      name: string;
      touchpoints: OutreachTouchpointDraft[];
      calendlyAutomation?: CalendlyAutomationDraft;
    }
  ) => void;
};

function SaveSequenceButton({
  saving,
  saveSucceeded,
  onClick,
  compact = false,
  label = "Save sequence",
  disabled = false,
  className = "",
}: {
  saving: boolean;
  saveSucceeded: boolean;
  onClick: () => void;
  compact?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving || saveSucceeded}
      className={[
        "dashboard-btn-primary dashboard-outreach-save-btn disabled:opacity-55",
        compact ? "px-3 py-1.5 text-xs" : "dashboard-outreach-builder-save",
        saving ? "dashboard-outreach-save-btn--saving" : "",
        saveSucceeded ? "dashboard-outreach-save-btn--success" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      aria-busy={saving}
      aria-label={
        saving ? "Saving sequence" : saveSucceeded ? "Sequence saved" : label
      }
    >
      <span className="dashboard-outreach-save-btn-inner" key={saving ? "saving" : saveSucceeded ? "saved" : "idle"}>
        {saving ? (
          <>
            <span className="dashboard-outreach-save-spinner" aria-hidden />
            <span>Saving…</span>
          </>
        ) : saveSucceeded ? (
          <>
            <MaterialIcon name="check" className="dashboard-outreach-save-check" aria-hidden />
            <span>Saved</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </span>
    </button>
  );
}

function ScheduleStaticChip({ label }: { label: string }) {
  return (
    <span className="dashboard-outreach-start-chip dashboard-outreach-start-chip--static">
      {label}
    </span>
  );
}

function touchpointTypeLabel(order: number): string {
  return order === 1 ? "Email" : "Reply";
}

function waitConnectorLabel(waitDays: number): string {
  if (waitDays === 0) return "Next step";
  if (waitDays === 1) return "1 day later";
  return `${waitDays} days later`;
}

type WaitUnit = "days" | "business_days" | "weeks" | "months";

const WAIT_UNIT_OPTIONS: { value: WaitUnit; label: string }[] = [
  { value: "days", label: "days" },
  { value: "business_days", label: "business days" },
  { value: "weeks", label: "weeks" },
  { value: "months", label: "months" },
];

function waitDaysFromAmount(amount: number, unit: WaitUnit): number {
  const n = Math.max(0, Math.floor(amount) || 0);
  if (unit === "weeks") return n * 7;
  if (unit === "months") return n * 30;
  return n;
}

function inferWaitDisplay(waitDays: number): { amount: number; unit: WaitUnit } {
  if (waitDays <= 0) return { amount: 0, unit: "days" };
  if (waitDays >= 30 && waitDays % 30 === 0) {
    return { amount: waitDays / 30, unit: "months" };
  }
  if (waitDays >= 7 && waitDays % 7 === 0) {
    return { amount: waitDays / 7, unit: "weeks" };
  }
  return { amount: waitDays, unit: "business_days" };
}

function buildWaitMetaFromTouchpoints(
  tps: OutreachTouchpointDraft[]
): Record<number, { amount: number; unit: WaitUnit }> {
  const meta: Record<number, { amount: number; unit: WaitUnit }> = {};
  for (const tp of tps) {
    if (tp.order > 1) meta[tp.order] = inferWaitDisplay(tp.waitDays);
  }
  return meta;
}

function buildStepScheduleMeta(
  tps: OutreachTouchpointDraft[]
): Record<number, { time: string; tz: string }> {
  const meta: Record<number, { time: string; tz: string }> = {};
  for (const tp of tps) {
    if (tp.order > 1) meta[tp.order] = { time: "09:00", tz: "IT" };
  }
  return meta;
}

const SEND_TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 6; h <= 20; h++) {
    for (const m of [0, 30]) {
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
})();

const TIMEZONE_OPTIONS = ["IT", "ET", "PT", "UTC", "CET"] as const;

function formatSendTimeLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number.parseInt(hStr ?? "9", 10);
  const m = Number.parseInt(mStr ?? "0", 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, "0")}${ampm}`;
}

const SEND_TIME_SELECT_OPTIONS = SEND_TIME_OPTIONS.map((t) => ({
  value: t,
  label: formatSendTimeLabel(t),
}));

const TIMEZONE_SELECT_OPTIONS = TIMEZONE_OPTIONS.map((tz) => ({
  value: tz,
  label: tz,
}));

export function OutreachPlanEditor({
  planId = "new",
  initialPlanName,
  initialTouchpoints,
  initialCalendlyAutomation,
  embedded = false,
  lockSchedule = false,
  editorLocked = false,
  campaignOutreachStatus = "idle",
  hasCampaignContacts = true,
  hasSequence = true,
  launchBusy = false,
  onLaunchCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onCancel,
  onGoToIntegrations,
  saveCalendlyToCampaign,
  onSaved,
}: Props) {
  const scheduleLocked = lockSchedule || editorLocked;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const auth = getStoredAuth();

  const [planName, setPlanName] = useState(initialPlanName);
  const [editingTitle, setEditingTitle] = useState(false);
  const [touchpoints, setTouchpoints] = useState<OutreachTouchpointDraft[]>(
    initialTouchpoints.length > 0
      ? initialTouchpoints.map((tp) => ({ ...tp }))
      : [createEmptyTouchpoint(1)]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const initialWait = initialTouchpoints[0]?.waitDays ?? 0;
  const [startMode, setStartMode] = useState<StartScheduleMode>(() =>
    inferStartMode(initialWait)
  );
  const [afterDays, setAfterDays] = useState(() => inferAfterDays(initialWait));
  const [soonestAt, setSoonestAt] = useState(() =>
    initialWait > 1 ? soonestAtFromWaitDays(initialWait, "09:00") : defaultSoonestAtLocal()
  );
  const [startSendTime, setStartSendTime] = useState("09:00");
  const [startTimezone, setStartTimezone] = useState<string>("IT");
  const [waitMeta, setWaitMeta] = useState<Record<number, { amount: number; unit: WaitUnit }>>(
    () => buildWaitMetaFromTouchpoints(initialTouchpoints)
  );
  const [stepScheduleMeta, setStepScheduleMeta] = useState<
    Record<number, { time: string; tz: string }>
  >(() => buildStepScheduleMeta(initialTouchpoints));

  const subjectInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const bodyTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const lastMergeFieldFocusRef = useRef<{ order: number; field: "subject" | "body" } | null>(
    null
  );
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [calendlyPickerOpen, setCalendlyPickerOpen] = useState(false);
  const [calendlyLoading, setCalendlyLoading] = useState(false);
  const [calendlyError, setCalendlyError] = useState("");
  const [calendlyMeetings, setCalendlyMeetings] = useState<CalendlyMeetingOption[]>([]);
  const [calendlyPickerUri, setCalendlyPickerUri] = useState("");
  const [calendlySaving, setCalendlySaving] = useState(false);
  const [selectedCalendlyMeeting, setSelectedCalendlyMeeting] = useState<CalendlyMeetingOption | null>(
    () => calendlyMeetingFromAutomation(initialCalendlyAutomation)
  );
  const [saving, setSaving] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    order: number;
    label: string;
  } | null>(null);
  const [launching, setLaunching] = useState(false);

  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const stepSectionRefs = useRef<(HTMLElement | null)[]>([]);
  const railStepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollSyncLock = useRef(false);
  const scrollSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaveSuccess = () => {
    if (saveSuccessTimerRef.current) {
      window.clearTimeout(saveSuccessTimerRef.current);
    }
    setSaveSucceeded(true);
    saveSuccessTimerRef.current = setTimeout(() => {
      setSaveSucceeded(false);
      saveSuccessTimerRef.current = null;
    }, 2200);
  };

  useEffect(
    () => () => {
      if (saveSuccessTimerRef.current) {
        window.clearTimeout(saveSuccessTimerRef.current);
      }
    },
    []
  );

  const createdMeta = useMemo(() => {
    const name = auth?.fullName?.trim() || auth?.email?.split("@")[0] || "You";
    const date = new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return { name, date };
  }, [auth?.email, auth?.fullName]);

  const loadGmailStatus = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(`${apiBase}/api/integrations/gmail/status`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      setGmailConnected(Boolean(data.success && data.connected));
      setGmailEmail(typeof data.email === "string" ? data.email : "");
    } catch {
      setGmailConnected(false);
      setGmailEmail("");
    }
  }, [apiBase, auth?.token]);

  const loadCalendlyStatus = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(`${apiBase}/api/integrations/calendly/status`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      setCalendlyConnected(Boolean(data.success && data.connected));
    } catch {
      setCalendlyConnected(false);
    }
  }, [apiBase, auth?.token]);

  const loadCalendlyMeetings = useCallback(async () => {
    if (!auth?.token) return [];
    try {
      const res = await fetch(`${apiBase}/api/integrations/calendly/links`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Could not load Calendly meetings."
        );
      }
      const rows = Array.isArray(data.links) ? data.links : [];
      return rows
        .map((row: unknown) => {
          const o = row as Record<string, unknown>;
          const schedulingUrl = String(o.schedulingUrl || "").trim();
          const name = String(o.name || "").trim() || "Calendly event";
          const uri = String(o.uri || schedulingUrl).trim();
          return {
            uri,
            name,
            schedulingUrl,
            durationMinutes: Number(o.durationMinutes ?? 0) || 0,
            kind: String(o.kind || "").trim(),
          } satisfies CalendlyMeetingOption;
        })
        .filter((row: CalendlyMeetingOption) => row.schedulingUrl && row.name);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Could not load Calendly meetings.");
    }
  }, [apiBase, auth?.token]);

  useEffect(() => {
    void loadGmailStatus();
    void loadCalendlyStatus();
  }, [loadGmailStatus, loadCalendlyStatus]);

  const initialCalendlyKey = [
    initialCalendlyAutomation?.enabled,
    initialCalendlyAutomation?.meetingUri,
    initialCalendlyAutomation?.meetingName,
  ].join("|");

  useEffect(() => {
    setSelectedCalendlyMeeting(calendlyMeetingFromAutomation(initialCalendlyAutomation));
  }, [planId, initialCalendlyKey, initialCalendlyAutomation]);

  const openCalendlyPicker = useCallback(async () => {
    if (!auth?.token) {
      setCalendlyError("Please sign in again.");
      return;
    }
    setCalendlyError("");
    setCalendlyLoading(true);
    try {
      const meetings = await loadCalendlyMeetings();
      if (meetings.length === 0) {
        setCalendlyError("No Calendly meeting links found. Create an event type in Calendly.");
        return;
      }
      setCalendlyMeetings(meetings);
      const priorUri = selectedCalendlyMeeting?.uri?.trim() || "";
      const priorUrl = selectedCalendlyMeeting?.schedulingUrl?.trim() || "";
      const matched = meetings.find(
        (m) =>
          (priorUri && m.uri === priorUri) ||
          (priorUrl && m.schedulingUrl === priorUrl) ||
          (priorUri && m.schedulingUrl === priorUri)
      );
      setCalendlyPickerUri(matched?.uri || meetings[0]?.uri || "");
      setCalendlyPickerOpen(true);
    } catch (err) {
      setCalendlyMeetings([]);
      const message =
        err instanceof Error ? err.message : "Could not load Calendly meetings.";
      if (message.toLowerCase().includes("not connected")) {
        onGoToIntegrations?.();
      }
      setCalendlyError(message);
    } finally {
      setCalendlyLoading(false);
    }
  }, [auth?.token, loadCalendlyMeetings, onGoToIntegrations, selectedCalendlyMeeting]);

  const applyCalendlyMeeting = async () => {
    const meeting = calendlyMeetings.find((m) => m.uri === calendlyPickerUri);
    if (!meeting) return;
    const automation: CalendlyAutomationDraft = {
      enabled: true,
      meetingUri: meeting.uri,
      meetingName: meeting.name,
      schedulingUrl: meeting.schedulingUrl,
      durationMinutes: meeting.durationMinutes,
      kind: meeting.kind,
    };
    setSelectedCalendlyMeeting(meeting);
    setCalendlyPickerOpen(false);
    if (!saveCalendlyToCampaign) return;
    setCalendlySaving(true);
    setCalendlyError("");
    try {
      await saveCalendlyToCampaign(automation);
    } catch (err) {
      setCalendlyError(
        err instanceof Error ? err.message : "Could not save interview link for this campaign."
      );
    } finally {
      setCalendlySaving(false);
    }
  };

  const calendlyEnabled = Boolean(selectedCalendlyMeeting);

  const waitLinkOrderKey = useMemo(
    () =>
      touchpoints
        .filter((tp) => tp.order > 1)
        .map((tp) => tp.order)
        .join(","),
    [touchpoints]
  );

  useEffect(() => {
    setWaitMeta((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const tp of touchpoints) {
        if (tp.order > 1 && !next[tp.order]) {
          next[tp.order] = inferWaitDisplay(tp.waitDays);
          changed = true;
        }
      }
      for (const key of Object.keys(next)) {
        const order = Number(key);
        if (!touchpoints.some((tp) => tp.order === order && tp.order > 1)) {
          delete next[order];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setStepScheduleMeta((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const tp of touchpoints) {
        if (tp.order > 1 && !next[tp.order]) {
          next[tp.order] = { time: "09:00", tz: "IT" };
          changed = true;
        }
      }
      for (const key of Object.keys(next)) {
        const order = Number(key);
        if (!touchpoints.some((tp) => tp.order === order && tp.order > 1)) {
          delete next[order];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // Only re-sync when step orders are added/removed (waitLinkOrderKey), not on every field edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- touchpoints read from render when orders change
  }, [waitLinkOrderKey]);

  useEffect(() => {
    return () => {
      if (scrollSyncTimer.current) clearTimeout(scrollSyncTimer.current);
    };
  }, []);

  const releaseScrollLock = useCallback(() => {
    if (scrollSyncTimer.current) clearTimeout(scrollSyncTimer.current);
    scrollSyncTimer.current = setTimeout(() => {
      scrollSyncLock.current = false;
    }, 480);
  }, []);

  const scrollToStep = useCallback(
    (index: number, smooth = true) => {
      const section = stepSectionRefs.current[index];
      const root = canvasScrollRef.current;
      if (!section || !root) return;

      scrollSyncLock.current = true;
      setActiveIndex(index);
      const top = section.offsetTop - root.offsetTop - 16;
      root.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
      releaseScrollLock();
    },
    [releaseScrollLock]
  );

  const selectStep = useCallback(
    (canvasIndex: number) => {
      if (canvasIndex < 0 || canvasIndex > touchpoints.length) return;
      scrollToStep(canvasIndex);
    },
    [scrollToStep, touchpoints.length]
  );

  const firstTouchpoint = touchpoints[0];

  useEffect(() => {
    const root = canvasScrollRef.current;
    if (!root) return;

    const syncActiveFromScroll = () => {
      if (scrollSyncLock.current) return;
      const anchor = root.scrollTop + 56;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      stepSectionRefs.current.forEach((section, index) => {
        if (!section) return;
        const distance = Math.abs(section.offsetTop - anchor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setActiveIndex((prev) => (prev === bestIndex ? prev : bestIndex));
    };

    root.addEventListener("scroll", syncActiveFromScroll, { passive: true });
    syncActiveFromScroll();
    return () => root.removeEventListener("scroll", syncActiveFromScroll);
  }, [touchpoints.length]);

  useEffect(() => {
    if (scrollSyncLock.current || activeIndex === 0) return;
    railStepRefs.current[activeIndex - 1]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, touchpoints.length]);

  const updateTouchpoint = (order: number, patch: Partial<OutreachTouchpointDraft>) => {
    setTouchpoints((prev) =>
      prev.map((tp) => (tp.order === order ? { ...tp, ...patch } : tp))
    );
  };

  const addTouchpoint = () => {
    if (editorLocked) return;
    const nextOrder = touchpoints.length + 1;
    setTouchpoints((prev) => [...prev, createEmptyTouchpoint(nextOrder)]);
    requestAnimationFrame(() => scrollToStep(touchpoints.length + 1));
  };

  const requestRemoveTouchpoint = (order: number) => {
    if (touchpoints.length <= 1) return;
    const step = touchpoints.find((tp) => tp.order === order);
    if (!step) return;
    setPendingDelete({
      order,
      label: step.label?.trim() || `Step ${order}`,
    });
  };

  const removeTouchpoint = (order: number) => {
    if (editorLocked) return;
    if (touchpoints.length <= 1) return;
    const removeIndex = touchpoints.findIndex((tp) => tp.order === order);
    if (removeIndex < 0) return;
    setTouchpoints((prev) =>
      prev
        .filter((tp) => tp.order !== order)
        .map((tp, i) => ({ ...tp, order: i + 1 }))
    );
    setActiveIndex((prev) => {
      const canvasIdx = removeIndex + 1;
      if (prev === canvasIdx) return Math.max(0, canvasIdx - 1);
      if (prev > canvasIdx) return prev - 1;
      return prev;
    });
  };

  const applyStartSchedule = useCallback(
    (
      mode: StartScheduleMode,
      nextAfterDays = afterDays,
      nextSoonestAt = soonestAt
    ) => {
      const waitDays = waitDaysForStartMode(mode, nextAfterDays, nextSoonestAt);
      setTouchpoints((prev) => {
        const first = prev[0];
        if (!first) return prev;
        return prev.map((tp) =>
          tp.order === first.order ? { ...tp, waitDays } : tp
        );
      });
    },
    [afterDays, soonestAt]
  );

  const handleStartModeChange = (mode: StartScheduleMode) => {
    setStartMode(mode);
    if (mode === "soonest_at") {
      const merged = mergeSendTimeIntoSoonestAt(soonestAt, startSendTime);
      setSoonestAt(merged);
      applyStartSchedule(mode, afterDays, merged);
      return;
    }
    applyStartSchedule(mode);
  };

  const handleAfterDaysChange = (days: number) => {
    setAfterDays(days);
    applyStartSchedule("after", days);
  };

  const handleSoonestAtChange = (value: string) => {
    setSoonestAt(value);
    applyStartSchedule("soonest_at", afterDays, value);
  };

  const handleStartSendTimeChange = (time: string) => {
    setStartSendTime(time);
    if (startMode === "next_business_day" || startMode === "after") {
      applyStartSchedule(startMode);
    }
  };

  const startSchedule = useMemo(
    () => ({
      mode: startMode,
      afterDays,
      soonestAt,
      sendTime: startSendTime,
      timezone: startTimezone,
    }),
    [startMode, afterDays, soonestAt, startSendTime, startTimezone]
  );

  const updateStepWait = (
    order: number,
    patch: Partial<{ amount: number; unit: WaitUnit }>
  ) => {
    const current =
      waitMeta[order] ??
      inferWaitDisplay(touchpoints.find((t) => t.order === order)?.waitDays ?? 0);
    const nextMeta = { ...current, ...patch };
    setWaitMeta((prev) => ({ ...prev, [order]: nextMeta }));
    updateTouchpoint(order, {
      waitDays: waitDaysFromAmount(nextMeta.amount, nextMeta.unit),
    });
  };

  const updateStepSchedule = (
    order: number,
    patch: Partial<{ time: string; tz: string }>
  ) => {
    const current = stepScheduleMeta[order] ?? { time: "09:00", tz: "IT" };
    setStepScheduleMeta((prev) => ({
      ...prev,
      [order]: { ...current, ...patch },
    }));
  };

  const insertMergeTag = (order: number, field: "subject" | "body", token: string) => {
    if (editorLocked) return;
    const tp = touchpoints.find((t) => t.order === order);
    if (!tp) return;
    const mergeToken = `{{${token}}}`;
    const current = field === "subject" ? tp.subject : tp.body;
    const element =
      field === "subject" ? subjectInputRefs.current[order] : bodyTextareaRefs.current[order];
    const insertAtCursor =
      lastMergeFieldFocusRef.current?.order === order &&
      lastMergeFieldFocusRef.current?.field === field &&
      element != null;
    const { value, selectionStart, selectionEnd } = insertTextIntoField(
      current,
      mergeToken,
      element,
      insertAtCursor
    );
    updateTouchpoint(order, { [field]: value });
    requestAnimationFrame(() => {
      const target =
        field === "subject" ? subjectInputRefs.current[order] : bodyTextareaRefs.current[order];
      if (!target) return;
      target.focus();
      target.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const savePlan = async () => {
    if (editorLocked) return;
    if (!auth?.token) return;
    setSaving(true);
    setError("");
    setSaveSucceeded(false);
    try {
      const missingSubject = touchpoints.find((tp) => !tp.subject.trim());
      if (missingSubject) {
        throw new Error(`Step ${missingSubject.order} needs a subject line.`);
      }
      const missingBody = touchpoints.find((tp) => !tp.body.trim());
      if (missingBody) {
        throw new Error(
          `Step ${missingBody.order} needs a message body (e.g. Hi {{FirstName}}, …).`
        );
      }
      const isNew = planId === "new";
      const url = isNew
        ? `${apiBase}/api/outreach/plans`
        : `${apiBase}/api/outreach/plans/${planId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: authHeaders(auth.token),
        body: JSON.stringify({
          name: planName.trim() || "Untitled outreach",
          touchpoints,
          calendlyAutomation: selectedCalendlyMeeting
            ? {
                enabled: true,
                meetingUri: selectedCalendlyMeeting.uri,
                meetingName: selectedCalendlyMeeting.name,
                schedulingUrl: selectedCalendlyMeeting.schedulingUrl,
                durationMinutes: selectedCalendlyMeeting.durationMinutes,
                kind: selectedCalendlyMeeting.kind,
              }
            : { enabled: false },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(typeof data.message === "string" ? data.message : "Failed to save plan");
      }
      const saved = data.plan as
        | {
            id: string;
            name: string;
            touchpoints: OutreachTouchpointDraft[];
            calendlyAutomation?: {
              enabled?: boolean;
              meetingUri?: string;
              meetingName?: string;
              schedulingUrl?: string;
              durationMinutes?: number;
              kind?: string;
            };
          }
        | undefined;
      const savedCalendly = saved?.calendlyAutomation;
      if (savedCalendly?.enabled && savedCalendly.meetingUri && savedCalendly.meetingName) {
        setSelectedCalendlyMeeting({
          uri: savedCalendly.meetingUri,
          name: savedCalendly.meetingName,
          schedulingUrl: savedCalendly.schedulingUrl || "",
          durationMinutes: Number(savedCalendly.durationMinutes || 0),
          kind: savedCalendly.kind || "",
        });
      } else if (saved && savedCalendly && !savedCalendly.enabled) {
        setSelectedCalendlyMeeting(null);
      }
      const successMessage = isNew ? "Sequence saved." : "Sequence updated.";
      onSaved(
        successMessage,
        saved?.id
          ? {
              id: saved.id,
              name: saved.name || planName.trim() || "Untitled outreach",
              touchpoints: Array.isArray(saved.touchpoints)
                ? saved.touchpoints.map((tp) => ({
                    order: tp.order,
                    label: tp.label || "",
                    subject: tp.subject || "",
                    body: tp.body || "",
                    waitDays: tp.waitDays ?? 0,
                  }))
                : touchpoints,
              calendlyAutomation: savedCalendly,
            }
          : undefined
      );
      flashSaveSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save outreach plan.");
    } finally {
      setSaving(false);
    }
  };

  const setStepSectionRef = (index: number) => (el: HTMLElement | null) => {
    stepSectionRefs.current[index] = el;
  };

  const setRailStepRef = (index: number) => (el: HTMLButtonElement | null) => {
    railStepRefs.current[index] = el;
  };

  const planTitleEditor = (centered: boolean) => (
    <div className={centered ? "mx-auto min-w-0 max-w-md text-center" : "min-w-0"}>
      {editorLocked ? (
        <span
          className={`dashboard-section-title truncate text-base ${centered ? "block text-center" : ""}`}
        >
          {planName}
        </span>
      ) : editingTitle ? (
        <input
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          onBlur={() => setEditingTitle(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditingTitle(false);
          }}
          autoFocus
          className={`${dashboardInputClass} w-full max-w-md text-sm font-semibold`}
        />
      ) : (
        <button
          type="button"
          className={`inline-flex max-w-full items-center gap-1.5 text-left hover:text-[#0050cb] ${
            centered ? "justify-center" : ""
          }`}
          onClick={() => setEditingTitle(true)}
        >
          <span className="dashboard-section-title truncate text-base">{planName}</span>
          <MaterialIcon name="edit" className="shrink-0 text-base text-slate-400" aria-hidden />
        </button>
      )}
      <p className="mt-0.5 text-xs text-slate-500">
        Created by {createdMeta.name} · {createdMeta.date}
      </p>
    </div>
  );

  const launchCampaign = useCallback(async () => {
    if (!onLaunchCampaign || launching) return;
    setLaunching(true);
    const overlayStartedAt = Date.now();
    try {
      await onLaunchCampaign();
      const elapsed = Date.now() - overlayStartedAt;
      if (elapsed < LAUNCH_AGENT_MIN_DURATION_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, LAUNCH_AGENT_MIN_DURATION_MS - elapsed)
        );
      }
    } finally {
      setLaunching(false);
    }
  }, [launching, onLaunchCampaign]);

  if (touchpoints.length === 0) return null;

  const launchActionBusy = launching || launchBusy;

  return (
    <section
      className={`dashboard-outreach-builder flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden${
        embedded ? " dashboard-outreach-builder--embedded" : " dashboard-card dashboard-card--fill max-w-full bg-[#f8f9fc]"
      }${launching ? " dashboard-outreach-builder--launching" : ""}`}
    >
      <CampaignLaunchAgentOverlay open={launching && Boolean(onLaunchCampaign)} channel="gmail" />
      {embedded ? (
        <>
          <div className="dashboard-outreach-gmail-bar shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={editorLocked}
              title={editorLocked ? "Campaign settings are read-only" : "Change sequence"}
              className={`${dashboardBtnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm disabled:opacity-55`}
            >
              <MaterialIcon name="arrow_back" className="text-base" />
              Change sequence
            </button>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
              <SaveSequenceButton
                compact
                saving={saving}
                saveSucceeded={saveSucceeded}
                disabled={editorLocked}
                onClick={() => void savePlan()}
                className="h-[38px] w-[137px] justify-center px-4 py-1.5 text-sm"
              />
              {campaignOutreachStatus === "active" ? (
                <button
                  type="button"
                  onClick={() => void onPauseCampaign?.()}
                  disabled={launchBusy}
                  className={`${dashboardBtnSecondaryClass} px-3 py-1.5 text-xs disabled:opacity-55`}
                >
                  Pause
                </button>
              ) : campaignOutreachStatus === "paused" ? (
                <button
                  type="button"
                  onClick={() => void onResumeCampaign?.()}
                  disabled={launchBusy}
                  className={`${dashboardBtnPrimaryClass} dashboard-outreach-save-btn inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap px-4 py-1.5 text-sm disabled:opacity-55`}
                >
                  {launchBusy ? (
                    <>
                      <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                      Resuming…
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="play_circle" className="text-base" />
                      Resume campaign
                    </>
                  )}
                </button>
              ) : campaignOutreachStatus === "completed" ? (
                <button
                  type="button"
                  disabled
                  title="Campaign completed"
                  aria-label="Campaign completed"
                  className={`${dashboardBtnSecondaryClass} inline-flex cursor-not-allowed items-center gap-1.5 px-3 py-1.5 text-xs opacity-60`}
                >
                  <MaterialIcon
                    name="check_circle"
                    className="text-base text-slate-500"
                    aria-hidden
                  />
                  Completed
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void launchCampaign()}
                  disabled={launchActionBusy || !hasSequence || !hasCampaignContacts}
                  title={
                    launching
                      ? "Launching…"
                      : !hasSequence
                        ? "Save a sequence first"
                        : !hasCampaignContacts
                          ? "Add contacts to this campaign first"
                          : "Launch campaign"
                  }
                  className={`${dashboardBtnPrimaryClass} dashboard-outreach-save-btn inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap px-4 py-1.5 text-sm disabled:opacity-55`}
                >
                  {launching ? (
                    <>
                      <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                      Launching…
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="rocket_launch" className="text-base" />
                      Launch campaign
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="dashboard-campaign-report-toolbar shrink-0">
            <div className="dashboard-campaign-report-toolbar-row">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="dashboard-campaign-sequence-toolbar-icon" aria-hidden>
                  <IntegrationBrandLogo provider="gmail" title="Gmail" className="h-[22px] w-[22px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="dashboard-campaign-report-title">Email sequence</h2>
                  <p className="dashboard-campaign-report-subtitle">
                    Edit steps, schedule, and message content
                  </p>
                </div>
              </div>
              <div className="dashboard-outreach-gmail-plan-meta hidden min-w-0 max-w-[min(100%,18rem)] sm:block">
                {planTitleEditor(false)}
              </div>
            </div>
          </div>
          <div className="dashboard-outreach-gmail-plan-meta dashboard-outreach-gmail-plan-meta--mobile shrink-0 sm:hidden">
            {planTitleEditor(false)}
          </div>
        </>
      ) : (
        <header className="dashboard-outreach-builder-top shrink-0">
          <div className="dashboard-outreach-builder-top-row">
            <div className="min-w-0">
              <h3 className="dashboard-outreach-builder-title">Create outreach</h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Build your email sequence step by step.
              </p>
            </div>
            <div className="dashboard-outreach-builder-top-actions">
              <button
                type="button"
                onClick={onCancel}
                className={`${dashboardBtnSecondaryClass} dashboard-outreach-builder-cancel`}
              >
                Cancel
              </button>
              <SaveSequenceButton
                saving={saving}
                saveSucceeded={saveSucceeded}
                disabled={editorLocked}
                onClick={() => void savePlan()}
                label="Save"
              />
            </div>
          </div>
          <div className="dashboard-outreach-builder-plan-meta">{planTitleEditor(false)}</div>
        </header>
      )}

      {error ? (
        <p className="dashboard-outreach-builder-error dashboard-alert-error shrink-0">{error}</p>
      ) : null}

      <div className="dashboard-outreach-builder-body">
        <aside
          className="dashboard-outreach-builder-rail dashboard-outreach-scroll flex flex-col"
          aria-label="Outreach sequence"
        >
          <p className="dashboard-outreach-builder-rail-title">Sequence steps</p>
          <ol className="dashboard-outreach-flow" role="tablist" aria-label="Touchpoints">
            {touchpoints.map((tp, index) => {
              const canvasIndex = index + 1;
              const isActive = canvasIndex === activeIndex;
              const nextTp = touchpoints[index + 1];
              return (
                <li key={`step-${tp.order}-${index}`} className="dashboard-outreach-flow-item">
                  <button
                    type="button"
                    ref={setRailStepRef(index)}
                    role="tab"
                    id={`outreach-step-tab-${tp.order}`}
                    aria-selected={isActive}
                    aria-controls={`outreach-step-panel-${tp.order}`}
                    tabIndex={isActive ? 0 : -1}
                    className={`dashboard-outreach-flow-node${
                      isActive ? " dashboard-outreach-flow-node--active" : ""
                    }`}
                    onClick={() => selectStep(canvasIndex)}
                  >
                    <span className="dashboard-outreach-flow-node-icon" aria-hidden>
                      <MaterialIcon
                        name={tp.order === 1 ? "mail" : "reply"}
                        className="text-[18px]"
                      />
                    </span>
                    <span className="dashboard-outreach-flow-node-body">
                      <span className="dashboard-outreach-flow-node-type">
                        {touchpointTypeLabel(tp.order)}
                      </span>
                      <span className="dashboard-outreach-flow-node-time">
                        {touchpointScheduleLabel(touchpoints, index, startSchedule)}
                      </span>
                      {tp.order > 1 ? (
                        <span className="dashboard-outreach-flow-node-sub">Same thread</span>
                      ) : null}
                      {tp.subject ? (
                        <span className="dashboard-outreach-flow-node-preview">{tp.subject}</span>
                      ) : null}
                    </span>
                  </button>
                  {nextTp ? (
                    <p
                      className={`dashboard-outreach-flow-wait${
                        index + 2 === activeIndex ? " dashboard-outreach-flow-wait--active" : ""
                      }`}
                    >
                      {waitConnectorLabel(nextTp.waitDays)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={addTouchpoint}
            disabled={editorLocked}
            className="dashboard-outreach-builder-add-step disabled:opacity-55"
          >
            <MaterialIcon name="add" className="text-base" />
            Add step
          </button>
          <div className="dashboard-wa-outreach-calendly-card">
            <div className="dashboard-wa-outreach-calendly-head">
              <img
                src="/integrations/calendly_logo.png"
                alt="Calendly"
                className="dashboard-wa-outreach-calendly-logo"
              />
              <p className="dashboard-wa-outreach-calendly-title">Calendly</p>
            </div>
            <p className="dashboard-wa-outreach-calendly-text">
              {calendlyEnabled && selectedCalendlyMeeting
                ? `“${selectedCalendlyMeeting.name}” will be shared automatically when a candidate shows interest.`
                : "Connect Calendly to automatically share interview links when candidates are interested."}
            </p>
            {onGoToIntegrations ? (
              <button
                type="button"
                onClick={() => void openCalendlyPicker()}
                className="dashboard-wa-outreach-calendly-btn"
                disabled={calendlyLoading || calendlySaving || editorLocked}
                title={
                  editorLocked
                    ? campaignOutreachStatus === "completed"
                      ? "Campaign completed"
                      : "Pause the campaign to edit the sequence"
                    : undefined
                }
              >
                {calendlyLoading
                  ? "Checking Calendly…"
                  : calendlySaving
                    ? "Saving…"
                    : calendlyEnabled
                      ? "Change interview link"
                      : "Add interview link"}
              </button>
            ) : null}
            {calendlyError ? (
              <p className="mt-2 text-[11px] text-rose-600">{calendlyError}</p>
            ) : null}
          </div>
        </aside>

        <div
          ref={canvasScrollRef}
          className="dashboard-outreach-builder-canvas dashboard-outreach-scroll"
        >
          {editorLocked ? (
            <div className="dashboard-wa-outreach-locked-banner dashboard-outreach-builder-locked-banner shrink-0">
              <MaterialIcon name="lock" className="shrink-0 text-base text-amber-700" aria-hidden />
              <p className="text-sm text-amber-950">
                Campaign settings are read-only while the campaign is running or after it is
                completed.
              </p>
            </div>
          ) : null}
          <div className="dashboard-outreach-builder-stack">
            <div className="dashboard-outreach-main-flow-item dashboard-outreach-main-flow-item--start">
              <section
                ref={setStepSectionRef(0)}
                data-step-index={0}
                id="outreach-start-panel"
                role="tabpanel"
                aria-label="When outreach begins"
                className={`dashboard-outreach-builder-start-block${
                  activeIndex === 0 ? " dashboard-outreach-builder-step-block--active" : ""
                }`}
              >
                <OutreachStartScheduleBar
                  mode={startMode}
                  afterDays={afterDays}
                  soonestAt={soonestAt}
                  sendTime={startSendTime}
                  timezone={startTimezone}
                  locked={scheduleLocked}
                  sendTimeOptions={SEND_TIME_SELECT_OPTIONS}
                  timezoneOptions={TIMEZONE_SELECT_OPTIONS}
                  onModeChange={handleStartModeChange}
                  onAfterDaysChange={handleAfterDaysChange}
                  onSoonestAtChange={handleSoonestAtChange}
                  onSendTimeChange={handleStartSendTimeChange}
                  onTimezoneChange={setStartTimezone}
                />
              </section>
              <span
                className={`dashboard-outreach-vline dashboard-outreach-vline--tall dashboard-outreach-vline--arrow${
                  activeIndex <= 1 ? " dashboard-outreach-vline--active" : ""
                }`}
                aria-hidden
              />
            </div>

            {touchpoints.map((tp, index) => {
              const canvasIndex = index + 1;
              const isActive = canvasIndex === activeIndex;
              return (
                <div key={`wrap-${tp.order}-${index}`} className="dashboard-outreach-main-flow-item">
                  {index > 0 ? (
                    <div
                      className={`dashboard-outreach-main-flow-link dashboard-outreach-vline-group${
                        isActive ? " dashboard-outreach-vline-group--active" : ""
                      }`}
                      role="group"
                      aria-label={`Wait before step ${tp.order}`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <span
                        className="dashboard-outreach-vline dashboard-outreach-vline--short"
                        aria-hidden
                      />
                      <div
                        className={`dashboard-outreach-wait-link-shell${
                          scheduleLocked ? " dashboard-outreach-wait-link-shell--locked" : ""
                        }`}
                      >
                        <div
                          className={`dashboard-outreach-start-pill-bar${
                            scheduleLocked ? " dashboard-outreach-start-pill-bar--locked" : ""
                          }`}
                        >
                          <span className="dashboard-outreach-start-prefix">Wait</span>
                          {scheduleLocked ? (
                            <>
                              <ScheduleStaticChip
                                label={String(
                                  waitMeta[tp.order]?.amount ??
                                    inferWaitDisplay(tp.waitDays).amount
                                )}
                              />
                              <ScheduleStaticChip
                                label={
                                  WAIT_UNIT_OPTIONS.find(
                                    (o) =>
                                      o.value ===
                                      (waitMeta[tp.order]?.unit ??
                                        inferWaitDisplay(tp.waitDays).unit)
                                  )?.label ?? "days"
                                }
                              />
                              <span className="dashboard-outreach-start-muted">Send @</span>
                              <ScheduleStaticChip
                                label={
                                  SEND_TIME_SELECT_OPTIONS.find(
                                    (o) =>
                                      o.value === (stepScheduleMeta[tp.order]?.time ?? "09:00")
                                  )?.label ?? "9:00AM"
                                }
                              />
                              <ScheduleStaticChip
                                label={stepScheduleMeta[tp.order]?.tz ?? "IT"}
                              />
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                min={0}
                                value={
                                  waitMeta[tp.order]?.amount ??
                                  inferWaitDisplay(tp.waitDays).amount
                                }
                                onChange={(e) =>
                                  updateStepWait(tp.order, {
                                    amount: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="dashboard-outreach-start-chip dashboard-outreach-start-chip--input"
                                aria-label="Wait amount"
                              />
                              <OutreachPillSelect
                                value={
                                  waitMeta[tp.order]?.unit ?? inferWaitDisplay(tp.waitDays).unit
                                }
                                options={WAIT_UNIT_OPTIONS}
                                onChange={(unit) => updateStepWait(tp.order, { unit })}
                                ariaLabel="Wait unit"
                              />
                              <span className="dashboard-outreach-start-muted">Send @</span>
                              <OutreachPillSelect
                                value={stepScheduleMeta[tp.order]?.time ?? "09:00"}
                                options={SEND_TIME_SELECT_OPTIONS}
                                onChange={(time) => updateStepSchedule(tp.order, { time })}
                                ariaLabel="Send time"
                              />
                              <OutreachPillSelect
                                value={stepScheduleMeta[tp.order]?.tz ?? "IT"}
                                options={TIMEZONE_SELECT_OPTIONS}
                                onChange={(tz) => updateStepSchedule(tp.order, { tz })}
                                ariaLabel="Timezone"
                                compact
                              />
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className="dashboard-outreach-vline dashboard-outreach-vline--short dashboard-outreach-vline--arrow"
                        aria-hidden
                      />
                    </div>
                  ) : null}

                  <section
                    ref={setStepSectionRef(canvasIndex)}
                    data-step-index={canvasIndex}
                    id={`outreach-step-panel-${tp.order}`}
                    role="tabpanel"
                    aria-labelledby={`outreach-step-tab-${tp.order}`}
                    className={`dashboard-outreach-builder-step-block${
                      isActive ? " dashboard-outreach-builder-step-block--active" : ""
                    }`}
                  >
                    <div className="dashboard-outreach-builder-step-head">
                      <span className="dashboard-outreach-builder-step-badge">
                        <MaterialIcon
                          name={tp.order === 1 ? "mail" : "reply"}
                          className="text-[18px]"
                          aria-hidden
                        />
                        {touchpointTypeLabel(tp.order)}
                        <span className="dashboard-outreach-builder-step-badge-meta">
                          Step {tp.order}
                        </span>
                      </span>
                      <div className="dashboard-outreach-builder-step-head-right">
                        <button
                          type="button"
                          className={`${dashboardBtnSecondaryClass} px-3 py-1.5 text-xs`}
                        >
                          Preview and test
                        </button>
                        {touchpoints.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => requestRemoveTouchpoint(tp.order)}
                            disabled={editorLocked}
                            className="dashboard-outreach-builder-delete rounded-lg border border-slate-200 p-2 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-55"
                            aria-label="Delete step"
                          >
                            <MaterialIcon name="delete" className="text-lg" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="dashboard-outreach-builder-compose">
                      <label className="dashboard-outreach-builder-field">
                        <span className="dashboard-outreach-builder-field-label">From</span>
                        <OutreachFieldSelect
                          value={gmailConnected ? gmailEmail : ""}
                          options={
                            gmailConnected
                              ? [{ value: gmailEmail, label: gmailEmail }]
                              : [{ value: "", label: "Connect Gmail in Integrations" }]
                          }
                          ariaLabel="From email"
                          disabled={!gmailConnected}
                        />
                      </label>

                      <label className="dashboard-outreach-builder-field">
                        <span className="dashboard-outreach-builder-field-label">Subject</span>
                        <div className="dashboard-outreach-builder-subject-row">
                          <input
                            ref={(node) => {
                              subjectInputRefs.current[tp.order] = node;
                            }}
                            type="text"
                            value={tp.subject}
                            readOnly={editorLocked}
                            onChange={(e) =>
                              updateTouchpoint(tp.order, { subject: e.target.value })
                            }
                            onFocus={() => {
                              lastMergeFieldFocusRef.current = {
                                order: tp.order,
                                field: "subject",
                              };
                            }}
                            className={`dashboard-input dashboard-input-sm flex-1${
                              editorLocked ? " dashboard-input--readonly" : ""
                            }`}
                            placeholder="{{FirstName}}, interested in a new opportunity?"
                          />
                          <span className="dashboard-outreach-builder-cc">Cc</span>
                          <span className="dashboard-outreach-builder-cc">Bcc</span>
                        </div>
                      </label>

                      <div className="dashboard-outreach-builder-tags-row">
                        <button
                          type="button"
                          className="dashboard-outreach-builder-chip dashboard-outreach-builder-chip--ai"
                        >
                          <MaterialIcon name="auto_awesome" className="text-sm" />
                          AI Command
                        </button>
                        <button type="button" className="dashboard-outreach-builder-chip">
                          Snippets
                        </button>
                        {OUTREACH_MERGE_FIELDS.map((field) => (
                          <button
                            key={`${tp.order}-subject-${field.token}`}
                            type="button"
                            className="dashboard-outreach-builder-chip"
                            onClick={() => insertMergeTag(tp.order, "subject", field.token)}
                          >
                            {field.label}
                          </button>
                        ))}
                        <button type="button" className="dashboard-outreach-builder-chip">
                          More…
                        </button>
                      </div>

                      <div className="dashboard-outreach-builder-editor-wrap">
                        <div className="dashboard-outreach-builder-toolbar" aria-hidden>
                          {[
                            "format_bold",
                            "format_italic",
                            "format_underlined",
                            "format_list_bulleted",
                            "format_list_numbered",
                            "link",
                            "image",
                            "title",
                          ].map((icon) => (
                            <span key={icon} className="dashboard-outreach-builder-toolbar-btn">
                              <MaterialIcon name={icon} className="text-base" />
                            </span>
                          ))}
                        </div>
                        <textarea
                          ref={(node) => {
                            bodyTextareaRefs.current[tp.order] = node;
                          }}
                          value={tp.body}
                          readOnly={editorLocked}
                          onChange={(e) => updateTouchpoint(tp.order, { body: e.target.value })}
                          onFocus={() => {
                            lastMergeFieldFocusRef.current = {
                              order: tp.order,
                              field: "body",
                            };
                          }}
                          rows={10}
                          className={`dashboard-outreach-builder-body-input${
                            editorLocked ? " dashboard-input--readonly" : ""
                          }`}
                          placeholder="Hi {{FirstName}},"
                        />
                        <div className="dashboard-outreach-builder-tags-row dashboard-outreach-builder-tags-row--body">
                          {OUTREACH_MERGE_FIELDS.map((field) => (
                            <button
                              key={`${tp.order}-body-${field.token}`}
                              type="button"
                              className="dashboard-outreach-builder-chip"
                              onClick={() => insertMergeTag(tp.order, "body", field.token)}
                            >
                              {field.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Delete step?"
        message={
          pendingDelete ? (
            <>
              <strong className="dashboard-confirm-modal-highlight">
                {pendingDelete.label}
              </strong>{" "}
              will be removed from this sequence. This cannot be undone.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Delete step"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const order = pendingDelete.order;
          setPendingDelete(null);
          removeTouchpoint(order);
        }}
      />
      {calendlyPickerOpen ? (
        <div
          className="dashboard-modal-overlay py-6"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCalendlyPickerOpen(false);
          }}
        >
          <div
            className="dashboard-modal mx-auto w-full max-w-lg p-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-calendly-meeting-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h3
                id="email-calendly-meeting-picker-title"
                className="dashboard-section-title text-lg"
              >
                Select interview meeting link
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Choose the Calendly meeting to use for automatic replies when candidates show
                interest.
              </p>
            </div>
            <div className="px-6 py-5">
              {calendlyLoading ? (
                <p className="text-sm text-slate-600">Loading meetings…</p>
              ) : (
                <div className="space-y-2">
                  {calendlyMeetings.map((meeting) => (
                    <label
                      key={meeting.uri}
                      className="flex items-start gap-2 rounded-md border border-slate-200 p-3"
                    >
                      <input
                        type="radio"
                        name="email-calendly-meeting"
                        checked={calendlyPickerUri === meeting.uri}
                        onChange={() => setCalendlyPickerUri(meeting.uri)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">
                          {meeting.name}
                        </span>
                        {meeting.schedulingUrl ? (
                          <span className="block break-all text-xs text-slate-500">
                            {meeting.schedulingUrl}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                className={dashboardBtnSecondaryClass}
                onClick={() => setCalendlyPickerOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={dashboardBtnPrimaryClass}
                onClick={() => void applyCalendlyMeeting()}
                disabled={!calendlyPickerUri.trim() || calendlyLoading || calendlySaving}
              >
                Use this link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
