import type { ReactNode } from "react";

import { ButtonSpinner } from "@/components/ui/ButtonSpinner";

type Props = {
  loading: boolean;
  children: ReactNode;
  /** Screen-reader label while loading (visible label stays in layout but hidden). */
  loadingLabel?: string;
};

/**
 * Keeps button width stable while loading by hiding label content in-place
 * and overlaying a grey spinner in the same grid cell.
 */
export function ButtonLoadingContent({
  loading,
  children,
  loadingLabel = "Loading",
}: Props) {
  return (
    <span className="inline-grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
      <span
        className={[
          "inline-flex items-center justify-center gap-1.5",
          loading ? "invisible" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={loading || undefined}
      >
        {children}
      </span>
      {loading ? (
        <>
          <ButtonSpinner />
          <span className="sr-only">{loadingLabel}</span>
        </>
      ) : null}
    </span>
  );
}
