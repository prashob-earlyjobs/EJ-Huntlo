"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type Huntlo360JourneyPhase = "outreach" | "schedule" | "track";

type Props = {
  activePhase: Huntlo360JourneyPhase;
  variant?: "default" | "overview";
};

const PHASES: {
  id: Huntlo360JourneyPhase;
  label: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    id: "outreach",
    label: "Outreach",
    subtitle: "Email or WhatsApp",
    icon: "send",
  },
  {
    id: "schedule",
    label: "Schedule",
    subtitle: "Calendly booking",
    icon: "event_available",
  },
  {
    id: "track",
    label: "Track",
    subtitle: "Replies & interviews",
    icon: "insights",
  },
];

export function Huntlo360JourneyBar({ activePhase, variant = "default" }: Props) {
  const activeIndex = PHASES.findIndex((p) => p.id === activePhase);
  const isOverview = variant === "overview";

  return (
    <div
      className={`dashboard-huntlo360-journey${
        isOverview ? " dashboard-huntlo360-journey--overview" : ""
      }`}
      aria-label="Huntlo 360 journey"
    >
      {PHASES.map((phase, index) => {
        const done = !isOverview && index < activeIndex;
        const active = !isOverview && phase.id === activePhase;
        const stepNumber = index + 1;

        return (
          <div key={phase.id} className="dashboard-huntlo360-journey-step">
            {index > 0 ? (
              <span
                className={`dashboard-huntlo360-journey-connector${
                  done ? " dashboard-huntlo360-journey-connector--done" : ""
                }`}
                aria-hidden
              />
            ) : null}
            <div
              className={`dashboard-huntlo360-journey-item${
                active ? " dashboard-huntlo360-journey-item--active" : ""
              }${done ? " dashboard-huntlo360-journey-item--done" : ""}${
                isOverview ? " dashboard-huntlo360-journey-item--overview" : ""
              }`}
            >
              <span className="dashboard-huntlo360-journey-icon" aria-hidden>
                {done ? (
                  <MaterialIcon name="check" className="text-sm" />
                ) : (
                  <span className="dashboard-huntlo360-journey-step-num">{stepNumber}</span>
                )}
              </span>
              <div className="dashboard-huntlo360-journey-copy">
                <span className="dashboard-huntlo360-journey-label">{phase.label}</span>
                <span className="dashboard-huntlo360-journey-subtitle">{phase.subtitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
