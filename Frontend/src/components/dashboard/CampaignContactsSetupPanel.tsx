"use client";

import { CampaignPreLaunchContactsPanel } from "@/components/dashboard/CampaignPreLaunchContactsPanel";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
} from "@/lib/dashboardStyles";
import type { CampaignContact } from "@/lib/campaigns";

type Channel = "gmail" | "whatsapp" | "voice_call";

type Props = {
  channel: Channel;
  contacts: CampaignContact[];
  totalContacts: number;
  page: number;
  totalPages: number;
  loading?: boolean;
  error?: string;
  revealInProgress?: boolean;
  contactsLocked?: boolean;
  removingKey?: string;
  selectable?: boolean;
  selectedKeys?: string[];
  onToggleContact?: (candidateKey: string, selected: boolean) => void;
  onToggleAllOnPage?: (candidateKeys: string[], selected: boolean) => void;
  onPageChange?: (page: number) => void;
  onAddFromSearchHistory?: () => void;
  onUploadCsv?: () => void;
  onRemoveContact?: (candidateKey: string) => void | Promise<void>;
  onRemoveSelectedContacts?: () => void | Promise<void>;
  removingSelected?: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function CampaignContactsSetupPanel({
  channel,
  onBack,
  onContinue,
  ...contactsProps
}: Props) {
  return (
    <div className="dashboard-campaign-editor-panel flex min-h-0 flex-1 flex-col">
      <div className="dashboard-campaign-report-toolbar shrink-0">
        <div className="dashboard-campaign-report-toolbar-row">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="dashboard-campaign-sequence-toolbar-icon" aria-hidden>
              <MaterialIcon name="group" className="text-xl" />
            </span>
            <div className="min-w-0">
              <h2 className="dashboard-campaign-report-title">Campaign contacts</h2>
              <p className="dashboard-campaign-report-subtitle">
                Add candidates for this campaign. Upload a CSV or pull from search history — you can
                also continue and add contacts later.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-campaign-contacts-setup-body min-h-0 flex-1 overflow-hidden">
        <CampaignPreLaunchContactsPanel channel={channel} setupStep {...contactsProps} />
      </div>

      <div className="dashboard-campaign-sequence-footer-actions shrink-0">
        <button
          type="button"
          onClick={onBack}
          className={`${dashboardBtnSecondaryClass} px-4 py-2.5 text-sm`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className={`${dashboardBtnPrimaryClass} px-5 py-2.5 text-sm`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
