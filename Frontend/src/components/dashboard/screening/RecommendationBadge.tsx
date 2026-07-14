"use client";

import type { Recommendation } from "@/components/dashboard/screening/types";

const LABELS: Record<Recommendation, string> = {
  strong_fit: "Strong Fit",
  good_fit: "Good Fit",
  average_fit: "Average Fit",
  not_recommended: "Not Recommended",
  needs_review: "Needs Review",
};

type Props = {
  recommendation: Recommendation;
};

export function RecommendationBadge({ recommendation }: Props) {
  return (
    <span className={`dashboard-screening-recommendation dashboard-screening-recommendation--${recommendation}`}>
      {recommendation === "strong_fit" || recommendation === "good_fit" ? (
        <span className="dashboard-screening-badge dashboard-screening-badge--ai">AI Recommended</span>
      ) : null}
      {LABELS[recommendation]}
    </span>
  );
}

export function recommendationLabel(r: Recommendation | null): string {
  if (!r) return "-";
  return LABELS[r];
}
