"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import type { OutreachChannel } from "@/components/dashboard/outreach/types";

const CHANNEL_META: Record<
  OutreachChannel,
  { icon: string; title: string; description: string; bestUse: string; comingSoon?: boolean }
> = {
  whatsapp: {
    icon: "chat",
    title: "WhatsApp",
    description: "Reach candidates on their preferred messaging app.",
    bestUse: "Quick interest checks & follow-ups",
  },
  email: {
    icon: "mail",
    title: "Email",
    description: "Professional outreach with rich job details.",
    bestUse: "Formal introductions & job summaries",
  },
  voice: {
    icon: "record_voice_over",
    title: "AI Voice Call",
    description: "Automated voice outreach with natural AI conversation.",
    bestUse: "High-intent candidates who haven't replied",
  },
  linkedin: {
    icon: "work",
    title: "LinkedIn",
    description: "Connect on LinkedIn with personalized messages.",
    bestUse: "Professional networking outreach",
    comingSoon: true,
  },
};

type Props = {
  channel: OutreachChannel;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  showBestUse?: boolean;
};

export function ChannelCard({ channel, selected, onSelect, disabled, showBestUse = true }: Props) {
  const meta = CHANNEL_META[channel];
  const isDisabled = disabled || meta.comingSoon;

  return (
    <button
      type="button"
      className={`dashboard-outreach-channel-card${
        selected ? " dashboard-outreach-channel-card--selected" : ""
      }${isDisabled ? " dashboard-outreach-channel-card--disabled" : ""}`}
      onClick={isDisabled ? undefined : onSelect}
      disabled={isDisabled}
    >
      <span className="dashboard-outreach-channel-card-icon">
        <MaterialIcon name={meta.icon} />
      </span>
      <div className="dashboard-outreach-channel-card-body">
        <div className="dashboard-outreach-channel-card-head">
          <h4>{meta.title}</h4>
          {meta.comingSoon ? (
            <span className="dashboard-outreach-badge dashboard-outreach-badge--muted">Coming soon</span>
          ) : null}
          {selected ? (
            <span className="dashboard-outreach-badge dashboard-outreach-badge--ai">Selected</span>
          ) : null}
        </div>
        <p>{meta.description}</p>
        {showBestUse ? (
          <p className="dashboard-outreach-channel-card-best">
            <MaterialIcon name="lightbulb" className="text-sm" />
            {meta.bestUse}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function getChannelLabel(channel: OutreachChannel): string {
  return CHANNEL_META[channel].title;
}

export function getChannelIcon(channel: OutreachChannel): string {
  return CHANNEL_META[channel].icon;
}
