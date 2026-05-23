"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

const ENTERPRISE_PLAN_ID = "enterprise";
const ENTERPRISE_LOCKED_MESSAGE =
  "Outreaches are available on the Enterprise plan. Upgrade to create outreach plans and send from Gmail.";

type Props = {
  currentPlanId: string;
  onViewPlans: () => void;
  onCreateOutreach?: () => void;
  externalNotice?: string;
  onClearNotice?: () => void;
};

export function EmailOutreachPanel({
  currentPlanId,
  onViewPlans,
  onCreateOutreach,
  externalNotice,
  onClearNotice,
}: Props) {
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;

  const handleNewOutreach = () => {
    onClearNotice?.();
    if (!isEnterprise) {
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
          className="dashboard-btn-primary shrink-0 px-3 py-1.5 text-xs"
        >
          <MaterialIcon name="add" className="text-sm" />
          New outreach
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
        ) : externalNotice ? (
          <p className="dashboard-alert-notice dashboard-outreach-notice">{externalNotice}</p>
        ) : null}
      </div>
    </section>
  );
}
