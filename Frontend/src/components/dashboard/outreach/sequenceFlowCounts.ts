import type {
  CampaignTrackingCandidate,
  SequenceFlowStepCounts,
  SequenceStep,
} from "@/components/dashboard/outreach/types";

/** Inbound candidate message(s) — same bar as stats.replied for generic replies. */
function candidateHasInboundReply(candidate: CampaignTrackingCandidate): boolean {
  return Number(candidate.replyCount ?? 0) > 0;
}

/** Per-step reply vs. no-reply counts for the live sequence flow panel. */
export function buildSequenceFlowStepCounts(
  steps: SequenceStep[],
  candidates: CampaignTrackingCandidate[]
): SequenceFlowStepCounts[] {
  if (steps.length === 0) return [];

  return steps.map((_, index) => {
    const stepOrder = index + 1;
    let replied = 0;
    let noReply = 0;
    let awaiting = 0;

    for (const candidate of candidates) {
      const sentCount = Number(candidate.sentCount) || 0;
      if (sentCount < stepOrder) continue;

      const hasReply = candidateHasInboundReply(candidate);
      if (hasReply && sentCount === stepOrder) {
        replied += 1;
      } else if (!hasReply && sentCount > stepOrder) {
        noReply += 1;
      } else if (!hasReply && sentCount === stepOrder) {
        awaiting += 1;
      }
    }

    return {
      stepOrder,
      contacted: replied + noReply + awaiting,
      replied,
      noReply,
      awaiting,
    };
  });
}

export function formatSequenceFlowCount(count: number): string {
  return count.toLocaleString();
}

export function formatCandidateCountLabel(count: number): string {
  const n = Math.max(0, Number(count) || 0);
  const formatted = formatSequenceFlowCount(n);
  return `${formatted} candidate${n === 1 ? "" : "s"}`;
}
