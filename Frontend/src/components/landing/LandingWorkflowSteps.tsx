"use client";

import { useState } from "react";

const WORKFLOW_STEPS = [
  {
    num: "01",
    title: "Describe",
    description:
      "Input requirements in plain English. No complex Boolean logic required.",
  },
  {
    num: "02",
    title: "Find Signals",
    description:
      "Huntlo extracts deep talent signals from 50+ diverse public platforms.",
  },
  {
    num: "03",
    title: "Launch Flow",
    description:
      "Automated sequences across Email and WhatsApp with custom triggers.",
  },
  {
    num: "04",
    title: "Track Results",
    description:
      "Unified inbox to manage all candidate conversations and interview status.",
  },
] as const;

function connectorClass(stepIndex: number, active: number) {
  if (active > stepIndex + 1) return "is-done";
  if (active === stepIndex + 1) return "is-flowing";
  return "";
}

function WorkflowStepCard({
  step,
  isActive,
  onSelect,
}: {
  step: (typeof WORKFLOW_STEPS)[number];
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="landing-workflow-step-card group relative z-10 flex w-full flex-col items-center border-0 bg-transparent p-0 text-center"
      aria-current={isActive ? "step" : undefined}
    >
      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${
          isActive
            ? "bg-[#0050cb] text-white shadow-md shadow-[#0050cb]/25"
            : "bg-[#e9edff] text-[#0050cb] group-hover:bg-[#dae1ff]"
        }`}
      >
        {step.num}
      </span>
      <h3 className="mt-5 text-lg font-bold text-[#141b2b]">{step.title}</h3>
      <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-[#434654]">
        {step.description}
      </p>
    </button>
  );
}

export function LandingWorkflowSteps() {
  const [active, setActive] = useState(0);

  return (
    <div className="landing-workflow-stage relative mt-14">
      <svg
        className="landing-workflow-bg-graphic pointer-events-none absolute left-1/2 top-6 hidden w-[min(100%,920px)] -translate-x-1/2 lg:block"
        viewBox="0 0 920 80"
        fill="none"
        aria-hidden
      >
        <path
          className="landing-workflow-bg-path"
          d="M80 40 H840"
          stroke="url(#workflowLineGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
        />
        <defs>
          <linearGradient id="workflowLineGrad" x1="0" y1="0" x2="920" y2="0">
            <stop offset="0%" stopColor="#0050cb" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#0050cb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0050cb" stopOpacity="0.08" />
          </linearGradient>
        </defs>
      </svg>

      <div className="landing-workflow-grid hidden lg:flex lg:w-full lg:items-start lg:justify-between">
        {WORKFLOW_STEPS.map((step, index) => (
          <div
            key={step.num}
            className="relative flex min-w-0 flex-1 flex-col items-center px-2"
            role="listitem"
          >
            {index < WORKFLOW_STEPS.length - 1 ? (
              <span
                className={`landing-workflow-connector absolute left-[calc(50%+28px)] top-7 z-[1] h-0.5 w-[calc(100%-56px)] ${connectorClass(index, active)}`}
                aria-hidden
              />
            ) : null}
            <WorkflowStepCard
              step={step}
              isActive={active === index}
              onSelect={() => setActive(index)}
            />
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:hidden"
        role="list"
      >
        {WORKFLOW_STEPS.map((step, index) => (
          <div key={step.num} role="listitem">
            <WorkflowStepCard
              step={step}
              isActive={active === index}
              onSelect={() => setActive(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
