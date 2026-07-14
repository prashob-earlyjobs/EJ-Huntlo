"use client";

import { useEffect, useMemo, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

type LaunchChannel = "whatsapp" | "gmail" | "voice";

type LaunchStep = {
  id: string;
  label: string;
  icon: string;
};

const LAUNCH_CONFIG: Record<
  LaunchChannel,
  {
    steps: LaunchStep[];
    title: string;
    subtitle: string;
    successText: string;
    launchedTitle: string;
    provider: "whatsapp" | "gmail" | "voice";
    overlayClass: string;
  }
> = {
  whatsapp: {
    steps: [
      { id: "save", label: "Saving WhatsApp sequence", icon: "save" },
      { id: "link", label: "Linking sequence to campaign", icon: "link" },
      { id: "enroll", label: "Enrolling campaign contacts", icon: "group_add" },
      { id: "agent", label: "Launching AI outreach agent", icon: "smart_toy" },
    ],
    title: "Launching WhatsApp Outreach agent",
    subtitle: "Your outreach agent is preparing WhatsApp messages for this campaign.",
    successText: "WhatsApp Outreach agent launched",
    launchedTitle: "WhatsApp Outreach agent launched",
    provider: "whatsapp",
    overlayClass: "",
  },
  gmail: {
    steps: [
      { id: "save", label: "Saving email sequence", icon: "save" },
      { id: "link", label: "Linking sequence to campaign", icon: "link" },
      { id: "enroll", label: "Enrolling campaign contacts", icon: "group_add" },
      { id: "send", label: "Starting Gmail outreach", icon: "mail" },
    ],
    title: "Launching Email Outreach agent",
    subtitle: "Your outreach agent is preparing Gmail messages for this campaign.",
    successText: "Email Outreach agent launched",
    launchedTitle: "Email Outreach agent launched",
    provider: "gmail",
    overlayClass: "dashboard-launch-agent-overlay--gmail",
  },
  voice: {
    steps: [
      { id: "save", label: "Saving voice screening", icon: "save" },
      { id: "script", label: "Preparing AI call script", icon: "description" },
      { id: "enroll", label: "Enrolling candidates", icon: "group_add" },
      { id: "calls", label: "Placing AI voice calls", icon: "call" },
    ],
    title: "Launching AI Voice Screening",
    subtitle: "Your screening agent is preparing voice calls for selected candidates.",
    successText: "Voice screening launched",
    launchedTitle: "Voice screening launched",
    provider: "voice",
    overlayClass: "dashboard-launch-agent-overlay--voice",
  },
};

/** Time each step stays active before advancing (ms). */
export const LAUNCH_AGENT_STEP_MS = 1600;

/** Hold all steps complete + full progress before closing (ms). */
export const LAUNCH_AGENT_COMPLETE_HOLD_MS = 1200;

const STEP_COUNT = LAUNCH_CONFIG.whatsapp.steps.length;

/** Minimum overlay duration (all steps finish, then progress at 100%). */
export const LAUNCH_AGENT_MIN_DURATION_MS =
  STEP_COUNT * LAUNCH_AGENT_STEP_MS + LAUNCH_AGENT_COMPLETE_HOLD_MS;

type Props = {
  open: boolean;
  channel?: LaunchChannel;
};

export function CampaignLaunchAgentOverlay({ open, channel = "whatsapp" }: Props) {
  const config = LAUNCH_CONFIG[channel];
  const steps = config.steps;
  const [activeStep, setActiveStep] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setAllComplete(false);
      return;
    }

    setActiveStep(0);
    setAllComplete(false);

    const timers: number[] = [];

    for (let i = 1; i < steps.length; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setActiveStep(i);
        }, LAUNCH_AGENT_STEP_MS * i)
      );
    }

    timers.push(
      window.setTimeout(() => {
        setAllComplete(true);
      }, LAUNCH_AGENT_STEP_MS * steps.length)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [open, steps.length]);

  const progressPercent = useMemo(() => {
    if (allComplete) return 100;
    return Math.round(
      ((activeStep + 1) / steps.length) *
        100 *
        (activeStep < steps.length - 1 ? 1 : 0.75)
    );
  }, [activeStep, allComplete, steps.length]);

  if (!open) return null;

  return (
    <div
      className={`dashboard-launch-agent-overlay${config.overlayClass ? ` ${config.overlayClass}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-agent-title"
      aria-busy={!allComplete}
    >
      <div className="dashboard-launch-agent-card">
        <div
          className={`dashboard-launch-agent-visual${
            allComplete ? " dashboard-launch-agent-visual--launched" : ""
          }`}
          aria-hidden
        >
          <span className="dashboard-launch-agent-orbit dashboard-launch-agent-orbit--1" />
          <span className="dashboard-launch-agent-orbit dashboard-launch-agent-orbit--2" />
          <span className="dashboard-launch-agent-orbit dashboard-launch-agent-orbit--3" />
          <span
            className={`dashboard-launch-agent-core${
              allComplete ? " dashboard-launch-agent-core--done" : ""
            }`}
          >
            <MaterialIcon
              name={allComplete ? "check" : config.provider === "voice" ? "record_voice_over" : "smart_toy"}
              className="dashboard-launch-agent-core-icon"
            />
          </span>
          <span className="dashboard-launch-agent-channel-badge">
            {config.provider === "voice" ? (
              <MaterialIcon
                name="record_voice_over"
                className="text-base text-[#0050cb]"
              />
            ) : (
              <IntegrationBrandLogo
                provider={config.provider}
                title={channel === "gmail" ? "Gmail" : "WhatsApp"}
                className="dashboard-integration-brand-logo--sm"
              />
            )}
          </span>
        </div>

        {!allComplete ? (
          <>
            <h3 id="launch-agent-title" className="dashboard-launch-agent-title">
              {config.title}
            </h3>
            <p className="dashboard-launch-agent-subtitle">{config.subtitle}</p>
          </>
        ) : (
          <h3 id="launch-agent-title" className="sr-only">
            {config.launchedTitle}
          </h3>
        )}

        <ol className="dashboard-launch-agent-steps">
          {steps.map((step, index) => {
            const done = allComplete || index < activeStep;
            const current = !allComplete && index === activeStep;
            return (
              <li
                key={step.id}
                className={`dashboard-launch-agent-step${
                  done ? " dashboard-launch-agent-step--done" : ""
                }${current ? " dashboard-launch-agent-step--active" : ""}`}
              >
                <span className="dashboard-launch-agent-step-icon" aria-hidden>
                  {done ? (
                    <MaterialIcon name="check_circle" className="text-lg text-emerald-600" />
                  ) : current ? (
                    <span className="dashboard-launch-agent-step-spinner" />
                  ) : (
                    <MaterialIcon name={step.icon} className="text-lg text-slate-300" />
                  )}
                </span>
                <span className="dashboard-launch-agent-step-label">{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="dashboard-launch-agent-progress" aria-hidden>
          <span
            className={`dashboard-launch-agent-progress-bar${
              allComplete ? " dashboard-launch-agent-progress-bar--done" : ""
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {allComplete ? (
          <div className="dashboard-launch-agent-success" role="status">
            <span className="dashboard-launch-agent-success-ring" aria-hidden />
            <span className="dashboard-launch-agent-success-icon" aria-hidden>
              <MaterialIcon name="rocket_launch" />
            </span>
            <span className="dashboard-launch-agent-success-text">{config.successText}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
