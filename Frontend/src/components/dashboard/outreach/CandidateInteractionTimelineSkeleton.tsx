type Props = {
  itemCount?: number;
};

function TimelineItemSkeleton({ index }: { index: number }) {
  const titleWidth = index % 3 === 0 ? "14rem" : index % 3 === 1 ? "11rem" : "16rem";
  return (
    <li className="dashboard-outreach-drawer-timeline-item" aria-hidden>
      <span className="dashboard-outreach-drawer-timeline-icon dashboard-shimmer-block">
        <span className="dashboard-shimmer h-3.5 w-3.5 rounded" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="dashboard-shimmer h-3.5 rounded"
          style={{ width: titleWidth, maxWidth: "100%" }}
        />
        <div className="dashboard-shimmer mt-1.5 h-3 w-28 rounded" />
      </div>
    </li>
  );
}

export function CandidateInteractionTimelineSkeleton({ itemCount = 3 }: Props) {
  return (
    <ol
      className="dashboard-outreach-drawer-timeline dashboard-outreach-drawer-timeline--skeleton"
      aria-busy="true"
      aria-label="Loading interaction history"
    >
      {Array.from({ length: itemCount }, (_, idx) => (
        <TimelineItemSkeleton key={`drawer-timeline-skel-${idx}`} index={idx} />
      ))}
    </ol>
  );
}
