"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  OutreachSequencePicker,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/OutreachSequencePicker";
import { CampaignEmailReportPanel } from "@/components/dashboard/CampaignEmailReportPanel";
import { CampaignJobDescriptionPanel } from "@/components/dashboard/CampaignJobDescriptionPanel";
import { CampaignVoiceAgentEditor } from "@/components/dashboard/CampaignVoiceAgentEditor";
import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { CampaignPreLaunchContactsPanel } from "@/components/dashboard/CampaignPreLaunchContactsPanel";
import { CampaignVoiceCallsPanel } from "@/components/dashboard/CampaignVoiceCallsPanel";
import { CampaignWhatsAppCommunicationsPanel } from "@/components/dashboard/CampaignWhatsAppCommunicationsPanel";
import { CampaignWorkspaceEmptyState } from "@/components/dashboard/CampaignWorkspaceEmptyState";
import { ImportCampaignContactsCsvModal } from "@/components/dashboard/ImportCampaignContactsCsvModal";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { OutreachSequencePickerSkeleton } from "@/components/dashboard/OutreachSequencePickerSkeleton";
import { OutreachPlanEditor } from "@/components/dashboard/OutreachPlanEditor";
import { ConfirmModal } from "@/components/dashboard/ConfirmModal";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import {
  CAMPAIGN_CONTACTS_LOCKED_MESSAGE,
  isCampaignLaunched,
  validateCampaignContactBatch,
} from "@/lib/campaignContactLimits";
import { WhatsAppOutreachEditor } from "@/components/dashboard/WhatsAppOutreachEditor";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { quotaAlertFromMessage } from "@/lib/apiErrors";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import type { CampaignContact, CampaignRecord } from "@/lib/campaigns";
import {
  buildSampleCampaignContactsCsv,
  CSV_MANDATORY_HEADERS,
  parseCsvContacts,
} from "@/lib/campaignCsvImport";
import type { ReportMetricKey } from "@/lib/campaignEmailReport";
import {
  addContactsToCampaignApi,
  fetchCampaign,
  fetchCampaignContactsPage,
  CampaignLaunchBlockedError,
  launchCampaignSequence,
  launchVoiceCampaign,
  pauseCampaignSequence,
  removeContactFromCampaignApi,
  resumeCampaignSequence,
  saveCampaignVoiceAgent,
  setCampaignOutreachPlan,
  syncCampaignRevealedContacts,
  updateCampaignCalendlyAutomation,
  updateCampaignJobDescription,
} from "@/lib/campaignsApi";
import {
  type ContactEmailThreadResult,
  fetchContactEmailThread,
  syncCampaignReplies,
} from "@/lib/campaignEmailThread";
import { useCampaignThreadRealtime } from "@/lib/realtime/useCampaignThreadRealtime";
import { useCampaignRevealJob } from "@/lib/useCampaignRevealJob";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
} from "@/lib/dashboardStyles";
import {
  campaignWorkspaceTabLabel,
  campaignWorkspaceTabShortLabel,
  getVisibleCampaignWorkspaceTabs,
  inferShowJobDescriptionTab,
  normalizeCampaignWorkspaceTab,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";
import {
  createEmptyTouchpoint,
  type OutreachTemplateListItem,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";
import type { OutreachStartScheduleDraft } from "@/lib/outreachSchedule";
import {
  createInitialWhatsAppSequence,
  ensureWhatsAppSequenceWithFallbacks,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
import {
  toCampaignEmailSenderOption,
  isMultiAccountMailProvider,
  type EmailIntegrationRow,
} from "@/lib/emailIntegrations";
import {
  fetchSavedOutreachPlans,
  SAVED_OUTREACH_PLANS_PAGE_SIZE,
} from "@/lib/savedOutreachPlansApi";
import {
  fetchWhatsAppOutreachPlan,
  saveWhatsAppOutreachPlan,
  type WhatsAppOutreachPlanRecord,
} from "@/lib/whatsappOutreachApi";

export type { CampaignWorkspaceTab };

const COMING_SOON_TABS = new Set<CampaignWorkspaceTab>(["Settings"]);
const CONTACTS_LIST_PAGE_SIZE = 15;
const EMAIL_LIST_PAGE_SIZE = 15;

type GmailCalendlyAutomationState = {
  enabled?: boolean;
  meetingUri?: string;
  meetingName?: string;
  schedulingUrl?: string;
  durationMinutes?: number;
  kind?: string;
};

function pickCampaignCalendly(
  campaign: { calendlyAutomation?: GmailCalendlyAutomationState },
  planCalendly?: GmailCalendlyAutomationState
): GmailCalendlyAutomationState | undefined {
  if (campaign.calendlyAutomation?.enabled && campaign.calendlyAutomation.schedulingUrl?.trim()) {
    return campaign.calendlyAutomation;
  }
  if (planCalendly?.enabled && planCalendly.schedulingUrl?.trim()) {
    return planCalendly;
  }
  return campaign.calendlyAutomation || planCalendly;
}

function campaignCalendlySchedulingUrl(
  campaign: { calendlyAutomation?: GmailCalendlyAutomationState },
  planUrl?: string
): string {
  const fromCampaign = pickCampaignCalendly(campaign)?.schedulingUrl?.trim();
  if (fromCampaign) return fromCampaign;
  return planUrl?.trim() || "";
}

type GmailEditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  startSchedule?: OutreachStartScheduleDraft;
  lockSchedule: boolean;
  calendlyAutomation?: GmailCalendlyAutomationState;
};

type WhatsAppEditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: WhatsAppTouchpointDraft[];
  jobDescription?: string;
  calendlySchedulingUrl?: string;
};

type ActiveEditor =
  | { channel: "gmail"; state: GmailEditorState }
  | { channel: "whatsapp"; state: WhatsAppEditorState };

type Props = {
  campaign: CampaignRecord;
  workspaceTab: CampaignWorkspaceTab;
  reportMetric?: ReportMetricKey | null;
  onWorkspaceTabChange: (tab: CampaignWorkspaceTab) => void;
  onOpenReportMetric?: (metric: ReportMetricKey) => void;
  onCloseReportMetric?: () => void;
  onViewWhatsAppConversation?: (candidateKey: string) => void;
  whatsappContactKey?: string | null;
  onBack: () => void;
  onCampaignUpdated?: (campaign: CampaignRecord) => void;
  onGoToIntegrations?: () => void;
  onAddFromSearchHistory?: () => void;
  onRevealQuotaExceeded?: (message: string) => void;
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

function emailEmptyLabel(
  contact: CampaignContact,
  revealInProgress: boolean,
  campaignLaunched: boolean
) {
  if (revealInProgress) {
    return "Unveiling contact details…";
  }
  if (!campaignLaunched) {
    return "Unveil email when adding from search, or reveal in Session Results.";
  }
  if (!contact.linkedinUrl.trim() || !contact.sourcingSessionId.trim()) {
    return "Missing LinkedIn — open this person in Session Results and use Reveal Email";
  }
  return "Email not found for this contact.";
}

function tryShowQuotaExceededModal(
  message: string,
  onRevealQuotaExceeded?: (message: string) => void
): boolean {
  if (!quotaAlertFromMessage(message)) return false;
  onRevealQuotaExceeded?.(message);
  return true;
}

function launchBlockedModalFromError(err: unknown): { title: string; message: ReactNode } {
  if (err instanceof CampaignLaunchBlockedError) {
    if (err.code === "GMAIL_DAILY_LIMIT_EXCEEDED") {
      const lim = err.gmailDailyLimit as
        | (typeof err.gmailDailyLimit & { totalContacts?: number; enrollable?: number })
        | null;
      const limit = lim?.limit ?? 200;
      const remaining = lim?.remaining ?? 0;
      const requested = lim?.requested ?? lim?.enrollable ?? 0;
      const reserved = lim?.reserved ?? 0;
      const totalContacts = lim?.totalContacts;
      const email = lim?.integrationEmail?.trim();
      return {
        title: "Gmail daily send limit",
        message: (
          <>
            {email ? (
              <p className="mb-2 text-sm text-slate-600">
                Connected account: <strong className="text-[#141b2b]">{email}</strong>
              </p>
            ) : null}
            {typeof totalContacts === "number" && totalContacts > limit ? (
              <p>
                This campaign has <strong className="text-[#141b2b]">{totalContacts}</strong>{" "}
                contacts, which exceeds the{" "}
                <strong className="text-[#141b2b]">{limit}</strong> emails-per-day limit for your
                Gmail account.
              </p>
            ) : (
              <p>
                This Gmail integration can send up to{" "}
                <strong className="text-[#141b2b]">{limit}</strong> emails per day across all
                running email campaigns.
              </p>
            )}
            <p className="mt-2">
              Already reserved today: <strong className="text-[#141b2b]">{reserved}</strong>
              {" · "}
              Remaining: <strong className="text-[#141b2b]">{remaining}</strong>
              {" · "}
              This launch needs: <strong className="text-[#141b2b]">{requested}</strong>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              You can launch again after the daily limit resets at midnight, or reduce contacts in
              this campaign.
            </p>
          </>
        ),
      };
    }
    if (err.activeCampaignName) {
      return {
        title: "One campaign at a time",
        message: (
          <>
            <strong className="dashboard-confirm-modal-highlight">{err.activeCampaignName}</strong>{" "}
            is still running. Pause it or wait until it completes before launching another campaign.
          </>
        ),
      };
    }
  }
  return {
    title: "Cannot launch campaign",
    message:
      err instanceof Error ? err.message : "Could not launch this campaign. Please try again.",
  };
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

export function CampaignWorkspace({
  campaign,
  workspaceTab: activeTab,
  reportMetric = null,
  onWorkspaceTabChange,
  onOpenReportMetric,
  onCloseReportMetric,
  onViewWhatsAppConversation,
  whatsappContactKey = null,
  onBack,
  onCampaignUpdated,
  onGoToIntegrations,
  onAddFromSearchHistory,
  onRevealQuotaExceeded,
}: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchBlockedModal, setLaunchBlockedModal] = useState<{
    title: string;
    message: ReactNode;
  } | null>(null);
  const [launchNotice, setLaunchNotice] = useState("");
  const [launchError, setLaunchError] = useState("");
  const [selectedEmailContactKey, setSelectedEmailContactKey] = useState<string | null>(null);
  const [voiceSelectedContactKeys, setVoiceSelectedContactKeys] = useState<string[]>([]);
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
  const [standaloneJobTitle, setStandaloneJobTitle] = useState(
    () => campaign.jobTitle?.trim() || ""
  );
  const [standaloneJobDescription, setStandaloneJobDescription] = useState(
    () => campaign.jobDescription?.trim() || ""
  );
  const [jobDescriptionLoading, setJobDescriptionLoading] = useState(false);
  const [jobDescriptionSaving, setJobDescriptionSaving] = useState(false);
  const [jobDescriptionNotice, setJobDescriptionNotice] = useState("");
  const [editorNotice, setEditorNotice] = useState("");
  const [saveToast, setSaveToast] = useState<{
    message: string;
    variant: "success" | "error" | "warning";
  } | null>(null);

  const [selectedEmailIntegrationId, setSelectedEmailIntegrationId] = useState(
    () => campaign.emailIntegrationId?.trim() || ""
  );
  const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegrationRow[]>([]);

  const emailSenderOptions = useMemo(
    () => emailIntegrations.map(toCampaignEmailSenderOption),
    [emailIntegrations]
  );

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${apiBase}/api/integrations`, {
          headers: authHeaders(auth.token),
        });
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.integrations)) return;
        const rows = (data.integrations as EmailIntegrationRow[]).filter((row) =>
          isMultiAccountMailProvider(row.provider)
        );
        if (cancelled) return;
        setEmailIntegrations(rows);
        setSelectedEmailIntegrationId((prev) => {
          if (prev && rows.some((row) => row.id === prev)) return prev;
          if (campaign.emailIntegrationId && rows.some((row) => row.id === campaign.emailIntegrationId)) {
            return campaign.emailIntegrationId;
          }
          const defaultRow = rows.find((row) => row.isDefaultEmail) || rows[0];
          return defaultRow?.id || "";
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, campaign.emailIntegrationId, campaign.id]);

  const [modalPlans, setModalPlans] = useState<ExistingOutreachPlanOption[]>([]);
  const [modalPlansLoading, setModalPlansLoading] = useState(false);
  const [savedPlansPage, setSavedPlansPage] = useState(1);
  const [savedPlansTotalPages, setSavedPlansTotalPages] = useState(1);
  const [savedPlansTotal, setSavedPlansTotal] = useState(0);
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
  const [removeContactConfirm, setRemoveContactConfirm] = useState<CampaignContact | null>(null);
  const unveilCompleteRef = useRef<(() => void) | undefined>(undefined);
  const [waCommsRefreshKey, setWaCommsRefreshKey] = useState(0);
  const [voiceCallsRefreshKey, setVoiceCallsRefreshKey] = useState(0);
  const [contactViewsRevision, setContactViewsRevision] = useState(0);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvParsedContacts, setCsvParsedContacts] = useState<CampaignContact[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);

  const onCampaignUpdatedRef = useRef(onCampaignUpdated);
  onCampaignUpdatedRef.current = onCampaignUpdated;

  const { job: revealJob, revealInProgress, reload: reloadRevealJob } = useCampaignRevealJob(
    campaign.id,
    {
      onComplete: () => unveilCompleteRef.current?.(),
      onQuotaExceeded: onRevealQuotaExceeded,
    }
  );
  const unveilJobActive =
    revealJob?.status === "pending" || revealJob?.status === "running";

  const contactsFetchKeyRef = useRef<string | null>(null);

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
    setContactsListPage(1);
    setEmailListPage(1);
  }, [campaign.id]);

  useEffect(() => {
    setContacts(campaign.contacts);
    setContactsError("");
  }, [contactsFromPropsKey, campaign.id]);

  const reloadCampaignRecord = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return null;
    try {
      return await fetchCampaign(auth.token, campaign.id);
    } catch {
      return null;
    }
  }, [campaign.id]);

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

  useEffect(() => {
    if (contactsFetchKeyRef.current === campaign.id) return;
    contactsFetchKeyRef.current = campaign.id;
    void reloadContacts();
  }, [campaign.id, reloadContacts]);

  const loadSequenceOptions = useCallback(async (page = 1) => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setModalPlans([]);
      setSavedPlansPage(1);
      setSavedPlansTotalPages(1);
      setSavedPlansTotal(0);
      setModalTemplates([]);
      setModalPlansLoading(false);
      setModalTemplatesLoading(false);
      setSequenceOptionsReady(true);
      return;
    }
    const hasLinkedPlan = Boolean(campaign.outreachPlanId?.trim());
    const lockedChannel =
      editor?.channel ||
      (hasLinkedPlan
        ? campaign.outreachChannel === "whatsapp"
          ? "whatsapp"
          : campaign.outreachChannel === "gmail"
            ? "gmail"
            : undefined
        : undefined);
    setModalPlansLoading(true);
    setModalTemplatesLoading(true);
    try {
      const [savedResult, templatesRes] = await Promise.all([
        fetchSavedOutreachPlans(auth.token, {
          page,
          limit: SAVED_OUTREACH_PLANS_PAGE_SIZE,
          ...(lockedChannel ? { channel: lockedChannel } : {}),
        }),
        fetch(`${apiBase}/api/outreach/templates`, { headers: authHeaders(auth.token) }),
      ]);
      setModalPlans(savedResult.plans);
      setSavedPlansPage(savedResult.pagination.page);
      setSavedPlansTotalPages(savedResult.pagination.totalPages);
      setSavedPlansTotal(savedResult.pagination.total);
      const templatesData = await templatesRes.json();
      if (templatesData.success && Array.isArray(templatesData.templates)) {
        setModalTemplates(templatesData.templates as OutreachTemplateListItem[]);
      } else {
        setModalTemplates([]);
      }
    } catch {
      setModalPlans([]);
      setSavedPlansPage(1);
      setSavedPlansTotalPages(1);
      setSavedPlansTotal(0);
      setModalTemplates([]);
    } finally {
      setModalPlansLoading(false);
      setModalTemplatesLoading(false);
      setSequenceOptionsReady(true);
    }
  }, [apiBase, campaign.outreachChannel, campaign.outreachPlanId, editor?.channel]);

  const handleSavedPlansPageChange = useCallback(
    (page: number) => {
      void loadSequenceOptions(page);
    },
    [loadSequenceOptions]
  );

  useEffect(() => {
    setEditorPhase("choose");
    setEditor(null);
    setEditorNotice("");
    setBypassLinkedPlan(false);
    setLinkedPlanLoading(false);
    setSavedPlansPage(1);
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
    if (
      editorPhase === "editing" &&
      editor?.state.planId &&
      editor.state.planId !== "new" &&
      String(editor.state.planId) === planId
    ) {
      return;
    }
    const auth = getStoredAuth();
    if (!auth?.token) return;
    const channel = campaign.outreachChannel === "whatsapp" ? "whatsapp" : "gmail";

    setLinkedPlanLoading(true);
    try {
      if (channel === "whatsapp") {
        const plan = await fetchWhatsAppOutreachPlan(auth.token, planId);
        const linkedJd = plan.jobDescription?.trim() || campaign.jobDescription?.trim() || "";
        setStandaloneJobDescription(linkedJd);
        openWhatsAppEditor({
          planId: plan.id,
          planName: plan.name || campaign.name,
          touchpoints:
            plan.touchpoints.length > 0
              ? plan.touchpoints.map((tp) => ({ ...tp }))
              : createInitialWhatsAppSequence(),
          jobDescription: linkedJd,
          calendlySchedulingUrl: campaignCalendlySchedulingUrl(
            campaign,
            plan.calendlyAutomation?.schedulingUrl
          ),
        });
      } else {
        const res = await fetch(`${apiBase}/api/outreach/plans/${encodeURIComponent(planId)}`, {
          headers: authHeaders(auth.token),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.plan) {
          const plan = data.plan as {
            id: string;
            name: string;
            touchpoints: OutreachTouchpointDraft[];
            startSchedule?: OutreachStartScheduleDraft;
            calendlyAutomation?: GmailCalendlyAutomationState;
          };
          openGmailEditor({
            planId: plan.id,
            planName: plan.name || campaign.name,
            touchpoints:
              Array.isArray(plan.touchpoints) && plan.touchpoints.length > 0
                ? plan.touchpoints.map((tp) => ({ ...tp }))
                : [createEmptyTouchpoint(1)],
            startSchedule: plan.startSchedule,
            lockSchedule: true,
            calendlyAutomation: pickCampaignCalendly(campaign, plan.calendlyAutomation),
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
  }, [
    apiBase,
    campaign.name,
    campaign.jobDescription,
    campaign.outreachPlanId,
    campaign.outreachChannel,
    campaign.calendlyAutomation,
    editor,
    editorPhase,
  ]);

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
    async (_message: string, savedPlan?: WhatsAppOutreachPlanRecord) => {
      if (!savedPlan?.id) return;

      const jd =
        savedPlan.jobDescription?.trim() ||
        (editor?.channel === "whatsapp" ? editor.state.jobDescription : "") ||
        campaign.jobDescription ||
        "";

      const calendlyUrl = campaignCalendlySchedulingUrl(
        campaign,
        savedPlan.calendlyAutomation?.schedulingUrl
      );

      setEditor({
        channel: "whatsapp",
        state: {
          planId: savedPlan.id,
          planName: savedPlan.name,
          touchpoints: savedPlan.touchpoints,
          jobDescription: jd,
          calendlySchedulingUrl: calendlyUrl,
        },
      });
      setStandaloneJobDescription(jd);
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
        let updated = await setCampaignOutreachPlan(
          auth.token,
          campaign.id,
          savedPlan.id,
          "whatsapp"
        );
        onCampaignUpdatedRef.current?.(updated);
        if (jd) {
          updated = await updateCampaignJobDescription(auth.token, campaign.id, {
            jobDescription: jd,
            jobTitle: standaloneJobTitle.trim() || campaign.jobTitle?.trim() || "",
          });
          onCampaignUpdatedRef.current?.(updated);
        }
        const calendlyToSync = savedPlan.calendlyAutomation?.enabled
          ? savedPlan.calendlyAutomation
          : pickCampaignCalendly(campaign);
        if (calendlyToSync?.enabled && calendlyToSync.schedulingUrl?.trim()) {
          updated = await updateCampaignCalendlyAutomation(
            auth.token,
            campaign.id,
            calendlyToSync
          );
          onCampaignUpdatedRef.current?.(updated);
        }
      } catch {
        setSaveToast({
          message: "Sequence saved, but could not link to this campaign. Try saving again.",
          variant: "error",
        });
      }
    },
    [campaign, campaign.id, campaign.jobDescription, editor]
  );

  const autoSaveWhatsAppSequence = useCallback(
    async (draft: {
      planId?: string | "new";
      planName: string;
      touchpoints: WhatsAppTouchpointDraft[];
      jobDescription?: string;
      calendlySchedulingUrl?: string;
    }) => {
      const normalizedTouchpoints = ensureWhatsAppSequenceWithFallbacks(
        draft.touchpoints.length > 0 ? draft.touchpoints : createInitialWhatsAppSequence()
      );
      const auth = getStoredAuth();
      if (!auth?.token) {
        openWhatsAppEditor({
          planId: draft.planId ?? "new",
          planName: draft.planName,
          touchpoints: normalizedTouchpoints,
          jobDescription: draft.jobDescription,
          calendlySchedulingUrl: draft.calendlySchedulingUrl,
        });
        return;
      }

      setLinkedPlanLoading(true);
      try {
        const saved = await saveWhatsAppOutreachPlan(auth.token, {
          planId: draft.planId ?? "new",
          name: draft.planName.trim() || campaign.name,
          touchpoints: normalizedTouchpoints,
          jobDescription: draft.jobDescription?.trim() || "",
        });
        await handleWhatsAppPlanSaved("WhatsApp sequence saved.", saved);
      } catch (err) {
        openWhatsAppEditor({
          planId: draft.planId ?? "new",
          planName: draft.planName,
          touchpoints: normalizedTouchpoints,
          jobDescription: draft.jobDescription,
          calendlySchedulingUrl: draft.calendlySchedulingUrl,
        });
        setEditorNotice(
          err instanceof Error ? err.message : "Could not save WhatsApp sequence."
        );
      } finally {
        setLinkedPlanLoading(false);
      }
    },
    [campaign.name, handleWhatsAppPlanSaved]
  );

  const handleLaunchWhatsAppCampaign = useCallback(
    async (savedPlan: WhatsAppOutreachPlanRecord) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        setSaveToast({ message: "Please sign in again.", variant: "error" });
        return;
      }
      if (unveilJobActive) {
        setSaveToast({
          message: "Wait for contact unveil to finish before launching.",
          variant: "error",
        });
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
        contactsFetchKeyRef.current = null;
        void reloadContacts();
        setLaunchNotice(
          launched.enrolled > 0
            ? `Sequence launched for ${launched.enrolled} contact${launched.enrolled === 1 ? "" : "s"}.`
            : "Launched, but no contacts had a phone number to enroll."
        );
        setLaunchError("");
      } catch (err) {
        if (err instanceof CampaignLaunchBlockedError) {
          setLaunchBlockedModal(launchBlockedModalFromError(err));
          throw err;
        }
        setSaveToast({
          message: err instanceof Error ? err.message : "Failed to launch campaign.",
          variant: "error",
        });
        throw err;
      }
    },
    [campaign.id, unveilJobActive]
  );

  const handleSaveCampaignCalendly = useCallback(
    async (automation: GmailCalendlyAutomationState) => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        throw new Error("Please sign in again.");
      }
      const updated = await updateCampaignCalendlyAutomation(
        auth.token,
        campaign.id,
        automation
      );
      onCampaignUpdatedRef.current?.(updated);
      setEditor((prev) => {
        if (prev?.channel === "gmail") {
          return { ...prev, state: { ...prev.state, calendlyAutomation: automation } };
        }
        if (prev?.channel === "whatsapp") {
          return {
            ...prev,
            state: {
              ...prev.state,
              calendlySchedulingUrl: automation.schedulingUrl?.trim() || "",
            },
          };
        }
        return prev;
      });
    },
    [campaign.id]
  );

  const handlePlanSaved = useCallback(
    async (
      _message: string,
      savedPlan?: {
        id: string;
        name: string;
        touchpoints: OutreachTouchpointDraft[];
        startSchedule?: OutreachStartScheduleDraft;
        calendlyAutomation?: GmailCalendlyAutomationState;
      }
    ) => {
      if (!savedPlan?.id) return;

      const planCalendly = savedPlan.calendlyAutomation;
      setEditor({
        channel: "gmail",
        state: {
          planId: savedPlan.id,
          planName: savedPlan.name,
          touchpoints: savedPlan.touchpoints,
          startSchedule: savedPlan.startSchedule,
          lockSchedule: true,
          calendlyAutomation: pickCampaignCalendly(campaign, planCalendly),
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
        let updated = await setCampaignOutreachPlan(
          auth.token,
          campaign.id,
          savedPlan.id,
          "gmail"
        );
        if (planCalendly) {
          updated = await updateCampaignCalendlyAutomation(
            auth.token,
            campaign.id,
            planCalendly
          );
        }
        onCampaignUpdatedRef.current?.(updated);
      } catch {
        setSaveToast({
          message: "Sequence saved, but could not link to this campaign. Try saving again.",
          variant: "error",
        });
      }
    },
    [campaign, campaign.id]
  );

  const outreachStatus = campaign.outreachStatus ?? "idle";
  /** No new contacts after launch (active, paused, or completed). */
  const campaignContactsLocked = isCampaignLaunched(outreachStatus);
  /** JD and start schedule while live or done. */
  const campaignFieldsLocked =
    outreachStatus === "active" || outreachStatus === "completed";
  /** Sequence email copy stays editable while active; only completed is read-only. */
  const campaignSequenceReadOnly = outreachStatus === "completed";
  const isVoiceCallCampaign = campaign.outreachChannel === "voice_call";
  const hasLinkedPlan = Boolean(campaign.outreachPlanId?.trim());
  const channelLocked =
    hasLinkedPlan || Boolean(editor?.channel) || isVoiceCallCampaign;
  const effectiveChannel: "gmail" | "whatsapp" | "voice_call" | null =
    isVoiceCallCampaign
      ? "voice_call"
      : editor?.channel ||
        (campaign.outreachChannel === "whatsapp"
          ? "whatsapp"
          : campaign.outreachChannel === "gmail"
            ? "gmail"
            : null);
  const allowedPickerChannels: ("gmail" | "whatsapp" | "voice_call")[] =
    isVoiceCallCampaign
      ? ["voice_call"]
      : channelLocked && effectiveChannel
        ? [effectiveChannel]
        : ["gmail", "whatsapp", "voice_call"];
  const isWhatsAppCampaign =
    campaign.outreachChannel === "whatsapp" ||
    effectiveChannel === "whatsapp" ||
    editor?.channel === "whatsapp";

  const showJobDescriptionTab = inferShowJobDescriptionTab(activeTab, {
    outreachChannel: effectiveChannel,
    hasJobDescription: Boolean(String(campaign.jobDescription || "").trim()),
  });

  const visibleWorkspaceTabs = getVisibleCampaignWorkspaceTabs({
    outreachChannel: effectiveChannel,
    channelLocked,
    showJobDescriptionTab,
    workspaceTab: activeTab,
    hasJobDescription: Boolean(String(campaign.jobDescription || "").trim()),
  });
  const hasSequence =
    Boolean(campaign.outreachPlanId?.trim()) || campaign.outreachChannel === "voice_call";
  const campaignContactCount = campaign.contactCount ?? campaign.contacts.length;
  const hasContacts =
    contacts.length > 0 || contactsListTotal > 0 || campaignContactCount > 0;

  useEffect(() => {
    if (!visibleWorkspaceTabs.includes(activeTab)) {
      const normalized = normalizeCampaignWorkspaceTab(activeTab, effectiveChannel);
      onWorkspaceTabChange(
        visibleWorkspaceTabs.includes(normalized)
          ? normalized
          : (visibleWorkspaceTabs[0] ?? "Emails")
      );
    }
  }, [activeTab, effectiveChannel, onWorkspaceTabChange, visibleWorkspaceTabs]);

  const whatsappJobDescriptionEditing =
    editorPhase === "editing" && editor?.channel === "whatsapp";

  const whatsappJobDescriptionValue = whatsappJobDescriptionEditing
    ? editor.state.jobDescription ?? campaign.jobDescription ?? ""
    : standaloneJobDescription || campaign.jobDescription || "";

  const setWhatsappJobDescriptionValue = useCallback(
    (value: string) => {
      if (whatsappJobDescriptionEditing) {
        setEditor((prev) =>
          prev?.channel === "whatsapp"
            ? { ...prev, state: { ...prev.state, jobDescription: value } }
            : prev
        );
      }
      setStandaloneJobDescription(value);
    },
    [whatsappJobDescriptionEditing]
  );

  useEffect(() => {
    const fromCampaignTitle = campaign.jobTitle?.trim() || "";
    if (fromCampaignTitle && !standaloneJobTitle.trim()) {
      setStandaloneJobTitle(fromCampaignTitle);
    }
    const fromCampaign = campaign.jobDescription?.trim() || "";
    if (fromCampaign && !standaloneJobDescription.trim()) {
      setStandaloneJobDescription(fromCampaign);
    }
  }, [
    campaign.id,
    campaign.jobTitle,
    campaign.jobDescription,
    standaloneJobTitle,
    standaloneJobDescription,
  ]);

  useEffect(() => {
    if (activeTab !== "Job description") return;

    if (whatsappJobDescriptionEditing) {
      const fromCampaign = campaign.jobDescription?.trim() || "";
      if (
        fromCampaign &&
        !(editor?.channel === "whatsapp" ? String(editor.state.jobDescription || "").trim() : "")
      ) {
        setEditor((prev) =>
          prev?.channel === "whatsapp"
            ? { ...prev, state: { ...prev.state, jobDescription: fromCampaign } }
            : prev
        );
      }
      return;
    }

    const planId = campaign.outreachPlanId?.trim();
    if (!planId || campaign.outreachChannel !== "whatsapp") return;

    const auth = getStoredAuth();
    if (!auth?.token) return;

    let cancelled = false;
    setJobDescriptionLoading(true);
    setJobDescriptionNotice("");
    void fetchWhatsAppOutreachPlan(auth.token, planId)
      .then((plan) => {
        if (cancelled) return;
        const jd =
          plan.jobDescription?.trim() || campaign.jobDescription?.trim() || "";
        setStandaloneJobDescription(jd);
        if (jd && !campaign.jobDescription?.trim()) {
          void updateCampaignJobDescription(auth.token, campaign.id, jd).then((updated) => {
            if (!cancelled) onCampaignUpdatedRef.current?.(updated);
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setJobDescriptionNotice(
          err instanceof Error ? err.message : "Could not load job description."
        );
      })
      .finally(() => {
        if (!cancelled) setJobDescriptionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    campaign.id,
    campaign.jobDescription,
    campaign.outreachPlanId,
    campaign.outreachChannel,
    editor?.channel === "whatsapp" ? editor.state.jobDescription : undefined,
    whatsappJobDescriptionEditing,
  ]);

  const persistCampaignRole = useCallback(
    async (payload: { jobDescription: string; jobTitle?: string }) => {
      const jd = payload.jobDescription.trim();
      const title = String(payload.jobTitle ?? standaloneJobTitle).trim();
      if (!jd && !title) return;
      const auth = getStoredAuth();
      if (!auth?.token) return;
      const updated = await updateCampaignJobDescription(auth.token, campaign.id, {
        jobDescription: jd,
        jobTitle: title,
      });
      onCampaignUpdatedRef.current?.(updated);
      if (title) setStandaloneJobTitle(title);
      if (jd) setStandaloneJobDescription(jd);
    },
    [campaign.id, standaloneJobTitle]
  );

  const whatsappJobTitleValue =
    standaloneJobTitle.trim() || campaign.jobTitle?.trim() || "";

  const handleSaveJobDescription = useCallback(async () => {
    if (campaignFieldsLocked) return;
    const title = whatsappJobTitleValue.trim();
    const jd = whatsappJobDescriptionValue.trim();
    if (!title) {
      setJobDescriptionNotice("Enter a job title before saving.");
      return;
    }
    if (!jd) {
      setJobDescriptionNotice("Enter a job description before saving.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setJobDescriptionNotice("Please sign in again.");
      return;
    }

    setJobDescriptionSaving(true);
    setJobDescriptionNotice("");
    try {
      const updatedCampaign = await updateCampaignJobDescription(auth.token, campaign.id, {
        jobDescription: jd,
        jobTitle: title,
      });
      onCampaignUpdatedRef.current?.(updatedCampaign);
      setStandaloneJobTitle(title);
      setStandaloneJobDescription(jd);
      if (whatsappJobDescriptionEditing) {
        setEditor((prev) =>
          prev?.channel === "whatsapp"
            ? { ...prev, state: { ...prev.state, jobDescription: jd } }
            : prev
        );
      }

      const planId = campaign.outreachPlanId?.trim();
      if (planId && campaign.outreachChannel === "whatsapp") {
        const plan = await fetchWhatsAppOutreachPlan(auth.token, planId);
        await saveWhatsAppOutreachPlan(auth.token, {
          planId: plan.id,
          name: plan.name,
          touchpoints: plan.touchpoints,
          jobDescription: jd,
          ...(plan.calendlyAutomation ? { calendlyAutomation: plan.calendlyAutomation } : {}),
        });
      }

      setJobDescriptionNotice("Job description saved.");
    } catch (err) {
      setJobDescriptionNotice(
        err instanceof Error ? err.message : "Could not save job description."
      );
    } finally {
      setJobDescriptionSaving(false);
    }
  }, [
    campaign.id,
    campaign.outreachChannel,
    campaign.outreachPlanId,
    campaignFieldsLocked,
    whatsappJobDescriptionEditing,
    whatsappJobDescriptionValue,
    whatsappJobTitleValue,
  ]);

  const handleLaunchSequence = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || launchBusy) return;
    if (unveilJobActive) {
      setLaunchError("Wait for contact unveil to finish before launching.");
      return;
    }
    setLaunchError("");
    setLaunchNotice("");
    setLaunchBusy(true);
    try {
      const result = await launchCampaignSequence(auth.token, campaign.id, {
        ...(selectedEmailIntegrationId
          ? { emailIntegrationId: selectedEmailIntegrationId }
          : {}),
      });
      onCampaignUpdatedRef.current?.(result.campaign);
      contactsFetchKeyRef.current = null;
      void reloadContacts();
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
      if (err instanceof CampaignLaunchBlockedError) {
        setLaunchBlockedModal(launchBlockedModalFromError(err));
      } else {
        setLaunchError(
          err instanceof Error ? err.message : "Could not launch campaign sequence."
        );
      }
    } finally {
      setLaunchBusy(false);
    }
  }, [campaign.id, launchBusy, unveilJobActive, selectedEmailIntegrationId]);

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
      if (err instanceof CampaignLaunchBlockedError) {
        setLaunchBlockedModal(launchBlockedModalFromError(err));
      } else {
        setLaunchError(err instanceof Error ? err.message : "Could not resume sequence.");
      }
    } finally {
      setLaunchBusy(false);
    }
  }, [campaign.id, launchBusy]);

  /** Voice call launch — places bulk calls via Hunar AI. */
  const handleLaunchVoiceCampaign = useCallback(async () => {
    if (launchBusy || unveilJobActive) return;
    const auth = getStoredAuth();
    if (!auth?.token) return;
    if (voiceSelectedContactKeys.length === 0) {
      setLaunchError("Select at least one contact with a phone number.");
      return;
    }
    setLaunchError("");
    setLaunchNotice("");
    setLaunchBusy(true);
    try {
      const result = await launchVoiceCampaign(
        auth.token,
        campaign.id,
        voiceSelectedContactKeys
      );
      onCampaignUpdatedRef.current?.(result.campaign);
      contactsFetchKeyRef.current = null;
      void reloadContacts();
      setVoiceCallsRefreshKey((v) => v + 1);
      setLaunchNotice(
        result.dialedCount > 0
          ? `AI voice calls started for ${result.dialedCount} contact${
              result.dialedCount === 1 ? "" : "s"
            }.`
          : "Launched, but no contacts had a valid phone number."
      );
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : "Could not launch voice campaign."
      );
    } finally {
      setLaunchBusy(false);
    }
  }, [campaign.id, launchBusy, unveilJobActive, voiceSelectedContactKeys, reloadContacts]);

  const handleToggleVoiceContact = useCallback((candidateKey: string, selected: boolean) => {
    setVoiceSelectedContactKeys((prev) => {
      if (selected) {
        return prev.includes(candidateKey) ? prev : [...prev, candidateKey];
      }
      return prev.filter((key) => key !== candidateKey);
    });
  }, []);

  const handleToggleVoiceContactsOnPage = useCallback(
    (candidateKeys: string[], selected: boolean) => {
      setVoiceSelectedContactKeys((prev) => {
        if (selected) {
          const merged = new Set(prev);
          for (const key of candidateKeys) merged.add(key);
          return Array.from(merged);
        }
        const remove = new Set(candidateKeys);
        return prev.filter((key) => !remove.has(key));
      });
    },
    []
  );

  const voiceLaunchBlockedReason = !hasSequence
    ? "Set up this voice campaign first"
    : !campaign.jobDescription?.trim()
      ? "Add a job description first"
      : !hasContacts
        ? "Add contacts to this campaign first"
        : voiceSelectedContactKeys.length === 0
          ? "Select contacts to call"
          : unveilJobActive
            ? "Wait for contact unveil to finish"
            : launchBusy
              ? "Launching…"
              : null;

  useEffect(() => {
    if (campaign.outreachChannel !== "voice_call") return;
    if (outreachStatus !== "idle") return;
    const readyKeys = contactsListRows
      .filter((contact) => contact.phone.trim())
      .map((contact) => contact.candidateKey);
    if (readyKeys.length === 0) return;
    setVoiceSelectedContactKeys((prev) => (prev.length > 0 ? prev : readyKeys));
  }, [campaign.outreachChannel, contactsListRows, outreachStatus]);

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

  const loadEmailListPage = useCallback(
    async (pageOverride?: number) => {
      const auth = getStoredAuth();
      if (!auth?.token) return;
      const page = pageOverride ?? emailListPage;
      setEmailListLoading(true);
      setEmailListError("");
      try {
        const result = await fetchCampaignContactsPage(auth.token, campaign.id, {
          page,
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
        setEmailListPage(result.pagination.page);
        if (page > result.pagination.totalPages) {
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
    },
    [campaign.id, emailFilter, emailListPage, emailSearch]
  );

  const refreshContactDependentViews = useCallback(() => {
    setContactsListPage(1);
    setEmailListPage(1);
    setWaCommsRefreshKey((k) => k + 1);
    setContactViewsRevision((r) => r + 1);
    void loadContactsListPage(1);
    void loadEmailListPage(1);
  }, [loadContactsListPage, loadEmailListPage]);

  const handleUnveilComplete = useCallback(() => {
    contactsFetchKeyRef.current = null;
    void reloadContacts();
    refreshContactDependentViews();
  }, [reloadContacts, refreshContactDependentViews]);

  useEffect(() => {
    unveilCompleteRef.current = handleUnveilComplete;
  }, [handleUnveilComplete]);

  const handleRemoveContactFromCampaign = useCallback(
    async (contact: CampaignContact) => {
      if (campaignFieldsLocked) return;
      const auth = getStoredAuth();
      if (!auth?.token) return;
      const key = String(contact.candidateKey || "").trim();
      if (!key || removeContactBusyKey) return;
      setRemoveContactBusyKey(key);
      try {
        const result = await removeContactFromCampaignApi(auth.token, campaign.id, key);
        onCampaignUpdatedRef.current?.(result.campaign);
        contactsFetchKeyRef.current = null;
        void reloadContacts();
        refreshContactDependentViews();
        setSaveToast({
          message:
            result.removed > 0
              ? `Removed ${contact.name.trim() || "contact"} from campaign.`
              : "Contact was not found in this campaign.",
          variant: result.removed > 0 ? "success" : "error",
        });
        setRemoveContactConfirm(null);
      } catch (err) {
        setSaveToast({
          message: err instanceof Error ? err.message : "Could not remove contact from campaign.",
          variant: "error",
        });
      } finally {
        setRemoveContactBusyKey("");
      }
    },
    [campaign.id, campaignFieldsLocked, refreshContactDependentViews, removeContactBusyKey]
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
      if (campaignContactsLocked) {
        setSaveToast({ message: CAMPAIGN_CONTACTS_LOCKED_MESSAGE, variant: "warning" });
        return;
      }

      const batchCheck = validateCampaignContactBatch(
        contacts.length,
        contactsToImport.length
      );
      if (!batchCheck.ok) {
        setSaveToast({ message: batchCheck.message, variant: "warning" });
        return;
      }

      const voiceJd =
        campaign.jobDescription?.trim() || standaloneJobDescription.trim() || "";
      if (campaign.outreachChannel === "voice_call" && !voiceJd) {
        setSaveToast({
          message: "Add a job description before importing contacts for AI voice calls.",
          variant: "warning",
        });
        return;
      }

      const payload =
        campaign.outreachChannel === "voice_call" && voiceJd
          ? contactsToImport.map((contact) => ({
              ...contact,
              jd: contact.jd?.trim() || voiceJd,
            }))
          : contactsToImport;

      setCsvImportBusy(true);
      try {
        const result = await addContactsToCampaignApi(
          auth.token,
          campaign.id,
          payload
        );
        onCampaignUpdatedRef.current?.(result.campaign);
        contactsFetchKeyRef.current = null;
        void reloadContacts();
        refreshContactDependentViews();
        setCsvModalOpen(false);
        setCsvFileName("");
        setCsvParsedContacts([]);
        setCsvValidationErrors([]);
        setSaveToast({
          message: `Imported ${result.addedCount} contact${result.addedCount === 1 ? "" : "s"} from CSV.`,
          variant: "success",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not import contacts from CSV.";
        if (!tryShowQuotaExceededModal(message, onRevealQuotaExceeded)) {
          setSaveToast({ message, variant: "error" });
        }
      } finally {
        setCsvImportBusy(false);
      }
    },
    [
      campaign.id,
      campaign.jobDescription,
      campaign.outreachChannel,
      campaignContactsLocked,
      contacts.length,
      onRevealQuotaExceeded,
      refreshContactDependentViews,
      standaloneJobDescription,
    ]
  );

  const handleCsvFileSelected = useCallback(
    async (file: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const { contacts: parsed, errors } = parseCsvContacts(raw);
      const limitErrors = [...errors];
      const voiceJd =
        campaign.jobDescription?.trim() || standaloneJobDescription.trim() || "";
      if (campaign.outreachChannel === "voice_call" && !voiceJd) {
        limitErrors.push(
          "Add a job description on the Job description tab before importing CSV for AI voice calls."
        );
      }
      const contactsForImport =
        campaign.outreachChannel === "voice_call" && voiceJd
          ? parsed.map((contact) => ({ ...contact, jd: voiceJd }))
          : parsed;
      const batchCheck = validateCampaignContactBatch(contacts.length, contactsForImport.length);
      if (!batchCheck.ok) {
        limitErrors.push(batchCheck.message);
      }
      setCsvFileName(file.name);
      setCsvParsedContacts(contactsForImport);
      setCsvValidationErrors(limitErrors);
    } catch (err) {
      setCsvFileName(file.name);
      setCsvParsedContacts([]);
      setCsvValidationErrors([
        err instanceof Error ? err.message : "Could not read this CSV file.",
      ]);
    }
  },
    [
      campaign.jobDescription,
      campaign.outreachChannel,
      contacts.length,
      standaloneJobDescription,
    ]
  );

  const downloadSampleCsv = useCallback(() => {
    const sample = buildSampleCampaignContactsCsv();
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
      outreachStatus?: "completed";
    }) => {
      if (payload.source === "campaign_completed" || payload.outreachStatus === "completed") {
        void reloadCampaignRecord().then((full) => {
          if (full) onCampaignUpdatedRef.current?.(full);
        });
        setWaCommsRefreshKey((k) => k + 1);
        setLaunchNotice("Campaign outreach sequence completed.");
        setLaunchError("");
        return;
      }

      const isWhatsApp =
        payload.source === "whatsapp_reply" ||
        payload.source === "whatsapp_send" ||
        payload.source === "whatsapp_ai" ||
        payload.source === "outreach_sent" ||
        payload.source === "reply_followup_sent";
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
    [reloadCampaignRecord]
  );

  useCampaignThreadRealtime(
    campaign.id,
    handleRealtimeThreadUpdate,
    campaign.outreachChannel === "whatsapp" ||
      activeTab === "Emails" ||
      activeTab === "WhatsApp"
  );

  useEffect(() => {
    const showPreLaunchContacts = activeTab === "Emails" && outreachStatus === "idle";
    if (!showPreLaunchContacts) return;
    void loadContactsListPage(contactsListPage);
  }, [
    activeTab,
    contactsListPage,
    loadContactsListPage,
    contactsFromPropsKey,
    contactViewsRevision,
    outreachStatus,
  ]);

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
  }, [activeTab, loadEmailListPage, contactViewsRevision]);

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
      const title = choice.jobTitle.trim();
      const jd = choice.jobDescription.trim();
      if (title) setStandaloneJobTitle(title);
      if (jd) setStandaloneJobDescription(jd);
      if (title || jd) {
        try {
          await persistCampaignRole({ jobTitle: title, jobDescription: jd });
        } catch (err) {
          setEditorNotice(
            err instanceof Error ? err.message : "Could not save role details."
          );
        }
      }
      if (choice.channel === "voice_call") {
        const auth = getStoredAuth();
        if (!auth?.token) {
          setEditorNotice("Please sign in again.");
          return;
        }
        setLinkedPlanLoading(true);
        try {
          const updated = await setCampaignOutreachPlan(
            auth.token,
            campaign.id,
            null,
            "voice_call"
          );
          onCampaignUpdatedRef.current?.(updated);
          setBypassLinkedPlan(false);
          setEditor(null);
          setEditorPhase("choose");
          setEditorNotice("");
          setSaveToast({
            message: "AI voice call campaign ready.",
            variant: "success",
          });
          onWorkspaceTabChange("Emails");
        } catch (err) {
          setEditorNotice(
            err instanceof Error ? err.message : "Could not set AI voice call channel."
          );
        } finally {
          setLinkedPlanLoading(false);
        }
        return;
      }
      if (choice.channel === "whatsapp") {
        await autoSaveWhatsAppSequence({
          planName: campaign.name,
          touchpoints: createInitialWhatsAppSequence(),
          jobDescription: jd,
        });
      } else {
        openGmailEditor({
          planId: "new",
          planName: campaign.name,
          touchpoints: [createEmptyTouchpoint(1)],
          lockSchedule: false,
          calendlyAutomation: campaign.calendlyAutomation,
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
        calendlyAutomation: campaign.calendlyAutomation,
      });
      return;
    }

    if (choice.type === "ai") {
      if (choice.channel === "whatsapp") {
        const title = choice.jobTitle.trim();
        const jd = choice.jobDescription.trim();
        if (title) setStandaloneJobTitle(title);
        if (jd) setStandaloneJobDescription(jd);
        if (title || jd) {
          try {
            await persistCampaignRole({ jobTitle: title, jobDescription: jd });
          } catch (err) {
            setEditorNotice(
              err instanceof Error ? err.message : "Could not save role details."
            );
          }
        }
        await autoSaveWhatsAppSequence({
          planName: choice.planName || campaign.name,
          touchpoints: choice.touchpoints.map((tp) => ({ ...tp })),
          jobDescription: jd,
        });
        return;
      }
      openGmailEditor({
        planId: "new",
        planName: choice.planName || campaign.name,
        touchpoints: choice.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: false,
        calendlyAutomation: campaign.calendlyAutomation,
      });
      return;
    }

    if (choice.type === "clone") {
      const auth = getStoredAuth();
      if (!auth?.token) return;
      try {
        if (choice.channel === "whatsapp") {
          const plan = await fetchWhatsAppOutreachPlan(auth.token, choice.planId);
          const jd =
            plan.jobDescription?.trim() ||
            campaign.jobDescription?.trim() ||
            standaloneJobDescription.trim();
          if (jd) setStandaloneJobDescription(jd);
          await autoSaveWhatsAppSequence({
            planName: campaign.name,
            touchpoints:
              plan.touchpoints.length > 0
                ? plan.touchpoints.map((tp) => ({ ...tp }))
                : createInitialWhatsAppSequence(),
            jobDescription: jd,
            calendlySchedulingUrl: campaignCalendlySchedulingUrl(
              campaign,
              plan.calendlyAutomation?.schedulingUrl
            ),
          });
          return;
        }
        const res = await fetch(`${apiBase}/api/outreach/plans/${choice.planId}`, {
          headers: authHeaders(auth.token),
        });
        const data = await res.json();
        if (data.success && data.plan) {
          const plan = data.plan as {
            name: string;
            touchpoints: OutreachTouchpointDraft[];
            startSchedule?: OutreachStartScheduleDraft;
          };
          openGmailEditor({
            planId: "new",
            planName: campaign.name,
            touchpoints:
              plan.touchpoints.length > 0
                ? plan.touchpoints.map((tp) => ({ ...tp }))
                : [createEmptyTouchpoint(1)],
            startSchedule: plan.startSchedule,
            lockSchedule: true,
            calendlyAutomation: campaign.calendlyAutomation,
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
      if (campaignFieldsLocked) return;
      const auth = getStoredAuth();
      if (!auth?.token) {
        setSaveToast({ message: "Please sign in again.", variant: "error" });
        return;
      }
      try {
        const result = await removeContactFromCampaignApi(auth.token, campaign.id, candidateKey);
        onCampaignUpdatedRef.current?.(result.campaign);
        contactsFetchKeyRef.current = null;
        void reloadContacts();
        refreshContactDependentViews();
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
    [campaign.id, campaignFieldsLocked, refreshContactDependentViews]
  );

  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[inherit] bg-white">
      <header className="dashboard-campaign-workspace-topbar shrink-0 border-b border-slate-200 bg-white px-2 py-1 sm:px-5 sm:py-2">
        <div className="dashboard-campaign-workspace-topbar-row flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-[#141b2b] sm:h-8 sm:w-8 sm:rounded-lg"
            aria-label="Back to campaigns"
          >
            <MaterialIcon name="arrow_back" className="text-base sm:text-lg" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold leading-none text-[#141b2b] sm:text-base">
            {campaign.name}
          </h1>
          {isVoiceCallCampaign ? (
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {outreachStatus === "active" ? (
                <button
                  type="button"
                  onClick={() => void handlePauseSequence()}
                  disabled={launchBusy}
                  className={`${dashboardBtnSecondaryClass} inline-flex h-7 items-center px-2.5 text-xs disabled:opacity-55 sm:h-8 sm:px-3 sm:text-sm`}
                >
                  Pause
                </button>
              ) : outreachStatus === "paused" ? (
                <button
                  type="button"
                  onClick={() => void handleResumeSequence()}
                  disabled={launchBusy}
                  title={launchBusy ? "Resuming…" : "Resume campaign"}
                  className={`${dashboardBtnPrimaryClass} inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap px-2.5 text-xs disabled:opacity-55 sm:h-8 sm:gap-1.5 sm:px-3 sm:text-sm`}
                >
                  {launchBusy ? (
                    <>
                      <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                      <span className="hidden sm:inline">Resuming…</span>
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="play_circle" className="text-base" />
                      <span className="hidden sm:inline">Resume</span>
                    </>
                  )}
                </button>
              ) : outreachStatus === "completed" ? (
                <button
                  type="button"
                  disabled
                  title="Campaign completed"
                  aria-label="Campaign completed"
                  className={`${dashboardBtnSecondaryClass} inline-flex h-7 cursor-not-allowed items-center gap-1 px-2.5 text-xs opacity-60 sm:h-8 sm:px-3 sm:text-sm`}
                >
                  <MaterialIcon
                    name="check_circle"
                    className="text-base text-slate-500"
                    aria-hidden
                  />
                  <span className="hidden sm:inline">Completed</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLaunchVoiceCampaign()}
                  disabled={
                    launchBusy ||
                    unveilJobActive ||
                    !hasSequence ||
                    !hasContacts ||
                    !campaign.jobDescription?.trim() ||
                    voiceSelectedContactKeys.length === 0
                  }
                  title={voiceLaunchBlockedReason ?? "Launch campaign"}
                  className={`${dashboardBtnPrimaryClass} inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap px-2.5 text-xs disabled:opacity-55 sm:h-8 sm:gap-1.5 sm:px-3 sm:text-sm`}
                >
                  {launchBusy ? (
                    <>
                      <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                      <span className="hidden sm:inline">Launching…</span>
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="rocket_launch" className="text-base" />
                      <span className="hidden sm:inline">Launch campaign</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <nav
          className="dashboard-campaign-workspace-topbar-tabs mt-1 flex gap-0.5 overflow-x-auto pb-0 sm:mt-1.5 sm:gap-1"
          aria-label="Campaign sections"
        >
          {visibleWorkspaceTabs.map((tab) => {
            const active = activeTab === tab;
            const tabLabel = campaignWorkspaceTabLabel(tab, effectiveChannel);
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={tabLabel}
                title={tabLabel}
                className={`shrink-0 snap-start rounded-md px-2 py-0.5 text-xs font-medium transition sm:rounded-lg sm:px-3 sm:py-1 sm:text-sm ${
                  active
                    ? "bg-[#0050cb]/10 text-[#0050cb]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#141b2b]"
                }`}
                onClick={() => onWorkspaceTabChange(tab)}
              >
                <span className="sm:hidden">
                  {campaignWorkspaceTabShortLabel(tab, effectiveChannel)}
                </span>
                <span className="hidden sm:inline">{tabLabel}</span>
              </button>
            );
          })}
        </nav>
        {launchError ? (
          <p className="dashboard-alert-warning mt-1 text-xs sm:mt-1.5 sm:text-sm" role="alert">
            {launchError}
          </p>
        ) : launchNotice ? (
          <p className="dashboard-alert-notice mt-1 text-xs sm:mt-1.5 sm:text-sm" role="status">
            {launchNotice}
          </p>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fc]">
        {activeTab === "Editor" ? (
          isVoiceCallCampaign ? (
            <CampaignVoiceAgentEditor
              key={campaign.id}
              locked={campaignFieldsLocked}
              outreachStatus={outreachStatus}
              initialConfig={campaign.voiceAgentConfig ?? null}
              onSaveAndTest={async (payload) => {
                const auth = getStoredAuth();
                if (!auth?.token) {
                  setSaveToast({ message: "Please sign in again.", variant: "error" });
                  return;
                }
                const jd =
                  campaign.jobDescription?.trim() || standaloneJobDescription.trim() || "";
                if (!jd) {
                  setSaveToast({
                    message: "Add a job description before saving the voice agent.",
                    variant: "warning",
                  });
                  return;
                }
                try {
                  const result = await saveCampaignVoiceAgent(
                    auth.token,
                    campaign.id,
                    payload
                  );
                  onCampaignUpdatedRef.current?.(result.campaign);
                  setSaveToast({
                    message:
                      result.action === "updated"
                        ? "Voice agent updated successfully."
                        : "Voice agent created successfully.",
                    variant: "success",
                  });
                } catch (error) {
                  setSaveToast({
                    message:
                      error instanceof Error
                        ? error.message
                        : "Failed to save voice agent.",
                    variant: "error",
                  });
                }
              }}
            />
          ) : editorPhase === "editing" && editor?.channel === "gmail" ? (
            <OutreachPlanEditor
              key={editor.state.planId}
              embedded
              planId={editor.state.planId}
              initialPlanName={editor.state.planName}
              initialTouchpoints={editor.state.touchpoints}
              initialStartSchedule={editor.state.startSchedule}
              initialCalendlyAutomation={pickCampaignCalendly(
                campaign,
                editor.state.calendlyAutomation
              )}
              lockSchedule={editor.state.lockSchedule || campaignFieldsLocked}
              editorLocked={campaignSequenceReadOnly}
              sequenceLiveEditable={outreachStatus === "active"}
              campaignOutreachStatus={outreachStatus}
              hasCampaignContacts={hasContacts}
              hasSequence={hasSequence}
              launchBusy={launchBusy}
              unveilInProgress={unveilJobActive}
              emailSenders={emailSenderOptions}
              selectedEmailIntegrationId={selectedEmailIntegrationId}
              onEmailIntegrationChange={setSelectedEmailIntegrationId}
              onLaunchCampaign={() => void handleLaunchSequence()}
              onPauseCampaign={() => void handlePauseSequence()}
              onResumeCampaign={() => void handleResumeSequence()}
              onCancel={backToSequenceChoose}
              onGoToIntegrations={onGoToIntegrations}
              saveCalendlyToCampaign={(automation) => handleSaveCampaignCalendly(automation)}
              onSaved={(message, saved) => void handlePlanSaved(message, saved)}
            />
          ) : editorPhase === "editing" && editor?.channel === "whatsapp" ? (
            <WhatsAppOutreachEditor
              embedded
              planId={editor.state.planId}
              initialPlanName={editor.state.planName}
              initialTouchpoints={editor.state.touchpoints}
              jobDescription={editor.state.jobDescription ?? ""}
              onJobDescriptionChange={setWhatsappJobDescriptionValue}
              initialCalendlySchedulingUrl={campaignCalendlySchedulingUrl(
                campaign,
                editor.state.calendlySchedulingUrl
              )}
              onCancel={backToSequenceChoose}
              onGoToIntegrations={onGoToIntegrations}
              saveCalendlyToCampaign={(automation) => handleSaveCampaignCalendly(automation)}
              onSaved={(message, saved) => void handleWhatsAppPlanSaved(message, saved)}
              onLaunchCampaign={(saved) => handleLaunchWhatsAppCampaign(saved)}
              onPauseCampaign={() => handlePauseSequence()}
              onResumeCampaign={() => handleResumeSequence()}
              campaignOutreachStatus={outreachStatus}
              hasCampaignContacts={hasContacts}
              unveilInProgress={unveilJobActive}
              onLaunchComplete={() => {
                onWorkspaceTabChange("WhatsApp");
                setWaCommsRefreshKey((k) => k + 1);
              }}
            />
          ) : (
            <div className="dashboard-campaign-editor-panel flex min-h-0 flex-1 flex-col">
              {editorNotice ? (
                <p className="dashboard-alert-notice dashboard-campaign-editor-notice shrink-0 text-sm">
                  {editorNotice}
                </p>
              ) : null}
              {campaignFieldsLocked ? (
                <p
                  className="dashboard-alert-notice dashboard-campaign-editor-notice shrink-0 text-sm"
                  role="status"
                >
                  {outreachStatus === "completed"
                    ? "This campaign is completed. Sequence and campaign settings are read-only."
                    : "Campaign is running. You can still edit email copy in the sequence editor; pause to change contacts or schedule."}
                </p>
              ) : null}
              <div className="dashboard-campaign-report-toolbar shrink-0">
                <div className="dashboard-campaign-report-toolbar-row">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="dashboard-campaign-sequence-toolbar-icon" aria-hidden>
                      <MaterialIcon name="playlist_play" className="text-[22px]" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="dashboard-campaign-report-title">Campaign sequence</h2>
                      <p className="dashboard-campaign-report-subtitle">
                        Create or select an outreach sequence for this campaign
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="dashboard-campaign-editor-body dashboard-outreach-scroll min-h-0 flex-1 overflow-y-auto">
                <div className="dashboard-campaign-editor-inner">
                  <OutreachSequencePicker
                    variant="campaign"
                    initialJobTitle={
                      campaign.jobTitle?.trim() || standaloneJobTitle.trim() || ""
                    }
                    initialJobDescription={
                      campaign.jobDescription?.trim() ||
                      standaloneJobDescription.trim() ||
                      ""
                    }
                    allowedChannels={allowedPickerChannels}
                    existingPlans={modalPlans}
                    plansLoading={modalPlansLoading}
                    plansPage={savedPlansPage}
                    plansTotalPages={savedPlansTotalPages}
                    plansTotal={savedPlansTotal}
                    onPlansPageChange={handleSavedPlansPageChange}
                    templates={modalTemplates}
                    templatesLoading={modalTemplatesLoading}
                    optionsReady={sequenceOptionsReady}
                    readOnly={campaignFieldsLocked}
                    onChoose={(choice) => void handleSequenceChoice(choice)}
                  />
                </div>
              </div>
            </div>
          )
        ) : activeTab === "Job description" ? (
          <CampaignJobDescriptionPanel
            jobTitle={whatsappJobTitleValue}
            onJobTitleChange={setStandaloneJobTitle}
            value={whatsappJobDescriptionValue}
            onChange={setWhatsappJobDescriptionValue}
            onSave={() => void handleSaveJobDescription()}
            loading={jobDescriptionLoading}
            saving={jobDescriptionSaving}
            notice={jobDescriptionNotice}
            locked={campaignFieldsLocked}
            outreachStatus={outreachStatus}
            isWhatsApp={isWhatsAppCampaign}
            isVoiceCall={isVoiceCallCampaign}
            showEmptyGuidance={
              !whatsappJobDescriptionValue.trim() &&
              !hasSequence &&
              !whatsappJobDescriptionEditing
            }
            showEditorTabHint={whatsappJobDescriptionEditing}
          />
        ) : activeTab === "Emails" ? (
          <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col overflow-hidden">
            {!hasContacts &&
            contactsListTotal === 0 &&
            campaignContactCount === 0 &&
            !emailListLoading &&
            !contactsListLoading ? (
              <CampaignWorkspaceEmptyState
                brand="gmail"
                title="No contacts yet"
                description={
                  <>
                    Add candidates from{" "}
                    <span className="font-medium text-[#141b2b]">Session Results</span> using{" "}
                    <span className="font-medium text-[#141b2b]">Add to campaign</span>, or upload a
                    CSV to build your outreach list before launch.
                  </>
                }
                actions={[
                  {
                    label: "Add from search history",
                    icon: "history",
                    disabled: campaignContactsLocked,
                    onClick: onAddFromSearchHistory,
                  },
                  {
                    label: "Upload CSV",
                    icon: "upload_file",
                    variant: "secondary",
                    disabled: campaignContactsLocked,
                    onClick: openCsvModal,
                  },
                ]}
              />
            ) : outreachStatus === "idle" ? (
              <CampaignPreLaunchContactsPanel
                channel={
                  isVoiceCallCampaign
                    ? "voice_call"
                    : campaign.outreachChannel === "whatsapp" || effectiveChannel === "whatsapp"
                      ? "whatsapp"
                      : "gmail"
                }
                contacts={contactsListRows}
                totalContacts={contactsListTotal}
                page={contactsListPage}
                totalPages={contactsListTotalPages}
                loading={contactsListLoading}
                error={contactsListError}
                revealInProgress={revealInProgress || launchBusy}
                contactsLocked={campaignContactsLocked}
                removingKey={removeContactBusyKey}
                selectable={isVoiceCallCampaign}
                selectedKeys={voiceSelectedContactKeys}
                onToggleContact={handleToggleVoiceContact}
                onToggleAllOnPage={handleToggleVoiceContactsOnPage}
                onPageChange={setContactsListPage}
                onAddFromSearchHistory={
                  campaignContactsLocked ? undefined : onAddFromSearchHistory
                }
                onUploadCsv={campaignContactsLocked ? undefined : openCsvModal}
                onRemoveContact={
                  campaignFieldsLocked
                    ? undefined
                    : async (candidateKey) => {
                        const contact = contactsListRows.find(
                          (row) => row.candidateKey === candidateKey
                        );
                        if (contact) await handleRemoveContactFromCampaign(contact);
                      }
                }
              />
            ) : isVoiceCallCampaign ? (
              <CampaignVoiceCallsPanel
                campaignId={campaign.id}
                outreachStatus={outreachStatus}
                refreshKey={voiceCallsRefreshKey}
                resultFields={campaign.voiceAgentConfig?.resultFields ?? []}
                callPrompt={campaign.voiceAgentConfig?.callPrompt ?? ""}
              />
            ) : (
              <>
            <div className="dashboard-campaign-wa-comms-toolbar shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <IntegrationBrandLogo provider="gmail" title="Gmail" className="h-4 w-4" />
                    <p className="dashboard-campaign-wa-comms-summary">
                      {emailListTotal} conversation{emailListTotal === 1 ? "" : "s"}
                      {emailFilter !== "all" || emailSearch.trim() ? (
                        <span className="text-slate-500">
                          {" "}
                          · {contacts.length} in campaign
                        </span>
                      ) : null}
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
            {syncThreadsNotice ? (
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
                                    {emailEmptyLabel(
                                      contact,
                                      revealInProgress || launchBusy,
                                      campaignContactsLocked
                                    )}
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
              </>
            )}
          </div>
        ) : activeTab === "WhatsApp" ? (
          <CampaignWhatsAppCommunicationsPanel
            campaignId={campaign.id}
            initialContactKey={whatsappContactKey}
            refreshKey={waCommsRefreshKey}
            revealInProgress={revealInProgress}
            contactsLocked={campaignContactsLocked}
            onAddFromSearchHistory={
              campaignContactsLocked ? undefined : onAddFromSearchHistory
            }
            onUploadCsv={campaignContactsLocked ? undefined : openCsvModal}
            onRemoveCandidate={
              campaignFieldsLocked
                ? undefined
                : (candidateKey) => void handleRemoveCandidate(candidateKey)
            }
          />
        ) : activeTab === "Report" ? (
          <CampaignEmailReportPanel
            campaignId={campaign.id}
            variant="report"
            reportMetric={reportMetric}
            onOpenReportMetric={onOpenReportMetric}
            onCloseReportMetric={onCloseReportMetric}
            onViewWhatsAppConversation={
              isWhatsAppCampaign ? onViewWhatsAppConversation : undefined
            }
          />
        ) : activeTab === "Activity" ? (
          <CampaignEmailReportPanel
            campaignId={campaign.id}
            variant="activity"
            revealInProgress={revealInProgress}
            revealJob={revealJob}
            reloadRevealJob={reloadRevealJob}
          />
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
      <ImportCampaignContactsCsvModal
        open={csvModalOpen}
        busy={csvImportBusy}
        mandatoryHeaders={CSV_MANDATORY_HEADERS}
        fileName={csvFileName}
        validationErrors={csvValidationErrors}
        readyCount={csvParsedContacts.length}
        onClose={closeCsvModal}
        onFileSelect={handleCsvFileSelected}
        onDownloadSample={downloadSampleCsv}
        onImport={() => void importParsedCsvContacts(csvParsedContacts)}
      />
      <ConfirmModal
        open={launchBlockedModal !== null}
        variant="alert"
        tone="warning"
        iconName="campaign"
        title={launchBlockedModal?.title ?? "Cannot launch"}
        message={launchBlockedModal?.message ?? ""}
        confirmLabel="Got it"
        onConfirm={() => setLaunchBlockedModal(null)}
        onCancel={() => setLaunchBlockedModal(null)}
      />
    </section>
  );
}
