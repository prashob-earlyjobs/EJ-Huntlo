"use client";

import { OutreachPanelSkeleton } from "@/components/dashboard/OutreachPanelSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  hasCampaignsAndIntegrationsAccess,
  OUTREACHES_LOCKED_MESSAGE,
} from "@/lib/planAccess";

type Props = {
  currentPlanId: string;
  /** False until /api/users/me has set the real plan id. */
  planResolved?: boolean;
  onViewPlans: () => void;
  onCreateOutreach?: () => void;
  externalNotice?: string;
  onClearNotice?: () => void;
};

export function EmailOutreachPanel({
  currentPlanId,
  planResolved = false,
  onViewPlans,
  onCreateOutreach,
  externalNotice,
  onClearNotice,
}: Props) {
  const hasOutreachAccess = hasCampaignsAndIntegrationsAccess(currentPlanId);
  const showShimmer = !planResolved;
  const showPlanLocked = planResolved && !hasOutreachAccess;

  const handleNewOutreach = () => {
    onClearNotice?.();
    if (!hasOutreachAccess) {
      onViewPlans();
      return;
    }
    onCreateOutreach?.();
  };

  return (
    <section className="dashboard-card dashboard-card--fill dashboard-outreach-panel flex h-full min-w-0 max-w-full w-full flex-col">
      <div className="dashboard-card-panel-header dashboard-outreach-panel-header flex flex-wrap items-center justify-between gap-3">
        <h3 className="dashboard-outreach-panel-title flex items-center gap-1.5">
          <MaterialIcon name="forward_to_inbox" className="text-base text-[#0050cb]" />
          Outreaches
        </h3>
        <button
          type="button"
          onClick={handleNewOutreach}
          disabled={showShimmer}
          className="dashboard-btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-55"
        >
          <MaterialIcon name="add" className="text-sm" />
          New outreach
        </button>
      </div>

      <div className="dashboard-card-body-scroll dashboard-outreach-panel-body flex flex-1 flex-col">
        {showShimmer ? (
          <OutreachPanelSkeleton />
        ) : showPlanLocked ? (
          <div className="dashboard-integration-notice-wrap">
            <p className="dashboard-alert-notice">{OUTREACHES_LOCKED_MESSAGE}</p>
            <button
              type="button"
              onClick={onViewPlans}
              className="dashboard-btn-primary mt-3 px-4 py-2 text-sm"
            >
              View plans
            </button>
          </div>
        ) : externalNotice ? (
          <p className="dashboard-alert-notice dashboard-outreach-notice">{externalNotice}</p>
        ) : null}
      </div>
    </section>
  );
}
