"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CampaignLaunchAgentOverlay,
  LAUNCH_AGENT_MIN_DURATION_MS,
} from "@/components/dashboard/CampaignLaunchAgentOverlay";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import {
  WhatsAppSetupWarningModal,
  type WhatsAppSetupWarningContext,
} from "@/components/dashboard/WhatsAppSetupWarningModal";
import { OutreachPillSelect } from "@/components/dashboard/OutreachPillSelect";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
} from "@/lib/dashboardStyles";
import {
  WHATSAPP_MERGE_TAGS,
  WHATSAPP_MESSAGE_MAX_LENGTH,
  WHATSAPP_NO_REPLY_TEMPLATES,
  WHATSAPP_OPENING_TEMPLATES,
  createEmptyWhatsAppStep,
  createInitialWhatsAppSequence,
  ensureWhatsAppSequenceWithFallbacks,
  formatWhatsAppWaitLabel,
  getNoReplyFallbacks,
  getWhatsAppOpeningTemplate,
  inferWaitDisplay,
  waitHoursFromDisplay,
  type WhatsAppMessageTemplate,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
import {
  saveWhatsAppOutreachPlan,
  type WhatsAppOutreachPlanRecord,
} from "@/lib/whatsappOutreachApi";

type Props = {
  planId?: string | "new";
  initialPlanName: string;
  initialTouchpoints: WhatsAppTouchpointDraft[];
  embedded?: boolean;
  onCancel: () => void;
  onSaved: (message: string, savedPlan?: WhatsAppOutreachPlanRecord) => void;
  onGoToIntegrations?: () => void;
  /** Campaign workspace: save then launch outreach for all contacts. */
  onLaunchCampaign?: (savedPlan: WhatsAppOutreachPlanRecord) => void | Promise<void>;
  onPauseCampaign?: () => void | Promise<void>;
  onResumeCampaign?: () => void | Promise<void>;
  campaignOutreachStatus?: "idle" | "active" | "paused" | "completed";
  hasCampaignContacts?: boolean;
  /** Called after launch API + overlay animation finish (e.g. switch workspace tab). */
  onLaunchComplete?: () => void;
};

type CalendlyMeetingLink = {
  name: string;
  schedulingUrl: string;
  slug?: string;
  durationMinutes?: number | null;
};

const WAIT_UNIT_OPTIONS = [
  { value: "hours" as const, label: "hours" },
  { value: "days" as const, label: "days" },
];

function openingPreviewLabel(tp: WhatsAppTouchpointDraft): string {
  if (tp.order !== 1) return tp.body.trim() || "Empty message";
  const tpl = getWhatsAppOpeningTemplate(tp.templateId);
  if (tpl) return `${tpl.name} · 2 no-reply follow-ups`;
  return "Select a template";
}

function touchpointNodeType(tp: WhatsAppTouchpointDraft): string {
  if (tp.order === 1) return "Opening";
  if (tp.order === 2) return "Follow-up 1";
  if (tp.order === 3) return "Follow-up 2";
  if (tp.isReplyFollowUp) return `Reply question ${tp.order - 3}`;
  return `Step ${tp.order - 3}`;
}

function touchpointPreviewLabel(tp: WhatsAppTouchpointDraft): string {
  if (tp.order === 1) return openingPreviewLabel(tp);
  if (tp.order === 2 || tp.order === 3) {
    return tp.body.trim() || "Select a template";
  }
  return tp.body.trim() || "Empty message";
}

function WhatsAppTemplateSelector({
  templates,
  selectedId,
  onSelect,
  ariaLabel,
  previewLabel = "Message preview",
}: {
  templates: WhatsAppMessageTemplate[];
  selectedId?: string;
  onSelect: (template: WhatsAppMessageTemplate) => void;
  ariaLabel: string;
  previewLabel?: string;
}) {
  return (
    <>
      <div
        className="dashboard-wa-opening-templates-grid"
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {templates.map((tpl) => {
          const active = selectedId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`dashboard-wa-opening-template-card${active ? " dashboard-wa-opening-template-card--active" : ""}`}
              onClick={() => onSelect(tpl)}
            >
              <span className="dashboard-wa-opening-template-card-head">
                <span
                  className={`dashboard-wa-opening-template-radio${active ? " dashboard-wa-opening-template-radio--active" : ""}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="dashboard-wa-opening-template-name">{tpl.name}</span>
                  <span className="dashboard-wa-opening-template-desc">{tpl.description}</span>
                </span>
              </span>
              <span className="dashboard-wa-opening-template-snippet">{tpl.body.split("\n")[0]}…</span>
            </button>
          );
        })}
      </div>
      {selectedId ? (
        <div className="dashboard-wa-opening-template-preview dashboard-wa-opening-template-preview--compact">
          <p className="dashboard-wa-opening-template-preview-label">{previewLabel}</p>
          <pre className="dashboard-wa-opening-template-preview-body">
            {templates.find((t) => t.id === selectedId)?.body}
          </pre>
        </div>
      ) : null}
    </>
  );
}

function NoReplyFallbackField({
  slot,
  touchpoint,
  waitMeta,
  onSelectTemplate,
  onWaitChange,
}: {
  slot: 1 | 2;
  touchpoint: WhatsAppTouchpointDraft;
  waitMeta: { amount: number; unit: "hours" | "days" };
  onSelectTemplate: (template: WhatsAppMessageTemplate) => void;
  onWaitChange: (patch: Partial<{ amount: number; unit: "hours" | "days" }>) => void;
}) {
  const templates = WHATSAPP_NO_REPLY_TEMPLATES[slot];

  return (
    <div className="dashboard-wa-no-reply-fallback">
      <div className="dashboard-wa-no-reply-fallback-head">
        <span className="dashboard-wa-no-reply-fallback-badge">If no reply</span>
        <h5 className="text-sm font-semibold text-[#141b2b]">Follow-up {slot}</h5>
      </div>
      <div className="dashboard-wa-outreach-wait-bar">
        <span className="text-xs font-medium text-slate-600">Send</span>
        <input
          type="number"
          min={1}
          value={waitMeta.amount || 1}
          onChange={(e) =>
            onWaitChange({ amount: Math.max(1, Number(e.target.value) || 1) })
          }
          className="dashboard-wa-outreach-wait-input"
          aria-label={`Follow-up ${slot} wait amount`}
        />
        <OutreachPillSelect
          value={waitMeta.unit}
          options={WAIT_UNIT_OPTIONS}
          onChange={(unit) => onWaitChange({ unit })}
          ariaLabel={`Follow-up ${slot} wait unit`}
        />
        <span className="text-xs text-slate-500">after no response</span>
      </div>
      <div className="mt-3">
        <WhatsAppTemplateSelector
          templates={templates}
          selectedId={touchpoint.templateId}
          onSelect={onSelectTemplate}
          ariaLabel={`No-reply follow-up ${slot} template`}
          previewLabel={`Follow-up ${slot} preview`}
        />
      </div>
    </div>
  );
}

function OpeningMessageSection({
  selectedTemplateId,
  onSelectTemplate,
}: {
  selectedTemplateId?: string;
  onSelectTemplate: (template: WhatsAppMessageTemplate) => void;
}) {
  return (
    <div className="dashboard-wa-opening-templates">
      <p className="dashboard-wa-opening-templates-lead">
        Choose an approved opening template for the first outreach message.
      </p>
      <p className="dashboard-wa-opening-templates-subtitle">Opening message</p>
      <WhatsAppTemplateSelector
        templates={WHATSAPP_OPENING_TEMPLATES}
        selectedId={selectedTemplateId}
        onSelect={onSelectTemplate}
        ariaLabel="Opening message template"
        previewLabel="Opening message preview"
      />
    </div>
  );
}

export function WhatsAppOutreachEditor({
  planId = "new",
  initialPlanName,
  initialTouchpoints,
  embedded = false,
  onCancel,
  onSaved,
  onGoToIntegrations,
  onLaunchCampaign,
  onPauseCampaign,
  onResumeCampaign,
  campaignOutreachStatus = "idle",
  hasCampaignContacts = true,
  onLaunchComplete,
}: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [planName, setPlanName] = useState(initialPlanName);
  const [editingTitle, setEditingTitle] = useState(false);
  const [touchpoints, setTouchpoints] = useState<WhatsAppTouchpointDraft[]>(() =>
    ensureWhatsAppSequenceWithFallbacks(
      initialTouchpoints.length > 0 ? initialTouchpoints : createInitialWhatsAppSequence()
    )
  );
  const [activeIndex, setActiveIndex] = useState(1);
  const [waitMeta, setWaitMeta] = useState<Record<number, { amount: number; unit: "hours" | "days" }>>(
    () => {
      const meta: Record<number, { amount: number; unit: "hours" | "days" }> = {};
      for (const tp of ensureWhatsAppSequenceWithFallbacks(initialTouchpoints)) {
        if (tp.order > 1) meta[tp.order] = inferWaitDisplay(tp.waitHours);
      }
      return meta;
    }
  );

  const railTouchpoints = useMemo(() => touchpoints, [touchpoints]);

  const { fallback1, fallback2 } = useMemo(
    () => getNoReplyFallbacks(touchpoints),
    [touchpoints]
  );

  const openingTouchpoint = touchpoints.find((tp) => tp.order === 1);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(planId);
  const [error, setError] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [setupWarningOpen, setSetupWarningOpen] = useState(false);
  const [setupWarningContext, setSetupWarningContext] =
    useState<WhatsAppSetupWarningContext>("save");
  const [calendlyPickerOpen, setCalendlyPickerOpen] = useState(false);
  const [calendlyLoading, setCalendlyLoading] = useState(false);
  const [calendlyError, setCalendlyError] = useState("");
  const [calendlyMeetingLinks, setCalendlyMeetingLinks] = useState<CalendlyMeetingLink[]>([]);
  const [selectedMeetingLink, setSelectedMeetingLink] = useState("");

  const loadWhatsAppStatus = useCallback(async (): Promise<boolean> => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setWhatsappConnected(false);
      return false;
    }
    try {
      const res = await fetch(`${apiBase}/api/integrations/whatsapp/status`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      const connected = Boolean(data.success && data.connected);
      setWhatsappConnected(connected);
      return connected;
    } catch {
      setWhatsappConnected(false);
      return false;
    }
  }, [apiBase]);

  const openCalendlyPicker = useCallback(async () => {
    setCalendlyError("");
    const auth = getStoredAuth();
    if (!auth?.token) {
      setCalendlyError("Please sign in again.");
      return;
    }
    setCalendlyLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/integrations/calendly/links`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        const message =
          typeof data?.message === "string" ? data.message : "Failed to load Calendly links.";
        if (message.toLowerCase().includes("not connected")) onGoToIntegrations?.();
        setCalendlyError(message);
        return;
      }
      const links = Array.isArray(data?.links)
        ? data.links
            .map((raw): CalendlyMeetingLink | null => {
              if (!raw || typeof raw !== "object") return null;
              const schedulingUrl =
                typeof (raw as { schedulingUrl?: unknown }).schedulingUrl === "string"
                  ? (raw as { schedulingUrl: string }).schedulingUrl.trim()
                  : "";
              if (!schedulingUrl) return null;
              return {
                name:
                  typeof (raw as { name?: unknown }).name === "string"
                    ? (raw as { name: string }).name.trim() || "Calendly event"
                    : "Calendly event",
                schedulingUrl,
                slug:
                  typeof (raw as { slug?: unknown }).slug === "string"
                    ? (raw as { slug: string }).slug.trim()
                    : "",
                durationMinutes:
                  typeof (raw as { durationMinutes?: unknown }).durationMinutes === "number"
                    ? (raw as { durationMinutes: number }).durationMinutes
                    : null,
              };
            })
            .filter((item): item is CalendlyMeetingLink => item !== null)
        : [];

      if (!links.length) {
        setCalendlyError("No Calendly meeting links found. Create an event type in Calendly.");
        return;
      }

      setCalendlyMeetingLinks(links);
      setSelectedMeetingLink(links[0].schedulingUrl);
      setCalendlyPickerOpen(true);
    } catch {
      setCalendlyError("Failed to check Calendly connection.");
    } finally {
      setCalendlyLoading(false);
    }
  }, [apiBase, onGoToIntegrations]);

  useEffect(() => {
    void loadWhatsAppStatus();
  }, [loadWhatsAppStatus]);

  const activeTouchpoint = useMemo(
    () => touchpoints.find((tp) => tp.order === activeIndex) ?? touchpoints[0],
    [touchpoints, activeIndex]
  );
  const activeHasCalendlyLink = useMemo(() => {
    const body = (activeTouchpoint?.body || "").toLowerCase();
    return body.includes("calendly.com/");
  }, [activeTouchpoint]);

  const updateTouchpoint = (order: number, patch: Partial<WhatsAppTouchpointDraft>) => {
    setTouchpoints((prev) =>
      prev.map((tp) => (tp.order === order ? { ...tp, ...patch } : tp))
    );
  };

  const updateStepWait = (order: number, patch: Partial<{ amount: number; unit: "hours" | "days" }>) => {
    const current = waitMeta[order] ?? inferWaitDisplay(
      touchpoints.find((t) => t.order === order)?.waitHours ?? 24
    );
    const next = { ...current, ...patch };
    setWaitMeta((prev) => ({ ...prev, [order]: next }));
    updateTouchpoint(order, { waitHours: waitHoursFromDisplay(next.amount, next.unit) });
  };

  const addStep = () => {
    const maxOrder = Math.max(...touchpoints.map((t) => t.order), 3);
    const nextOrder = maxOrder + 1;
    setTouchpoints((prev) =>
      ensureWhatsAppSequenceWithFallbacks([
        ...prev,
        { ...createEmptyWhatsAppStep(nextOrder), order: nextOrder, isNoReplyFallback: false },
      ])
    );
    setWaitMeta((prev) => ({
      ...prev,
      [nextOrder]: { amount: 1, unit: "days" },
    }));
    setActiveIndex(nextOrder);
  };

  const removeStep = (order: number) => {
    if (order <= 7) return;
    setTouchpoints((prev) =>
      ensureWhatsAppSequenceWithFallbacks(prev.filter((tp) => tp.order !== order))
    );
    setActiveIndex(1);
  };

  const insertMergeTag = (tag: string) => {
    if (!activeTouchpoint || activeTouchpoint.order === 1) return;
    const token = `{{${tag}}}`;
    const body = activeTouchpoint.body.trim();
    updateTouchpoint(activeTouchpoint.order, {
      body: body ? `${body} ${token}` : token,
    });
  };

  const insertCalendlyLink = () => {
    const link = selectedMeetingLink.trim();
    if (!activeTouchpoint || !link) return;
    const body = activeTouchpoint.body.trim();
    const hasLink = body.includes(link);
    if (hasLink) {
      setCalendlyPickerOpen(false);
      return;
    }
    updateTouchpoint(activeTouchpoint.order, {
      body: body ? `${body}\n\n${link}` : link,
    });
    setCalendlyPickerOpen(false);
  };

  const selectOpeningTemplate = (template: WhatsAppMessageTemplate) => {
    setTouchpoints((prev) =>
      ensureWhatsAppSequenceWithFallbacks(
        prev.map((tp) =>
          tp.order === 1
            ? {
                ...tp,
                templateId: template.id,
                body: template.body,
                label: "Opening message",
              }
            : tp
        )
      )
    );
  };

  const updateFallbackWait = (
    order: 2 | 3,
    patch: Partial<{ amount: number; unit: "hours" | "days" }>
  ) => {
    updateStepWait(order, patch);
  };

  const validateAndBuildPayload = () => {
    const trimmedName = planName.trim();
    if (!trimmedName) {
      setError("Sequence name is required.");
      return null;
    }
    const opening = touchpoints.find((tp) => tp.order === 1);
    if (!opening?.templateId || !opening.body.trim()) {
      setError("Select an opening message template.");
      setActiveIndex(1);
      return null;
    }

    if (!fallback1?.templateId || !fallback1.body.trim()) {
      setError("Select a template for no-reply follow-up 1.");
      setActiveIndex(1);
      return null;
    }
    if (!fallback2?.templateId || !fallback2.body.trim()) {
      setError("Select a template for no-reply follow-up 2.");
      setActiveIndex(1);
      return null;
    }

    const emptyExtra = touchpoints.find((tp) => tp.order > 3 && !tp.body.trim());
    if (emptyExtra) {
      setError(`Follow-up ${emptyExtra.order - 3} is empty.`);
      setActiveIndex(emptyExtra.order);
      return null;
    }
    const tooLong = touchpoints.find((tp) => tp.body.length > WHATSAPP_MESSAGE_MAX_LENGTH);
    if (tooLong) {
      setError(`Message ${tooLong.order} exceeds ${WHATSAPP_MESSAGE_MAX_LENGTH} characters.`);
      setActiveIndex(tooLong.order);
      return null;
    }

    return {
      name: trimmedName,
      touchpoints: touchpoints.map((tp) => ({
        order: tp.order,
        label: tp.label,
        body: tp.body.trim(),
        waitHours: tp.waitHours,
        ...(tp.templateId ? { templateId: tp.templateId } : {}),
        ...(tp.isNoReplyFallback ? { isNoReplyFallback: true } : {}),
        ...(tp.isReplyFollowUp ? { isReplyFollowUp: true } : {}),
      })),
    };
  };

  const persistSequence = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return null;

    const auth = getStoredAuth();
    if (!auth?.token) {
      setError("Sign in to save your WhatsApp sequence.");
      return null;
    }

    const wasNew = currentPlanId === "new";
    const saved = await saveWhatsAppOutreachPlan(auth.token, {
      planId: currentPlanId,
      name: payload.name,
      touchpoints: payload.touchpoints,
    });
    setCurrentPlanId(saved.id);
    return { saved, wasNew };
  };

  const executeSaveSequence = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await persistSequence();
      if (!result) return;
      onSaved(
        result.wasNew ? "WhatsApp sequence created." : "WhatsApp sequence updated.",
        result.saved
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save WhatsApp sequence.");
    } finally {
      setSaving(false);
    }
  };

  const promptSetupIfDisconnected = async (
    context: WhatsAppSetupWarningContext
  ): Promise<boolean> => {
    const connected = await loadWhatsAppStatus();
    if (connected) return true;
    setSetupWarningContext(context);
    setSetupWarningOpen(true);
    return false;
  };

  const saveSequence = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return;
    const ok = await promptSetupIfDisconnected("save");
    if (!ok) return;
    await executeSaveSequence();
  };

  const launchCampaign = async () => {
    if (!onLaunchCampaign) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;
    const ok = await promptSetupIfDisconnected("launch");
    if (!ok) return;

    setLaunching(true);
    setError("");
    const overlayStartedAt = Date.now();
    try {
      const result = await persistSequence();
      if (!result) {
        setLaunching(false);
        return;
      }
      await onLaunchCampaign(result.saved);

      const elapsed = Date.now() - overlayStartedAt;
      if (elapsed < LAUNCH_AGENT_MIN_DURATION_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, LAUNCH_AGENT_MIN_DURATION_MS - elapsed)
        );
      }
      onLaunchComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch campaign.");
    } finally {
      setLaunching(false);
    }
  };

  const pauseCampaign = async () => {
    if (!onPauseCampaign) return;
    setPausing(true);
    setError("");
    try {
      await onPauseCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause campaign.");
    } finally {
      setPausing(false);
    }
  };

  const resumeCampaign = async () => {
    if (!onResumeCampaign) return;
    setResuming(true);
    setError("");
    try {
      await onResumeCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume campaign.");
    } finally {
      setResuming(false);
    }
  };

  const actionBusy = saving || launching || pausing || resuming;

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
          className={`inline-flex max-w-full items-center gap-1.5 text-left hover:text-[#128c7e] ${
            centered ? "justify-center" : ""
          }`}
          onClick={() => setEditingTitle(true)}
        >
          <span className="dashboard-section-title truncate text-base">{planName}</span>
          <MaterialIcon name="edit" className="shrink-0 text-base text-slate-400" aria-hidden />
        </button>
      )}
    </div>
  );

  return (
    <section
      className={`dashboard-wa-outreach flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-[#f0f7f4]${
        embedded ? " dashboard-wa-outreach--embedded" : " dashboard-card dashboard-card--fill max-w-full"
      }${launching ? " dashboard-wa-outreach--launching" : ""}`}
    >
      <WhatsAppSetupWarningModal
        open={setupWarningOpen}
        context={setupWarningContext}
        onClose={() => setSetupWarningOpen(false)}
        onSetupWhatsApp={() => {
          setSetupWarningOpen(false);
          onGoToIntegrations?.();
        }}
        onSaveAnyway={
          setupWarningContext === "save"
            ? () => {
                setSetupWarningOpen(false);
                void executeSaveSequence();
              }
            : undefined
        }
      />
      <CampaignLaunchAgentOverlay open={launching && Boolean(onLaunchCampaign)} />
      {embedded ? (
        <div className="dashboard-wa-outreach-bar flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className={`${dashboardBtnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm`}
          >
            <MaterialIcon name="arrow_back" className="text-base" />
            Change sequence
          </button>
          <div className="hidden min-w-0 flex-1 px-4 sm:block">{planTitleEditor(true)}</div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveSequence()}
              disabled={actionBusy}
              className={`${dashboardBtnSecondaryClass} dashboard-wa-outreach-save px-4 py-1.5 text-sm disabled:opacity-55`}
            >
              {saving ? "Saving…" : "Save sequence"}
            </button>
            {campaignOutreachStatus === "active" ? (
              <button
                type="button"
                onClick={() => void pauseCampaign()}
                disabled={actionBusy}
                className={`${dashboardBtnSecondaryClass} inline-flex items-center gap-1.5 px-4 py-1.5 text-sm disabled:opacity-55`}
              >
                {pausing ? (
                  <>
                    <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                    Pausing…
                  </>
                ) : (
                  <>
                    <MaterialIcon name="pause_circle" className="text-base" />
                    Pause campaign
                  </>
                )}
              </button>
            ) : campaignOutreachStatus === "paused" ? (
              <button
                type="button"
                onClick={() => void resumeCampaign()}
                disabled={actionBusy}
                className="dashboard-campaign-wa-launch-btn inline-flex items-center gap-1.5 px-4 py-1.5 text-sm disabled:opacity-55"
              >
                {resuming ? (
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
            ) : onLaunchCampaign ? (
              <button
                type="button"
                onClick={() => void launchCampaign()}
                disabled={actionBusy || !hasCampaignContacts}
                title={!hasCampaignContacts ? "Add contacts to this campaign first" : "Launch campaign"}
                className="dashboard-campaign-wa-launch-btn inline-flex items-center gap-1.5 px-4 py-1.5 text-sm disabled:opacity-55"
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
            ) : null}
          </div>
        </div>
      ) : (
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" />
              <div className="min-w-0">
                <h3 className="dashboard-section-title text-lg">WhatsApp outreach</h3>
                <p className="dashboard-text-body mt-1 text-sm">
                  Build a multi-step WhatsApp message sequence.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onCancel}
                className={`${dashboardBtnSecondaryClass} px-4 py-2 text-sm`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveSequence()}
                disabled={saving}
                className={`${dashboardBtnPrimaryClass} dashboard-wa-outreach-save px-4 py-2 text-sm disabled:opacity-55`}
              >
                {saving ? "Saving…" : "Save sequence"}
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">{planTitleEditor(false)}</div>
        </header>
      )}

      {embedded ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          {planTitleEditor(false)}
        </div>
      ) : null}

      {whatsappConnected === false ? (
        <div className="dashboard-wa-outreach-connect-banner mx-4 mt-3 shrink-0 sm:mx-6">
          <MaterialIcon name="link_off" className="shrink-0 text-lg text-amber-700" />
          <p className="min-w-0 flex-1 text-sm text-amber-950">
            Connect WhatsApp under Integrations to send messages from this sequence.
          </p>
          {onGoToIntegrations ? (
            <button
              type="button"
              onClick={onGoToIntegrations}
              className={`${dashboardBtnSecondaryClass} shrink-0 px-3 py-1.5 text-xs`}
            >
              Integrations
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="dashboard-alert-error mx-4 mt-3 shrink-0 text-sm sm:mx-6">{error}</p>
      ) : null}

      <div className="dashboard-wa-outreach-body">
        <aside className="dashboard-wa-outreach-rail dashboard-outreach-scroll" aria-label="WhatsApp steps">
          <div className="dashboard-wa-outreach-rail-heading">
            <IntegrationBrandLogo
              provider="whatsapp"
              title="WhatsApp"
              className="dashboard-integration-brand-logo--sm"
            />
            <p className="dashboard-wa-outreach-rail-title">Sequence steps</p>
          </div>
          <ol className="dashboard-wa-outreach-flow">
            {railTouchpoints.map((tp, index) => {
              const isActive = tp.order === activeIndex;
              const nextRail = railTouchpoints[index + 1];
              const isSubStep = tp.order > 1;
              return (
                <li
                  key={tp.order}
                  className={`dashboard-wa-outreach-flow-item${
                    isSubStep ? " dashboard-wa-outreach-flow-item--sub" : ""
                  }${
                    tp.isReplyFollowUp ? " dashboard-wa-outreach-flow-item--reply" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`dashboard-wa-outreach-flow-node${isActive ? " dashboard-wa-outreach-flow-node--active" : ""}`}
                    onClick={() => setActiveIndex(tp.order)}
                  >
                    <span className="dashboard-wa-outreach-flow-node-icon" aria-hidden>
                      <MaterialIcon name="chat" className="text-base" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                    <span className="dashboard-wa-outreach-flow-node-type">
                      {touchpointNodeType(tp)}
                    </span>
                    <span className="dashboard-wa-outreach-flow-node-preview">
                      {touchpointPreviewLabel(tp)}
                    </span>
                    </span>
                  </button>
                  {nextRail && !nextRail.isReplyFollowUp ? (
                    <p
                      className={`dashboard-wa-outreach-flow-wait${
                        nextRail.order > 1 ? " dashboard-wa-outreach-flow-wait--sub" : ""
                      }`}
                    >
                      {formatWhatsAppWaitLabel(nextRail.waitHours)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            onClick={addStep}
            className="dashboard-wa-outreach-add-step"
          >
            <MaterialIcon name="add" className="text-base" />
            Add message
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
              {activeHasCalendlyLink
                ? "Interview link is added to this message. You can change it anytime."
                : "Connect Calendly to send interview links in your outreach conversations."}
            </p>
            {onGoToIntegrations ? (
              <button
                type="button"
                onClick={() => void openCalendlyPicker()}
                className="dashboard-wa-outreach-calendly-btn"
                disabled={calendlyLoading}
              >
                {calendlyLoading
                  ? "Checking Calendly…"
                  : activeHasCalendlyLink
                    ? "Change interview link"
                    : "Add interview link"}
              </button>
            ) : null}
            {calendlyError ? (
              <p className="mt-2 text-[11px] text-rose-600">{calendlyError}</p>
            ) : null}
          </div>
        </aside>

        <div className="dashboard-wa-outreach-canvas">
          {activeTouchpoint ? (
            <div className="dashboard-wa-outreach-step-panel">
              {activeTouchpoint.order !== 2 && activeTouchpoint.order !== 3 ? (
                <div className="dashboard-wa-outreach-step-head">
                  <h4 className="text-sm font-semibold text-[#141b2b]">
                    {activeTouchpoint.label}
                  </h4>
                  {activeTouchpoint.order > 7 ? (
                    <button
                      type="button"
                      onClick={() => removeStep(activeTouchpoint.order)}
                      className="dashboard-wa-outreach-delete"
                    >
                      <MaterialIcon name="delete" className="text-base" />
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="dashboard-wa-outreach-messages-scroll dashboard-outreach-scroll">
              {activeTouchpoint.order === 1 && openingTouchpoint ? (
                <OpeningMessageSection
                  selectedTemplateId={openingTouchpoint.templateId}
                  onSelectTemplate={selectOpeningTemplate}
                />
              ) : activeTouchpoint.order === 2 || activeTouchpoint.order === 3 ? (
                <div className="dashboard-wa-no-reply-section">
                  <h4 className="dashboard-wa-no-reply-section-title">No-reply follow-up</h4>
                  <p className="dashboard-wa-no-reply-section-lead">
                    This message sends automatically only when the candidate has not responded.
                  </p>
                  <NoReplyFallbackField
                    slot={activeTouchpoint.order === 2 ? 1 : 2}
                    touchpoint={activeTouchpoint}
                    waitMeta={
                      waitMeta[activeTouchpoint.order] ??
                      inferWaitDisplay(activeTouchpoint.waitHours)
                    }
                    onSelectTemplate={(template) =>
                      updateTouchpoint(activeTouchpoint.order, {
                        templateId: template.id,
                        body: template.body,
                      })
                    }
                    onWaitChange={(patch) =>
                      updateFallbackWait(activeTouchpoint.order as 2 | 3, patch)
                    }
                  />
                </div>
              ) : activeTouchpoint.isReplyFollowUp ? (
                <div className="dashboard-wa-no-reply-section">
                  <h4 className="dashboard-wa-no-reply-section-title">Reply-based question</h4>
                  <p className="dashboard-wa-no-reply-section-lead">
                    This message is sent only after the candidate replies to your previous WhatsApp message.
                  </p>
                  <label className="dashboard-label mt-4 block">
                    Message
                    <textarea
                      value={activeTouchpoint.body}
                      onChange={(e) =>
                        updateTouchpoint(activeTouchpoint.order, { body: e.target.value })
                      }
                      rows={6}
                      maxLength={WHATSAPP_MESSAGE_MAX_LENGTH}
                      placeholder="Thanks for your response. Could you share..."
                      className="dashboard-input dashboard-input-sm mt-2 w-full resize-y"
                    />
                  </label>
                  <p className="mt-1 text-right text-[11px] text-slate-500">
                    {activeTouchpoint.body.length.toLocaleString()} /{" "}
                    {WHATSAPP_MESSAGE_MAX_LENGTH.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="dashboard-wa-outreach-step-form">
                  <div className="dashboard-wa-outreach-wait-bar">
                    <span className="text-xs font-medium text-slate-600">Wait</span>
                    <input
                      type="number"
                      min={0}
                      value={
                        waitMeta[activeTouchpoint.order]?.amount ??
                        inferWaitDisplay(activeTouchpoint.waitHours).amount
                      }
                      onChange={(e) =>
                        updateStepWait(activeTouchpoint.order, {
                          amount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="dashboard-wa-outreach-wait-input"
                      aria-label="Wait amount"
                    />
                    <OutreachPillSelect
                      value={
                        waitMeta[activeTouchpoint.order]?.unit ??
                        inferWaitDisplay(activeTouchpoint.waitHours).unit
                      }
                      options={WAIT_UNIT_OPTIONS}
                      onChange={(unit) => updateStepWait(activeTouchpoint.order, { unit })}
                      ariaLabel="Wait unit"
                    />
                    <span className="text-xs text-slate-500">after previous message</span>
                  </div>

                  <label className="dashboard-label mt-4 block">
                    Message
                    <textarea
                      value={activeTouchpoint.body}
                      onChange={(e) =>
                        updateTouchpoint(activeTouchpoint.order, { body: e.target.value })
                      }
                      rows={8}
                      maxLength={WHATSAPP_MESSAGE_MAX_LENGTH}
                      placeholder="Hi {{FirstName}}, just following up on my earlier message…"
                      className="dashboard-input dashboard-input-sm mt-2 w-full resize-y"
                    />
                  </label>
                  <p className="mt-1 text-right text-[11px] text-slate-500">
                    {activeTouchpoint.body.length.toLocaleString()} /{" "}
                    {WHATSAPP_MESSAGE_MAX_LENGTH.toLocaleString()}
                  </p>

                  <div className="mt-4">
                    <p className="dashboard-label mb-2">Personalization</p>
                    <div className="flex flex-wrap gap-1.5">
                      {WHATSAPP_MERGE_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertMergeTag(tag)}
                          className="dashboard-wa-outreach-chip"
                        >
                          {`{{${tag}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
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
            aria-labelledby="calendly-meeting-picker-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 id="calendly-meeting-picker-title" className="dashboard-section-title text-lg">
                Select interview meeting link
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Choose the Calendly link to insert into the active message.
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-2">
                {calendlyMeetingLinks.map((link) => (
                  <label
                    key={link.schedulingUrl}
                    className="flex items-start gap-2 rounded-md border border-slate-200 p-3"
                  >
                    <input
                      type="radio"
                      name="calendly-link"
                      checked={selectedMeetingLink === link.schedulingUrl}
                      onChange={() => setSelectedMeetingLink(link.schedulingUrl)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{link.name}</span>
                      <span className="block text-xs text-slate-500 break-all">{link.schedulingUrl}</span>
                    </span>
                  </label>
                ))}
              </div>
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
                onClick={insertCalendlyLink}
                disabled={!selectedMeetingLink.trim() || !activeTouchpoint}
              >
                Insert link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
