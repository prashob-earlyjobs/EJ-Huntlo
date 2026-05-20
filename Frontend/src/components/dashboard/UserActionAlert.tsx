"use client";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { quotaExceededTitle } from "@/lib/apiErrors";

type Props = {
  message: string;
  isQuotaExceeded?: boolean;
  onDismiss?: () => void;
  onViewPlans?: () => void;
  className?: string;
};

export function UserActionAlert({
  message,
  isQuotaExceeded = false,
  onDismiss,
  onViewPlans,
  className = "",
}: Props) {
  if (!message.trim()) return null;

  return (
    <div
      role="alert"
      className={`dashboard-user-action-alert ${
        isQuotaExceeded ? "dashboard-user-action-alert--quota" : "dashboard-user-action-alert--error"
      } ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="dashboard-user-action-alert-icon" aria-hidden>
          <MaterialIcon
            name={isQuotaExceeded ? "account_balance_wallet" : "error_outline"}
            className="text-[22px]"
          />
        </span>
        <div className="min-w-0 flex-1">
          {isQuotaExceeded ? (
            <p className="dashboard-user-action-alert-title">{quotaExceededTitle()}</p>
          ) : null}
          <p className="dashboard-user-action-alert-message">{message}</p>
          {isQuotaExceeded && onViewPlans ? (
            <button
              type="button"
              onClick={onViewPlans}
              className="dashboard-user-action-alert-cta mt-2"
            >
              View plans &amp; usage
              <MaterialIcon name="arrow_forward" className="text-base" />
            </button>
          ) : null}
        </div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="dashboard-btn-ghost shrink-0 p-1"
          aria-label="Dismiss"
        >
          <MaterialIcon name="close" className="text-lg" />
        </button>
      ) : null}
    </div>
  );
}
