"use client";

import { useState } from "react";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { BLOCKED_ACCOUNT_MESSAGE, performLogout } from "@/lib/sessionLogout";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";

type Props = {
  open: boolean;
};

export function BlockedAccountModal({ open }: Props) {
  const [loggingOut, setLoggingOut] = useState(false);

  if (!open) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    await performLogout();
    setLoggingOut(false);
  };

  return (
    <div
      className="dashboard-modal-overlay z-[200] flex items-center justify-center py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocked-account-title"
    >
      <div className="dashboard-modal mx-4 w-full max-w-md p-6 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M12 9V13M12 17H12.01M10.29 3.86L2.82 17C2.39 17.74 2.95 19 3.82 19H20.18C21.05 19 21.61 17.74 21.18 17L13.71 3.86C13.28 3.13 11.72 3.13 11.29 3.86Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="blocked-account-title" className="dashboard-section-title text-lg">
          Account blocked
        </h2>
        <p className="dashboard-text-body mt-3">{BLOCKED_ACCOUNT_MESSAGE}</p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className={`${dashboardBtnPrimaryClass} mt-6 w-full disabled:opacity-60`}
        >
          <ButtonLoadingContent loading={loggingOut} loadingLabel="Signing out">
            Logout
          </ButtonLoadingContent>
        </button>
      </div>
    </div>
  );
}
