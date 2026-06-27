type ButtonSpinnerSize = "sm" | "md" | "lg";

const sizeClass: Record<ButtonSpinnerSize, string> = {
  sm: "size-3.5 border-[1.5px]",
  md: "size-4 border-2",
  lg: "size-8 border-2",
};

type Props = {
  size?: ButtonSpinnerSize;
  className?: string;
};

/** Grey loading spinner for buttons and compact actions. */
export function ButtonSpinner({ size = "sm", className = "" }: Props) {
  return (
    <span
      className={[
        "inline-block shrink-0 animate-spin rounded-full border-gray-300 border-t-gray-500",
        sizeClass[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    />
  );
}
