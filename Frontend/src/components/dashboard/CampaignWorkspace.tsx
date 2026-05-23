"use client";

import { useCallback, useEffect, useState } from "react";

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
    if (choice.type === "ai") {
      setEditorNotice("AI outreach generation is coming soon.");
      return;
    }

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
    <section className="dashboard-campaign-workspace flex h-full min-h-0 min-w-0 w-full flex-col">
      <header className="dashboard-campaign-workspace-header shrink-0">
        <div className="dashboard-campaign-workspace-title-row">
          <button
            type="button"
            onClick={onBack}
            className="dashboard-campaign-workspace-back"
            aria-label="Back to campaigns"
          >
            <MaterialIcon name="arrow_back" className="text-xl" />
          </button>
          <h1 className="dashboard-campaign-workspace-title">{campaign.name}</h1>
          <button
            type="button"
            onClick={() => setStarred((v) => !v)}
            className={`dashboard-campaign-workspace-star${starred ? " dashboard-campaign-workspace-star--on" : ""}`}
            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={starred}
          >
            <MaterialIcon name={starred ? "star" : "star_border"} className="text-[22px]" />
          </button>
        </div>

        <nav className="dashboard-campaign-workspace-tabs" aria-label="Campaign sections">
          {CAMPAIGN_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`dashboard-campaign-workspace-tab${
                activeTab === tab ? " dashboard-campaign-workspace-tab--active" : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <div className="dashboard-campaign-workspace-body flex min-h-0 flex-1 flex-col">
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
            <div className="dashboard-campaign-editor-choose">
              {editorNotice ? (
                <p className="dashboard-alert-notice mb-3 shrink-0 text-sm">{editorNotice}</p>
              ) : null}
              <OutreachSequencePicker
                existingPlans={modalPlans}
                plansLoading={modalPlansLoading}
                templates={modalTemplates}
                templatesLoading={modalTemplatesLoading}
                lead="Create or select a sequence for this campaign"
                onChoose={(choice) => void handleSequenceChoice(choice)}
              />
            </div>
          )
        ) : activeTab === "Emails" ? (
          <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col">
            <div className="dashboard-campaign-emails-toolbar shrink-0">
              <p className="dashboard-campaign-emails-summary">
                {contacts.length} contact{contacts.length === 1 ? "" : "s"} in this campaign
              </p>
            </div>
            <div className="dashboard-campaign-emails-scroll flex min-h-0 flex-1 flex-col">
              {contactsLoading ? (
                <p className="dashboard-campaign-workspace-placeholder py-12">Loading contacts…</p>
              ) : contactsError ? (
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
                                No email on file
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
                <p className="dashboard-campaign-workspace-placeholder py-12">Loading contacts…</p>
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
                            ) : (
                              <p className="dashboard-campaign-emails-meta dashboard-campaign-emails-address--empty">
                                No details
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="dashboard-campaign-workspace-placeholder-wrap">
            <p className="dashboard-campaign-workspace-placeholder">
              <span className="font-medium text-[#202124]">{activeTab}</span> for this campaign
              is coming soon.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
