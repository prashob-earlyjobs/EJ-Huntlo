"use client";

import type { EvaluationCriterion } from "@/components/dashboard/screening/types";
import { dashboardLabelClass } from "@/lib/dashboardStyles";

type Props = {
  criteria: EvaluationCriterion[];
  onChange: (criteria: EvaluationCriterion[]) => void;
};

export function EvaluationCriteriaCard({ criteria, onChange }: Props) {
  const update = (id: string, patch: Partial<EvaluationCriterion>) => {
    onChange(criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="dashboard-screening-criteria">
      <h4 className="dashboard-screening-subsection-title">Evaluation criteria</h4>
      <p className="dashboard-text-body dashboard-screening-criteria-hint">
        AI scores each category. Recruiter makes the final decision.
      </p>
      <div className="dashboard-screening-criteria-list">
        {criteria.map((c) => (
          <div
            key={c.id}
            className={`dashboard-screening-criteria-card${
              !c.enabled ? " dashboard-screening-criteria-card--disabled" : ""
            }`}
          >
            <label className="dashboard-screening-criteria-toggle">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={(e) => update(c.id, { enabled: e.target.checked })}
              />
              <strong>{c.label}</strong>
            </label>
            <p>{c.description}</p>
            <div className="dashboard-screening-field dashboard-screening-field--inline">
              <label className={dashboardLabelClass}>Weight %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="dashboard-input dashboard-input-sm"
                value={c.weight}
                disabled={!c.enabled}
                onChange={(e) => update(c.id, { weight: Number(e.target.value) })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
