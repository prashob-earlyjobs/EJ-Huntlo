/** Shared UI helpers for session result candidate cards. */

export function formatCandidateScore(score: number): string {
  const rounded = Math.round(score * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function candidateScoreBadgeClass(score: number): string {
  const base = "dashboard-score-badge";
  if (score >= 3.5) return `${base} dashboard-score-badge--high`;
  if (score >= 2.5) return `${base} dashboard-score-badge--mid`;
  return `${base} dashboard-score-badge--low`;
}

export function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}
