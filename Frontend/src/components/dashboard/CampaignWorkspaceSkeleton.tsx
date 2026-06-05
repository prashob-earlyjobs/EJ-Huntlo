"use client";

import {
  getVisibleCampaignWorkspaceTabs,
  inferCampaignWorkspaceChannel,
  inferShowJobDescriptionTab,
  type CampaignOutreachChannel,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";

type Props = {
  workspaceTab?: CampaignWorkspaceTab;
  /** When known (e.g. from campaigns list), hides the other channel's tabs while loading. */
  outreachChannel?: CampaignOutreachChannel | null;
  /** When known, shows Job description tab during shimmer (Gmail campaigns with a saved JD). */
  hasJobDescription?: boolean;
};

function WhatsAppCommsSkeleton() {
  return (
    <div className="dashboard-campaign-wa-comms dashboard-campaign-workspace-skeleton-wa flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-wa-comms-toolbar shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="dashboard-shimmer h-6 w-6 rounded-md" />
          <div className="dashboard-shimmer h-4 w-36 rounded" />
          <div className="dashboard-shimmer ml-auto h-6 w-16 rounded-full" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="dashboard-shimmer h-9 min-w-48 flex-1 rounded-lg" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`wa-filter-skel-${i}`}
                className="dashboard-shimmer h-8 rounded-full"
                style={{ width: `${3.25 + (i % 2) * 0.5}rem` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-campaign-wa-comms-layout flex min-h-0 flex-1">
        <aside className="dashboard-campaign-wa-comms-list hidden min-h-0 w-full min-w-0 flex-col border-slate-200 md:flex md:w-[min(100%,320px)] md:max-w-[38%] md:border-r">
          <ul className="dashboard-campaign-wa-comms-list-scroll min-h-0 flex-1 overflow-hidden p-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <li
                key={`wa-list-skel-${i}`}
                className="dashboard-campaign-workspace-skeleton-wa-list-item flex items-center gap-3 border-b border-slate-100 px-4 py-3"
              >
                <div className="dashboard-shimmer h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div
                      className="dashboard-shimmer h-3.5 rounded"
                      style={{ width: `${55 + (i % 3) * 12}%` }}
                    />
                    <div className="dashboard-shimmer h-3 w-10 shrink-0 rounded" />
                  </div>
                  <div className="dashboard-shimmer h-3 w-[45%] rounded" />
                  <div className="dashboard-shimmer h-3 w-full max-w-[90%] rounded" />
                  <div className="dashboard-shimmer h-5 w-20 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="dashboard-campaign-wa-comms-thread hidden min-h-0 min-w-0 flex-1 flex-col bg-[#e5ddd5] md:flex">
          <header className="dashboard-campaign-wa-comms-thread-head shrink-0 flex items-center gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-3">
            <div className="dashboard-shimmer h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="dashboard-shimmer h-4 w-32 rounded" />
              <div className="dashboard-shimmer h-3 w-48 max-w-full rounded" />
            </div>
            <div className="dashboard-shimmer h-6 w-24 shrink-0 rounded-full" />
          </header>

          <div className="dashboard-campaign-wa-comms-messages min-h-0 flex-1 overflow-hidden px-4 py-5">
            <div className="mx-auto flex max-w-md flex-col gap-4">
              <div className="dashboard-campaign-workspace-skeleton-wa-msg dashboard-campaign-workspace-skeleton-wa-msg--out ml-auto">
                <div className="dashboard-shimmer h-3 w-24 rounded mb-1 ml-auto" />
                <div className="dashboard-shimmer h-16 w-[85%] rounded-lg rounded-tr-sm" />
              </div>
              <div className="dashboard-campaign-workspace-skeleton-wa-msg dashboard-campaign-workspace-skeleton-wa-msg--in">
                <div className="dashboard-shimmer h-14 w-[70%] rounded-lg rounded-tl-sm" />
              </div>
              <div className="dashboard-campaign-workspace-skeleton-wa-msg dashboard-campaign-workspace-skeleton-wa-msg--out ml-auto">
                <div className="dashboard-shimmer h-3 w-20 rounded mb-1 ml-auto" />
                <div className="dashboard-shimmer h-12 w-[75%] rounded-lg rounded-tr-sm" />
              </div>
            </div>
          </div>

          <footer className="dashboard-campaign-wa-comms-composer shrink-0 border-t border-[#d1d7db] bg-[#f0f2f5] px-3 py-3">
            <div className="dashboard-shimmer mb-2 h-3 w-full max-w-md rounded" />
            <div className="flex gap-2">
              <div className="dashboard-shimmer h-10 min-w-0 flex-1 rounded-full" />
              <div className="dashboard-shimmer h-10 w-10 shrink-0 rounded-full" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="dashboard-outreach-scroll flex min-h-0 flex-1 flex-col items-center overflow-hidden px-4 py-6 sm:px-8">
      <div className="w-full max-w-xl space-y-4">
        <div className="dashboard-shimmer mx-auto h-6 w-56 rounded" />
        <div className="dashboard-shimmer h-4 w-full rounded" />
        <div className="dashboard-shimmer h-4 w-[88%] rounded" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`editor-opt-skel-${i}`}
              className="dashboard-shimmer h-20 w-full rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactsListSkeleton() {
  return (
    <div className="dashboard-campaign-emails-panel flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-emails-toolbar shrink-0 px-4 py-3">
        <div className="dashboard-shimmer h-4 w-28 rounded" />
      </div>
      <ul className="dashboard-campaign-emails-list min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={`contact-skel-${i}`}
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-3"
          >
            <div className="dashboard-shimmer h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="dashboard-shimmer h-4 w-[50%] rounded" />
              <div className="dashboard-shimmer h-3 w-[35%] rounded" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GenericTabSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="dashboard-shimmer h-10 w-10 rounded-lg" />
      <div className="dashboard-shimmer h-4 w-40 rounded" />
      <div className="dashboard-shimmer h-4 w-56 rounded" />
    </div>
  );
}

function bodyForTab(tab: CampaignWorkspaceTab) {
  switch (tab) {
    case "WhatsApp":
      return <WhatsAppCommsSkeleton />;
    case "Editor":
      return <EditorSkeleton />;
    case "Job description":
      return <GenericTabSkeleton />;
    case "Emails":
      return <ContactsListSkeleton />;
    default:
      return <GenericTabSkeleton />;
  }
}

export function CampaignWorkspaceSkeleton({
  workspaceTab = "Editor",
  outreachChannel = null,
  hasJobDescription = false,
}: Props) {
  const effectiveChannel = inferCampaignWorkspaceChannel(workspaceTab, outreachChannel);
  const channelLocked = effectiveChannel === "gmail" || effectiveChannel === "whatsapp";
  const showJobDescriptionTab = inferShowJobDescriptionTab(workspaceTab, {
    outreachChannel: effectiveChannel,
    hasJobDescription,
  });
  const visibleTabs = getVisibleCampaignWorkspaceTabs({
    outreachChannel: effectiveChannel,
    channelLocked,
    showJobDescriptionTab,
    workspaceTab,
    hasJobDescription,
  });
  const skeletonTab = visibleTabs.includes(workspaceTab)
    ? workspaceTab
    : visibleTabs[0] ?? "Editor";

  return (
    <section
      className="dashboard-campaign-workspace-skeleton flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[inherit] bg-white"
      aria-busy="true"
      aria-label="Loading campaign"
    >
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="dashboard-shimmer h-9 w-9 shrink-0 rounded-lg" />
          <div className="dashboard-shimmer h-7 min-w-0 flex-1 max-w-xs rounded" />
          <div className="dashboard-shimmer h-9 w-9 shrink-0 rounded-lg" />
        </div>

        <nav
          className="mt-3 flex gap-1 overflow-x-auto pb-0.5"
          aria-label="Campaign sections"
        >
          {visibleTabs.map((tab) => {
            const active = tab === skeletonTab;
            return (
              <span
                key={tab}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-[#0050cb]/10 text-[#0050cb]"
                    : "text-slate-400"
                }`}
                aria-hidden
              >
                {tab}
              </span>
            );
          })}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f8f9fc]">
        {bodyForTab(skeletonTab)}
      </div>
    </section>
  );
}
