"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmModal } from "@/components/dashboard/ConfirmModal";
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

type Props = {
  planId?: string | "new";
  initialPlanName: string;
  initialTouchpoints: OutreachTouchpointDraft[];
  /** Hide standalone header when nested under campaign workspace. */
  embedded?: boolean;
  /** Lock Start / Wait schedule pills when sequence came from template or saved plan. */
  lockSchedule?: boolean;
  onCancel: () => void;
  onSaved: (
    message: string,
    plan?: { id: string; name: string; touchpoints: OutreachTouchpointDraft[] }
  ) => void;
};

function SaveSequenceButton({
  saving,
  saveSucceeded,
  onClick,
  compact = false,
  label = "Save sequence",
}: {
  saving: boolean;
  saveSucceeded: boolean;
  onClick: () => void;
  compact?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || saveSucceeded}
      className={[
        "dashboard-btn-primary dashboard-outreach-save-btn disabled:opacity-55",
        compact ? "px-3 py-1.5 text-xs" : "dashboard-outreach-builder-save",
        saving ? "dashboard-outreach-save-btn--saving" : "",
        saveSucceeded ? "dashboard-outreach-save-btn--success" : "",
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

function formatScheduleDate(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function touchpointScheduleLabel(
  touchpoints: OutreachTouchpointDraft[],
  index: number
): string {
  const tp = touchpoints[index];
  if (!tp) return "";
  if (index === 0 && tp.waitDays === 0) {
    return formatScheduleDate(new Date());
  }
  let totalDays = 0;
  for (let i = 0; i <= index; i++) {
    totalDays += touchpoints[i]?.waitDays ?? 0;
  }
  const d = new Date();
  d.setDate(d.getDate() + totalDays);
  d.setHours(9, 0, 0, 0);
  return formatScheduleDate(d);
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

type StartScheduleMode = "immediate" | "next_business_day" | "soonest_at" | "after";

function defaultSoonestAtLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function daysUntilDatetime(value: string): number {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function waitDaysForStartMode(
  mode: StartScheduleMode,
  afterDays: number,
  soonestAt: string
): number {
  if (mode === "immediate") return 0;
  if (mode === "next_business_day") return 1;
  if (mode === "soonest_at") return daysUntilDatetime(soonestAt);
  return Math.max(1, afterDays);
}

function inferStartMode(waitDays: number): StartScheduleMode {
  if (waitDays === 0) return "immediate";
  if (waitDays === 1) return "next_business_day";
  return "after";
}

const START_MODE_OPTIONS: { value: StartScheduleMode; label: string }[] = [
  { value: "immediate", label: "immediately" },
  { value: "next_business_day", label: "next business day" },
  { value: "soonest_at", label: "soonest at" },
  { value: "after", label: "after" },
];

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

function mergeSendTimeIntoSoonestAt(isoLocal: string, hhmm: string): string {
  const [hh, mm] = hhmm.split(":");
  const base = new Date(isoLocal);
  if (Number.isNaN(base.getTime())) return defaultSoonestAtLocal();
  base.setHours(Number(hh), Number(mm), 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export function OutreachPlanEditor({
  planId = "new",
  initialPlanName,
  initialTouchpoints,
  embedded = false,
  lockSchedule = false,
  onCancel,
  onSaved,
}: Props) {
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
  const [afterDays, setAfterDays] = useState(() =>
    initialWait >= 2 ? initialWait : 2
  );
  const [soonestAt, setSoonestAt] = useState(defaultSoonestAtLocal);
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
  const [saving, setSaving] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    order: number;
    label: string;
  } | null>(null);

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

  useEffect(() => {
    void loadGmailStatus();
  }, [loadGmailStatus]);

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
    (mode: StartScheduleMode, nextAfterDays = afterDays, nextSoonestAt = soonestAt) => {
      const waitDays = waitDaysForStartMode(mode, nextAfterDays, nextSoonestAt);
      setTouchpoints((prev) => {
        const first = prev[0];
        if (!first) return prev;
        return prev.map((tp) => (tp.order === first.order ? { ...tp, waitDays } : tp));
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

  const handleStartSendTimeChange = (time: string) => {
    setStartSendTime(time);
    if (startMode === "soonest_at") {
      const merged = mergeSendTimeIntoSoonestAt(soonestAt, time);
      setSoonestAt(merged);
      applyStartSchedule("soonest_at", afterDays, merged);
    }
  };

  const showSendAt = startMode !== "immediate";

  const startModeLabel =
    START_MODE_OPTIONS.find((o) => o.value === startMode)?.label ?? startMode;

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
        body: JSON.stringify({ name: planName.trim() || "Untitled outreach", touchpoints }),
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
          }
        | undefined;
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
      {editingTitle ? (
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

  if (touchpoints.length === 0) return null;

  return (
    <section
      className={`dashboard-outreach-builder flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-[#f8f9fc]${
        embedded ? " dashboard-outreach-builder--embedded" : " dashboard-card dashboard-card--fill max-w-full"
      }`}
    >
      {embedded ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className={`${dashboardBtnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm`}
          >
            <MaterialIcon name="arrow_back" className="text-base" />
            Change sequence
          </button>
          <div className="hidden min-w-0 flex-1 px-4 sm:block">{planTitleEditor(true)}</div>
          <SaveSequenceButton
            compact
            saving={saving}
            saveSucceeded={saveSucceeded}
            onClick={() => void savePlan()}
          />
        </div>
      ) : (
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="dashboard-section-title text-lg">Create outreach</h3>
              <p className="dashboard-text-body mt-1 text-sm">
                Build your email sequence step by step.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onCancel}
                className={`${dashboardBtnSecondaryClass} px-4 py-2 text-sm`}
              >
                Cancel
              </button>
              <SaveSequenceButton
                saving={saving}
                saveSucceeded={saveSucceeded}
                onClick={() => void savePlan()}
                label="Save"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">{planTitleEditor(false)}</div>
        </header>
      )}

      {embedded ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:hidden">{planTitleEditor(false)}</div>
      ) : null}

      {error ? (
        <p className="dashboard-alert-error mx-4 mt-3 shrink-0 text-sm sm:mx-6">{error}</p>
      ) : null}

      <div className="dashboard-outreach-builder-body">
        <aside
          className="dashboard-outreach-builder-rail dashboard-outreach-scroll"
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
                        {touchpointScheduleLabel(touchpoints, index)}
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
            className="dashboard-outreach-builder-add-step"
          >
            <MaterialIcon name="add" className="text-base" />
            Add step
          </button>
        </aside>

        <div
          ref={canvasScrollRef}
          className="dashboard-outreach-builder-canvas dashboard-outreach-scroll"
        >
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
                <div
                  className={`dashboard-outreach-start-pill-bar${
                    lockSchedule ? " dashboard-outreach-start-pill-bar--locked" : ""
                  }`}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="dashboard-outreach-start-prefix">Start</span>
                  {lockSchedule ? (
                    <>
                      <ScheduleStaticChip label={startModeLabel} />
                      {startMode === "after" ? (
                        <>
                          <ScheduleStaticChip label={String(afterDays)} />
                          <ScheduleStaticChip label="business day" />
                        </>
                      ) : null}
                      {showSendAt ? (
                        <>
                          <span className="dashboard-outreach-start-muted">Send @</span>
                          <ScheduleStaticChip
                            label={
                              SEND_TIME_SELECT_OPTIONS.find((o) => o.value === startSendTime)
                                ?.label ?? startSendTime
                            }
                          />
                          <ScheduleStaticChip label={startTimezone} />
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <OutreachPillSelect
                        value={startMode}
                        options={START_MODE_OPTIONS}
                        onChange={handleStartModeChange}
                        ariaLabel="When to begin outreach"
                      />
                      {startMode === "after" ? (
                        <>
                          <input
                            type="number"
                            min={1}
                            value={afterDays}
                            onChange={(e) => {
                              const days = Math.max(1, Number(e.target.value) || 1);
                              setAfterDays(days);
                              applyStartSchedule("after", days);
                            }}
                            className="dashboard-outreach-start-chip dashboard-outreach-start-chip--input"
                            aria-label="Days after"
                          />
                          <span className="dashboard-outreach-start-chip dashboard-outreach-start-chip--static">
                            business day
                          </span>
                        </>
                      ) : null}
                      {showSendAt ? (
                        <>
                          <span className="dashboard-outreach-start-muted">Send @</span>
                          <OutreachPillSelect
                            value={startSendTime}
                            options={SEND_TIME_SELECT_OPTIONS}
                            onChange={handleStartSendTimeChange}
                            ariaLabel="Send time"
                          />
                          <OutreachPillSelect
                            value={startTimezone}
                            options={TIMEZONE_SELECT_OPTIONS}
                            onChange={setStartTimezone}
                            ariaLabel="Timezone"
                            compact
                          />
                        </>
                      ) : null}
                    </>
                  )}
                </div>
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
                          lockSchedule ? " dashboard-outreach-wait-link-shell--locked" : ""
                        }`}
                      >
                        <div
                          className={`dashboard-outreach-start-pill-bar${
                            lockSchedule ? " dashboard-outreach-start-pill-bar--locked" : ""
                          }`}
                        >
                          <span className="dashboard-outreach-start-prefix">Wait</span>
                          {lockSchedule ? (
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
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-[#0050cb]/15 bg-[#0050cb]/10 px-2.5 py-1 text-sm font-semibold text-[#0050cb]">
                        <MaterialIcon
                          name={tp.order === 1 ? "mail" : "reply"}
                          className="text-[18px]"
                          aria-hidden
                        />
                        {touchpointTypeLabel(tp.order)}
                        <span className="font-normal text-[#0050cb]/70">· Step {tp.order}</span>
                      </span>
                      <div className="flex items-center gap-2">
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
                            onChange={(e) =>
                              updateTouchpoint(tp.order, { subject: e.target.value })
                            }
                            onFocus={() => {
                              lastMergeFieldFocusRef.current = {
                                order: tp.order,
                                field: "subject",
                              };
                            }}
                            className="dashboard-input dashboard-input-sm flex-1"
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
                          onChange={(e) => updateTouchpoint(tp.order, { body: e.target.value })}
                          onFocus={() => {
                            lastMergeFieldFocusRef.current = {
                              order: tp.order,
                              field: "body",
                            };
                          }}
                          rows={10}
                          className="dashboard-outreach-builder-body-input"
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
    </section>
  );
}
