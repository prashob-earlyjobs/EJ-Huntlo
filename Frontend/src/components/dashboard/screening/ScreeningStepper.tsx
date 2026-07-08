"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

type Step = { key: string; label: string };

type Props = {
  steps: Step[];
  currentStep: number;
  onStepClick?: (index: number) => void;
};

export function ScreeningStepper({ steps, currentStep, onStepClick }: Props) {
  return (
    <nav className="dashboard-screening-stepper" aria-label="Screening builder steps">
      <ol className="dashboard-screening-stepper-list">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const canClick = onStepClick && index <= currentStep;

          return (
            <li
              key={step.key}
              className={`dashboard-screening-stepper-item${
                isCurrent ? " dashboard-screening-stepper-item--current" : ""
              }${isComplete ? " dashboard-screening-stepper-item--complete" : ""}`}
            >
              <button
                type="button"
                className="dashboard-screening-stepper-btn"
                onClick={canClick ? () => onStepClick(index) : undefined}
                disabled={!canClick}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="dashboard-screening-stepper-marker">
                  {isComplete ? <MaterialIcon name="check" className="text-sm" /> : index + 1}
                </span>
                <span className="dashboard-screening-stepper-label">{step.label}</span>
              </button>
              {index < steps.length - 1 ? (
                <span className="dashboard-screening-stepper-connector" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
