"use client";

import { Fragment } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  multiChannelEditorLabel,
  waitDaysBeforeChannel,
  type CampaignMultiChannelSetup,
} from "@/lib/campaignMultiChannelSetup";
import type { OutreachSequenceChannel } from "@/lib/campaignSetupPickerDraft";

type Props = {
  setup: CampaignMultiChannelSetup;
  disabled?: boolean;
  onSelectChannel: (channel: OutreachSequenceChannel) => void;
  onMoveChannel: (index: number, direction: -1 | 1) => void;
};

function ChannelIcon({
  channel,
  className,
}: {
  channel: OutreachSequenceChannel;
  className?: string;
}) {
  if (channel === "gmail") {
    return <IntegrationBrandLogo provider="gmail" title="Gmail" className={className} />;
  }
  if (channel === "whatsapp") {
    return <IntegrationBrandLogo provider="whatsapp" title="WhatsApp" className={className} />;
  }
  return (
    <span className="dashboard-campaign-channel-arrange-ai-icon" aria-hidden>
      <MaterialIcon name="record_voice_over" className="text-lg" />
    </span>
  );
}

export function CampaignMultiChannelEditorNav({
  setup,
  disabled,
  onSelectChannel,
  onMoveChannel,
}: Props) {
  const { channels, activeChannel, arrange } = setup;

  if (channels.length <= 1) return null;

  return (
    <div
      className="dashboard-campaign-multi-channel-editor-nav shrink-0 border-b border-slate-200 bg-white"
      aria-label="Outreach channels"
    >
      <p className="dashboard-campaign-sequence-subheading mb-3">Outreach channels</p>
      <div className="dashboard-campaign-multi-channel-editor-rail-scroll">
        <div className="dashboard-campaign-channel-arrange-flow" role="tablist">
          {channels.map((channel, index) => {
            const active = channel === activeChannel;
            const waitDays =
              index > 0
                ? waitDaysBeforeChannel(channels[index - 1], arrange.waitDaysByChannel)
                : null;
            return (
              <Fragment key={`${channel}-${index}`}>
                {index > 0 ? (
                  <div
                    className="dashboard-campaign-multi-channel-editor-connector"
                    aria-hidden
                  >
                    <span className="dashboard-campaign-multi-channel-editor-connector-line" />
                    <div className="dashboard-campaign-channel-arrange-flow-link-copy">
                      <span className="dashboard-campaign-channel-arrange-flow-link-label">
                        No reply?
                      </span>
                      <span className="dashboard-campaign-channel-arrange-flow-link-sub">
                        {waitDays}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="dashboard-campaign-channel-arrange-flow-segment">
                  <div
                    className={`dashboard-campaign-channel-arrange-flow-node${
                      active ? " dashboard-campaign-channel-arrange-flow-node--active" : ""
                    }`}
                  >
                    <div className="dashboard-campaign-multi-channel-editor-node-top">
                      <span className="dashboard-campaign-channel-arrange-flow-node-head">
                        <span className="dashboard-campaign-channel-arrange-flow-node-step">
                          Step {index + 1}
                        </span>
                      </span>
                      <div className="dashboard-campaign-channel-arrange-flow-node-moves">
                        <button
                          type="button"
                          className="dashboard-campaign-channel-arrange-move-btn"
                          disabled={disabled || index === 0}
                          aria-label={`Try ${multiChannelEditorLabel(channel)} sooner`}
                          onClick={() => onMoveChannel(index, -1)}
                        >
                          <MaterialIcon name="chevron_left" className="text-base" />
                        </button>
                        <button
                          type="button"
                          className="dashboard-campaign-channel-arrange-move-btn"
                          disabled={disabled || index === channels.length - 1}
                          aria-label={`Try ${multiChannelEditorLabel(channel)} later`}
                          onClick={() => onMoveChannel(index, 1)}
                        >
                          <MaterialIcon name="chevron_right" className="text-base" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={active}
                      disabled={disabled}
                      className="dashboard-campaign-multi-channel-editor-node-select"
                      onClick={() => onSelectChannel(channel)}
                    >
                      <span
                        className="dashboard-campaign-channel-arrange-flow-node-icon"
                        aria-hidden
                      >
                        <ChannelIcon
                          channel={channel}
                          className="dashboard-campaign-channel-arrange-brand"
                        />
                      </span>
                      <p className="dashboard-campaign-channel-arrange-flow-node-label">
                        {multiChannelEditorLabel(channel)}
                      </p>
                    </button>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
