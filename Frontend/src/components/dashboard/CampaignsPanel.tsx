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
  parseCampaignWorkspaceTabFromPathname,
  pathForCampaignReportMetric,
  pathForCampaignWhatsAppConversation,
  pathForCampaignWorkspace,
  pathForCampaignsList,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";
import { dashboardBtnSecondaryClass } from "@/lib/dashboardStyles";

const ENTERPRISE_PLAN_ID = "enterprise";
const ENTERPRISE_LOCKED_MESSAGE =
  "Campaigns are available on the Enterprise plan. Upgrade to organize and run outreach campaigns.";

type Props = {
  currentPlanId: string;
  /** False until /api/users/me (or dashboard overview) has set the real plan id. */
  planResolved?: boolean;
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
};

export function CampaignsPanel({
  currentPlanId,
  planResolved = false,
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
}: Props) {
  const router = useRouter();
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [fetchedCampaign, setFetchedCampaign] = useState<CampaignRecord | null>(null);
  const [fetchCampaignLoading, setFetchCampaignLoading] = useState(false);
  const [fetchCampaignAttempted, setFetchCampaignAttempted] = useState(false);
  const [fetchCampaignError, setFetchCampaignError] = useState("");
  const [workspaceTab, setWorkspaceTab] =
    useState<CampaignWorkspaceTab>(routeWorkspaceTab);
  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const activeCampaignId = routeCampaignId.trim() || null;
  const listCampaign =
    activeCampaignId
      ? campaigns.find((c) => c.id === activeCampaignId) ?? null
      : null;
  const resolvedCampaign = listCampaign ?? fetchedCampaign;

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
    !resolvedCampaign &&
    (campaignsLoading || fetchCampaignLoading || !fetchCampaignAttempted);

  /** Full skeleton only on first load (no campaigns yet). */
  const showListShimmer =
    !planResolved || (campaignsLoading && campaignsTotal === 0 && isEnterprise);

  const showEnterpriseLocked =
    planResolved && !isEnterprise && !campaignsLoading && campaignsTotal === 0;
  const showEmptyList =
    planResolved && isEnterprise && !campaignsLoading && campaignsTotal === 0;
  const showPagination = campaignsTotalPages > 1;

  useEffect(() => {
    setWorkspaceTab(routeWorkspaceTab);
  }, [routeWorkspaceTab, activeCampaignId]);

  useEffect(() => {
    const onPopState = () => {
      const tab = parseCampaignWorkspaceTabFromPathname(window.location.pathname);
      if (tab) setWorkspaceTab(tab);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [campaignsPage]);

  const selectWorkspaceTab = useCallback(
    (tab: CampaignWorkspaceTab) => {
      setWorkspaceTab(tab);
      if (resolvedCampaign) {
        router.push(pathForCampaignWorkspace(resolvedCampaign.id, tab));
      }
    },
    [resolvedCampaign, router]
  );

  const openReportMetric = useCallback(
    (metric: ReportMetricKey) => {
      if (!resolvedCampaign) return;
      router.push(pathForCampaignReportMetric(resolvedCampaign.id, metric));
    },
    [resolvedCampaign, router]
  );

  const closeReportMetric = useCallback(() => {
    if (!resolvedCampaign) return;
    router.push(pathForCampaignWorkspace(resolvedCampaign.id, "Report"));
  }, [resolvedCampaign, router]);

  const openWhatsAppConversation = useCallback(
    (candidateKey: string) => {
      const key = candidateKey.trim();
      if (!resolvedCampaign || !key) return;
      setWorkspaceTab("WhatsApp");
      router.push(pathForCampaignWhatsAppConversation(resolvedCampaign.id, key));
    },
    [resolvedCampaign, router]
  );

  const openCampaign = useCallback(
    (campaignId: string, tab: CampaignWorkspaceTab = "Editor") => {
      setWorkspaceTab(tab);
      router.push(pathForCampaignWorkspace(campaignId, tab));
    },
    [router]
  );

  const handleCampaignUpdated = useCallback(
    (updated: CampaignRecord) => {
      setFetchedCampaign((prev) => (prev?.id === updated.id ? updated : prev));
      onCampaignUpdated?.(updated);
    },
    [onCampaignUpdated]
  );

  const openCreateModal = () => {
    if (!isEnterprise) {
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
      if (!record) return;
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

  if (activeCampaignId && !resolvedCampaign) {
    return (
      <>
        <section className="dashboard-card dashboard-card--fill dashboard-campaign-workspace-card flex h-full min-w-0 max-w-full w-full flex-col overflow-hidden p-0">
          {awaitingCampaignResolve ? (
            <CampaignWorkspaceSkeleton workspaceTab={routeWorkspaceTab} />
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

  if (resolvedCampaign) {
    return (
      <>
        <section className="dashboard-card dashboard-card--fill dashboard-campaign-workspace-card flex h-full min-w-0 max-w-full w-full flex-col overflow-hidden p-0">
          <CampaignWorkspace
            campaign={resolvedCampaign}
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
                disabled={!planResolved || !isEnterprise}
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
          ) : showEnterpriseLocked ? (
            <div className="dashboard-integration-notice-wrap">
              <p className="dashboard-alert-notice">{ENTERPRISE_LOCKED_MESSAGE}</p>
              <button
                type="button"
                onClick={onViewPlans}
                className="dashboard-btn-primary mt-3 px-4 py-2 text-sm"
              >
                <MaterialIcon name="workspace_premium" className="text-base" />
                View Enterprise plan
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
              {isEnterprise ? (
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
                  View Enterprise plan
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

        {showPagination && !showListShimmer && !showEmptyList && !showEnterpriseLocked ? (
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
                className={`${dashboardBtnSecondaryClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <MaterialIcon name="chevron_left" className="text-base" />
                Previous
              </button>
              <button
                type="button"
                disabled={campaignsLoading || campaignsPage >= campaignsTotalPages}
                onClick={() => onCampaignsPageChange?.(campaignsPage + 1)}
                className={`${dashboardBtnSecondaryClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Next
                <MaterialIcon name="chevron_right" className="text-base" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {createModal}
    </>
  );
}
