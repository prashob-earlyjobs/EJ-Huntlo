"use client";

import { useEffect, useState } from "react";

import { getStoredAuth } from "@/lib/auth";
import {
  fetchConnectedEmailIntegrations,
  toCampaignEmailSenderOption,
  type CampaignEmailSenderOption,
} from "@/lib/emailIntegrations";

export function useCampaignEmailSenders(enabled: boolean, initialIntegrationId = "") {
  const [emailSenders, setEmailSenders] = useState<CampaignEmailSenderOption[]>([]);
  const [selectedEmailIntegrationId, setSelectedEmailIntegrationId] = useState(
    initialIntegrationId.trim()
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const auth = getStoredAuth();
    if (!auth?.token) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const rows = await fetchConnectedEmailIntegrations(auth.token);
        if (cancelled) return;

        const options = rows.map(toCampaignEmailSenderOption);
        setEmailSenders(options);
        setSelectedEmailIntegrationId((prev) => {
          const trimmed = prev.trim();
          if (trimmed && options.some((row) => row.id === trimmed)) return trimmed;
          const initial = initialIntegrationId.trim();
          if (initial && options.some((row) => row.id === initial)) return initial;
          const defaultRow = options.find((row) => row.isDefaultEmail) || options[0];
          return defaultRow?.id || "";
        });
      } catch {
        if (!cancelled) setEmailSenders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, initialIntegrationId]);

  const needsSenderSelection = enabled && emailSenders.length > 1;
  const senderReady =
    !enabled || emailSenders.length <= 1 || Boolean(selectedEmailIntegrationId.trim());

  return {
    emailSenders,
    selectedEmailIntegrationId,
    setSelectedEmailIntegrationId,
    loading,
    needsSenderSelection,
    senderReady,
  };
}
