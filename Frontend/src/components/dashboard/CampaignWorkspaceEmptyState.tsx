"use client";

import type { ReactNode } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";

export type CampaignWorkspaceEmptyAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

type Props = {
  title: string;
  description: ReactNode;
  brand?: "gmail" | "whatsapp";
  icon?: string;
  actions?: CampaignWorkspaceEmptyAction[];
  className?: string;
};

export function CampaignWorkspaceEmptyState({
  title,
  description,
  brand,
  icon = "group",
  actions = [],
  className = "",
}: Props) {
  return (
    <div className={`dashboard-campaign-empty-state${className ? ` ${className}` : ""}`}>
      <div className="dashboard-empty-state dashboard-campaign-empty-state-card">
        <div
          className={`dashboard-empty-state-icon${
            brand === "whatsapp"
              ? " dashboard-campaign-empty-state-icon--whatsapp"
              : brand === "gmail"
                ? " dashboard-campaign-empty-state-icon--gmail"
                : ""
          }`}
        >
          {brand ? (
            <IntegrationBrandLogo
              provider={brand}
              title={brand === "whatsapp" ? "WhatsApp" : "Gmail"}
              className="h-7 w-7"
            />
          ) : (
            <MaterialIcon name={icon} className="text-[28px]" />
          )}
        </div>
        <p className="dashboard-campaign-empty-state-title">{title}</p>
        <p className="dashboard-campaign-empty-state-desc">{description}</p>
        {actions.length > 0 ? (
          <div className="dashboard-campaign-empty-state-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`${dashboardBtnSecondaryClass} dashboard-campaign-empty-state-btn`}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
