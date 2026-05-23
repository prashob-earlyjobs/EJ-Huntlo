"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CampaignWorkspace,
} from "@/components/dashboard/CampaignWorkspace";
import { CampaignsListSkeleton } from "@/components/dashboard/CampaignsListSkeleton";
import { CampaignWorkspaceSkeleton } from "@/components/dashboard/CampaignWorkspaceSkeleton";
import {
  CreateCampaignModal,
  type CreateCampaignPayload,
} from "@/components/dashboard/CreateCampaignModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignRecord } from "@/lib/campaigns";
import { fetchCampaign } from "@/lib/campaignsApi";
import { getStoredAuth } from "@/lib/auth";
import {
  parseCampaignWorkspaceTabFromPathname,
  pathForCampaignWorkspace,
  pathForCampaignsList,
  replaceCampaignWorkspaceUrl,
  type CampaignWorkspaceTab,
} from "@/lib/campaignRoutes";

const ENTERPRISE_PLAN_ID = "enterprise";
const ENTERPRISE_LOCKED_MESSAGE =
  "Campaigns are available on the Enterprise plan. Upgrade to organize and run outreach campaigns.";

type Props = {
  currentPlanId: string;
  /** False until /api/users/me (or dashboard overview) has set the real plan id. */
  planResolved?: boolean;
  onViewPlans: () => void;
  campaigns: CampaignRecord[];
  campaignsLoading?: boolean;
  onCreateCampaign: (name: string) => Promise<CampaignRecord | null>;
  onCampaignUpdated?: (campaign: CampaignRecord) => void;
  routeCampaignId?: string;
  routeWorkspaceTab?: CampaignWorkspaceTab;
};

export function CampaignsPanel({
  currentPlanId,
  planResolved = false,
  onViewPlans,
  campaigns,
  campaignsLoading = false,
  onCreateCampaign,
  onCampaignUpdated,
  routeCampaignId = "",
  routeWorkspaceTab = "Editor",
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
  const [listReady, setListReady] = useState(false);

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

  useEffect(() => {
    if (!campaignsLoading) setListReady(true);
  }, [campaignsLoading]);

  /** Shimmer until plan is known, campaigns load, or list has hydrated once. */
  const showListShimmer =
    !planResolved ||
    campaignsLoading ||
    (isEnterprise && !listReady);

  const showEnterpriseLocked =
    planResolved && !isEnterprise && !campaignsLoading && campaigns.length === 0;

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

  const selectWorkspaceTab = useCallback(
    (tab: CampaignWorkspaceTab) => {
      setWorkspaceTab(tab);
      if (resolvedCampaign) {
        replaceCampaignWorkspaceUrl(resolvedCampaign.id, tab);
      }
    },
    [resolvedCampaign]
  );

  const openCampaign = useCallback(
    (campaignId: string, tab: CampaignWorkspaceTab = "Editor") => {
      setWorkspaceTab(tab);
      router.push(pathForCampaignWorkspace(campaignId, tab));
    },
    [router]
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
            <CampaignWorkspaceSkeleton />
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
            onWorkspaceTabChange={selectWorkspaceTab}
            onBack={() => router.push(pathForCampaignsList())}
            onCampaignUpdated={onCampaignUpdated}
          />
        </section>
        {createModal}
      </>
    );
  }

  return (
    <>
      <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
        <div className="dashboard-card-panel-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="dashboard-section-title flex items-center gap-2">
              <MaterialIcon name="flag" className="text-xl text-[#0050cb]" />
              Campaigns
            </h3>
            <p className="dashboard-text-body mt-1">
              Organize outreach sequences and contacts into reusable campaigns.
            </p>
          </div>
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

        <div className="dashboard-card-body-scroll dashboard-outreach-panel-body mt-4 flex flex-1 flex-col">
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
                View Enterprise plan
              </button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
              <MaterialIcon name="flag" className="text-4xl text-slate-400" />
              <p className="text-base font-semibold text-[#141b2b]">No campaigns yet</p>
              <p className="dashboard-text-body max-w-sm">
                Create a campaign to group outreach plans and track sends across your pipeline.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <button
                    type="button"
                    onClick={() => openCampaign(campaign.id, "Editor")}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#0050cb]/40 hover:bg-[#f8f9ff]"
                  >
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#0050cb]/15 bg-[#0050cb]/10 text-[#0050cb]"
                      aria-hidden
                    >
                      <MaterialIcon name="flag" className="text-xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#141b2b]">
                        {campaign.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {campaign.contacts.length} contact
                        {campaign.contacts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <MaterialIcon name="chevron_right" className="shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {createModal}
    </>
  );
}
