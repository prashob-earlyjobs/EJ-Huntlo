"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Step = {
  key: string;
  label: string;
};

type Props = {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  disabled?: boolean;
};

export function OutreachStepper({ steps, currentStep, onStepClick, disabled }: Props) {
  return (
    <nav className="dashboard-outreach-stepper" aria-label="Campaign builder steps">
      <ol className="dashboard-outreach-stepper-list">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const canClick = onStepClick && index <= currentStep && !disabled;

          return (
            <li
              key={step.key}
              className={`dashboard-outreach-stepper-item${
                isCurrent ? " dashboard-outreach-stepper-item--current" : ""
              }${isComplete ? " dashboard-outreach-stepper-item--complete" : ""}`}
            >
              <button
                type="button"
                className="dashboard-outreach-stepper-btn"
                onClick={canClick ? () => onStepClick(index) : undefined}
                disabled={!canClick}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="dashboard-outreach-stepper-marker">
                  {isComplete ? <MaterialIcon name="check" className="text-sm" /> : index + 1}
                </span>
                <span className="dashboard-outreach-stepper-label">{step.label}</span>
              </button>
              {index < steps.length - 1 ? (
                <span className="dashboard-outreach-stepper-connector" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
