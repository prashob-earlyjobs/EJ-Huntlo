"use client";

import { useCallback, useState } from "react";

import {
  CreateOutreachModal,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/CreateOutreachModal";
import { EmailOutreachPanel } from "@/components/dashboard/EmailOutreachPanel";
import { OutreachPlanEditor } from "@/components/dashboard/OutreachPlanEditor";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  createEmptyTouchpoint,
  type OutreachTemplateListItem,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";

const ENTERPRISE_PLAN_ID = "enterprise";

type EditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  lockSchedule: boolean;
};

type Props = {
  currentPlanId: string;
  planResolved?: boolean;
  onViewPlans: () => void;
  onGoToIntegrations: () => void;
};

export function OutreachesPanel({
  currentPlanId,
  planResolved = false,
  onViewPlans,
}: Props) {
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [createOutreachOpen, setCreateOutreachOpen] = useState(false);
  const [modalPlans, setModalPlans] = useState<ExistingOutreachPlanOption[]>([]);
  const [modalPlansLoading, setModalPlansLoading] = useState(false);
  const [modalTemplates, setModalTemplates] = useState<OutreachTemplateListItem[]>([]);
  const [modalTemplatesLoading, setModalTemplatesLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);

  const loadModalPlans = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || !isEnterprise) {
      setModalPlans([]);
      return;
    }
    setModalPlansLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/outreach/plans`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        setModalPlans(
          data.plans.map(
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
    } catch {
      setModalPlans([]);
    } finally {
      setModalPlansLoading(false);
    }
  }, [apiBase, isEnterprise]);

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
    setModalPlansLoading(true);
    setModalTemplatesLoading(true);
    void loadModalPlans();
    void loadModalTemplates();
    setCreateOutreachOpen(true);
  };

  const openEditor = (state: EditorState) => {
    setNotice("");
    setEditor(state);
  };

  const handleCreateOutreachChoice = async (choice: CreateOutreachChoice) => {
    setCreateOutreachOpen(false);

    if (choice.type === "scratch") {
      const today = new Date().toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      openEditor({
        planId: "new",
        planName: `First Project - ${today}`,
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
        setNotice("Template not found.");
        return;
      }
      const today = new Date().toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      openEditor({
        planId: "new",
        planName: `${tpl.planName} - ${today}`,
        touchpoints: tpl.touchpoints.map((tp) => ({ ...tp })),
        lockSchedule: true,
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

  if (editor) {
    return (
      <OutreachPlanEditor
        planId={editor.planId}
        initialPlanName={editor.planName}
        initialTouchpoints={editor.touchpoints}
        lockSchedule={editor.lockSchedule}
        onCancel={() => setEditor(null)}
        onSaved={(message) => {
          setEditor(null);
          setNotice(message);
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
        templates={modalTemplates}
        templatesLoading={modalTemplatesLoading}
        optionsReady={!modalPlansLoading && !modalTemplatesLoading}
        onClose={() => setCreateOutreachOpen(false)}
        onChoose={(choice) => void handleCreateOutreachChoice(choice)}
      />
    </>
  );
}
