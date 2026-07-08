"use client";

import { useCallback, useState } from "react";

import { EmailIntegrationSetupWarningModal } from "@/components/dashboard/EmailIntegrationSetupWarningModal";
import { getStoredAuth } from "@/lib/auth";
import { fetchConnectedEmailIntegrations } from "@/lib/emailIntegrations";

export const EMAIL_INTEGRATION_REQUIRED_MESSAGE =
  "No email integration connected. Connect Gmail, Outlook, Zoho Mail, or Custom SMTP under Integrations first.";

export function isEmailIntegrationRequiredError(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("no email integration connected") ||
    normalized.includes("email integration not found or disconnected")
  );
}

export function useEmailIntegrationLaunchGuard() {
  const [open, setOpen] = useState(false);

  const ensureEmailIntegrationReady = useCallback(async (needsEmail: boolean) => {
    if (!needsEmail) return true;

    const auth = getStoredAuth();
    if (!auth?.token) return true;

    try {
      const connected = await fetchConnectedEmailIntegrations(auth.token);
      if (connected.length > 0) return true;
    } catch {
      /* show modal below */
    }

    setOpen(true);
    return false;
  }, []);

  const resolveLaunchError = useCallback((err: unknown, fallback = "Could not launch campaign.") => {
    const message = err instanceof Error ? err.message : fallback;
    if (isEmailIntegrationRequiredError(message)) {
      setOpen(true);
      return "";
    }
    return message;
  }, []);

  const modal = (
    <EmailIntegrationSetupWarningModal
      open={open}
      onClose={() => setOpen(false)}
      onConnected={() => setOpen(false)}
    />
  );

  return {
    ensureEmailIntegrationReady,
    resolveLaunchError,
    modal,
  };
}
