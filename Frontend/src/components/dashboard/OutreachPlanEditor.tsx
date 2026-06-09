"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import { ConfirmModal } from "@/components/dashboard/ConfirmModal";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { OutreachFieldSelect } from "@/components/dashboard/OutreachFieldSelect";
import { OutreachPillSelect } from "@/components/dashboard/OutreachPillSelect";
import { OutreachTimePicker } from "@/components/dashboard/OutreachTimePicker";
import { OutreachTestEmailModal } from "@/components/dashboard/OutreachTestEmailModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
} from "@/lib/dashboardStyles";
import {
  createEmptyTouchpoint,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";
import {
  formatGmailWaitConnectorLabel,
  getGmailWaitUnitOptions,
  gmailWaitFromDisplay,
  gmailWaitUsesSendAt,
  clampWaitAmount,
  inferGmailWaitDisplay,
  maxWaitAmountForUnit,
  type GmailWaitUnit,
} from "@/lib/outreachWait";
import {
  defaultScheduledAtLocal,
  inferStartMode,
  clampScheduledAtLocal,
  mergeSendTimeIntoScheduledAt,
  scheduledAtFromWaitDays,
  waitDaysForStartMode,
  type StartScheduleMode,
} from "@/lib/outreachStartSchedule";
import {
  DEFAULT_OUTREACH_TIMEZONE,
  formatSendTimeLabel,
  formatTouchpointScheduleLabel,
  normalizeOutreachTimezone,
  normalizeStartSchedule,
  OUTREACH_TIMEZONE_OPTIONS,
  stepScheduleFromTouchpoints,
  touchpointsWithScheduleForSave,
  type OutreachStartScheduleDraft,
  type OutreachTimezoneCode,
} from "@/lib/outreachSchedule";
import { OutreachStartScheduleBar } from "@/components/dashboard/OutreachStartScheduleBar";
import {
  insertTextIntoField,
  OUTREACH_MERGE_FIELDS,
  type FieldTextSelection,
} from "@/lib/outreachMergeFields";

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

function buildPlanSaveSnapshot(input: {
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  startSchedule: OutreachStartScheduleDraft;
  stepScheduleMeta: Record<number, { time: string; tz: string }>;
  selectedCalendlyMeeting: CalendlyMeetingOption | null;
}): string {
  const calendlyAutomation = input.selectedCalendlyMeeting
    ? {
        enabled: true,
        meetingUri: input.selectedCalendlyMeeting.uri,
        meetingName: input.selectedCalendlyMeeting.name,
        schedulingUrl: input.selectedCalendlyMeeting.schedulingUrl,
        durationMinutes: input.selectedCalendlyMeeting.durationMinutes,
        kind: input.selectedCalendlyMeeting.kind,
      }
    : { enabled: false };

  return JSON.stringify({
    name: input.planName.trim() || "Untitled outreach",
    touchpoints: touchpointsWithScheduleForSave(
      input.touchpoints,
      input.startSchedule,
      input.stepScheduleMeta
    ),
    startSchedule: input.startSchedule,
    calendlyAutomation,
  });
}

function initialEditorSaveSnapshot(
  planName: string,
  touchpoints: OutreachTouchpointDraft[],
  startSchedule: OutreachStartScheduleDraft | null | undefined,
  calendlyAutomation?: CalendlyAutomationDraft
): string {
  const normalizedTouchpoints =
    touchpoints.length > 0
      ? touchpoints.map((tp) => ({
          ...tp,
          waitHours: Math.max(0, Number(tp.waitHours) || 0),
        }))
      : [createEmptyTouchpoint(1)];
  const resolvedStart = resolveEditorStartSchedule(startSchedule, touchpoints);
  const firstWaitDays = Math.max(0, Number(normalizedTouchpoints[0]?.waitDays) || 0);
  const normalizedStart = normalizeStartSchedule(resolvedStart, firstWaitDays);
  return buildPlanSaveSnapshot({
    planName,
    touchpoints: normalizedTouchpoints,
    startSchedule: normalizedStart,
    stepScheduleMeta: stepScheduleFromTouchpoints(normalizedTouchpoints),
    selectedCalendlyMeeting: calendlyMeetingFromAutomation(calendlyAutomation),
  });
}

type Props = {
  planId?: string | "new";
  initialPlanName: string;
  initialTouchpoints: OutreachTouchpointDraft[];
  initialStartSchedule?: OutreachStartScheduleDraft | null;
  initialCalendlyAutomation?: CalendlyAutomationDraft;
  /** Hide standalone header when nested under campaign workspace. */
  embedded?: boolean;
  /** Lock Start / Wait schedule pills when sequence came from template or saved plan. */
  lockSchedule?: boolean;
  /** Read-only editor (completed campaign only). */
  editorLocked?: boolean;
  /** Active campaign: copy editable, schedule locked. */
  sequenceLiveEditable?: boolean;
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
      startSchedule?: OutreachStartScheduleDraft;
      calendlyAutomation?: CalendlyAutomationDraft;
    }
  ) => void;
};

function SaveSequenceButton({
  saving,
  saveSucceeded,
  hasUnsavedChanges,
  onClick,
  compact = false,
  label = "Save sequence",
  disabled = false,
  className = "",
}: {
  saving: boolean;
  saveSucceeded: boolean;
  hasUnsavedChanges: boolean;
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
      disabled={disabled || saving || !hasUnsavedChanges}
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

function buildWaitMetaFromTouchpoints(
  tps: OutreachTouchpointDraft[]
): Record<number, { amount: number; unit: GmailWaitUnit }> {
  const meta: Record<number, { amount: number; unit: GmailWaitUnit }> = {};
  for (const tp of tps) {
    if (tp.order > 1) meta[tp.order] = inferGmailWaitDisplay(tp);
  }
  return meta;
}

function resolveEditorStartSchedule(
  initialStartSchedule: OutreachStartScheduleDraft | null | undefined,
  initialTouchpoints: OutreachTouchpointDraft[]
): OutreachStartScheduleDraft {
  const firstWaitDays = Math.max(0, Number(initialTouchpoints[0]?.waitDays) || 0);
  return normalizeStartSchedule(
    initialStartSchedule ?? {
      mode: inferStartMode(initialTouchpoints[0]?.waitDays ?? 0),
      scheduledAt:
        firstWaitDays > 0
          ? scheduledAtFromWaitDays(
              firstWaitDays,
              initialTouchpoints[0]?.sendTime ?? "09:00"
            )
          : defaultScheduledAtLocal(),
      sendTime: initialTouchpoints[0]?.sendTime,
      timezone: normalizeOutreachTimezone(initialTouchpoints[0]?.timezone),
    },
    firstWaitDays
  );
}

const TIMEZONE_SELECT_OPTIONS = OUTREACH_TIMEZONE_OPTIONS.map((tz) => ({
  value: tz,
  label: tz === "IST" ? "IST (India)" : "UTC",
}));

export function OutreachPlanEditor({
  planId = "new",
  initialPlanName,
  initialTouchpoints,
  initialStartSchedule,
  initialCalendlyAutomation,
  embedded = false,
  lockSchedule = false,
  editorLocked = false,
  sequenceLiveEditable = false,
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
  const scheduleLocked = lockSchedule;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const auth = getStoredAuth();

  const [planName, setPlanName] = useState(initialPlanName);
  const [editingTitle, setEditingTitle] = useState(false);
  const [touchpoints, setTouchpoints] = useState<OutreachTouchpointDraft[]>(
    initialTouchpoints.length > 0
      ? initialTouchpoints.map((tp) => ({
          ...tp,
          waitHours: Math.max(0, Number(tp.waitHours) || 0),
        }))
      : [createEmptyTouchpoint(1)]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedStartSchedule = useMemo(
    () => resolveEditorStartSchedule(initialStartSchedule, initialTouchpoints),
    [initialStartSchedule, initialTouchpoints]
  );
  const [startMode, setStartMode] = useState<StartScheduleMode>(
    () => resolvedStartSchedule.mode
  );
  const [scheduledAt, setScheduledAt] = useState(() =>
    clampScheduledAtLocal(resolvedStartSchedule.scheduledAt)
  );
  const [startSendTime, setStartSendTime] = useState(() => resolvedStartSchedule.sendTime);
  const [startTimezone, setStartTimezone] = useState(() => resolvedStartSchedule.timezone);
  const [waitMeta, setWaitMeta] = useState<Record<number, { amount: number; unit: GmailWaitUnit }>>(
    () => buildWaitMetaFromTouchpoints(initialTouchpoints)
  );
  const [stepScheduleMeta, setStepScheduleMeta] = useState<
    Record<number, { time: string; tz: string }>
  >(() => stepScheduleFromTouchpoints(initialTouchpoints));

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
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(() =>
    planId === "new"
      ? null
      : initialEditorSaveSnapshot(
          initialPlanName,
          initialTouchpoints,
          initialStartSchedule,
          initialCalendlyAutomation
        )
  );
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    order: number;
    label: string;
  } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [testPreviewStep, setTestPreviewStep] = useState<{
    order: number;
    subject: string;
    body: string;
  } | null>(null);
  const [testEmailToast, setTestEmailToast] = useState<string | null>(null);

  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const stepSectionRefs = useRef<(HTMLElement | null)[]>([]);
  const railStepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bodyInputRefs = useRef<Record<number, HTMLTextAreaElement | undefined>>({});
  const bodySelectionRef = useRef<(FieldTextSelection & { order: number }) | null>(null);
  const [bodyFocusOrder, setBodyFocusOrder] = useState<number | null>(null);
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

  useEffect(() => {
    setSavedSnapshot(
      planId === "new"
        ? null
        : initialEditorSaveSnapshot(
            initialPlanName,
            initialTouchpoints,
            initialStartSchedule,
            initialCalendlyAutomation
          )
    );
  }, [planId, initialPlanName, initialTouchpoints, initialStartSchedule, initialCalendlyAutomation]);

  useEffect(() => {
    const resolved = resolveEditorStartSchedule(initialStartSchedule, initialTouchpoints);
    setStartMode(resolved.mode);
    setScheduledAt(clampScheduledAtLocal(resolved.scheduledAt));
    setStartSendTime(resolved.sendTime);
    setStartTimezone(resolved.timezone);
  }, [planId, initialStartSchedule, initialTouchpoints]);

  const createdMeta = useMemo(() => {
    const name = auth?.fullName?.trim() || auth?.email?.split("@")[0] || "You";
    const date = new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return { name, date };
  }, [auth?.email, auth?.fullName]);

  const senderFirstName = useMemo(() => {
    const full = auth?.fullName?.trim() || createdMeta.name;
    const part = full.split(/\s+/).filter(Boolean)[0];
    return part || "You";
  }, [auth?.fullName, createdMeta.name]);

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

  const loadCalendlyMeetings = useCallback(async (): Promise<CalendlyMeetingOption[]> => {
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
        (m: CalendlyMeetingOption) =>
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
          next[tp.order] = inferGmailWaitDisplay(tp);
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
          next[tp.order] = { time: "09:00", tz: DEFAULT_OUTREACH_TIMEZONE };
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
    (mode: StartScheduleMode, nextScheduledAt = scheduledAt) => {
      const waitDays = waitDaysForStartMode(mode, nextScheduledAt);
      setTouchpoints((prev) => {
        const first = prev[0];
        if (!first) return prev;
        return prev.map((tp) =>
          tp.order === first.order
            ? {
                ...tp,
                waitDays,
                waitHours: 0,
                sendTime: startSendTime,
                timezone: startTimezone,
              }
            : tp
        );
      });
    },
    [scheduledAt, startSendTime, startTimezone]
  );

  const handleStartModeChange = (mode: StartScheduleMode) => {
    setStartMode(mode);
    if (mode === "scheduled") {
      const merged = clampScheduledAtLocal(
        mergeSendTimeIntoScheduledAt(scheduledAt, startSendTime)
      );
      setScheduledAt(merged);
      applyStartSchedule(mode, merged);
      return;
    }
    applyStartSchedule(mode);
  };

  const handleScheduledAtChange = (value: string) => {
    const clamped = clampScheduledAtLocal(value);
    setScheduledAt(clamped);
    applyStartSchedule("scheduled", clamped);
  };

  const handleStartTimezoneChange = (tz: OutreachTimezoneCode) => {
    const normalized = normalizeOutreachTimezone(tz);
    setStartTimezone(normalized);
    if (startMode !== "scheduled") return;
    const waitDays = waitDaysForStartMode("scheduled", scheduledAt);
    setTouchpoints((prev) => {
      const first = prev[0];
      if (!first) return prev;
      return prev.map((tp) =>
        tp.order === first.order
          ? {
              ...tp,
              waitDays,
              waitHours: 0,
              sendTime: startSendTime,
              timezone: normalized,
            }
          : tp
      );
    });
  };

  const startSchedule = useMemo((): OutreachStartScheduleDraft => {
    const firstWaitDays = Math.max(0, Number(touchpoints[0]?.waitDays) || 0);
    return normalizeStartSchedule(
      {
        mode: startMode,
        scheduledAt,
        sendTime: startSendTime,
        timezone: startTimezone,
      },
      firstWaitDays
    );
  }, [startMode, scheduledAt, startSendTime, startTimezone, touchpoints]);

  const currentSaveSnapshot = useMemo(
    () =>
      buildPlanSaveSnapshot({
        planName,
        touchpoints,
        startSchedule,
        stepScheduleMeta,
        selectedCalendlyMeeting,
      }),
    [planName, touchpoints, startSchedule, stepScheduleMeta, selectedCalendlyMeeting]
  );

  const hasUnsavedChanges =
    savedSnapshot === null || currentSaveSnapshot !== savedSnapshot;

  const updateStepWait = (
    order: number,
    patch: Partial<{ amount: number; unit: GmailWaitUnit }>
  ) => {
    const tp = touchpoints.find((t) => t.order === order);
    const current = waitMeta[order] ?? inferGmailWaitDisplay(tp ?? { waitDays: 0 });
    const nextMeta = {
      ...current,
      ...patch,
      amount: clampWaitAmount(
        patch.amount ?? current.amount,
        patch.unit ?? current.unit
      ),
    };
    setWaitMeta((prev) => ({ ...prev, [order]: nextMeta }));
    updateTouchpoint(order, gmailWaitFromDisplay(nextMeta.amount, nextMeta.unit));
  };

  const captureBodySelection = useCallback((order: number, el: HTMLTextAreaElement) => {
    bodySelectionRef.current = {
      order,
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? el.selectionStart ?? 0,
    };
  }, []);

  const insertBodyMergeToken = useCallback(
    (token: string) => {
      if (editorLocked) return;
      const order = bodyFocusOrder ?? touchpoints[activeIndex - 1]?.order;
      if (!order) return;
      const tp = touchpoints.find((t) => t.order === order);
      if (!tp) return;
      const insertText = `{{${token}}}`;
      const el = bodyInputRefs.current[order] ?? null;
      const stored =
        bodySelectionRef.current?.order === order ? bodySelectionRef.current : null;
      const { value, selectionStart, selectionEnd } = insertTextIntoField(
        tp.body,
        insertText,
        el,
        Boolean(el && stored),
        stored ? { start: stored.start, end: stored.end } : undefined
      );
      updateTouchpoint(order, { body: value });
      requestAnimationFrame(() => {
        const target = bodyInputRefs.current[order];
        if (!target) return;
        target.focus();
        target.setSelectionRange(selectionStart, selectionEnd);
        bodySelectionRef.current = { order, start: selectionStart, end: selectionEnd };
      });
    },
    [activeIndex, bodyFocusOrder, editorLocked, touchpoints]
  );

  const updateStepSchedule = (
    order: number,
    patch: Partial<{ time: string; tz: string }>
  ) => {
    const current = stepScheduleMeta[order] ?? {
      time: "09:00",
      tz: DEFAULT_OUTREACH_TIMEZONE,
    };
    setStepScheduleMeta((prev) => ({
      ...prev,
      [order]: { ...current, ...patch },
    }));
  };

  const savePlan = async () => {
    if (editorLocked || !hasUnsavedChanges) return;
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
          `Step ${missingBody.order} needs a message body (e.g. Hi {{candidate_name}}, …).`
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
          touchpoints: touchpointsWithScheduleForSave(
            touchpoints,
            startSchedule,
            stepScheduleMeta
          ),
          startSchedule,
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
            startSchedule?: OutreachStartScheduleDraft;
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
      if (saved?.startSchedule) {
        const resolved = normalizeStartSchedule(saved.startSchedule);
        setStartMode(resolved.mode);
        setScheduledAt(clampScheduledAtLocal(resolved.scheduledAt));
        setStartSendTime(resolved.sendTime);
        setStartTimezone(resolved.timezone);
      }
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
                    waitHours: tp.waitHours ?? 0,
                    waitMinutes: tp.waitMinutes ?? 0,
                    sendTime: tp.sendTime,
                    timezone: tp.timezone,
                    waitUnit: tp.waitUnit,
                  }))
                : touchpoints,
              startSchedule: saved.startSchedule
                ? normalizeStartSchedule(saved.startSchedule)
                : startSchedule,
              calendlyAutomation: savedCalendly,
            }
          : undefined
      );
      const savedStartSchedule = saved?.startSchedule
        ? normalizeStartSchedule(saved.startSchedule)
        : startSchedule;
      let savedCalendlyMeeting = selectedCalendlyMeeting;
      if (savedCalendly?.enabled && savedCalendly.meetingUri && savedCalendly.meetingName) {
        savedCalendlyMeeting = {
          uri: savedCalendly.meetingUri,
          name: savedCalendly.meetingName,
          schedulingUrl: savedCalendly.schedulingUrl || "",
          durationMinutes: Number(savedCalendly.durationMinutes || 0),
          kind: savedCalendly.kind || "",
        };
      } else if (saved && savedCalendly && !savedCalendly.enabled) {
        savedCalendlyMeeting = null;
      }
      setSavedSnapshot(
        buildPlanSaveSnapshot({
          planName: saved?.name || planName.trim() || "Untitled outreach",
          touchpoints,
          startSchedule: savedStartSchedule,
          stepScheduleMeta,
          selectedCalendlyMeeting: savedCalendlyMeeting,
        })
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
          className={`flex w-full min-w-0 max-w-full items-center gap-1.5 text-left hover:text-[#0050cb] ${
            centered ? "justify-center" : ""
          }`}
          onClick={() => setEditingTitle(true)}
        >
          <span className="dashboard-section-title min-w-0 truncate text-base">{planName}</span>
          <MaterialIcon name="edit" className="shrink-0 text-base text-slate-400" aria-hidden />
        </button>
      )}
      <p className="mt-0.5 truncate text-xs text-slate-500">
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
            <div className="dashboard-outreach-gmail-bar-heading flex min-w-0 items-center gap-2.5">
              <span className="dashboard-campaign-sequence-toolbar-icon shrink-0" aria-hidden>
                <IntegrationBrandLogo provider="gmail" title="Gmail" className="h-[22px] w-[22px]" />
              </span>
              <div className="min-w-0">
                <h2 className="dashboard-campaign-report-title truncate">Email sequence</h2>
                <p className="dashboard-campaign-report-subtitle truncate">
                  Edit steps, schedule, and message content
                </p>
              </div>
            </div>
            <div className="dashboard-outreach-gmail-bar-meta dashboard-outreach-gmail-plan-meta min-w-0">
              {planTitleEditor(false)}
            </div>
            <div className="dashboard-outreach-gmail-bar-actions flex shrink-0 flex-wrap items-center justify-end gap-2">
              <SaveSequenceButton
                compact
                saving={saving}
                saveSucceeded={saveSucceeded}
                hasUnsavedChanges={hasUnsavedChanges}
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
                hasUnsavedChanges={hasUnsavedChanges}
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
                        {formatTouchpointScheduleLabel(touchpoints, index, startSchedule)}
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
                      {formatGmailWaitConnectorLabel(nextTp)}
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
                ? "Saved for this campaign · used in AI replies."
                : "Connect Calendly to share interview links."}
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
          {sequenceLiveEditable ? (
            <div className="dashboard-outreach-builder-live-banner shrink-0">
              <MaterialIcon name="info" className="shrink-0 text-base text-sky-700" aria-hidden />
              <p className="text-sm text-sky-950">
                Campaign is live. You can edit subject and body here; changes apply to emails not
                sent yet. Start time and wait settings stay locked.
              </p>
            </div>
          ) : null}
          {editorLocked ? (
            <div className="dashboard-wa-outreach-locked-banner dashboard-outreach-builder-locked-banner shrink-0">
              <MaterialIcon name="lock" className="shrink-0 text-base text-amber-700" aria-hidden />
              <p className="text-sm text-amber-950">
                This campaign is completed. The sequence is read-only.
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
                  scheduledAt={scheduledAt}
                  timezone={startTimezone}
                  locked={scheduleLocked}
                  onModeChange={handleStartModeChange}
                  onScheduledAtChange={handleScheduledAtChange}
                  onTimezoneChange={handleStartTimezoneChange}
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
              const stepWaitUnit =
                waitMeta[tp.order]?.unit ?? inferGmailWaitDisplay(tp).unit;
              const stepWaitUsesSendAt = gmailWaitUsesSendAt(stepWaitUnit);
              const waitUnitOptions = getGmailWaitUnitOptions();
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
                                    inferGmailWaitDisplay(tp).amount
                                )}
                              />
                              <ScheduleStaticChip
                                label={
                                  waitUnitOptions.find((o) => o.value === stepWaitUnit)
                                    ?.label ?? "days"
                                }
                              />
                              {stepWaitUsesSendAt ? (
                                <>
                                  <span className="dashboard-outreach-start-muted">Send @</span>
                                  <ScheduleStaticChip
                                    label={formatSendTimeLabel(
                                      stepScheduleMeta[tp.order]?.time ?? "09:00"
                                    )}
                                  />
                                  <ScheduleStaticChip
                                    label={stepScheduleMeta[tp.order]?.tz ?? DEFAULT_OUTREACH_TIMEZONE}
                                  />
                                </>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                min={0}
                                max={maxWaitAmountForUnit(stepWaitUnit)}
                                value={
                                  waitMeta[tp.order]?.amount ??
                                  inferGmailWaitDisplay(tp).amount
                                }
                                onChange={(e) =>
                                  updateStepWait(tp.order, {
                                    amount: clampWaitAmount(
                                      Number(e.target.value) || 0,
                                      stepWaitUnit
                                    ),
                                  })
                                }
                                className="dashboard-outreach-start-chip dashboard-outreach-start-chip--input"
                                aria-label="Wait amount"
                              />
                              <OutreachPillSelect
                                value={stepWaitUnit}
                                options={waitUnitOptions}
                                onChange={(unit) => updateStepWait(tp.order, { unit })}
                                ariaLabel="Wait unit"
                              />
                              {stepWaitUsesSendAt ? (
                                <>
                                  <span className="dashboard-outreach-start-muted">Send @</span>
                                  <OutreachTimePicker
                                    value={stepScheduleMeta[tp.order]?.time ?? "09:00"}
                                    onChange={(time) => updateStepSchedule(tp.order, { time })}
                                    ariaLabel="Send time"
                                  />
                                  <OutreachPillSelect
                                    value={stepScheduleMeta[tp.order]?.tz ?? DEFAULT_OUTREACH_TIMEZONE}
                                    options={TIMEZONE_SELECT_OPTIONS}
                                    onChange={(tz) => updateStepSchedule(tp.order, { tz })}
                                    ariaLabel="Timezone"
                                    compact
                                  />
                                </>
                              ) : null}
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
                          onClick={() =>
                            setTestPreviewStep({
                              order: tp.order,
                              subject: tp.subject,
                              body: tp.body,
                            })
                          }
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
                            type="text"
                            value={tp.subject}
                            readOnly={editorLocked}
                            onChange={(e) =>
                              updateTouchpoint(tp.order, { subject: e.target.value })
                            }
                            className={`dashboard-input dashboard-input-sm flex-1${
                              editorLocked ? " dashboard-input--readonly" : ""
                            }`}
                            placeholder="Email subject"
                          />
                        </div>
                      </label>

                      <div className="dashboard-outreach-builder-editor-wrap">
                        <textarea
                          ref={(el) => {
                            if (el) bodyInputRefs.current[tp.order] = el;
                            else delete bodyInputRefs.current[tp.order];
                          }}
                          value={tp.body}
                          readOnly={editorLocked}
                          onFocus={(e) => {
                            setBodyFocusOrder(tp.order);
                            captureBodySelection(tp.order, e.currentTarget);
                          }}
                          onSelect={(e) => captureBodySelection(tp.order, e.currentTarget)}
                          onKeyUp={(e) => captureBodySelection(tp.order, e.currentTarget)}
                          onMouseUp={(e) => captureBodySelection(tp.order, e.currentTarget)}
                          onChange={(e) => updateTouchpoint(tp.order, { body: e.target.value })}
                          rows={10}
                          className={`dashboard-outreach-builder-body-input${
                            editorLocked ? " dashboard-input--readonly" : ""
                          }`}
                          placeholder="Write your email body…"
                        />
                        {!editorLocked ? (
                          <div className="dashboard-outreach-builder-merge-tags">
                            <span className="dashboard-outreach-builder-field-label">
                              Personalization
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {OUTREACH_MERGE_FIELDS.map((field) => (
                                <button
                                  key={field.token}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => insertBodyMergeToken(field.token)}
                                  className="dashboard-wa-outreach-chip"
                                  title={field.label}
                                >
                                  {`{{${field.token}}}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
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
      {testPreviewStep && auth?.token ? (
        <OutreachTestEmailModal
          open
          stepLabel={`${touchpointTypeLabel(testPreviewStep.order)} · Step ${testPreviewStep.order}`}
          fromEmail={gmailConnected ? gmailEmail : ""}
          subject={testPreviewStep.subject}
          body={testPreviewStep.body}
          senderFirstName={senderFirstName}
          authToken={auth.token}
          gmailConnected={gmailConnected}
          onGoToIntegrations={onGoToIntegrations}
          onClose={() => setTestPreviewStep(null)}
          onSent={setTestEmailToast}
        />
      ) : null}
      {testEmailToast ? (
        <DashboardToast
          message={testEmailToast}
          variant="success"
          onDismiss={() => setTestEmailToast(null)}
        />
      ) : null}
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
