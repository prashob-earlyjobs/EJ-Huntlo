"use client";

import { useCallback, useState } from "react";

import {
  CreateOutreachModal,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/CreateOutreachModal";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import { EmailOutreachPanel } from "@/components/dashboard/EmailOutreachPanel";
import { OutreachPlanEditor } from "@/components/dashboard/OutreachPlanEditor";
import { WhatsAppOutreachEditor } from "@/components/dashboard/WhatsAppOutreachEditor";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  createEmptyTouchpoint,
  type OutreachTemplateListItem,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";
import {
  createInitialWhatsAppSequence,
  type WhatsAppTouchpointDraft,
} from "@/lib/whatsappOutreach";
import { fetchWhatsAppOutreachPlan } from "@/lib/whatsappOutreachApi";
import {
  fetchSavedOutreachPlans,
  SAVED_OUTREACH_PLANS_PAGE_SIZE,
} from "@/lib/savedOutreachPlansApi";

const ENTERPRISE_PLAN_ID = "enterprise";

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
  jobDescription?: string;
};

type ActiveEditor =
  | { channel: "gmail"; state: GmailEditorState }
  | { channel: "whatsapp"; state: WhatsAppEditorState };

type Props = {
  currentPlanId: string;
  planResolved?: boolean;
  onViewPlans: () => void;
  onGoToIntegrations?: () => void;
};

export function OutreachesPanel({
  currentPlanId,
  planResolved = false,
  onViewPlans,
  onGoToIntegrations,
}: Props) {
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [createOutreachOpen, setCreateOutreachOpen] = useState(false);
  const [modalPlans, setModalPlans] = useState<ExistingOutreachPlanOption[]>([]);
  const [modalPlansLoading, setModalPlansLoading] = useState(false);
  const [savedPlansPage, setSavedPlansPage] = useState(1);
  const [savedPlansTotalPages, setSavedPlansTotalPages] = useState(1);
  const [savedPlansTotal, setSavedPlansTotal] = useState(0);
  const [modalTemplates, setModalTemplates] = useState<OutreachTemplateListItem[]>([]);
  const [modalTemplatesLoading, setModalTemplatesLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [editor, setEditor] = useState<ActiveEditor | null>(null);

  const loadModalPlans = useCallback(async (page = 1) => {
    const auth = getStoredAuth();
    if (!auth?.token || !isEnterprise) {
      setModalPlans([]);
      setSavedPlansPage(1);
      setSavedPlansTotalPages(1);
      setSavedPlansTotal(0);
      return;
    }
    setModalPlansLoading(true);
    try {
      const result = await fetchSavedOutreachPlans(auth.token, {
        page,
        limit: SAVED_OUTREACH_PLANS_PAGE_SIZE,
      });
      setModalPlans(result.plans);
      setSavedPlansPage(result.pagination.page);
      setSavedPlansTotalPages(result.pagination.totalPages);
      setSavedPlansTotal(result.pagination.total);
    } catch {
      setModalPlans([]);
      setSavedPlansPage(1);
      setSavedPlansTotalPages(1);
      setSavedPlansTotal(0);
    } finally {
      setModalPlansLoading(false);
    }
  }, [isEnterprise]);

  const loadModalTemplates = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || !isEnterprise) {
      setModalTemplates([]);
      return;
    }
    setModalTemplatesLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/outreach/templates`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        setModalTemplates(data.templates as OutreachTemplateListItem[]);
      } else {
        setModalTemplates([]);
      }
    } catch {
      setModalTemplates([]);
    } finally {
      setModalTemplatesLoading(false);
    }
  }, [apiBase, isEnterprise]);

  const openCreateOutreach = () => {
    if (!planResolved || !isEnterprise) {
      if (planResolved) onViewPlans();
      return;
    }
    setSavedPlansPage(1);
    setModalPlansLoading(true);
    setModalTemplatesLoading(true);
    void loadModalPlans(1);
    void loadModalTemplates();
    setCreateOutreachOpen(true);
  };

  const handleSavedPlansPageChange = (page: number) => {
    void loadModalPlans(page);
  };

  const openGmailEditor = (state: GmailEditorState) => {
    setNotice("");
    setEditor({ channel: "gmail", state });
  };

  const openWhatsAppEditor = (state: WhatsAppEditorState) => {
    setNotice("");
    setEditor({ channel: "whatsapp", state });
  };

  const handleCreateOutreachChoice = async (choice: CreateOutreachChoice) => {
    setCreateOutreachOpen(false);

    if (choice.type === "scratch") {
      const today = new Date().toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      if (choice.channel === "whatsapp") {
        openWhatsAppEditor({
          planId: "new",
          planName: `WhatsApp - ${today}`,
          touchpoints: createInitialWhatsAppSequence(),
        });
      } else {
        openGmailEditor({
          planId: "new",
          planName: `First Project - ${today}`,
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
        setNotice("Template not found.");
        return;
      }
      const today = new Date().toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      openGmailEditor({
        planId: "new",
        planName: `${tpl.planName} - ${today}`,
        touchpoints: tpl.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: true,
      });
      return;
    }

    if (choice.type === "ai") {
      if (choice.channel === "whatsapp") {
        openWhatsAppEditor({
          planId: "new",
          planName: choice.planName,
          touchpoints: choice.touchpoints.map((tp) => ({ ...tp })),
          jobDescription: choice.jobDescription,
        });
        return;
      }
      openGmailEditor({
        planId: "new",
        planName: choice.planName,
        touchpoints: choice.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: false,
      });
      return;
    }

    if (choice.type === "clone") {
      const auth = getStoredAuth();
      if (!auth?.token) return;
      try {
        if (choice.channel === "whatsapp") {
          const plan = await fetchWhatsAppOutreachPlan(auth.token, choice.planId);
          openWhatsAppEditor({
            planId: "new",
            planName: `Copy of ${plan.name}`,
            touchpoints:
              plan.touchpoints.length > 0
                ? plan.touchpoints.map((tp) => ({ ...tp }))
                : createInitialWhatsAppSequence(),
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
          };
          openGmailEditor({
            planId: "new",
            planName: `Copy of ${plan.name}`,
            touchpoints:
              plan.touchpoints.length > 0
                ? plan.touchpoints.map((tp) => ({ ...tp }))
                : [createEmptyTouchpoint(1)],
            lockSchedule: true,
          });
        } else {
          setNotice("Could not load outreach plan to clone.");
        }
      } catch {
        setNotice("Could not load outreach plan to clone.");
      }
    }
  };

  if (editor?.channel === "gmail") {
    return (
      <OutreachPlanEditor
        planId={editor.state.planId}
        initialPlanName={editor.state.planName}
        initialTouchpoints={editor.state.touchpoints}
        lockSchedule={editor.state.lockSchedule}
        onCancel={() => setEditor(null)}
        onSaved={(message) => {
          setEditor(null);
          setSaveToast(message || "Sequence saved.");
        }}
      />
    );
  }

  if (editor?.channel === "whatsapp") {
    return (
      <WhatsAppOutreachEditor
        planId={editor.state.planId}
        initialPlanName={editor.state.planName}
        initialTouchpoints={editor.state.touchpoints}
        initialJobDescription={editor.state.jobDescription || ""}
        onCancel={() => setEditor(null)}
        onGoToIntegrations={onGoToIntegrations}
        onSaved={(message) => {
          setEditor(null);
          setSaveToast(message || "WhatsApp sequence saved.");
        }}
      />
    );
  }

  return (
    <>
      <EmailOutreachPanel
        currentPlanId={currentPlanId}
        planResolved={planResolved}
        onViewPlans={onViewPlans}
        onCreateOutreach={openCreateOutreach}
        externalNotice={notice}
        onClearNotice={() => setNotice("")}
      />
      <CreateOutreachModal
        open={createOutreachOpen}
        existingPlans={modalPlans}
        plansLoading={modalPlansLoading}
        plansPage={savedPlansPage}
        plansTotalPages={savedPlansTotalPages}
        plansTotal={savedPlansTotal}
        onPlansPageChange={handleSavedPlansPageChange}
        templates={modalTemplates}
        templatesLoading={modalTemplatesLoading}
        optionsReady={!modalPlansLoading && !modalTemplatesLoading}
        onClose={() => setCreateOutreachOpen(false)}
        onChoose={(choice) => void handleCreateOutreachChoice(choice)}
      />
      {saveToast ? (
        <DashboardToast
          message={saveToast}
          variant="success"
          onDismiss={() => setSaveToast(null)}
        />
      ) : null}
    </>
  );
}
