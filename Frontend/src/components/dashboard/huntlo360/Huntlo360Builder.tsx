"use client";

import { SingleChannelBuilder } from "@/components/dashboard/outreach/SingleChannelBuilder";
import type { CampaignDetailsForm, CandidateSource, OutreachChannel } from "@/components/dashboard/outreach/types";
import type { CampaignCalendlyAutomation } from "@/lib/campaigns";
import type { EmailSingleChannelMessage } from "@/lib/emailSingleChannelOutreach";
import type { WhatsAppSingleChannelMessage } from "@/lib/whatsappOutreach";

type Props = {
  onBack: () => void;
  onSaveDraft: (campaignId: string) => void;
  onLaunch: (campaignId: string) => void;
  onDraftSaved?: () => void;
  resumeCampaignId?: string;
  initialStep?: number;
  initialForm?: CampaignDetailsForm;
  initialChannel?: OutreachChannel;
  initialWhatsappMessage?: Partial<WhatsAppSingleChannelMessage>;
  initialEmailMessage?: Partial<EmailSingleChannelMessage> & { subject?: string };
  initialCalendlyAutomation?: CampaignCalendlyAutomation;
  initialSelectedIds?: string[];
  initialSource?: CandidateSource;
};

export function Huntlo360Builder(props: Props) {
  return <SingleChannelBuilder variant="huntlo360" {...props} />;
}
