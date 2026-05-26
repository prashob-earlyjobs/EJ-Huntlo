"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  OutreachSequencePicker,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/OutreachSequencePicker";
import { CampaignEmailThreadPopover } from "@/components/dashboard/CampaignEmailThreadPopover";
import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { OutreachSequencePickerSkeleton } from "@/components/dashboard/OutreachSequencePickerSkeleton";
import { OutreachPlanEditor } from "@/components/dashboard/OutreachPlanEditor";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import type { CampaignContact, CampaignRecord } from "@/lib/campaigns";
import {
  getActiveCampaignRevealJob,
  pollCampaignRevealJob,
  startCampaignReveal,
} from "@/lib/campaignRevealJob";
import {
  fetchCampaign,
  launchCampaignSequence,
  pauseCampaignSequence,
  resumeCampaignSequence,
  setCampaignOutreachPlan,
  syncCampaignRevealedContacts,
} from "@/lib/campaignsApi";
import { syncCampaignReplies } from "@/lib/campaignEmailThread";
import { useCampaignThreadRealtime } from "@/lib/realtime/useCampaignThreadRealtime";
import { dashboardBtnPrimaryClass, dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import {
  CAMPAIGN_WORKSPACE_TABS,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";
import {
  createEmptyTouchpoint,
  type OutreachTemplateListItem,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";

export type { CampaignWorkspaceTab };

const COMING_SOON_TABS = new Set<CampaignWorkspaceTab>(["Activity", "Report", "Settings"]);

type EditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  lockSchedule: boolean;
};

type Props = {
  campaign: CampaignRecord;
  workspaceTab: CampaignWorkspaceTab;
  onWorkspaceTabChange: (tab: CampaignWorkspaceTab) => void;
  onBack: () => void;
  onCampaignUpdated?: (campaign: CampaignRecord) => void;
};

function contactInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function emailEmptyLabel(contact: CampaignContact, revealInProgress: boolean) {
  if (revealInProgress) {
    return "Revealing email and phone in background…";
  }
  if (!contact.linkedinUrl.trim() || !contact.sourcingSessionId.trim()) {
    return "Missing LinkedIn — open this person in Session Results and use Reveal Email";
  }
  return "Email not found yet. If you revealed it in Session Results, it will appear here shortly.";
}

function phoneEmptyLabel(contact: CampaignContact, revealInProgress: boolean) {
  if (revealInProgress) {
    return "Revealing email and phone in background…";
  }
  if (!contact.linkedinUrl.trim() || !contact.sourcingSessionId.trim()) {
    return "Missing LinkedIn — open this person in Session Results and use Reveal Phone";
  }
  return "Phone not found yet. If you revealed it in Session Results, it will appear here shortly.";
}

function campaignContactNeedsReveal(contact: CampaignContact) {
  if (!contact.linkedinUrl.trim() || !contact.sourcingSessionId.trim()) {
    return false;
  }
  return !contact.email.trim() || !contact.phone.trim();
}

function formatAddedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function CampaignWorkspace({
  campaign,
  workspaceTab: activeTab,
  onWorkspaceTabChange,
  onBack,
  onCampaignUpdated,
}: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const [starred, setStarred] = useState(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchNotice, setLaunchNotice] = useState("");
  const [launchError, setLaunchError] = useState("");
  const threadAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [threadPopoverContact, setThreadPopoverContact] = useState<{
    candidateKey: string;
    name: string;
    email: string;
    subtitle: string;
  } | null>(null);
  const [syncThreadsBusy, setSyncThreadsBusy] = useState(false);
  const [syncThreadsNotice, setSyncThreadsNotice] = useState("");
  const [threadReloadByKey, setThreadReloadByKey] = useState<Record<string, number>>({});
  const [editorPhase, setEditorPhase] = useState<"choose" | "editing">("choose");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorNotice, setEditorNotice] = useState("");

  const [modalPlans, setModalPlans] = useState<ExistingOutreachPlanOption[]>([]);
  const [modalPlansLoading, setModalPlansLoading] = useState(false);
  const [modalTemplates, setModalTemplates] = useState<OutreachTemplateListItem[]>([]);
  const [modalTemplatesLoading, setModalTemplatesLoading] = useState(false);
  const [sequenceOptionsReady, setSequenceOptionsReady] = useState(false);
  const [linkedPlanLoading, setLinkedPlanLoading] = useState(false);
  const [bypassLinkedPlan, setBypassLinkedPlan] = useState(false);

  const [contacts, setContacts] = useState<CampaignContact[]>(campaign.contacts);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [revealInProgress, setRevealInProgress] = useState(false);
  const [revealStarting, setRevealStarting] = useState(false);

  const onCampaignUpdatedRef = useRef(onCampaignUpdated);
  onCampaignUpdatedRef.current = onCampaignUpdated;

  const contactsFetchKeyRef = useRef<string | null>(null);
  const autoRevealAttemptedRef = useRef("");

  const contactsFromPropsKey = useMemo(
    () =>
      campaign.contacts
        .map(
          (c) =>
            `${c.candidateKey}|${c.email}|${c.phone}|${c.name}|${c.addedAt}`
        )
        .join("\n"),
    [campaign.contacts]
  );

  useEffect(() => {
    setContacts(campaign.contacts);
    contactsFetchKeyRef.current = null;
    autoRevealAttemptedRef.current = "";
  }, [campaign.id]);

  useEffect(() => {
    setContacts(campaign.contacts);
    setContactsError("");
  }, [contactsFromPropsKey, campaign.id]);

  const reloadContacts = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const showLoading = contacts.length === 0;
    if (showLoading) setContactsLoading(true);
    setContactsError("");
    try {
      let full = await fetchCampaign(auth.token, campaign.id);
      try {
        full = await syncCampaignRevealedContacts(auth.token, campaign.id);
      } catch {
        /* use last fetched campaign if sync fails */
      }
      setContacts(full.contacts);
      onCampaignUpdatedRef.current?.(full);
    } catch (err) {
      setContactsError(
        err instanceof Error ? err.message : "Could not load campaign contacts."
      );
    } finally {
      setContactsLoading(false);
    }
  }, [campaign.id, contacts.length]);

  const pollActiveRevealJob = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;

    const active = await getActiveCampaignRevealJob(auth.token, campaign.id);
    if (!active) {
      setRevealInProgress(false);
      return;
    }

    setRevealInProgress(true);
    try {
      const job = await pollCampaignRevealJob(auth.token, active.id, {
        intervalMs: 2000,
        maxAttempts: 120,
      });
      if (job.status === "completed" || job.status === "quota_exceeded") {
        contactsFetchKeyRef.current = null;
        await reloadContacts();
      }
    } finally {
      setRevealInProgress(false);
    }
  }, [campaign.id, reloadContacts]);

  const startRevealForContacts = useCallback(
    async (candidateKeys: string[]) => {
      const auth = getStoredAuth();
      if (!auth?.token || candidateKeys.length === 0) return;
      if (revealStarting || revealInProgress) return;

      setRevealStarting(true);
      setContactsError("");
      try {
        const existing = await getActiveCampaignRevealJob(auth.token, campaign.id);
        if (!existing) {
          await startCampaignReveal(auth.token, campaign.id, candidateKeys);
        }
        setRevealInProgress(true);
        contactsFetchKeyRef.current = null;
        await pollActiveRevealJob();
      } catch (err) {
        setContactsError(
          err instanceof Error ? err.message : "Could not start contact reveal."
        );
      } finally {
        setRevealStarting(false);
      }
    },
    [campaign.id, pollActiveRevealJob, revealInProgress, revealStarting]
  );

  useEffect(() => {
    if (contactsFetchKeyRef.current === campaign.id) return;
    contactsFetchKeyRef.current = campaign.id;
    void reloadContacts();
  }, [campaign.id, reloadContacts]);

  useEffect(() => {
    if (contactsLoading || revealStarting || revealInProgress) return;

    const needing = contacts.filter(campaignContactNeedsReveal);
    if (needing.length === 0) {
      autoRevealAttemptedRef.current = "";
      return;
    }

    const signature = needing
      .map((c) => c.candidateKey)
      .sort()
      .join(",");
    if (autoRevealAttemptedRef.current === signature) return;

    void (async () => {
      const auth = getStoredAuth();
      if (!auth?.token) return;

      const active = await getActiveCampaignRevealJob(auth.token, campaign.id);
      if (active) {
        autoRevealAttemptedRef.current = signature;
        await pollActiveRevealJob();
        return;
      }

      autoRevealAttemptedRef.current = signature;
      await startRevealForContacts(needing.map((c) => c.candidateKey));
    })();
  }, [
    contacts,
    contactsLoading,
    campaign.id,
    pollActiveRevealJob,
    revealInProgress,
    revealStarting,
    startRevealForContacts,
  ]);

  useEffect(() => {
    const isContactTab =
      activeTab === "Emails" || activeTab === "Phones" || activeTab === "Contacts";
    if (!isContactTab || contactsLoading) return;

    const needing = contacts.filter(campaignContactNeedsReveal);
    if (needing.length === 0 || revealInProgress) return;

    const interval = window.setInterval(() => {
      contactsFetchKeyRef.current = null;
      void reloadContacts();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeTab, contacts, contactsLoading, revealInProgress, reloadContacts]);

  const loadSequenceOptions = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setModalPlans([]);
      setModalTemplates([]);
      setModalPlansLoading(false);
      setModalTemplatesLoading(false);
      setSequenceOptionsReady(true);
      return;
    }
    setModalPlansLoading(true);
    setModalTemplatesLoading(true);
    try {
      const [plansRes, templatesRes] = await Promise.all([
        fetch(`${apiBase}/api/outreach/plans`, { headers: authHeaders(auth.token) }),
        fetch(`${apiBase}/api/outreach/templates`, { headers: authHeaders(auth.token) }),
      ]);
      const plansData = await plansRes.json();
      const templatesData = await templatesRes.json();
      if (plansData.success && Array.isArray(plansData.plans)) {
        setModalPlans(
          plansData.plans.map(
            (p: { id: string; name: string; touchpointCount: number }) => ({
              id: p.id,
              name: p.name,
              touchpointCount: p.touchpointCount,
            })
          )
        );
      } else {
        setModalPlans([]);
      }
      if (templatesData.success && Array.isArray(templatesData.templates)) {
        setModalTemplates(templatesData.templates as OutreachTemplateListItem[]);
      } else {
        setModalTemplates([]);
      }
    } catch {
      setModalPlans([]);
      setModalTemplates([]);
    } finally {
      setModalPlansLoading(false);
      setModalTemplatesLoading(false);
      setSequenceOptionsReady(true);
    }
  }, [apiBase]);

  useEffect(() => {
    setEditorPhase("choose");
    setEditor(null);
    setEditorNotice("");
    setBypassLinkedPlan(false);
    setLinkedPlanLoading(false);
  }, [campaign.id]);

  useLayoutEffect(() => {
    if (activeTab !== "Editor" || editorPhase !== "choose" || bypassLinkedPlan) return;
    if (campaign.outreachPlanId?.trim()) return;
    setSequenceOptionsReady(false);
    setModalPlansLoading(true);
    setModalTemplatesLoading(true);
    setModalPlans([]);
    setModalTemplates([]);
  }, [activeTab, editorPhase, campaign.id, campaign.outreachPlanId, bypassLinkedPlan]);

  useEffect(() => {
    if (activeTab !== "Editor" || editorPhase !== "choose" || bypassLinkedPlan) return;
    if (campaign.outreachPlanId?.trim()) return;
    void loadSequenceOptions();
  }, [
    activeTab,
    editorPhase,
    loadSequenceOptions,
    campaign.id,
    campaign.outreachPlanId,
    bypassLinkedPlan,
  ]);

  const openEditor = (state: EditorState) => {
    setEditorNotice("");
    setEditor(state);
    setEditorPhase("editing");
    setBypassLinkedPlan(false);
  };

  const backToSequenceChoose = () => {
    setEditor(null);
    setEditorPhase("choose");
    setEditorNotice("");
    setBypassLinkedPlan(true);
  };

  const loadLinkedOutreachPlan = useCallback(async () => {
    const planId = campaign.outreachPlanId?.trim();
    if (!planId) return;
    const auth = getStoredAuth();
    if (!auth?.token) return;

    setLinkedPlanLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/outreach/plans/${planId}`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        const plan = data.plan as {
          id: string;
          name: string;
          touchpoints: OutreachTouchpointDraft[];
        };
        openEditor({
          planId: plan.id,
          planName: plan.name || campaign.name,
          touchpoints:
            Array.isArray(plan.touchpoints) && plan.touchpoints.length > 0
              ? plan.touchpoints.map((tp) => ({ ...tp }))
              : [createEmptyTouchpoint(1)],
          lockSchedule: true,
        });
      } else {
        setEditorNotice("Saved sequence not found. Choose a new one below.");
        setBypassLinkedPlan(true);
      }
    } catch {
      setEditorNotice("Could not load saved sequence.");
      setBypassLinkedPlan(true);
    } finally {
      setLinkedPlanLoading(false);
    }
  }, [apiBase, campaign.name, campaign.outreachPlanId]);

  useEffect(() => {
    if (activeTab !== "Editor" || bypassLinkedPlan) return;
    if (!campaign.outreachPlanId?.trim()) return;
    if (editorPhase === "editing" && editor?.planId === campaign.outreachPlanId) return;
    void loadLinkedOutreachPlan();
  }, [
    activeTab,
    bypassLinkedPlan,
    campaign.id,
    campaign.outreachPlanId,
    editor,
    editorPhase,
    loadLinkedOutreachPlan,
  ]);

  const handlePlanSaved = useCallback(
    async (
      _message: string,
      savedPlan?: { id: string; name: string; touchpoints: OutreachTouchpointDraft[] }
    ) => {
      if (!savedPlan?.id) return;

      setEditor({
        planId: savedPlan.id,
        planName: savedPlan.name,
        touchpoints: savedPlan.touchpoints,
        lockSchedule: true,
      });
      setEditorPhase("editing");
      setBypassLinkedPlan(false);
      setEditorNotice("");

      const auth = getStoredAuth();
      if (!auth?.token) return;
      try {
        const updated = await setCampaignOutreachPlan(auth.token, campaign.id, savedPlan.id);
        onCampaignUpdatedRef.current?.(updated);
      } catch {
        setEditorNotice("Sequence saved, but could not link to this campaign. Try saving again.");
      }
    },
    [campaign.id]
  );

  const outreachStatus = campaign.outreachStatus ?? "idle";
  const hasSequence = Boolean(campaign.outreachPlanId?.trim());
  const contactsWithEmail = campaign.contacts.filter((c) => c.email.trim().includes("@")).length;

  const handleLaunchSequence = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || launchBusy) return;
    setLaunchError("");
    setLaunchNotice("");
    setLaunchBusy(true);
    try {
      const result = await launchCampaignSequence(auth.token, campaign.id);
      onCampaignUpdatedRef.current?.(result.campaign);
      setLaunchNotice(
        result.enrolled > 0
          ? `Sequence launched for ${result.enrolled} contact${result.enrolled === 1 ? "" : "s"}.`
          : "Launched, but no contacts had an email to enroll."
      );
      if (result.skipped > 0) {
        setLaunchNotice(
          (prev) =>
            `${prev} ${result.skipped} skipped (no email).`.trim()
        );
      }
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : "Could not launch campaign sequence."
      );
    } finally {
      setLaunchBusy(false);
    }
  }, [campaign.id, launchBusy]);

  const handlePauseSequence = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || launchBusy) return;
    setLaunchError("");
    setLaunchNotice("");
    setLaunchBusy(true);
    try {
      const updated = await pauseCampaignSequence(auth.token, campaign.id);
      onCampaignUpdatedRef.current?.(updated);
      setLaunchNotice("Campaign sequence paused.");
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Could not pause sequence.");
    } finally {
      setLaunchBusy(false);
    }
  }, [campaign.id, launchBusy]);

  const handleResumeSequence = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || launchBusy) return;
    setLaunchError("");
    setLaunchNotice("");
    setLaunchBusy(true);
    try {
      const updated = await resumeCampaignSequence(auth.token, campaign.id);
      onCampaignUpdatedRef.current?.(updated);
      setLaunchNotice("Campaign sequence resumed.");
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Could not resume sequence.");
    } finally {
      setLaunchBusy(false);
    }
  }, [campaign.id, launchBusy]);

  const handleSyncAllThreads = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || syncThreadsBusy) return;
    setSyncThreadsNotice("");
    setSyncThreadsBusy(true);
    try {
      const result = await syncCampaignReplies(auth.token, campaign.id);
      setSyncThreadsNotice(
        result.newReplies > 0
          ? `Synced ${result.newReplies} new message${result.newReplies === 1 ? "" : "s"} from Gmail.`
          : "Threads synced — open a contact to view history."
      );
      setThreadReloadByKey((prev) => {
        const next = { ...prev };
        for (const c of contacts) {
          next[c.candidateKey] = (next[c.candidateKey] || 0) + 1;
        }
        return next;
      });
    } catch (err) {
      setSyncThreadsNotice(
        err instanceof Error ? err.message : "Could not sync threads from Gmail."
      );
    } finally {
      setSyncThreadsBusy(false);
    }
  }, [campaign.id, syncThreadsBusy, contacts]);

  const handleRealtimeThreadUpdate = useCallback(
    (payload: { candidateKey: string; hasNewCandidateReply: boolean; newMessages: number }) => {
      setThreadReloadByKey((prev) => ({
        ...prev,
        [payload.candidateKey]: (prev[payload.candidateKey] || 0) + 1,
      }));
      if (payload.hasNewCandidateReply) {
        setSyncThreadsNotice("New reply received — thread updated live.");
      } else if (payload.newMessages > 0) {
        setSyncThreadsNotice("Email thread updated live.");
      }
    },
    []
  );

  useCampaignThreadRealtime(campaign.id, handleRealtimeThreadUpdate, activeTab === "Emails");

  const closeThreadPopover = useCallback(() => {
    setThreadPopoverContact(null);
    threadAnchorRef.current = null;
  }, []);

  const handleThreadButtonClick = useCallback(
    (contact: CampaignContact, e: ReactMouseEvent<HTMLButtonElement>) => {
      const btn = e.currentTarget;
      if (threadPopoverContact?.candidateKey === contact.candidateKey) {
        closeThreadPopover();
        return;
      }
      threadAnchorRef.current = btn;
      const subtitle = [contact.role, contact.company].filter(Boolean).join(" · ");
      setThreadPopoverContact({
        candidateKey: contact.candidateKey,
        name: contact.name,
        email: contact.email.trim(),
        subtitle,
      });
      setSyncThreadsNotice("");
    },
    [threadPopoverContact?.candidateKey, closeThreadPopover]
  );

  useEffect(() => {
    if (activeTab !== "Emails") {
      closeThreadPopover();
    }
  }, [activeTab, closeThreadPopover]);

  const handleSequenceChoice = async (choice: CreateOutreachChoice) => {
    if (choice.type === "scratch") {
      openEditor({
        planId: "new",
        planName: campaign.name,
        touchpoints: [createEmptyTouchpoint(1)],
        lockSchedule: false,
      });
      return;
    }

    if (choice.type === "template") {
      let tpl = modalTemplates.find((t) => t.id === choice.templateId);
      if (!tpl) {
        const auth = getStoredAuth();
        if (auth?.token) {
          try {
            const res = await fetch(`${apiBase}/api/outreach/templates/${choice.templateId}`, {
              headers: authHeaders(auth.token),
            });
            const data = await res.json();
            if (data.success && data.template) {
              tpl = data.template as OutreachTemplateListItem;
            }
          } catch {
            /* fall through */
          }
        }
      }
      if (!tpl) {
        setEditorNotice("Template not found.");
        return;
      }
      openEditor({
        planId: "new",
        planName: campaign.name,
        touchpoints: tpl.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: true,
      });
      return;
    }

    if (choice.type === "ai") {
      openEditor({
        planId: "new",
        planName: choice.planName || campaign.name,
        touchpoints: choice.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: false,
      });
      return;
    }

    if (choice.type === "clone") {
      const auth = getStoredAuth();
      if (!auth?.token) return;
      try {
        const res = await fetch(`${apiBase}/api/outreach/plans/${choice.planId}`, {
          headers: authHeaders(auth.token),
        });
        const data = await res.json();
        if (data.success && data.plan) {
          const plan = data.plan as {
            name: string;
            touchpoints: OutreachTouchpointDraft[];
          };
          openEditor({
            planId: "new",
            planName: campaign.name,
            touchpoints:
              plan.touchpoints.length > 0
                ? plan.touchpoints.map((tp) => ({ ...tp }))
                : [createEmptyTouchpoint(1)],
            lockSchedule: true,
          });
        } else {
          setEditorNotice("Could not load outreach plan to clone.");
        }
      } catch {
        setEditorNotice("Could not load outreach plan to clone.");
      }
    }
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[inherit] bg-white">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-[#141b2b]"
            aria-label="Back to campaigns"
          >
            <MaterialIcon name="arrow_back" className="text-xl" />
          </button>
          <h1 className="dashboard-section-title min-w-0 flex-1 truncate text-lg">
            {campaign.name}
          </h1>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {outreachStatus === "active" ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Active
              </span>
            ) : outreachStatus === "paused" ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Paused
              </span>
            ) : outreachStatus === "completed" ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Completed
              </span>
            ) : null}
            {outreachStatus === "active" ? (
              <button
                type="button"
                onClick={() => void handlePauseSequence()}
                disabled={launchBusy}
                className={`${dashboardBtnSecondaryClass} px-3 py-1.5 text-xs disabled:opacity-55`}
              >
                Pause
              </button>
            ) : outreachStatus === "paused" ? (
              <button
                type="button"
                onClick={() => void handleResumeSequence()}
                disabled={launchBusy}
                className={`${dashboardBtnPrimaryClass} px-3 py-1.5 text-xs disabled:opacity-55`}
              >
                {launchBusy ? "Resuming…" : "Resume"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleLaunchSequence()}
                disabled={launchBusy || !hasSequence || contactsWithEmail === 0}
                title={
                  launchBusy
                    ? "Launching…"
                    : !hasSequence
                      ? "Save a sequence on the Editor tab first"
                      : contactsWithEmail === 0
                        ? "Add contacts with email addresses"
                        : "Launch"
                }
                aria-label={
                  launchBusy ? "Launching campaign sequence" : "Launch campaign sequence"
                }
                className={`${dashboardBtnPrimaryClass} inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 disabled:opacity-55`}
              >
                {launchBusy ? (
                  <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                ) : (
                  <MaterialIcon name="play_arrow" className="text-xl" />
                )}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStarred((v) => !v)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition hover:bg-slate-100 ${
              starred ? "text-amber-500" : "text-slate-500"
            }`}
            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={starred}
          >
            <MaterialIcon name={starred ? "star" : "star_border"} className="text-[22px]" />
          </button>
        </div>

        <nav
          className="mt-3 flex gap-1 overflow-x-auto pb-0.5"
          aria-label="Campaign sections"
        >
          {CAMPAIGN_WORKSPACE_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#0050cb]/10 text-[#0050cb]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#141b2b]"
                }`}
                onClick={() => onWorkspaceTabChange(tab)}
              >
                {tab}
              </button>
            );
          })}
        </nav>
        {launchError ? (
          <p className="dashboard-alert-warning mt-2 text-sm" role="alert">
            {launchError}
          </p>
        ) : launchNotice ? (
          <p className="dashboard-alert-notice mt-2 text-sm" role="status">
            {launchNotice}
          </p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fc]">
        {activeTab === "Editor" ? (
          editorPhase === "editing" && editor ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {editorNotice ? (
                <p className="dashboard-alert-notice mx-4 mt-3 shrink-0 text-sm" role="alert">
                  {editorNotice}
                </p>
              ) : null}
              <OutreachPlanEditor
                embedded
                planId={editor.planId}
                initialPlanName={editor.planName}
                initialTouchpoints={editor.touchpoints}
                lockSchedule={editor.lockSchedule}
                onCancel={backToSequenceChoose}
                onSaved={(message, savedPlan) => void handlePlanSaved(message, savedPlan)}
              />
            </div>
          ) : linkedPlanLoading ||
            (Boolean(campaign.outreachPlanId?.trim()) && !bypassLinkedPlan) ? (
            <div
              className="dashboard-campaign-editor-choose"
              aria-busy="true"
              aria-label="Loading saved sequence"
            >
              <OutreachSequencePickerSkeleton rows={4} />
            </div>
          ) : (
            <div className="dashboard-outreach-scroll flex flex-1 flex-col items-center overflow-auto px-4 py-6 sm:px-8">
              {editorNotice ? (
                <p className="dashboard-alert-notice mb-4 w-full max-w-xl shrink-0 text-sm">
                  {editorNotice}
                </p>
              ) : null}
              <div className="w-full max-w-xl">
                <OutreachSequencePicker
                  variant="modal"
                  existingPlans={modalPlans}
                  plansLoading={modalPlansLoading}
                  templates={modalTemplates}
                  templatesLoading={modalTemplatesLoading}
                  optionsReady={sequenceOptionsReady}
                  lead="Create or select a sequence for this campaign"
                  onChoose={(choice) => void handleSequenceChoice(choice)}
                />
              </div>
            </div>
          )
        ) : activeTab === "Emails" ? (
          <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col">
            <div className="dashboard-campaign-emails-toolbar shrink-0 flex flex-wrap items-center justify-between gap-2">
              <p className="dashboard-campaign-emails-summary">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"} in this campaign
              </p>
              {contacts.length > 0 ? (
                <button
                  type="button"
                  className={`${dashboardBtnSecondaryClass} px-2.5 py-1 text-xs disabled:opacity-55`}
                  disabled={syncThreadsBusy}
                  onClick={() => void handleSyncAllThreads()}
                >
                  {syncThreadsBusy ? "Syncing…" : "Sync all from Gmail"}
                </button>
              ) : null}
            </div>
            {syncThreadsNotice ? (
              <p className="dashboard-alert-notice mx-3 mb-0 mt-2 shrink-0 text-sm" role="status">
                {syncThreadsNotice}
              </p>
            ) : null}
            <div className="dashboard-campaign-emails-scroll flex min-h-0 flex-1 flex-col">
              {contactsLoading ? (
                <CampaignContactsSkeleton rows={6} />
              ) : contactsError && !contactsLoading ? (
                <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error py-12">
                  {contactsError}
                </p>
              ) : contacts.length === 0 ? (
                <div className="dashboard-campaign-workspace-placeholder-wrap">
                  <MaterialIcon name="mail" className="mb-2 text-4xl text-[#80868b]" />
                  <p className="dashboard-campaign-workspace-placeholder">
                    No contacts yet. Add candidates from{" "}
                    <span className="font-medium text-[#202124]">Session Results</span> using{" "}
                    <span className="font-medium text-[#202124]">Add to campaign</span>.
                  </p>
                </div>
              ) : (
                <ul className="dashboard-campaign-emails-list">
                  {[...contacts]
                    .sort(
                      (a, b) =>
                        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
                    )
                    .map((contact) => {
                      const subtitle = [contact.role, contact.company]
                        .filter(Boolean)
                        .join(" · ");
                      const email = contact.email.trim();
                      return (
                        <li key={contact.candidateKey} className="dashboard-campaign-emails-row">
                          <span className="dashboard-campaign-emails-avatar" aria-hidden>
                            {contactInitial(contact.name)}
                          </span>
                          <div className="dashboard-campaign-emails-main min-w-0 flex-1">
                            <p className="dashboard-campaign-emails-name">
                              {contact.name.trim() || "Unnamed contact"}
                            </p>
                            {subtitle ? (
                              <p className="dashboard-campaign-emails-meta">{subtitle}</p>
                            ) : null}
                            {email ? (
                              <a
                                href={`mailto:${email}`}
                                className="dashboard-campaign-emails-address"
                              >
                                {email}
                              </a>
                            ) : (
                              <p className="dashboard-campaign-emails-address dashboard-campaign-emails-address--empty">
                                {emailEmptyLabel(contact, revealInProgress)}
                              </p>
                            )}
                          </div>
                          <div className="dashboard-campaign-emails-actions shrink-0">
                            <button
                              type="button"
                              className={`dashboard-campaign-emails-thread-btn${
                                threadPopoverContact?.candidateKey === contact.candidateKey
                                  ? " dashboard-campaign-emails-thread-btn--active"
                                  : ""
                              }`}
                              aria-expanded={
                                threadPopoverContact?.candidateKey === contact.candidateKey
                              }
                              aria-haspopup="dialog"
                              onClick={(e) => handleThreadButtonClick(contact, e)}
                            >
                              <MaterialIcon name="forum" className="text-base" />
                              Thread
                            </button>
                            {contact.addedAt ? (
                              <span className="dashboard-campaign-emails-added">
                                Added {formatAddedAt(contact.addedAt)}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            {threadPopoverContact ? (
              <CampaignEmailThreadPopover
                open
                anchorRef={threadAnchorRef}
                onClose={closeThreadPopover}
                campaignId={campaign.id}
                candidateKey={threadPopoverContact.candidateKey}
                contactName={threadPopoverContact.name}
                contactEmail={threadPopoverContact.email}
                contactSubtitle={threadPopoverContact.subtitle}
                reloadToken={threadReloadByKey[threadPopoverContact.candidateKey] || 0}
              />
            ) : null}
          </div>
        ) : activeTab === "Phones" ? (
          <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col">
            <div className="dashboard-campaign-emails-toolbar shrink-0">
              <p className="dashboard-campaign-emails-summary">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"} in this campaign
              </p>
            </div>
            <div className="dashboard-campaign-emails-scroll flex min-h-0 flex-1 flex-col">
              {contactsLoading ? (
                <CampaignContactsSkeleton rows={6} />
              ) : contactsError && !contactsLoading ? (
                <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error py-12">
                  {contactsError}
                </p>
              ) : contacts.length === 0 ? (
                <div className="dashboard-campaign-workspace-placeholder-wrap">
                  <MaterialIcon name="phone" className="mb-2 text-4xl text-[#80868b]" />
                  <p className="dashboard-campaign-workspace-placeholder">
                    No contacts yet. Add candidates from Session Results — phones are revealed
                    automatically when you add to a campaign.
                  </p>
                </div>
              ) : (
                <ul className="dashboard-campaign-emails-list">
                  {[...contacts]
                    .sort(
                      (a, b) =>
                        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
                    )
                    .map((contact) => {
                      const subtitle = [contact.role, contact.company]
                        .filter(Boolean)
                        .join(" · ");
                      const phone = contact.phone.trim();
                      return (
                        <li key={contact.candidateKey} className="dashboard-campaign-emails-row">
                          <span className="dashboard-campaign-emails-avatar" aria-hidden>
                            {contactInitial(contact.name)}
                          </span>
                          <div className="dashboard-campaign-emails-main min-w-0 flex-1">
                            <p className="dashboard-campaign-emails-name">
                              {contact.name.trim() || "Unnamed contact"}
                            </p>
                            {subtitle ? (
                              <p className="dashboard-campaign-emails-meta">{subtitle}</p>
                            ) : null}
                            {phone ? (
                              <a href={`tel:${phone}`} className="dashboard-campaign-emails-address">
                                {phone}
                              </a>
                            ) : (
                              <p className="dashboard-campaign-emails-address dashboard-campaign-emails-address--empty">
                                {phoneEmptyLabel(contact, revealInProgress)}
                              </p>
                            )}
                          </div>
                          {contact.addedAt ? (
                            <span className="dashboard-campaign-emails-added">
                              Added {formatAddedAt(contact.addedAt)}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        ) : activeTab === "Contacts" ? (
          <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col">
            <div className="dashboard-campaign-emails-toolbar shrink-0">
              <p className="dashboard-campaign-emails-summary">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="dashboard-campaign-emails-scroll flex min-h-0 flex-1 flex-col">
              {contactsLoading ? (
                <CampaignContactsSkeleton rows={6} />
              ) : contacts.length === 0 ? (
                <div className="dashboard-campaign-workspace-placeholder-wrap">
                  <MaterialIcon name="group" className="mb-2 text-4xl text-[#80868b]" />
                  <p className="dashboard-campaign-workspace-placeholder">
                    No contacts in this campaign yet.
                  </p>
                </div>
              ) : (
                <ul className="dashboard-campaign-emails-list">
                  {[...contacts]
                    .sort(
                      (a, b) =>
                        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
                    )
                    .map((contact) => {
                      const subtitle = [contact.role, contact.company, contact.location]
                        .filter(Boolean)
                        .join(" · ");
                      const email = contact.email.trim();
                      const phone = contact.phone.trim();
                      return (
                        <li key={contact.candidateKey} className="dashboard-campaign-emails-row">
                          <span className="dashboard-campaign-emails-avatar" aria-hidden>
                            {contactInitial(contact.name)}
                          </span>
                          <div className="dashboard-campaign-emails-main min-w-0 flex-1">
                            <p className="dashboard-campaign-emails-name">
                              {contact.name.trim() || "Unnamed contact"}
                            </p>
                            {subtitle ? (
                              <p className="dashboard-campaign-emails-meta">{subtitle}</p>
                            ) : null}
                            {email ? (
                              <p className="dashboard-campaign-emails-meta">
                                <span className="font-medium text-[#5f6368]">Email: </span>
                                {email}
                              </p>
                            ) : null}
                            {phone ? (
                              <p className="dashboard-campaign-emails-meta">
                                <span className="font-medium text-[#5f6368]">Phone: </span>
                                {phone}
                              </p>
                            ) : null}
                            {!email && !phone && !subtitle ? (
                              <p className="dashboard-campaign-emails-meta dashboard-campaign-emails-address--empty">
                                No contact details
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        ) : COMING_SOON_TABS.has(activeTab) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <MaterialIcon name="construction" className="text-4xl text-slate-400" />
            <p className="dashboard-text-body max-w-sm">
              <span className="font-semibold text-[#141b2b]">{activeTab}</span> for this campaign
              is coming soon.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
