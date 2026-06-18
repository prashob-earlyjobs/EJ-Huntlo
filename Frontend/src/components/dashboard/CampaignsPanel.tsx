"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CampaignWorkspace,
} from "@/components/dashboard/CampaignWorkspace";
import { CampaignsListSkeleton } from "@/components/dashboard/CampaignsListSkeleton";
import { CampaignsListTable } from "@/components/dashboard/CampaignsListTable";
import { CampaignWorkspaceSkeleton } from "@/components/dashboard/CampaignWorkspaceSkeleton";
import {
  CreateCampaignModal,
  type CreateCampaignPayload,
} from "@/components/dashboard/CreateCampaignModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignRecord } from "@/lib/campaigns";
import { fetchCampaign, type CampaignsListSummary } from "@/lib/campaignsApi";
import { getStoredAuth } from "@/lib/auth";
import type { ReportMetricKey } from "@/lib/campaignEmailReport";
import {
  defaultCampaignWorkspaceTab,
  inferCampaignWorkspaceChannel,
  normalizeCampaignWorkspaceTab,
  parseCampaignWorkspaceTabFromPathname,
  pathForCampaignReportMetric,
  pathForCampaignWhatsAppConversation,
  pathForCampaignWorkspace,
  pathForCampaignsList,
  replaceCampaignWorkspaceUrl,
  resolveCampaignOutreachChannel,
  type CampaignOutreachChannel,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";
import {
  CAMPAIGNS_LOCKED_MESSAGE,
  hasCampaignsAccess,
} from "@/lib/planAccess";
import type { PricingPlansPayload } from "@/lib/pricingPlans";

type Props = {
  currentPlanId: string;
  /** False until /api/users/me (or dashboard overview) has set the real plan id. */
  planResolved?: boolean;
  pricingPlans?: PricingPlansPayload | null;
  pricingPlansReady?: boolean;
  onViewPlans: () => void;
  onGoToIntegrations?: () => void;
  campaigns: CampaignRecord[];
  campaignsLoading?: boolean;
  campaignsPage?: number;
  campaignsTotal?: number;
  campaignsTotalPages?: number;
  campaignsSummary?: CampaignsListSummary;
  onCampaignsPageChange?: (page: number) => void;
  onCreateCampaign: (name: string) => Promise<CampaignRecord | null>;
  onCampaignUpdated?: (campaign: CampaignRecord) => void;
  routeCampaignId?: string;
  routeWorkspaceTab?: CampaignWorkspaceTab;
  routeReportMetric?: ReportMetricKey | null;
  routeWhatsAppContactKey?: string | null;
  onAddFromSearchHistory?: () => void;
  onRevealQuotaExceeded?: (message: string) => void;
};

export function CampaignsPanel({
  currentPlanId,
  planResolved = false,
  pricingPlans = null,
  pricingPlansReady = false,
  onViewPlans,
  onGoToIntegrations,
  campaigns,
  campaignsLoading = false,
  campaignsPage = 1,
  campaignsTotal = 0,
  campaignsTotalPages = 1,
  campaignsSummary = { total: 0, active: 0, contacts: 0 },
  onCampaignsPageChange,
  onCreateCampaign,
  onCampaignUpdated,
  routeCampaignId = "",
  routeWorkspaceTab = "Editor",
  routeReportMetric = null,
  routeWhatsAppContactKey = null,
  onAddFromSearchHistory,
  onRevealQuotaExceeded,
}: Props) {
  const router = useRouter();
  const planAccessOpts = { plansReady: pricingPlansReady };
  const campaignsAllowed = hasCampaignsAccess(currentPlanId, pricingPlans, planAccessOpts);
  const pricingAccessPending = !pricingPlansReady;

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [fetchedCampaign, setFetchedCampaign] = useState<CampaignRecord | null>(null);
  const [fetchCampaignLoading, setFetchCampaignLoading] = useState(false);
  const [fetchCampaignAttempted, setFetchCampaignAttempted] = useState(false);
  const [fetchCampaignError, setFetchCampaignError] = useState("");
  const [workspaceTab, setWorkspaceTab] =
    useState<CampaignWorkspaceTab>(routeWorkspaceTab);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  /** Keeps workspace mounted during brief refetch / tab URL updates. */
  const [cachedWorkspaceCampaign, setCachedWorkspaceCampaign] =
    useState<CampaignRecord | null>(null);
  const [campaignNavHint, setCampaignNavHint] = useState<{
    campaignId: string;
    outreachChannel: CampaignOutreachChannel | null;
    hasJobDescription: boolean;
  } | null>(null);

  const activeCampaignId = routeCampaignId.trim() || null;
  const listCampaign =
    activeCampaignId
      ? campaigns.find((c) => c.id === activeCampaignId) ?? null
      : null;
  const resolvedCampaign = listCampaign ?? fetchedCampaign;
  const workspaceCampaign =
    resolvedCampaign ??
    (cachedWorkspaceCampaign?.id === activeCampaignId ? cachedWorkspaceCampaign : null);

  useEffect(() => {
    if (!resolvedCampaign) return;
    setCachedWorkspaceCampaign(resolvedCampaign);
    setCampaignNavHint({
      campaignId: resolvedCampaign.id,
      outreachChannel: resolveCampaignOutreachChannel(resolvedCampaign.outreachChannel),
      hasJobDescription: Boolean(resolvedCampaign.jobDescription?.trim()),
    });
  }, [resolvedCampaign]);

  useEffect(() => {
    if (!activeCampaignId) {
      setCachedWorkspaceCampaign(null);
      setCampaignNavHint(null);
    }
  }, [activeCampaignId]);

  useLayoutEffect(() => {
    if (!activeCampaignId) {
      setFetchCampaignLoading(false);
      setFetchCampaignAttempted(true);
      setFetchCampaignError("");
      return;
    }
    if (listCampaign) {
      setFetchCampaignLoading(false);
      setFetchCampaignAttempted(true);
      setFetchCampaignError("");
      return;
    }
    setFetchCampaignLoading(true);
    setFetchCampaignAttempted(false);
    setFetchCampaignError("");
  }, [activeCampaignId, listCampaign]);

  useEffect(() => {
    if (!activeCampaignId) {
      setFetchedCampaign(null);
      return;
    }
    if (listCampaign) {
      setFetchedCampaign(null);
      return;
    }
    if (campaignsLoading) return;

    let cancelled = false;
    void (async () => {
      const auth = getStoredAuth();
      if (!auth?.token) {
        if (!cancelled) {
          setFetchCampaignLoading(false);
          setFetchCampaignAttempted(true);
        }
        return;
      }
      try {
        const record = await fetchCampaign(auth.token, activeCampaignId);
        if (!cancelled) {
          setFetchedCampaign(record);
          setFetchCampaignError("");
        }
      } catch (err) {
        if (!cancelled) {
          setFetchedCampaign(null);
          setFetchCampaignError(
            err instanceof Error ? err.message : "Campaign not found"
          );
        }
      } finally {
        if (!cancelled) {
          setFetchCampaignLoading(false);
          setFetchCampaignAttempted(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCampaignId, listCampaign, campaignsLoading]);

  const awaitingCampaignResolve =
    Boolean(activeCampaignId) &&
    !workspaceCampaign &&
    (campaignsLoading || fetchCampaignLoading || !fetchCampaignAttempted);

  const skeletonNavHint =
    campaignNavHint?.campaignId === activeCampaignId ? campaignNavHint : null;

  /** Full skeleton only on first load (no campaigns yet). */
  const showListShimmer =
    !planResolved ||
    pricingAccessPending ||
    (campaignsLoading && campaignsTotal === 0 && campaignsAllowed);

  const showPlanLocked =
    planResolved &&
    pricingPlansReady &&
    !campaignsAllowed &&
    !campaignsLoading &&
    campaignsTotal === 0;
  const showEmptyList =
    planResolved && campaignsAllowed && !campaignsLoading && campaignsTotal === 0;
  const showPagination = campaignsTotalPages > 1;

  useEffect(() => {
    const channel = resolveCampaignOutreachChannel(workspaceCampaign?.outreachChannel);
    setWorkspaceTab(normalizeCampaignWorkspaceTab(routeWorkspaceTab, channel));
  }, [routeWorkspaceTab, activeCampaignId, workspaceCampaign?.outreachChannel]);

  useEffect(() => {
    const onPopState = () => {
      const tab = parseCampaignWorkspaceTabFromPathname(window.location.pathname);
      if (!tab) return;
      const channel = resolveCampaignOutreachChannel(workspaceCampaign?.outreachChannel);
      setWorkspaceTab(normalizeCampaignWorkspaceTab(tab, channel));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [workspaceCampaign?.outreachChannel]);

  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [campaignsPage]);

  const selectWorkspaceTab = useCallback(
    (tab: CampaignWorkspaceTab) => {
      setWorkspaceTab(tab);
      const campaign = workspaceCampaign;
      if (!campaign || campaign.id !== activeCampaignId) return;
      replaceCampaignWorkspaceUrl(campaign.id, tab);
    },
    [activeCampaignId, workspaceCampaign]
  );

  const openReportMetric = useCallback(
    (metric: ReportMetricKey) => {
      if (!workspaceCampaign) return;
      router.push(pathForCampaignReportMetric(workspaceCampaign.id, metric));
    },
    [workspaceCampaign, router]
  );

  const closeReportMetric = useCallback(() => {
    if (!workspaceCampaign) return;
    replaceCampaignWorkspaceUrl(workspaceCampaign.id, "Report");
    setWorkspaceTab("Report");
  }, [workspaceCampaign]);

  const openWhatsAppConversation = useCallback(
    (candidateKey: string) => {
      const key = candidateKey.trim();
      if (!workspaceCampaign || !key) return;
      setWorkspaceTab("WhatsApp");
      router.push(pathForCampaignWhatsAppConversation(workspaceCampaign.id, key));
    },
    [workspaceCampaign, router]
  );

  const openCampaign = useCallback(
    (campaignId: string, tab: CampaignWorkspaceTab = "Editor") => {
      const listMatch = campaigns.find((c) => c.id === campaignId);
      const channel = resolveCampaignOutreachChannel(listMatch?.outreachChannel);
      const initialTab =
        tab === "Editor" ? defaultCampaignWorkspaceTab(channel) : tab;
      setWorkspaceTab(initialTab);
      router.push(pathForCampaignWorkspace(campaignId, initialTab));
    },
    [campaigns, router]
  );

  const handleCampaignUpdated = useCallback(
    (updated: CampaignRecord) => {
      setCachedWorkspaceCampaign((prev) => (prev?.id === updated.id ? updated : prev));
      setCampaignNavHint((prev) =>
        prev?.campaignId === updated.id
          ? {
              campaignId: updated.id,
              outreachChannel: resolveCampaignOutreachChannel(updated.outreachChannel),
              hasJobDescription: Boolean(updated.jobDescription?.trim()),
            }
          : prev
      );
      setFetchedCampaign((prev) => (prev?.id === updated.id ? updated : prev));
      onCampaignUpdated?.(updated);
    },
    [onCampaignUpdated]
  );

  const openCreateModal = () => {
    if (!campaignsAllowed) {
      onViewPlans();
      return;
    }
    setCreateOpen(true);
  };

  const handleCreateCampaign = async (payload: CreateCampaignPayload) => {
    if (createBusy) return;
    setCreateBusy(true);
    try {
      const record = await onCreateCampaign(payload.name);
      if (!record) {
        throw new Error("Could not create campaign. Please try again.");
      }
      setCreateOpen(false);
      openCampaign(record.id, "Editor");
    } finally {
      setCreateBusy(false);
    }
  };

  const createModal = (
    <CreateCampaignModal
      open={createOpen}
      busy={createBusy}
      onClose={() => !createBusy && setCreateOpen(false)}
      onCreate={handleCreateCampaign}
    />
  );

  if (activeCampaignId && !workspaceCampaign) {
    return (
      <>
        <section className="dashboard-card dashboard-card--fill dashboard-campaign-workspace-card flex h-full min-w-0 max-w-full w-full flex-col overflow-hidden p-0">
          {awaitingCampaignResolve ? (
            <CampaignWorkspaceSkeleton
              workspaceTab={workspaceTab}
              outreachChannel={inferCampaignWorkspaceChannel(
                workspaceTab,
                listCampaign?.outreachChannel ?? skeletonNavHint?.outreachChannel ?? null
              )}
              hasJobDescription={
                Boolean(listCampaign?.jobDescription?.trim()) ||
                Boolean(skeletonNavHint?.hasJobDescription)
              }
            />
          ) : (
            <div className="dashboard-card-body-scroll flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-[#5f6368]">
                {fetchCampaignError || "Campaign not found."}
              </p>
              <Link
                href={pathForCampaignsList()}
                className="dashboard-btn-primary px-4 py-2 text-sm"
              >
                Back to campaigns
              </Link>
            </div>
          )}
        </section>
        {createModal}
      </>
    );
  }

  if (workspaceCampaign) {
    return (
      <>
        <section className="dashboard-card dashboard-card--fill dashboard-campaign-workspace-card flex h-full min-w-0 max-w-full w-full flex-col overflow-hidden p-0">
          <CampaignWorkspace
            campaign={workspaceCampaign}
            workspaceTab={workspaceTab}
            reportMetric={routeReportMetric}
            onWorkspaceTabChange={selectWorkspaceTab}
            onOpenReportMetric={openReportMetric}
            onCloseReportMetric={closeReportMetric}
            onViewWhatsAppConversation={openWhatsAppConversation}
            whatsappContactKey={routeWhatsAppContactKey}
            onBack={() => router.push(pathForCampaignsList())}
            onCampaignUpdated={handleCampaignUpdated}
            onGoToIntegrations={onGoToIntegrations}
            onAddFromSearchHistory={onAddFromSearchHistory}
            onRevealQuotaExceeded={onRevealQuotaExceeded}
          />
        </section>
        {createModal}
      </>
    );
  }

  const campaignCountLabel = `${campaignsTotal.toLocaleString()} campaign${
    campaignsTotal === 1 ? "" : "s"
  }`;

  return (
    <>
      <section className="dashboard-card dashboard-card--fill dashboard-campaigns-panel flex h-full min-w-0 max-w-full w-full flex-col">
        <div className="dashboard-card-panel-header dashboard-campaigns-panel-header">
          <div className="dashboard-results-toolbar">
            <div className="min-w-0 flex-1">
              <h3 className="dashboard-section-title flex items-center gap-2">
                <MaterialIcon name="flag" className="text-xl text-[#0050cb]" />
                Campaigns
              </h3>
              <p className="dashboard-text-body mt-1">
                Organize outreach sequences and contacts into reusable campaigns.
              </p>
            </div>
            <div className="dashboard-results-toolbar-actions">
              {!showListShimmer && campaignsTotal > 0 ? (
                <span
                  className="dashboard-results-toolbar-badge tabular-nums"
                  title={campaignCountLabel}
                >
                  {campaignCountLabel}
                </span>
              ) : null}
              <button
                type="button"
                disabled={!planResolved || !campaignsAllowed}
                onClick={openCreateModal}
                className="dashboard-btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-55"
              >
                <MaterialIcon name="add" className="text-sm" />
                New campaign
              </button>
            </div>
          </div>
        </div>

        <div
          ref={listScrollRef}
          className="dashboard-card-body-scroll dashboard-campaigns-panel-body"
        >
          {showListShimmer ? (
            <CampaignsListSkeleton count={5} />
          ) : showPlanLocked ? (
            <div className="dashboard-integration-notice-wrap">
              <p className="dashboard-alert-notice">{CAMPAIGNS_LOCKED_MESSAGE}</p>
              <button
                type="button"
                onClick={onViewPlans}
                className="dashboard-btn-primary mt-3 px-4 py-2 text-sm"
              >
                <MaterialIcon name="workspace_premium" className="text-base" />
                View plans
              </button>
            </div>
          ) : showEmptyList ? (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-state-icon">
                <MaterialIcon name="flag" className="text-[28px]" />
              </div>
              <p className="mt-4 text-base font-semibold text-[#141b2b]">No campaigns yet</p>
              <p className="mt-2 max-w-sm text-sm text-[#424656]">
                Create a campaign to group outreach plans, contacts, and performance across your
                pipeline.
              </p>
              {campaignsAllowed ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="dashboard-btn-primary mt-6"
                >
                  <MaterialIcon name="add" className="text-base" />
                  New campaign
                </button>
              ) : (
                <button type="button" onClick={onViewPlans} className="dashboard-btn-primary mt-6">
                  <MaterialIcon name="workspace_premium" className="text-base" />
                  View plans
                </button>
              )}
            </div>
          ) : (
            <CampaignsListTable
              campaigns={campaigns}
              summary={campaignsSummary}
              loading={campaignsLoading}
              onOpenCampaign={(id) => openCampaign(id, "Editor")}
            />
          )}
        </div>

        {showPagination && !showListShimmer && !showEmptyList && !showPlanLocked ? (
          <div className="dashboard-campaigns-pagination dashboard-pagination shrink-0">
            <p className="dashboard-pagination-label tabular-nums">
              Page {campaignsPage} of {campaignsTotalPages}
              <span className="text-[#424656]/80">
                {" "}
                · {campaignsTotal.toLocaleString()} total
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={campaignsLoading || campaignsPage <= 1}
                onClick={() => onCampaignsPageChange?.(campaignsPage - 1)}
                className={`${dashboardBtnSecondaryClass} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <MaterialIcon name="chevron_left" className="text-sm" />
                Previous
              </button>
              <button
                type="button"
                disabled={campaignsLoading || campaignsPage >= campaignsTotalPages}
                onClick={() => onCampaignsPageChange?.(campaignsPage + 1)}
                className={`${dashboardBtnSecondaryClass} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Next
                <MaterialIcon name="chevron_right" className="text-sm" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {createModal}
    </>
  );
}
