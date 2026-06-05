"use client";

import { useEffect, useMemo, useState } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

const SEARCH_STEPS = [
  { id: "annotate", label: "Analyzing your prompt", icon: "auto_awesome" },
  { id: "filters", label: "Finalizing your filters", icon: "tune" },
  { id: "create", label: "Creating the search", icon: "add_circle" },
  { id: "session", label: "Setting up your sourcing session", icon: "hub" },
  { id: "profiles", label: "Searching and ranking profiles", icon: "person_search" },
] as const;

/** Time each step stays active before advancing (ms). */
const SEARCH_AGENT_STEP_MS = 2200;

type Props = {
  open: boolean;
  query?: string;
};

export function CandidateSearchAgentOverlay({ open, query = "" }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      return;
    }

    setActiveStep(0);
    const timers: number[] = [];

    for (let i = 1; i < SEARCH_STEPS.length; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setActiveStep(i);
        }, SEARCH_AGENT_STEP_MS * i)
      );
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [open, query]);

  const progressPercent = useMemo(() => {
    return Math.round(
      ((activeStep + 1) / SEARCH_STEPS.length) *
        100 *
        (activeStep < SEARCH_STEPS.length - 1 ? 1 : 0.82)
    );
  }, [activeStep]);

  if (!open) return null;

  const trimmedQuery = query.trim();

  return (
    <div
      className="dashboard-launch-agent-overlay dashboard-launch-agent-overlay--gmail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-search-agent-title"
      aria-busy="true"
    >
      <div className="dashboard-launch-agent-card">
        <div className="dashboard-launch-agent-visual" aria-hidden>
          <span className="dashboard-launch-agent-orbit dashboard-launch-agent-orbit--1" />
          <span className="dashboard-launch-agent-orbit dashboard-launch-agent-orbit--2" />
          <span className="dashboard-launch-agent-orbit dashboard-launch-agent-orbit--3" />
          <span className="dashboard-launch-agent-core">
            <MaterialIcon name="groups" className="dashboard-launch-agent-core-icon" />
          </span>
          <span className="dashboard-launch-agent-channel-badge">
            <MaterialIcon name="auto_awesome" className="text-base text-[#0050cb]" />
          </span>
        </div>

        <h3 id="candidate-search-agent-title" className="dashboard-launch-agent-title">
          Finding matching candidates
        </h3>
        <p className="dashboard-launch-agent-subtitle">
          {trimmedQuery
            ? `Sourcing profiles for “${trimmedQuery.length > 72 ? `${trimmedQuery.slice(0, 69)}…` : trimmedQuery}”.`
            : "Our AI is sourcing and ranking profiles for your search."}
        </p>
        <p className="mt-1 text-center text-xs text-[#5f667a]">
          This usually takes less than a minute
        </p>

        <ol className="dashboard-launch-agent-steps">
          {SEARCH_STEPS.map((step, index) => {
            const done = index < activeStep;
            const current = index === activeStep;
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
            className="dashboard-launch-agent-progress-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
