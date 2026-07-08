"use client";

import type { InterviewStatus } from "@/components/dashboard/schedule/types";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

const LABELS: Record<InterviewStatus, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  reschedule_requested: "Reschedule Requested",
  no_show: "No-show",
};

type Props = { status: InterviewStatus };

export function StatusBadge({ status }: Props) {
  return (
    <span className={`dashboard-schedule-status dashboard-schedule-status--${status}`}>
      {LABELS[status]}
    </span>
  );
}

type Step = { key: string; label: string };
type StepperProps = {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
};

export function InterviewStepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <nav className="dashboard-schedule-stepper" aria-label="Schedule builder steps">
      <ol className="dashboard-schedule-stepper-list">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const canClick = onStepClick && index <= currentStep;
          return (
            <li
              key={step.key}
              className={`dashboard-schedule-stepper-item${
                isCurrent ? " dashboard-schedule-stepper-item--current" : ""
              }${isComplete ? " dashboard-schedule-stepper-item--complete" : ""}`}
            >
              <button
                type="button"
                className="dashboard-schedule-stepper-btn"
                onClick={canClick ? () => onStepClick(index) : undefined}
                disabled={!canClick}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="dashboard-schedule-stepper-marker">
                  {isComplete ? <MaterialIcon name="check" className="text-sm" /> : index + 1}
                </span>
                <span className="dashboard-schedule-stepper-label">{step.label}</span>
              </button>
              {index < steps.length - 1 ? <span className="dashboard-schedule-stepper-connector" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
