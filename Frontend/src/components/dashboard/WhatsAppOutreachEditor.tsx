"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
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

type Props = {
  planId?: string | "new";
  initialPlanName: string;
  initialTouchpoints: WhatsAppTouchpointDraft[];
  embedded?: boolean;
  onCancel: () => void;
  onSaved: (message: string) => void;
  onGoToIntegrations?: () => void;
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
  fallback1,
  fallback2,
  waitMeta,
  selectedTemplateId,
  onSelectTemplate,
  onUpdateFallback,
  onUpdateFallbackWait,
}: {
  fallback1: WhatsAppTouchpointDraft;
  fallback2: WhatsAppTouchpointDraft;
  waitMeta: Record<number, { amount: number; unit: "hours" | "days" }>;
  selectedTemplateId?: string;
  onSelectTemplate: (template: WhatsAppMessageTemplate) => void;
  onUpdateFallback: (order: 2 | 3, patch: Partial<WhatsAppTouchpointDraft>) => void;
  onUpdateFallbackWait: (
    order: 2 | 3,
    patch: Partial<{ amount: number; unit: "hours" | "days" }>
  ) => void;
}) {
  const selectFallbackTemplate = (order: 2 | 3, slot: 1 | 2, template: WhatsAppMessageTemplate) => {
    onUpdateFallback(order, {
      templateId: template.id,
      body: template.body,
    });
  };

  return (
    <div className="dashboard-wa-opening-templates">
      <p className="dashboard-wa-opening-templates-lead">
        Choose approved templates for the opening message and two automatic follow-ups if the
        candidate does not reply.
      </p>
      <p className="dashboard-wa-opening-templates-subtitle">Opening message</p>
      <WhatsAppTemplateSelector
        templates={WHATSAPP_OPENING_TEMPLATES}
        selectedId={selectedTemplateId}
        onSelect={onSelectTemplate}
        ariaLabel="Opening message template"
        previewLabel="Opening message preview"
      />

      <div className="dashboard-wa-no-reply-section">
        <h4 className="dashboard-wa-no-reply-section-title">No-reply follow-ups</h4>
        <p className="dashboard-wa-no-reply-section-lead">
          These messages send automatically when the candidate has not responded.
        </p>
        <NoReplyFallbackField
          slot={1}
          touchpoint={fallback1}
          waitMeta={
            waitMeta[2] ?? inferWaitDisplay(fallback1.waitHours)
          }
          onSelectTemplate={(tpl) => selectFallbackTemplate(2, 1, tpl)}
          onWaitChange={(patch) => onUpdateFallbackWait(2, patch)}
        />
        <NoReplyFallbackField
          slot={2}
          touchpoint={fallback2}
          waitMeta={
            waitMeta[3] ?? inferWaitDisplay(fallback2.waitHours)
          }
          onSelectTemplate={(tpl) => selectFallbackTemplate(3, 2, tpl)}
          onWaitChange={(patch) => onUpdateFallbackWait(3, patch)}
        />
      </div>
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

  const railTouchpoints = useMemo(
    () => touchpoints.filter((tp) => !tp.isNoReplyFallback),
    [touchpoints]
  );

  const { fallback1, fallback2 } = useMemo(
    () => getNoReplyFallbacks(touchpoints),
    [touchpoints]
  );

  const openingTouchpoint = touchpoints.find((tp) => tp.order === 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);

  const loadWhatsAppStatus = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setWhatsappConnected(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/integrations/whatsapp/status`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      setWhatsappConnected(Boolean(data.success && data.connected));
    } catch {
      setWhatsappConnected(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadWhatsAppStatus();
  }, [loadWhatsAppStatus]);

  const activeTouchpoint = useMemo(
    () => touchpoints.find((tp) => tp.order === activeIndex) ?? touchpoints[0],
    [touchpoints, activeIndex]
  );

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
    if (order <= 3) return;
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

  const saveSequence = async () => {
    const trimmedName = planName.trim();
    if (!trimmedName) {
      setError("Sequence name is required.");
      return;
    }
    const opening = touchpoints.find((tp) => tp.order === 1);
    if (!opening?.templateId || !opening.body.trim()) {
      setError("Select an opening message template.");
      setActiveIndex(1);
      return;
    }

    if (!fallback1?.templateId || !fallback1.body.trim()) {
      setError("Select a template for no-reply follow-up 1.");
      setActiveIndex(1);
      return;
    }
    if (!fallback2?.templateId || !fallback2.body.trim()) {
      setError("Select a template for no-reply follow-up 2.");
      setActiveIndex(1);
      return;
    }

    const emptyExtra = touchpoints.find((tp) => tp.order > 3 && !tp.body.trim());
    if (emptyExtra) {
      setError(`Follow-up ${emptyExtra.order - 3} is empty.`);
      setActiveIndex(emptyExtra.order);
      return;
    }
    const tooLong = touchpoints.find((tp) => tp.body.length > WHATSAPP_MESSAGE_MAX_LENGTH);
    if (tooLong) {
      setError(`Message ${tooLong.order} exceeds ${WHATSAPP_MESSAGE_MAX_LENGTH} characters.`);
      setActiveIndex(tooLong.order);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setError("Sign in to save your WhatsApp sequence.");
        return;
      }

      const payload = {
        name: trimmedName,
        channel: "whatsapp",
        touchpoints: touchpoints.map((tp) => ({
          order: tp.order,
          label: tp.label,
          body: tp.body.trim(),
          waitHours: tp.waitHours,
          ...(tp.templateId ? { templateId: tp.templateId } : {}),
          ...(tp.isNoReplyFallback ? { isNoReplyFallback: true } : {}),
        })),
      };

      const isNew = planId === "new";
      const url = isNew
        ? `${apiBase}/api/outreach/whatsapp/plans`
        : `${apiBase}/api/outreach/whatsapp/plans/${planId}`;

      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: authHeaders(auth.token),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        if (res.status === 404 || res.status === 501) {
          onSaved(
            isNew ? "WhatsApp sequence ready (save API pending)." : "WhatsApp sequence updated."
          );
          return;
        }
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to save WhatsApp sequence."
        );
      }

      onSaved(isNew ? "WhatsApp sequence created." : "WhatsApp sequence updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save WhatsApp sequence.");
    } finally {
      setSaving(false);
    }
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
      }`}
    >
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
          <button
            type="button"
            onClick={() => void saveSequence()}
            disabled={saving}
            className={`${dashboardBtnPrimaryClass} dashboard-wa-outreach-save px-4 py-1.5 text-sm disabled:opacity-55`}
          >
            {saving ? "Saving…" : "Save sequence"}
          </button>
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
              return (
                <li key={tp.order} className="dashboard-wa-outreach-flow-item">
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
                        {tp.order === 1 ? "Opening" : `Step ${tp.order - 3}`}
                      </span>
                      <span className="dashboard-wa-outreach-flow-node-preview">
                        {openingPreviewLabel(tp)}
                      </span>
                    </span>
                  </button>
                  {nextRail ? (
                    <p className="dashboard-wa-outreach-flow-wait">
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
        </aside>

        <div className="dashboard-wa-outreach-canvas">
          {activeTouchpoint ? (
            <div className="dashboard-wa-outreach-step-panel">
              <div className="dashboard-wa-outreach-step-head">
                <h4 className="text-sm font-semibold text-[#141b2b]">
                  {activeTouchpoint.label}
                </h4>
                {activeTouchpoint.order > 3 ? (
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

              <div className="dashboard-wa-outreach-messages-scroll dashboard-outreach-scroll">
              {activeTouchpoint.order === 1 && openingTouchpoint && fallback1 && fallback2 ? (
                <OpeningMessageSection
                  fallback1={fallback1}
                  fallback2={fallback2}
                  waitMeta={waitMeta}
                  selectedTemplateId={openingTouchpoint.templateId}
                  onSelectTemplate={selectOpeningTemplate}
                  onUpdateFallback={(order, patch) => updateTouchpoint(order, patch)}
                  onUpdateFallbackWait={updateFallbackWait}
                />
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
    </section>
  );
}
