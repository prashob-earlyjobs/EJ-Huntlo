type Props = {
  className?: string;
  compact?: boolean;
};

/** LinkedIn-style #OPEN TO WORK label (green bar, white caps). */
export function OpenToWorkBadge({ className = "", compact = false }: Props) {
  return (
    <span
      className={`dashboard-open-to-work-badge${compact ? " dashboard-open-to-work-badge--compact" : ""} ${className}`.trim()}
      title="Open to work on LinkedIn"
    >
      #OPEN TO WORK
    </span>
  );
}
