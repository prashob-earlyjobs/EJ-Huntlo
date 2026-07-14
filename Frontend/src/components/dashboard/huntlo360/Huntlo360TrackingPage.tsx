"use client";

import { CampaignTrackingPage } from "@/components/dashboard/outreach/CampaignTrackingPage";
import { Huntlo360JourneyBar } from "@/components/dashboard/huntlo360/Huntlo360JourneyBar";

type Props = {
  campaignId: string;
  onBack: () => void;
  onToast: (message: string) => void;
};

export function Huntlo360TrackingPage({ campaignId, onBack, onToast }: Props) {
  return (
    <div className="dashboard-huntlo360-tracking">
      <Huntlo360JourneyBar activePhase="track" />
      <CampaignTrackingPage
        campaignId={campaignId}
        onBack={onBack}
        onToast={onToast}
        backLabel="Back to Huntlo 360"
        scheduleFirst
      />
    </div>
  );
}
