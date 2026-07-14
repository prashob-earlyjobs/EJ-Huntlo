"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type OutreachBuilderChromeMeta = {
  title: string;
  stepLabel: string;
};

type OutreachBuilderChromeContextValue = {
  setChrome: (chrome: OutreachBuilderChromeMeta | null) => void;
};

const OutreachBuilderChromeContext = createContext<OutreachBuilderChromeContextValue | null>(
  null
);

type ProviderProps = {
  children: ReactNode;
  enabled?: boolean;
};

export function OutreachBuilderChromeProvider({ children, enabled = true }: ProviderProps) {
  const [chrome, setChromeState] = useState<OutreachBuilderChromeMeta | null>(null);

  const setChrome = useCallback(
    (next: OutreachBuilderChromeMeta | null) => {
      if (!enabled) return;
      setChromeState(next);
    },
    [enabled]
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <OutreachBuilderChromeContext.Provider value={{ setChrome }}>
      {chrome ? (
        <div className="dashboard-outreach-panel-builder-meta">
          <h1 className="dashboard-outreach-panel-builder-meta-title">{chrome.title}</h1>
          <p className="dashboard-outreach-panel-builder-meta-step">{chrome.stepLabel}</p>
        </div>
      ) : null}
      {children}
    </OutreachBuilderChromeContext.Provider>
  );
}

export function useOutreachBuilderChrome() {
  const context = useContext(OutreachBuilderChromeContext);
  return context ?? { setChrome: () => {} };
}
