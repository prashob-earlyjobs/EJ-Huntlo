import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";

type RevealContactIconButtonProps = {
  icon: "mail" | "call";
  tip: string;
  ariaLabel: string;
  revealed: boolean;
  busy: boolean;
  onClick: () => void;
};

export function RevealContactIconButton({
  icon,
  tip,
  ariaLabel,
  revealed,
  busy,
  onClick,
}: RevealContactIconButtonProps) {
  return (
    <span className="dashboard-icon-tip" data-tip={busy ? "Revealing…" : tip}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-busy={busy}
        disabled={busy}
        onClick={onClick}
        className={`dashboard-table-icon-btn dashboard-table-icon-btn--sm${
          revealed ? " dashboard-table-icon-btn--active" : ""
        }${busy ? " dashboard-table-icon-btn--loading" : ""}`}
      >
        {busy ? <ButtonSpinner /> : <MaterialIcon name={icon} />}
      </button>
    </span>
  );
}
