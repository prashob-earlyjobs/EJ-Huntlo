"use client";

import { useState } from "react";

import {
  CampaignWorkspace,
} from "@/components/dashboard/CampaignWorkspace";
import {
  CreateCampaignModal,
  type CreateCampaignPayload,
} from "@/components/dashboard/CreateCampaignModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { CampaignRecord } from "@/lib/campaigns";

const ENTERPRISE_PLAN_ID = "enterprise";
const ENTERPRISE_LOCKED_MESSAGE =
  "Campaigns are available on the Enterprise plan. Upgrade to organize and run outreach campaigns.";

type Props = {
  currentPlanId: string;
  onViewPlans: () => void;
  campaigns: CampaignRecord[];
  campaignsLoading?: boolean;
  onCreateCampaign: (name: string) => Promise<CampaignRecord | null>;
  onCampaignUpdated?: (campaign: CampaignRecord) => void;
};

export function CampaignsPanel({
  currentPlanId,
  onViewPlans,
  campaigns,
  campaignsLoading = false,
  onCreateCampaign,
  onCampaignUpdated,
}: Props) {
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const activeCampaign =
    campaigns.find((c) => c.id === activeCampaignId) ?? null;

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
      setActiveCampaignId(record.id);
    } finally {
      setCreateBusy(false);
    }
  };

  const createModal = (
    <CreateCampaignModal
      open={createOpen}
      onClose={() => !createBusy && setCreateOpen(false)}
      onCreate={handleCreateCampaign}
    />
  );

  if (activeCampaign) {
    return (
      <>
        <section className="dashboard-card dashboard-card--fill dashboard-campaign-workspace-card flex h-full min-w-0 max-w-full w-full flex-col overflow-hidden p-0">
          <CampaignWorkspace
            campaign={activeCampaign}
            onBack={() => setActiveCampaignId(null)}
            onCampaignUpdated={onCampaignUpdated}
          />
        </section>
        {createModal}
      </>
    );
  }

  return (
    <>
      <section className="dashboard-card dashboard-card--fill dashboard-outreach-panel flex h-full min-w-0 max-w-full w-full flex-col">
        <div className="dashboard-card-panel-header dashboard-outreach-panel-header flex flex-wrap items-center justify-between gap-3">
          <h3 className="dashboard-outreach-panel-title flex items-center gap-1.5">
            <MaterialIcon name="flag" className="text-base text-[#0050cb]" />
            Campaigns
          </h3>
          <button
            type="button"
            disabled={!isEnterprise}
            onClick={openCreateModal}
            className="dashboard-btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-55"
          >
            <MaterialIcon name="add" className="text-sm" />
            New campaign
          </button>
        </div>

        <div className="dashboard-card-body-scroll dashboard-outreach-panel-body flex flex-1 flex-col">
          {!isEnterprise ? (
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
          ) : campaignsLoading ? (
            <p className="dashboard-outreach-panel-desc py-12 text-center text-sm text-[#5f6368]">
              Loading campaigns…
            </p>
          ) : campaigns.length === 0 ? (
            <div className="dashboard-outreach-panel-desc flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
              <MaterialIcon name="flag" className="text-4xl text-[#80868b]" />
              <p className="dashboard-outreach-panel-desc-title text-base font-semibold text-[#202124]">
                No campaigns yet
              </p>
              <p className="max-w-sm text-sm text-[#5f6368]">
                Create a campaign to group outreach plans and track sends across your pipeline.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 p-1">
              {campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCampaignId(campaign.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-[#e8eaed] bg-white px-4 py-3 text-left transition-colors hover:border-[#d2e3fc] hover:bg-[#fafbff]"
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fe] text-[#0050cb]"
                      aria-hidden
                    >
                      <MaterialIcon name="flag" className="text-xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#202124]">
                        {campaign.name}
                      </p>
                      <p className="truncate text-xs text-[#5f6368]">
                        {campaign.contacts.length} contact
                        {campaign.contacts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <MaterialIcon
                      name="chevron_right"
                      className="shrink-0 text-[#9aa0a6]"
                      aria-hidden
                    />
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
