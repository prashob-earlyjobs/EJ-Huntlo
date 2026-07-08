"use client";

import { getChannelIcon, getChannelLabel } from "@/components/dashboard/outreach/ChannelCard";
import type { OutreachChannel } from "@/components/dashboard/outreach/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Props = {
  channels: OutreachChannel[];
  activeChannel?: OutreachChannel | null;
};

export function OutreachAiGeneratingPanel({ channels, activeChannel = null }: Props) {
  const uniqueChannels = [...new Set(channels.filter((c) => c === "email" || c === "whatsapp"))];
  const headline = activeChannel
    ? `Generating ${getChannelLabel(activeChannel)} messages…`
    : "Generating outreach messages…";

  return (
    <div className="dashboard-outreach-ai-generating" role="status" aria-live="polite">
      <div className="dashboard-outreach-ai-generating-orbit" aria-hidden>
        <span className="dashboard-outreach-ai-generating-core">
          <MaterialIcon name="auto_awesome" />
        </span>
      </div>
      <h3 className="dashboard-outreach-ai-generating-title">{headline}</h3>
      <p className="dashboard-outreach-ai-generating-desc">
        Tailoring your sequence to the job description. This usually takes a few seconds.
      </p>
      <ul className="dashboard-outreach-ai-generating-channels">
        {uniqueChannels.map((channel) => {
          const isActive = !activeChannel || activeChannel === channel;
          return (
            <li
              key={channel}
              className={`dashboard-outreach-ai-generating-channel${
                isActive ? " dashboard-outreach-ai-generating-channel--active" : ""
              }`}
            >
              <MaterialIcon name={getChannelIcon(channel)} className="text-sm" />
              {getChannelLabel(channel)}
              {isActive ? <span className="dashboard-reveal-spinner" aria-hidden /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
