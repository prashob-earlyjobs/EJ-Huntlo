"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  OutreachSequencePicker,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/OutreachSequencePicker";
import { CampaignEmailReportPanel } from "@/components/dashboard/CampaignEmailReportPanel";
import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { CampaignWhatsAppCommunicationsPanel } from "@/components/dashboard/CampaignWhatsAppCommunicationsPanel";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { OutreachSequencePickerSkeleton } from "@/components/dashboard/OutreachSequencePickerSkeleton";
import { OutreachPlanEditor } from "@/components/dashboard/OutreachPlanEditor";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import { WhatsAppOutreachEditor } from "@/components/dashboard/WhatsAppOutreachEditor";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import type { CampaignContact, CampaignRecord } from "@/lib/campaigns";
import {
  getActiveCampaignRevealJob,
  pollCampaignRevealJob,
  startCampaignReveal,
} from "@/lib/campaignRevealJob";
import {
  addContactsToCampaignApi,
  fetchCampaign,
  fetchCampaignContactsPage,
  launchCampaignSequence,
  pauseCampaignSequence,
  removeContactFromCampaignApi,
  resumeCampaignSequence,
  setCampaignOutreachPlan,
  syncCampaignRevealedContacts,
} from "@/lib/campaignsApi";
import {
  type ContactEmailThreadResult,
  fetchContactEmailThread,
  syncCampaignReplies,
} from "@/lib/campaignEmailThread";
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
import {
  createInitialWhatsAppSequence,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
import {
  fetchWhatsAppOutreachPlan,
  type WhatsAppOutreachPlanRecord,
} from "@/lib/whatsappOutreachApi";

export type { CampaignWorkspaceTab };

const COMING_SOON_TABS = new Set<CampaignWorkspaceTab>(["Settings"]);
const CONTACTS_LIST_PAGE_SIZE = 15;
const EMAIL_LIST_PAGE_SIZE = 15;

type GmailEditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  lockSchedule: boolean;
};

type WhatsAppEditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: WhatsAppTouchpointDraft[];
};

type ActiveEditor =
  | { channel: "gmail"; state: GmailEditorState }
  | { channel: "whatsapp"; state: WhatsAppEditorState };

type Props = {
  campaign: CampaignRecord;
  workspaceTab: CampaignWorkspaceTab;
  onWorkspaceTabChange: (tab: CampaignWorkspaceTab) => void;
  onBack: () => void;
  onCampaignUpdated?: (campaign: CampaignRecord) => void;
  onGoToIntegrations?: () => void;
  onAddFromSearchHistory?: () => void;
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

function formatThreadTime(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const CSV_MANDATORY_HEADERS = [
  "name",
  "email",
  "phone",
  "role",
  "company",
  "location",
  "linkedinUrl",
] as const;

function parseCsvContacts(fileText: string): {
  contacts: CampaignContact[];
  errors: string[];
} {
  const rows = fileText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (rows.length < 2) {
    return {
      contacts: [],
      errors: ["CSV needs a header row and at least one contact row."],
    };
  }
  const rawHeaders = parseCsvLine(rows[0]);
  const headerMap = new Map<string, number>();
  rawHeaders.forEach((h, i) => headerMap.set(String(h || "").trim().toLowerCase(), i));

  const missingHeaders = CSV_MANDATORY_HEADERS.filter(
    (h) => !headerMap.has(h.toLowerCase())
  );
  const errors: string[] = [];
  if (missingHeaders.length > 0) {
    errors.push(`Missing mandatory headers: ${missingHeaders.join(", ")}`);
  }

  const now = new Date().toISOString();
  const contacts: CampaignContact[] = [];
  rows.slice(1).forEach((row, rowIx) => {
    const cols = parseCsvLine(row);
    const get = (key: string) => {
      const ix = headerMap.get(key.toLowerCase());
      return ix == null ? "" : String(cols[ix] || "").trim();
    };

    const name = get("name");
    const email = get("email");
    const phone = get("phone");
    const role = get("role");
    const company = get("company");
    const location = get("location");
    const linkedinUrl = get("linkedinurl");
    const lineNo = rowIx + 2;

    if (!name) {
      errors.push(`Row ${lineNo}: name is required.`);
      return;
    }
    if (!email && !phone) {
      errors.push(`Row ${lineNo}: either email or phone is required.`);
      return;
    }

    const identity = email || phone || name || `row-${rowIx + 1}`;
    contacts.push({
      candidateKey: `csv-${Date.now()}-${rowIx}-${identity.toLowerCase().replace(/\s+/g, "-")}`,
      candidateId: "",
      name,
      email,
      phone,
      role,
      company,
      location,
      linkedinUrl,
      sourcingSessionId: "",
      addedAt: now,
    });
  });

  return { contacts, errors };
}

export function CampaignWorkspace({
  campaign,
  workspaceTab: activeTab,
  onWorkspaceTabChange,
  onBack,
  onCampaignUpdated,
  onGoToIntegrations,
  onAddFromSearchHistory,
}: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const [starred, setStarred] = useState(false);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchNotice, setLaunchNotice] = useState("");
  const [launchError, setLaunchError] = useState("");
  const [selectedEmailContactKey, setSelectedEmailContactKey] = useState<string | null>(null);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState<
    "all" | "interested" | "not_interested" | "awaiting"
  >("all");
  const [emailListPage, setEmailListPage] = useState(1);
  const [emailListRows, setEmailListRows] = useState<CampaignContact[]>([]);
  const [emailListLoading, setEmailListLoading] = useState(false);
  const [emailListError, setEmailListError] = useState("");
  const [emailListTotal, setEmailListTotal] = useState(0);
  const [emailListTotalPages, setEmailListTotalPages] = useState(1);
  const [emailDispositionByKey, setEmailDispositionByKey] = useState<
    Record<string, "unknown" | "interested" | "not_interested">
  >({});
  const [emailThreadLoading, setEmailThreadLoading] = useState(false);
  const [emailThreadError, setEmailThreadError] = useState("");
  const [emailThreadData, setEmailThreadData] = useState<ContactEmailThreadResult | null>(null);
  const [syncThreadsBusy, setSyncThreadsBusy] = useState(false);
  const [syncThreadsNotice, setSyncThreadsNotice] = useState("");
  const [threadReloadByKey, setThreadReloadByKey] = useState<Record<string, number>>({});
  const [editorPhase, setEditorPhase] = useState<"choose" | "editing">("choose");
  const [editor, setEditor] = useState<ActiveEditor | null>(null);
  const [editorNotice, setEditorNotice] = useState("");
  const [saveToast, setSaveToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

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
  const [contactsListPage, setContactsListPage] = useState(1);
  const [contactsListRows, setContactsListRows] = useState<CampaignContact[]>([]);
  const [contactsListLoading, setContactsListLoading] = useState(false);
  const [contactsListError, setContactsListError] = useState("");
  const [contactsListTotal, setContactsListTotal] = useState(0);
  const [contactsListTotalPages, setContactsListTotalPages] = useState(1);
  const [removeContactBusyKey, setRemoveContactBusyKey] = useState("");
  const [openContactMenuKey, setOpenContactMenuKey] = useState("");
  const [removeContactConfirm, setRemoveContactConfirm] = useState<CampaignContact | null>(null);
  const [revealInProgress, setRevealInProgress] = useState(false);
  const [waCommsRefreshKey, setWaCommsRefreshKey] = useState(0);
  const [revealStarting, setRevealStarting] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvParsedContacts, setCsvParsedContacts] = useState<CampaignContact[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);

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
    setContactsListPage(1);
    setEmailListPage(1);
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
      activeTab === "Emails" || activeTab === "WhatsApp" || activeTab === "Contacts";
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

  const openGmailEditor = (state: GmailEditorState) => {
    setEditorNotice("");
    setEditor({ channel: "gmail", state });
    setEditorPhase("editing");
    setBypassLinkedPlan(false);
  };

  const openWhatsAppEditor = (state: WhatsAppEditorState) => {
    setEditorNotice("");
    setEditor({ channel: "whatsapp", state });
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
    const channel = campaign.outreachChannel === "whatsapp" ? "whatsapp" : "gmail";

    setLinkedPlanLoading(true);
    try {
      if (channel === "whatsapp") {
        const plan = await fetchWhatsAppOutreachPlan(auth.token, planId);
        openWhatsAppEditor({
          planId: plan.id,
          planName: plan.name || campaign.name,
          touchpoints:
            plan.touchpoints.length > 0
              ? plan.touchpoints.map((tp) => ({ ...tp }))
              : createInitialWhatsAppSequence(),
        });
      } else {
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
          openGmailEditor({
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
      }
    } catch {
      setEditorNotice("Could not load saved sequence.");
      setBypassLinkedPlan(true);
    } finally {
      setLinkedPlanLoading(false);
    }
  }, [apiBase, campaign.name, campaign.outreachPlanId, campaign.outreachChannel]);

  useEffect(() => {
    if (activeTab !== "Editor" || bypassLinkedPlan) return;
    if (!campaign.outreachPlanId?.trim()) return;
    if (
      editorPhase === "editing" &&
      editor?.state.planId === campaign.outreachPlanId
    ) {
      return;
    }
    void loadLinkedOutreachPlan();
  }, [
    activeTab,
    bypassLinkedPlan,
    campaign.id,
    campaign.outreachPlanId,
    campaign.outreachChannel,
    editor,
    editorPhase,
    loadLinkedOutreachPlan,
  ]);

  const handleWhatsAppPlanSaved = useCallback(
    async (
      _message: string,
      savedPlan?: { id: string; name: string; touchpoints: WhatsAppTouchpointDraft[] }
    ) => {
      if (!savedPlan?.id) return;

      setEditor({
        channel: "whatsapp",
        state: {
          planId: savedPlan.id,
          planName: savedPlan.name,
          touchpoints: savedPlan.touchpoints,
        },
      });
      setEditorPhase("editing");
      setBypassLinkedPlan(false);
      setEditorNotice("");
      setSaveToast({
        message: _message || "WhatsApp sequence saved.",
        variant: "success",
      });

      const auth = getStoredAuth();
      if (!auth?.token) return;
      try {
        const updated = await setCampaignOutreachPlan(
          auth.token,
          campaign.id,
          savedPlan.id,
          "whatsapp"
        );
        onCampaignUpdatedRef.current?.(updated);
      } catch {
        setSaveToast({
          message: "Sequence saved, but could not link to this campaign. Try saving again.",
          variant: "error",
        });
      }
    },
    [campaign.id]
  );

  const handleLaunchWhatsAppCampaign = useCallback(
    async (savedPlan: WhatsAppOutreachPlanRecord) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setSaveToast({ message: "Please sign in again.", variant: "error" });
        return;
      }
      try {
        const updated = await setCampaignOutreachPlan(
          auth.token,
          campaign.id,
          savedPlan.id,
          "whatsapp"
        );
        onCampaignUpdatedRef.current?.(updated);

        const launched = await launchCampaignSequence(auth.token, campaign.id);
        onCampaignUpdatedRef.current?.(launched.campaign);
        setLaunchNotice(
          launched.enrolled > 0
            ? `Sequence launched for ${launched.enrolled} contact${launched.enrolled === 1 ? "" : "s"}.`
            : "Launched, but no contacts had a phone number to enroll."
        );
        setLaunchError("");
      } catch (err) {
        setSaveToast({
          message: err instanceof Error ? err.message : "Failed to launch campaign.",
          variant: "error",
        });
        throw err;
      }
    },
    [campaign.id]
  );

  const handlePlanSaved = useCallback(
    async (
      _message: string,
      savedPlan?: { id: string; name: string; touchpoints: OutreachTouchpointDraft[] }
    ) => {
      if (!savedPlan?.id) return;

      setEditor({
        channel: "gmail",
        state: {
          planId: savedPlan.id,
          planName: savedPlan.name,
          touchpoints: savedPlan.touchpoints,
          lockSchedule: true,
        },
      });
      setEditorPhase("editing");
      setBypassLinkedPlan(false);
      setEditorNotice("");
      setSaveToast({
        message: _message || "Sequence saved.",
        variant: "success",
      });

      const auth = getStoredAuth();
      if (!auth?.token) return;
      try {
        const updated = await setCampaignOutreachPlan(
          auth.token,
          campaign.id,
          savedPlan.id,
          "gmail"
        );
        onCampaignUpdatedRef.current?.(updated);
      } catch {
        setSaveToast({
          message: "Sequence saved, but could not link to this campaign. Try saving again.",
          variant: "error",
        });
      }
    },
    [campaign.id]
  );

  const outreachStatus = campaign.outreachStatus ?? "idle";
  const hasLinkedPlan = Boolean(campaign.outreachPlanId?.trim());
  const channelLocked = hasLinkedPlan || Boolean(editor?.channel);
  const effectiveChannel: "gmail" | "whatsapp" | null =
    editor?.channel ||
    (campaign.outreachChannel === "whatsapp"
      ? "whatsapp"
      : campaign.outreachChannel === "gmail"
        ? "gmail"
        : null);
  const allowedPickerChannels: ("gmail" | "whatsapp")[] =
    channelLocked && effectiveChannel ? [effectiveChannel] : ["gmail", "whatsapp"];
  const visibleWorkspaceTabs = CAMPAIGN_WORKSPACE_TABS.filter((tab) => {
    if (!channelLocked || !effectiveChannel) return true;
    if (effectiveChannel === "gmail") return tab !== "WhatsApp";
    return tab !== "Emails";
  });
  const hasSequence = Boolean(campaign.outreachPlanId?.trim());
  const hasContacts = contacts.length > 0;

  useEffect(() => {
    if (!visibleWorkspaceTabs.includes(activeTab)) {
      onWorkspaceTabChange("Editor");
    }
  }, [activeTab, onWorkspaceTabChange, visibleWorkspaceTabs]);

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

  const loadContactsListPage = useCallback(
    async (page: number) => {
      const auth = getStoredAuth();
      if (!auth?.token) return;
      setContactsListLoading(true);
      setContactsListError("");
      try {
        const result = await fetchCampaignContactsPage(auth.token, campaign.id, {
          page,
          limit: CONTACTS_LIST_PAGE_SIZE,
        });
        setContactsListRows(result.contacts);
        setContactsListPage(result.pagination.page);
        setContactsListTotal(result.pagination.total);
        setContactsListTotalPages(Math.max(1, result.pagination.totalPages));
      } catch (err) {
        setContactsListError(
          err instanceof Error ? err.message : "Could not load paginated contacts."
        );
      } finally {
        setContactsListLoading(false);
      }
    },
    [campaign.id]
  );

  const handleRemoveContactFromCampaign = useCallback(
    async (contact: CampaignContact) => {
      const auth = getStoredAuth();
      if (!auth?.token) return;
      const key = String(contact.candidateKey || "").trim();
      if (!key || removeContactBusyKey) return;
      setRemoveContactBusyKey(key);
      try {
        const result = await removeContactFromCampaignApi(auth.token, campaign.id, key);
        onCampaignUpdatedRef.current?.(result.campaign);
        setContacts(result.campaign.contacts);
        if (activeTab === "Contacts") {
          void loadContactsListPage(contactsListPage);
        }
        setSaveToast({
          message:
            result.removed > 0
              ? `Removed ${contact.name.trim() || "contact"} from campaign.`
              : "Contact was not found in this campaign.",
          variant: result.removed > 0 ? "success" : "error",
        });
        setRemoveContactConfirm(null);
        setOpenContactMenuKey("");
      } catch (err) {
        setSaveToast({
          message: err instanceof Error ? err.message : "Could not remove contact from campaign.",
          variant: "error",
        });
      } finally {
        setRemoveContactBusyKey("");
      }
    },
    [activeTab, campaign.id, contactsListPage, loadContactsListPage, removeContactBusyKey]
  );

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

  const importParsedCsvContacts = useCallback(
    async (contactsToImport: CampaignContact[]) => {
      const auth = getStoredAuth();
      if (!auth?.token || contactsToImport.length === 0) return;
      setCsvImportBusy(true);
      try {
        const result = await addContactsToCampaignApi(auth.token, campaign.id, contactsToImport, {
          revealInBackground: true,
        });
        onCampaignUpdatedRef.current?.(result.campaign);
        setContacts(result.campaign.contacts);
        setCsvModalOpen(false);
        setCsvFileName("");
        setCsvParsedContacts([]);
        setCsvValidationErrors([]);
        setSaveToast({
          message: `Imported ${result.addedCount} contact${result.addedCount === 1 ? "" : "s"} from CSV.`,
          variant: "success",
        });
        if (activeTab === "Contacts") {
          setContactsListPage(1);
          void loadContactsListPage(1);
        }
      } catch (err) {
        setSaveToast({
          message: err instanceof Error ? err.message : "Could not import contacts from CSV.",
          variant: "error",
        });
      } finally {
        setCsvImportBusy(false);
      }
    },
    [activeTab, campaign.id, loadContactsListPage]
  );

  const handleCsvFileSelected = useCallback(async (file: File) => {
    if (!file) return;
    const raw = await file.text();
    const { contacts: parsed, errors } = parseCsvContacts(raw);
    setCsvFileName(file.name);
    setCsvParsedContacts(parsed);
    setCsvValidationErrors(errors);
  }, []);

  const downloadSampleCsv = useCallback(() => {
    const sample = [
      CSV_MANDATORY_HEADERS.join(","),
      'John Doe,john@example.com,+919999999999,Software Engineer,Acme,Bangalore,https://www.linkedin.com/in/johndoe',
      'Jane Smith,jane@example.com,,Product Manager,Globex,Mumbai,https://www.linkedin.com/in/janesmith',
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign_contacts_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleRealtimeThreadUpdate = useCallback(
    (payload: {
      candidateKey: string;
      hasNewCandidateReply: boolean;
      newMessages: number;
      source?: string;
    }) => {
      const isWhatsApp =
        payload.source === "whatsapp_reply" || payload.source === "whatsapp_send";
      if (isWhatsApp) {
        setWaCommsRefreshKey((k) => k + 1);
        if (payload.hasNewCandidateReply) {
          setSyncThreadsNotice("New WhatsApp reply — you can reply within 24 hours.");
        }
        return;
      }

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

  useCampaignThreadRealtime(
    campaign.id,
    handleRealtimeThreadUpdate,
    activeTab === "Emails" || activeTab === "WhatsApp"
  );

  useEffect(() => {
    if (activeTab !== "Contacts") return;
    void loadContactsListPage(contactsListPage);
  }, [activeTab, contactsListPage, loadContactsListPage, contactsFromPropsKey]);

  useEffect(() => {
    if (activeTab !== "Emails") return;
    const hasSelected =
      selectedEmailContactKey &&
      emailListRows.some((c) => c.candidateKey === selectedEmailContactKey);
    if (hasSelected) return;
    setSelectedEmailContactKey(emailListRows[0]?.candidateKey ?? null);
  }, [activeTab, emailListRows, selectedEmailContactKey]);

  const selectedEmailContact = useMemo(
    () => emailListRows.find((c) => c.candidateKey === selectedEmailContactKey) ?? null,
    [emailListRows, selectedEmailContactKey]
  );

  const loadEmailListPage = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    setEmailListLoading(true);
    setEmailListError("");
    try {
      const result = await fetchCampaignContactsPage(auth.token, campaign.id, {
        page: emailListPage,
        limit: EMAIL_LIST_PAGE_SIZE,
        search: emailSearch,
        disposition: emailFilter,
      });
      setEmailListRows(result.contacts);
      setEmailListTotal(result.pagination.total);
      setEmailListTotalPages(Math.max(1, result.pagination.totalPages));
      setEmailDispositionByKey((prev) => ({
        ...prev,
        ...result.dispositionByCandidateKey,
      }));
      if (emailListPage > result.pagination.totalPages) {
        setEmailListPage(Math.max(1, result.pagination.totalPages));
      }
    } catch (err) {
      setEmailListError(err instanceof Error ? err.message : "Could not load email contacts.");
      setEmailListRows([]);
      setEmailListTotal(0);
      setEmailListTotalPages(1);
    } finally {
      setEmailListLoading(false);
    }
  }, [campaign.id, emailFilter, emailListPage, emailSearch]);

  const buildCompactPageItems = useCallback((currentPage: number, totalPages: number) => {
    const total = Math.max(1, totalPages);
    const current = Math.min(total, Math.max(1, currentPage));
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 2) return [1, 2, 3, "dots-right", total] as Array<number | string>;
    if (current >= total - 1) {
      return [1, "dots-left", total - 2, total - 1, total] as Array<number | string>;
    }
    const items: Array<number | string> = [1];
    if (current - 1 > 2) items.push("dots-left");
    items.push(current - 1, current, current + 1);
    if (current + 1 < total - 1) items.push("dots-right");
    items.push(total);
    return items;
  }, []);

  const emailListPageItems = useMemo(
    () => buildCompactPageItems(emailListPage, emailListTotalPages),
    [buildCompactPageItems, emailListPage, emailListTotalPages]
  );

  useEffect(() => {
    setEmailListPage(1);
  }, [emailSearch, emailFilter, contactsFromPropsKey, campaign.id]);

  useEffect(() => {
    if (activeTab !== "Emails") return;
    void loadEmailListPage();
  }, [activeTab, loadEmailListPage]);

  const contactsListPageItems = useMemo(
    () => buildCompactPageItems(contactsListPage, contactsListTotalPages),
    [buildCompactPageItems, contactsListPage, contactsListTotalPages]
  );

  const loadSelectedEmailThread = useCallback(
    async (sync: boolean) => {
      const auth = getStoredAuth();
      if (!auth?.token || !selectedEmailContact) return;
      setEmailThreadLoading(true);
      setEmailThreadError("");
      try {
        const result = await fetchContactEmailThread(
          auth.token,
          campaign.id,
          selectedEmailContact.candidateKey,
          { sync }
        );
        setEmailThreadData(result);
        setEmailDispositionByKey((prev) => ({
          ...prev,
          [selectedEmailContact.candidateKey]:
            result.replyDisposition === "interested" ||
            result.replyDisposition === "not_interested"
              ? result.replyDisposition
              : "unknown",
        }));
      } catch (err) {
        setEmailThreadError(
          err instanceof Error ? err.message : "Could not load email thread."
        );
        setEmailThreadData(null);
      } finally {
        setEmailThreadLoading(false);
      }
    },
    [campaign.id, selectedEmailContact]
  );

  useEffect(() => {
    if (activeTab !== "Emails" || !selectedEmailContact) return;
    setEmailThreadData(null);
    void loadSelectedEmailThread(true);
  }, [
    activeTab,
    selectedEmailContact,
    loadSelectedEmailThread,
    threadReloadByKey[selectedEmailContact?.candidateKey ?? ""],
  ]);

  useEffect(() => {
    if (activeTab !== "Emails") {
      setEmailThreadData(null);
      setEmailThreadError("");
    }
  }, [activeTab]);

  const handleSequenceChoice = async (choice: CreateOutreachChoice) => {
    if (choice.type === "scratch") {
        if (choice.channel === "whatsapp") {
        openWhatsAppEditor({
          planId: "new",
          planName: campaign.name,
          touchpoints: createInitialWhatsAppSequence(),
        });
      } else {
        openGmailEditor({
          planId: "new",
          planName: campaign.name,
          touchpoints: [createEmptyTouchpoint(1)],
          lockSchedule: false,
        });
      }
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
      openGmailEditor({
        planId: "new",
        planName: campaign.name,
        touchpoints: tpl.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: true,
      });
      return;
    }

    if (choice.type === "ai") {
      openGmailEditor({
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
          openGmailEditor({
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

  const openCsvModal = useCallback(() => {
    setCsvModalOpen(true);
    setCsvFileName("");
    setCsvParsedContacts([]);
    setCsvValidationErrors([]);
  }, []);

  const closeCsvModal = useCallback(() => {
    if (csvImportBusy) return;
    setCsvModalOpen(false);
    setCsvFileName("");
    setCsvParsedContacts([]);
    setCsvValidationErrors([]);
  }, [csvImportBusy]);

  const handleRemoveCandidate = useCallback(
    async (candidateKey: string) => {
      if (outreachStatus !== "idle") return;
      const auth = getStoredAuth();
      if (!auth?.token) {
        setSaveToast({ message: "Please sign in again.", variant: "error" });
        return;
      }
      try {
        const result = await removeContactFromCampaignApi(auth.token, campaign.id, candidateKey);
        onCampaignUpdatedRef.current?.(result.campaign);
        setContacts(result.campaign.contacts);
        setWaCommsRefreshKey((k) => k + 1);
        setSaveToast({
          message: result.removed ? "Candidate removed from campaign." : "Candidate not found.",
          variant: result.removed ? "success" : "error",
        });
      } catch (err) {
        setSaveToast({
          message: err instanceof Error ? err.message : "Could not remove candidate.",
          variant: "error",
        });
      }
    },
    [campaign.id, outreachStatus]
  );

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
                disabled={launchBusy || !hasSequence || !hasContacts}
                title={
                  launchBusy
                    ? "Launching…"
                    : !hasSequence
                      ? "Save a sequence on the Editor tab first"
                      : !hasContacts
                        ? "Add contacts to this campaign first"
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
          {visibleWorkspaceTabs.map((tab) => {
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
          editorPhase === "editing" && editor?.channel === "gmail" ? (
            <OutreachPlanEditor
              embedded
              planId={editor.state.planId}
              initialPlanName={editor.state.planName}
              initialTouchpoints={editor.state.touchpoints}
              lockSchedule={editor.state.lockSchedule}
              onCancel={backToSequenceChoose}
              onGoToIntegrations={onGoToIntegrations}
              onSaved={(message, saved) => void handlePlanSaved(message, saved)}
            />
          ) : editorPhase === "editing" && editor?.channel === "whatsapp" ? (
            <WhatsAppOutreachEditor
              embedded
              planId={editor.state.planId}
              initialPlanName={editor.state.planName}
              initialTouchpoints={editor.state.touchpoints}
              onCancel={backToSequenceChoose}
              onGoToIntegrations={onGoToIntegrations}
              onSaved={(message, saved) => void handleWhatsAppPlanSaved(message, saved)}
              onLaunchCampaign={(saved) => handleLaunchWhatsAppCampaign(saved)}
              onPauseCampaign={() => handlePauseSequence()}
              onResumeCampaign={() => handleResumeSequence()}
              campaignOutreachStatus={outreachStatus}
              hasCampaignContacts={hasContacts}
              onLaunchComplete={() => {
                onWorkspaceTabChange("WhatsApp");
                setWaCommsRefreshKey((k) => k + 1);
              }}
            />
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
                  allowedChannels={allowedPickerChannels}
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
            {emailListTotal > 0 ? (
              <div className="dashboard-campaign-wa-comms-toolbar shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <IntegrationBrandLogo provider="gmail" title="Gmail" className="h-4 w-4" />
                    <p className="dashboard-campaign-wa-comms-summary">
                      {emailListTotal} conversation{emailListTotal === 1 ? "" : "s"}
                    </p>
                  </div>
                  {outreachStatus === "active" ? (
                    <span className="dashboard-campaign-wa-comms-preview-pill dashboard-campaign-wa-comms-live-pill">
                      Sequence active
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-55"
                    disabled={syncThreadsBusy}
                    onClick={() => void handleSyncAllThreads()}
                  >
                    <MaterialIcon name="refresh" className="text-base" />
                    {syncThreadsBusy ? "Syncing…" : "Refresh"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="dashboard-campaign-wa-comms-search relative min-w-48 flex-1">
                    <MaterialIcon
                      name="search"
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-slate-400"
                    />
                    <input
                      type="search"
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                      placeholder="Search by name, email, company…"
                      className="dashboard-campaign-wa-comms-search-input w-full"
                    />
                  </label>
                  <div
                    className="dashboard-campaign-wa-comms-filters"
                    role="tablist"
                    aria-label="Filter emails"
                  >
                    {[
                      ["all", "All"],
                      ["interested", "Interested"],
                      ["not_interested", "Not Interested"],
                      ["awaiting", "Awaiting Reply"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={emailFilter === key}
                        className={`dashboard-campaign-wa-comms-filter${
                          emailFilter === key ? " dashboard-campaign-wa-comms-filter--active" : ""
                        }`}
                        onClick={() =>
                          setEmailFilter(
                            key as "all" | "interested" | "not_interested" | "awaiting"
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {emailListTotal > 0 && syncThreadsNotice ? (
              <p className="dashboard-alert-notice mx-3 mb-0 mt-2 shrink-0 text-sm" role="status">
                {syncThreadsNotice}
              </p>
            ) : null}
            <div className="dashboard-campaign-wa-comms-layout flex min-h-0 flex-1">
              {emailListLoading ? (
                <>
                  <div className="dashboard-campaign-wa-comms-list border-r border-slate-200 p-4">
                    <CampaignContactsSkeleton rows={8} />
                  </div>
                  <div className="dashboard-campaign-wa-comms-thread hidden flex-1 p-6 md:flex md:items-center md:justify-center">
                    <p className="dashboard-text-body text-sm text-slate-500">Loading email threads…</p>
                  </div>
                </>
              ) : emailListError && !emailListLoading ? (
                <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error py-12">
                  {emailListError}
                </p>
              ) : emailListTotal === 0 ? (
                <div className="dashboard-campaign-workspace-placeholder-wrap">
                  <IntegrationBrandLogo provider="gmail" title="Gmail" className="mb-2 h-10 w-10" />
                  <p className="dashboard-campaign-workspace-placeholder">
                    No contacts yet. Add candidates from{" "}
                    <span className="font-medium text-[#202124]">Session Results</span> using{" "}
                    <span className="font-medium text-[#202124]">Add to campaign</span>.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      className={`${dashboardBtnPrimaryClass} px-3 py-1.5 text-sm`}
                      onClick={onAddFromSearchHistory}
                    >
                      <MaterialIcon name="history" className="text-base" />
                      Add candidate from search history
                    </button>
                    <button
                      type="button"
                      className={`${dashboardBtnSecondaryClass} px-3 py-1.5 text-sm`}
                      onClick={openCsvModal}
                    >
                      <MaterialIcon name="upload_file" className="text-base" />
                      Upload CSV
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <aside className="dashboard-campaign-wa-comms-list flex min-h-0 w-full min-w-0 flex-col border-slate-200 md:w-[min(100%,360px)] md:max-w-[40%] md:border-r">
                    <ul className="dashboard-campaign-emails-list min-h-0 flex-1 overflow-y-auto">
                      {emailListRows.map((contact) => {
                          const subtitle = [contact.role, contact.company]
                            .filter(Boolean)
                            .join(" · ");
                          const email = contact.email.trim();
                          const active = selectedEmailContactKey === contact.candidateKey;
                          return (
                            <li
                              key={contact.candidateKey}
                              className={`dashboard-campaign-emails-row cursor-pointer transition hover:bg-slate-50 ${
                                active ? "dashboard-campaign-emails-row--active" : ""
                              }`}
                              onClick={() => {
                                setSelectedEmailContactKey(contact.candidateKey);
                                setSyncThreadsNotice("");
                              }}
                            >
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
                                  <p className="dashboard-campaign-emails-address">{email}</p>
                                ) : (
                                  <p className="dashboard-campaign-emails-address dashboard-campaign-emails-address--empty">
                                    {emailEmptyLabel(contact, revealInProgress)}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      {emailListRows.length === 0 ? (
                        <li className="px-4 py-10 text-center text-sm text-slate-500">
                          No contacts match your filters.
                        </li>
                      ) : null}
                    </ul>
                    {emailListTotal > 0 && emailListTotalPages > 1 ? (
                      <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={emailListPage <= 1}
                            onClick={() => setEmailListPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </button>
                          {emailListPageItems.map((item, index) => {
                            if (typeof item !== "number") {
                              return (
                                <span
                                  key={`${item}-${index}`}
                                  className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-xs font-medium text-slate-400"
                                  aria-hidden
                                >
                                  ...
                                </span>
                              );
                            }
                            const active = item === emailListPage;
                            return (
                              <button
                                key={item}
                                type="button"
                                className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-medium transition ${
                                  active
                                    ? "border-[#0050cb] bg-[#eef4ff] text-[#0050cb]"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                                onClick={() => setEmailListPage(item)}
                                aria-current={active ? "page" : undefined}
                              >
                                {item}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={emailListPage >= emailListTotalPages}
                            onClick={() => setEmailListPage((p) => Math.min(emailListTotalPages, p + 1))}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </aside>
                  <div className="dashboard-campaign-wa-comms-thread min-h-0 min-w-0 flex-1 flex-col bg-[#f3f6fb] flex">
                    {!selectedEmailContact ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                        <MaterialIcon name="forum" className="text-4xl text-slate-400" />
                        <p className="text-sm text-slate-600">Select a contact to view the thread</p>
                      </div>
                    ) : (
                      <>
                        <header className="dashboard-campaign-wa-comms-thread-head shrink-0 bg-white">
                          <span className="dashboard-campaign-wa-comms-thread-avatar" aria-hidden>
                            {contactInitial(selectedEmailContact.name)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="dashboard-campaign-wa-comms-thread-name truncate">
                              {selectedEmailContact.name.trim() || "Unnamed contact"}
                            </p>
                            <p className="dashboard-campaign-wa-comms-thread-meta truncate">
                              {selectedEmailContact.email.trim() || "No email on file"}
                              {selectedEmailContact.role || selectedEmailContact.company
                                ? ` · ${[selectedEmailContact.role, selectedEmailContact.company]
                                    .filter(Boolean)
                                    .join(" · ")}`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            className={`${dashboardBtnSecondaryClass} px-2 py-1 text-xs disabled:opacity-55`}
                            disabled={emailThreadLoading}
                            onClick={() => void loadSelectedEmailThread(true)}
                          >
                            {emailThreadLoading ? "Refreshing…" : "Refresh"}
                          </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                          {emailThreadLoading && !emailThreadData ? (
                            <div className="dashboard-campaign-thread-loading px-2 py-6" aria-busy="true">
                              <span className="dashboard-reveal-spinner" aria-hidden />
                              Loading…
                            </div>
                          ) : emailThreadError ? (
                            <p className="dashboard-campaign-thread-empty dashboard-campaign-thread-empty--error px-2 py-4">
                              {emailThreadError}
                            </p>
                          ) : !emailThreadData?.hasEnrollment ? (
                            <div className="flex min-h-full items-center justify-center px-2 py-4">
                              <p className="dashboard-campaign-thread-empty text-center">
                                Launch the campaign sequence to start a Gmail thread.
                              </p>
                            </div>
                          ) : emailThreadData.sentCount === 0 ? (
                            <p className="dashboard-campaign-thread-empty px-2 py-4">
                              No email sent yet. Wait ~1 minute or refresh.
                            </p>
                          ) : emailThreadData.messages.length === 0 ? (
                            <p className="dashboard-campaign-thread-empty px-2 py-4">
                              No messages yet. Refresh from Gmail.
                            </p>
                          ) : (
                            <div className="dashboard-campaign-thread-messages">
                              {emailThreadData.messages.map((msg) => (
                                <article
                                  key={msg.id}
                                  className={`dashboard-campaign-thread-msg ${
                                    msg.isFromCandidate
                                      ? "dashboard-campaign-thread-msg--inbound"
                                      : "dashboard-campaign-thread-msg--outbound"
                                  }`}
                                >
                                  <header className="dashboard-campaign-thread-msg-head">
                                    <span className="dashboard-campaign-thread-msg-from">
                                      {msg.isFromCandidate
                                        ? selectedEmailContact.name.trim() || "Contact"
                                        : "You"}
                                    </span>
                                    <time
                                      className="dashboard-campaign-thread-msg-time"
                                      dateTime={msg.receivedAt}
                                    >
                                      {formatThreadTime(msg.receivedAt)}
                                    </time>
                                  </header>
                                  {msg.subject ? (
                                    <p className="dashboard-campaign-thread-msg-subject">{msg.subject}</p>
                                  ) : null}
                                  <p className="dashboard-campaign-thread-msg-body">
                                    {msg.bodyText.trim() || msg.snippet.trim() || "(No message body)"}
                                  </p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : activeTab === "WhatsApp" ? (
          <CampaignWhatsAppCommunicationsPanel
            campaignId={campaign.id}
            refreshKey={waCommsRefreshKey}
            revealInProgress={revealInProgress}
            onAddFromSearchHistory={onAddFromSearchHistory}
            onUploadCsv={openCsvModal}
            onRemoveCandidate={(candidateKey) => void handleRemoveCandidate(candidateKey)}
          />
        ) : activeTab === "Report" ? (
          <CampaignEmailReportPanel campaignId={campaign.id} variant="report" />
        ) : activeTab === "Activity" ? (
          <CampaignEmailReportPanel campaignId={campaign.id} variant="activity" />
        ) : activeTab === "Contacts" ? (
          <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col">
            <div className="dashboard-campaign-emails-toolbar shrink-0 flex flex-wrap items-center justify-between gap-2">
              <p className="dashboard-campaign-emails-summary">
                {contactsListTotal} contact{contactsListTotal === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`${dashboardBtnSecondaryClass} cursor-pointer px-2.5 py-1 text-xs`}
                  onClick={() => {
                    window.location.href = "/dashboard/search/history";
                  }}
                >
                  Add Candidates
                </button>
                <button
                  type="button"
                  className={`${dashboardBtnSecondaryClass} cursor-pointer px-2.5 py-1 text-xs disabled:opacity-55`}
                  disabled={csvImportBusy}
                  onClick={() => setCsvModalOpen(true)}
                >
                  {csvImportBusy ? "Importing…" : "Import CSV"}
                </button>
              </div>
            </div>
            <div className="dashboard-campaign-emails-scroll flex min-h-0 flex-1 flex-col">
              {contactsListLoading ? (
                <CampaignContactsSkeleton rows={6} />
              ) : contactsListError ? (
                <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error py-12">
                  {contactsListError}
                </p>
              ) : contactsListRows.length === 0 ? (
                <div className="dashboard-campaign-workspace-placeholder-wrap">
                  <MaterialIcon name="group" className="mb-2 block text-4xl text-[#80868b]" />
                  <p className="dashboard-campaign-workspace-placeholder">
                    No contacts in this campaign yet.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      className={`${dashboardBtnPrimaryClass} px-3 py-1.5 text-sm`}
                      onClick={onAddFromSearchHistory}
                    >
                      <MaterialIcon name="history" className="text-base" />
                      Add candidate from search history
                    </button>
                    <button
                      type="button"
                      className={`${dashboardBtnSecondaryClass} px-3 py-1.5 text-sm`}
                      onClick={openCsvModal}
                    >
                      <MaterialIcon name="upload_file" className="text-base" />
                      Upload CSV
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="dashboard-campaign-emails-list">
                  {contactsListRows.map((contact) => {
                      const subtitle = [contact.role, contact.company, contact.location]
                        .filter(Boolean)
                        .join(" · ");
                      const email = contact.email.trim();
                      const phone = contact.phone.trim();
                      return (
                        <li key={contact.candidateKey} className="dashboard-campaign-emails-row group">
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
                          <div className="relative">
                            <button
                              type="button"
                              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                                openContactMenuKey === contact.candidateKey
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              }`}
                              disabled={removeContactBusyKey === contact.candidateKey}
                              onClick={() =>
                                setOpenContactMenuKey((prev) =>
                                  prev === contact.candidateKey ? "" : contact.candidateKey
                                )
                              }
                              aria-label={`Open actions for ${contact.name.trim() || "contact"}`}
                              title="Contact actions"
                            >
                              <MaterialIcon name="more_vert" className="text-base" />
                            </button>
                            {openContactMenuKey === contact.candidateKey ? (
                              <div className="absolute right-0 top-9 z-20 min-w-32 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
                                <button
                                  type="button"
                                  className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
                                  disabled={removeContactBusyKey === contact.candidateKey}
                                  onClick={() => {
                                    setOpenContactMenuKey("");
                                    setRemoveContactConfirm(contact);
                                  }}
                                >
                                  <MaterialIcon name="delete" className="text-sm" />
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            {contactsListTotalPages > 1 ? (
              <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={contactsListPage <= 1 || contactsListLoading}
                    onClick={() => setContactsListPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  {contactsListPageItems.map((item) => {
                    if (typeof item !== "number") {
                      return (
                        <span
                          key={item}
                          className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-xs font-medium text-slate-400"
                          aria-hidden
                        >
                          ...
                        </span>
                      );
                    }
                    const active = item === contactsListPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border px-2 text-xs font-medium transition ${
                          active
                            ? "border-[#0050cb] bg-[#eef4ff] text-[#0050cb]"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        disabled={contactsListLoading}
                        onClick={() => setContactsListPage(item)}
                        aria-current={active ? "page" : undefined}
                      >
                        {item}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={contactsListPage >= contactsListTotalPages || contactsListLoading}
                    onClick={() =>
                      setContactsListPage((p) => Math.min(contactsListTotalPages, p + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
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

      {saveToast ? (
        <DashboardToast
          message={saveToast.message}
          variant={saveToast.variant}
          onDismiss={() => setSaveToast(null)}
        />
      ) : null}
      {removeContactConfirm
        ? createPortal(
            <div
              className="dashboard-modal-overlay z-130 py-6"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget && !removeContactBusyKey) {
                  setRemoveContactConfirm(null);
                }
              }}
            >
              <div
                className="dashboard-modal mx-auto flex w-full max-w-md flex-col overflow-hidden p-0"
                role="dialog"
                aria-modal="true"
                aria-labelledby="remove-campaign-contact-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                    aria-hidden
                  >
                    <MaterialIcon name="delete" className="text-xl" />
                  </span>
                  <div className="min-w-0">
                    <h3 id="remove-campaign-contact-title" className="dashboard-section-title text-base">
                      Remove contact from campaign?
                    </h3>
                    <p className="dashboard-text-body mt-2 text-sm text-slate-600">
                      {`This will remove ${
                        removeContactConfirm.name.trim() || "this contact"
                      } from this campaign.`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={Boolean(removeContactBusyKey)}
                    onClick={() => setRemoveContactConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-red-600 bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={Boolean(removeContactBusyKey)}
                    onClick={() => void handleRemoveContactFromCampaign(removeContactConfirm)}
                  >
                    {removeContactBusyKey ? "Deleting..." : "Delete contact"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {csvModalOpen
        ? createPortal(
            <div className="dashboard-modal-overlay" role="dialog" aria-modal="true">
              <div
                className="dashboard-confirm-modal-backdrop cursor-pointer"
                onClick={() => setCsvModalOpen(false)}
              />
              <div className="dashboard-modal dashboard-confirm-modal-panel max-w-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <h3 className="dashboard-confirm-modal-title">Import contacts from CSV</h3>
                  <button
                    type="button"
                    className="dashboard-confirm-modal-close cursor-pointer"
                    onClick={() => setCsvModalOpen(false)}
                    aria-label="Close"
                  >
                    <MaterialIcon name="close" className="dashboard-confirm-modal-icon-symbol" />
                  </button>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm">
                  <p className="text-slate-600">
                    Mandatory headers: <strong>{CSV_MANDATORY_HEADERS.join(", ")}</strong>
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#0050cb] bg-white px-3 text-xs font-medium text-[#0050cb] transition hover:bg-[#eef4ff]"
                      onClick={() => csvFileInputRef.current?.click()}
                    >
                      <MaterialIcon name="upload_file" className="text-sm" />
                      Select CSV
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      onClick={downloadSampleCsv}
                      title="Download sample CSV"
                      aria-label="Download sample CSV"
                    >
                      <MaterialIcon name="download" className="text-sm" />
                      Sample CSV
                    </button>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleCsvFileSelected(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {csvFileName ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Selected: {csvFileName}
                    </p>
                  ) : null}
                  {csvValidationErrors.length > 0 ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="mb-1 font-medium text-red-700">Please fix these errors:</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-red-700">
                        {csvValidationErrors.map((err, i) => (
                          <li key={`${err}-${i}`}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : csvFileName ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                      CSV validated. {csvParsedContacts.length} contact
                      {csvParsedContacts.length === 1 ? "" : "s"} ready to import.
                    </div>
                  ) : null}
                </div>
                <div className="dashboard-confirm-modal-footer">
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setCsvModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-[#0050cb] bg-[#0050cb] px-3 text-sm font-medium text-white transition hover:bg-[#003d99] disabled:opacity-55"
                    disabled={
                      csvImportBusy ||
                      csvParsedContacts.length === 0 ||
                      csvValidationErrors.length > 0
                    }
                    onClick={() => void importParsedCsvContacts(csvParsedContacts)}
                  >
                    {csvImportBusy ? "Importing…" : "Import contacts"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
