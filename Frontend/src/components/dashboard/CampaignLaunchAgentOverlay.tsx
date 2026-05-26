"use client";

import { useEffect, useState } from "react";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

const LAUNCH_STEPS = [
  { id: "save", label: "Saving WhatsApp sequence", icon: "save" as const },
  { id: "link", label: "Linking sequence to campaign", icon: "link" as const },
  { id: "enroll", label: "Enrolling campaign contacts", icon: "group_add" as const },
  { id: "agent", label: "Launching AI outreach agent", icon: "smart_toy" as const },
];

/** Time each step stays active before advancing (ms). */
export const LAUNCH_AGENT_STEP_MS = 1600;

/** Hold all steps complete + full progress before closing (ms). */
export const LAUNCH_AGENT_COMPLETE_HOLD_MS = 1200;

/** Minimum overlay duration (all steps finish, then progress at 100%). */
export const LAUNCH_AGENT_MIN_DURATION_MS =
  LAUNCH_STEPS.length * LAUNCH_AGENT_STEP_MS + LAUNCH_AGENT_COMPLETE_HOLD_MS;

type Props = {
  open: boolean;
};

export function CampaignLaunchAgentOverlay({ open }: Props) {
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

    const timers: ReturnType<typeof window.setTimeout>[] = [];

    for (let i = 1; i < LAUNCH_STEPS.length; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setActiveStep(i);
        }, LAUNCH_AGENT_STEP_MS * i)
      );
    }

    timers.push(
      window.setTimeout(() => {
        setAllComplete(true);
      }, LAUNCH_AGENT_STEP_MS * LAUNCH_STEPS.length)
    );

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [open]);

  const progressPercent = allComplete
    ? 100
    : Math.round(
        ((activeStep + 1) / LAUNCH_STEPS.length) *
          100 *
          (activeStep < LAUNCH_STEPS.length - 1 ? 1 : 0.75)
      );

  if (!open) return null;

  return (
    <div
      className="dashboard-launch-agent-overlay"
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
              name={allComplete ? "check" : "smart_toy"}
              className="dashboard-launch-agent-core-icon"
            />
          </span>
          <span className="dashboard-launch-agent-wa-badge">
            <IntegrationBrandLogo
              provider="whatsapp"
              title="WhatsApp"
              className="dashboard-integration-brand-logo--sm"
            />
          </span>
        </div>

        {!allComplete ? (
          <>
            <h3 id="launch-agent-title" className="dashboard-launch-agent-title">
              Launching WhatsApp Outreach agent
            </h3>
            <p className="dashboard-launch-agent-subtitle">
              Your outreach agent is preparing WhatsApp messages for this campaign.
            </p>
          </>
        ) : (
          <h3 id="launch-agent-title" className="sr-only">
            WhatsApp Outreach agent launched
          </h3>
        )}

        <ol className="dashboard-launch-agent-steps">
          {LAUNCH_STEPS.map((step, index) => {
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
            <span className="dashboard-launch-agent-success-text">
              WhatsApp Outreach agent launched
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
