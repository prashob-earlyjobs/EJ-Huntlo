"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  OutreachSequencePicker,
  type CreateOutreachChoice,
  type ExistingOutreachPlanOption,
} from "@/components/dashboard/OutreachSequencePicker";
import { OutreachPlanEditor } from "@/components/dashboard/OutreachPlanEditor";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import type { CampaignContact, CampaignRecord } from "@/lib/campaigns";
import { fetchCampaign } from "@/lib/campaignsApi";
import {
  createEmptyTouchpoint,
  type OutreachTemplateListItem,
  type OutreachTouchpointDraft,
} from "@/lib/outreachTemplates";

export type CampaignWorkspaceTab =
  | "Editor"
  | "Contacts"
  | "Emails"
  | "Activity"
  | "Report"
  | "Settings";

const CAMPAIGN_TABS: CampaignWorkspaceTab[] = [
  "Editor",
  "Contacts",
  "Emails",
  "Activity",
  "Report",
  "Settings",
];

const COMING_SOON_TABS = new Set<CampaignWorkspaceTab>(["Activity", "Report", "Settings"]);

type EditorState = {
  planId: string | "new";
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  lockSchedule: boolean;
};

type Props = {
  campaign: CampaignRecord;
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

function CampaignContactsList({
  contacts,
  loading,
  error,
  emptyIcon,
  emptyMessage,
  showEmail,
}: {
  contacts: CampaignContact[];
  loading: boolean;
  error?: string;
  emptyIcon: string;
  emptyMessage: ReactNode;
  showEmail?: boolean;
}) {
  if (loading) {
    return <p className="dashboard-text-body py-12 text-center">Loading contacts…</p>;
  }
  if (error) {
    return <p className="dashboard-alert-error py-12 text-center text-sm">{error}</p>;
  }
  if (contacts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <MaterialIcon name={emptyIcon} className="text-4xl text-slate-400" />
        <p className="dashboard-text-body max-w-md">{emptyMessage}</p>
      </div>
    );
  }

  const sorted = [...contacts].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  return (
    <ul className="flex flex-col gap-2 p-1">
      {sorted.map((contact) => {
        const subtitle = showEmail
          ? [contact.role, contact.company].filter(Boolean).join(" · ")
          : [contact.role, contact.company, contact.location].filter(Boolean).join(" · ");
        const email = contact.email.trim();

        return (
          <li
            key={contact.candidateKey}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[#0050cb]/40 hover:bg-[#f8f9ff]"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0050cb]/10 text-xs font-semibold text-[#0050cb]"
              aria-hidden
            >
              {contactInitial(contact.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#141b2b]">
                {contact.name.trim() || "Unnamed contact"}
              </p>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
              ) : showEmail ? null : (
                <p className="mt-0.5 text-xs italic text-slate-400">No details</p>
              )}
              {showEmail ? (
                email ? (
                  <a
                    href={`mailto:${email}`}
                    className="mt-1 block text-sm text-[#0050cb] hover:underline"
                  >
                    {email}
                  </a>
                ) : (
                  <p className="mt-1 text-sm italic text-slate-400">No email on file</p>
                )
              ) : null}
            </div>
            {contact.addedAt ? (
              <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">
                Added {formatAddedAt(contact.addedAt)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function CampaignWorkspace({ campaign, onBack, onCampaignUpdated }: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const [activeTab, setActiveTab] = useState<CampaignWorkspaceTab>("Editor");
  const [starred, setStarred] = useState(false);
  const [editorPhase, setEditorPhase] = useState<"choose" | "editing">("choose");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorNotice, setEditorNotice] = useState("");

  const [modalPlans, setModalPlans] = useState<ExistingOutreachPlanOption[]>([]);
  const [modalPlansLoading, setModalPlansLoading] = useState(false);
  const [modalTemplates, setModalTemplates] = useState<OutreachTemplateListItem[]>([]);
  const [modalTemplatesLoading, setModalTemplatesLoading] = useState(false);

  const [contacts, setContacts] = useState<CampaignContact[]>(campaign.contacts);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");

  useEffect(() => {
    setContacts(campaign.contacts);
  }, [campaign.id, campaign.contacts]);

  const reloadContacts = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    setContactsLoading(true);
    setContactsError("");
    try {
      const full = await fetchCampaign(auth.token, campaign.id);
      setContacts(full.contacts);
      onCampaignUpdated?.(full);
    } catch (err) {
      setContactsError(
        err instanceof Error ? err.message : "Could not load campaign contacts."
      );
    } finally {
      setContactsLoading(false);
    }
  }, [campaign.id, onCampaignUpdated]);

  useEffect(() => {
    if (activeTab === "Emails" || activeTab === "Contacts") {
      void reloadContacts();
    }
  }, [activeTab, reloadContacts]);

  const loadSequenceOptions = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setModalPlans([]);
      setModalTemplates([]);
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
    }
  }, [apiBase]);

  useEffect(() => {
    if (activeTab === "Editor" && editorPhase === "choose") {
      void loadSequenceOptions();
    }
  }, [activeTab, editorPhase, loadSequenceOptions]);

  const openEditor = (state: EditorState) => {
    setEditorNotice("");
    setEditor(state);
    setEditorPhase("editing");
  };

  const backToSequenceChoose = () => {
    setEditor(null);
    setEditorPhase("choose");
    setEditorNotice("");
  };

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
          {CAMPAIGN_TABS.map((tab) => {
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
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fc]">
        {activeTab === "Editor" ? (
          editorPhase === "editing" && editor ? (
            <OutreachPlanEditor
              embedded
              planId={editor.planId}
              initialPlanName={editor.planName}
              initialTouchpoints={editor.touchpoints}
              lockSchedule={editor.lockSchedule}
              onCancel={backToSequenceChoose}
              onSaved={() => {
                /* stay on campaign */
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
                  existingPlans={modalPlans}
                  plansLoading={modalPlansLoading}
                  templates={modalTemplates}
                  templatesLoading={modalTemplatesLoading}
                  lead="Create or select a sequence for this campaign"
                  onChoose={(choice) => void handleSequenceChoice(choice)}
                />
              </div>
            </div>
          )
        ) : activeTab === "Emails" || activeTab === "Contacts" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <p className="text-sm text-slate-600">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"}
                {activeTab === "Emails" ? " in this campaign" : ""}
              </p>
            </div>
            <div className="dashboard-outreach-scroll flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6">
              <CampaignContactsList
                contacts={contacts}
                loading={contactsLoading}
                error={activeTab === "Emails" ? contactsError : undefined}
                emptyIcon={activeTab === "Emails" ? "mail" : "group"}
                showEmail={activeTab === "Emails"}
                emptyMessage={
                  activeTab === "Emails" ? (
                    <>
                      No contacts yet. Add candidates from{" "}
                      <span className="font-medium text-[#141b2b]">Session Results</span> using{" "}
                      <span className="font-medium text-[#141b2b]">Add to campaign</span>.
                    </>
                  ) : (
                    "No contacts in this campaign yet."
                  )
                }
              />
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
