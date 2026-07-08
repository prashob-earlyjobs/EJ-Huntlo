"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

import {
  CustomMailConnectModal,
  type CustomMailConnectFormValues,
} from "@/components/dashboard/CustomMailConnectModal";
import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import { OutlookConnectModal } from "@/components/dashboard/OutlookConnectModal";
import {
  ZohoMailConnectModal,
  type ZohoMailConnectFormValues,
} from "@/components/dashboard/ZohoMailConnectModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import { connectCustomMail as connectCustomMailApi } from "@/lib/customMailIntegrations";
import { dashboardBtnPrimaryClass } from "@/lib/dashboardStyles";
import { fetchConnectedEmailIntegrations } from "@/lib/emailIntegrations";

export type EmailProviderId = "gmail" | "outlook" | "zoho_mail" | "custom_mail";

export const EMAIL_PROVIDER_OPTIONS: {
  id: EmailProviderId;
  name: string;
  provider: string;
  description: string;
}[] = [
  {
    id: "gmail",
    name: "Gmail",
    provider: "Google",
    description: "Send outreach from your Gmail inbox.",
  },
  {
    id: "outlook",
    name: "Outlook",
    provider: "Microsoft",
    description: "Send from Microsoft 365 or Outlook.com.",
  },
  {
    id: "zoho_mail",
    name: "Zoho Mail",
    provider: "Zoho",
    description: "Connect your Zoho Mail account.",
  },
  {
    id: "custom_mail",
    name: "Custom SMTP",
    provider: "SMTP",
    description: "Use your own SMTP server or relay.",
  },
];

type HookOptions = {
  enabled?: boolean;
  onConnected?: () => void;
};

export function useEmailIntegrationConnect({ enabled = false, onConnected }: HookOptions = {}) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [outlookModalOpen, setOutlookModalOpen] = useState(false);
  const [zohoMailModalOpen, setZohoMailModalOpen] = useState(false);
  const [customMailModalOpen, setCustomMailModalOpen] = useState(false);

  const refreshConnected = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setConnectedProviders(new Set());
      return false;
    }
    const rows = await fetchConnectedEmailIntegrations(auth.token);
    setConnectedProviders(new Set(rows.map((row) => row.provider)));
    return rows.length > 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setNotice("");
    void refreshConnected();
  }, [enabled, refreshConnected]);

  const notifyConnected = useCallback(async () => {
    const hasConnected = await refreshConnected();
    if (hasConnected) {
      onConnected?.();
    }
  }, [onConnected, refreshConnected]);

  const gmailLogin = useGoogleLogin({
    flow: "auth-code",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
    ].join(" "),
    onSuccess: async (codeResponse) => {
      try {
        const auth = getStoredAuth();
        if (!auth?.token) {
          throw new Error("Please sign in again.");
        }
        const res = await fetch(`${apiBase}/api/integrations/gmail/callback`, {
          method: "POST",
          headers: authHeaders(auth.token),
          body: JSON.stringify({ code: codeResponse.code }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to connect Gmail"
          );
        }
        const email =
          typeof data.integration?.email === "string" ? data.integration.email.trim() : "";
        setNotice(email ? `Gmail connected as ${email}.` : "Gmail connected.");
        await notifyConnected();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect Gmail.");
      } finally {
        setBusyProvider(null);
      }
    },
    onError: () => {
      setNotice("Gmail sign-in was cancelled or failed.");
      setBusyProvider(null);
    },
  });

  const connectGmail = useCallback(() => {
    setNotice("");
    setBusyProvider("gmail");
    gmailLogin();
  }, [gmailLogin]);

  const connectOutlook = useCallback(() => {
    setNotice("");
    setOutlookModalOpen(true);
  }, []);

  const connectZohoMail = useCallback(() => {
    setNotice("");
    setZohoMailModalOpen(true);
  }, []);

  const connectCustomMail = useCallback(() => {
    setNotice("");
    setCustomMailModalOpen(true);
  }, []);

  const handleZohoMailSubmit = useCallback(
    async (values: ZohoMailConnectFormValues) => {
      setBusyProvider("zoho_mail");
      setNotice("");
      try {
        const auth = getStoredAuth();
        if (!auth?.token) {
          throw new Error("Please sign in again.");
        }
        const res = await fetch(`${apiBase}/api/integrations/zoho_mail/connect`, {
          method: "POST",
          headers: authHeaders(auth.token),
          body: JSON.stringify({
            authMode: "smtp",
            email: values.email,
            senderName: values.senderName,
            appPassword: values.appPassword,
            dataCenter: values.dataCenter,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to connect Zoho Mail"
          );
        }
        const email =
          typeof data.integration?.email === "string" ? data.integration.email.trim() : "";
        setZohoMailModalOpen(false);
        setNotice(email ? `Zoho Mail connected as ${email}.` : "Zoho Mail connected.");
        await notifyConnected();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect Zoho Mail.");
      } finally {
        setBusyProvider(null);
      }
    },
    [apiBase, notifyConnected]
  );

  const handleCustomMailSubmit = useCallback(
    async (values: CustomMailConnectFormValues) => {
      setBusyProvider("custom_mail");
      setNotice("");
      try {
        const auth = getStoredAuth();
        if (!auth?.token) {
          throw new Error("Please sign in again.");
        }
        const { integration } = await connectCustomMailApi(auth.token, {
          fromEmail: values.fromEmail,
          displayName: values.displayName,
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          security: values.security,
          username: values.username,
          password: values.password,
        });
        setCustomMailModalOpen(false);
        const email =
          (typeof integration.email === "string" ? integration.email.trim() : "") ||
          values.fromEmail.trim();
        setNotice(email ? `SMTP connected as ${email}.` : "Custom SMTP connected.");
        await notifyConnected();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect SMTP.");
      } finally {
        setBusyProvider(null);
      }
    },
    [notifyConnected]
  );

  const connectProvider = useCallback(
    (providerId: EmailProviderId) => {
      if (providerId === "gmail") connectGmail();
      else if (providerId === "outlook") connectOutlook();
      else if (providerId === "zoho_mail") connectZohoMail();
      else connectCustomMail();
    },
    [connectCustomMail, connectGmail, connectOutlook, connectZohoMail]
  );

  return {
    connectedProviders,
    busyProvider,
    notice,
    outlookModalOpen,
    setOutlookModalOpen,
    zohoMailModalOpen,
    setZohoMailModalOpen,
    customMailModalOpen,
    setCustomMailModalOpen,
    connectProvider,
    handleZohoMailSubmit,
    handleCustomMailSubmit,
  };
}

type PanelProps = {
  enabled?: boolean;
  onConnected?: () => void;
};

export function EmailIntegrationConnectPanel({ enabled = false, onConnected }: PanelProps) {
  const {
    connectedProviders,
    busyProvider,
    notice,
    outlookModalOpen,
    setOutlookModalOpen,
    zohoMailModalOpen,
    setZohoMailModalOpen,
    customMailModalOpen,
    setCustomMailModalOpen,
    connectProvider,
    handleZohoMailSubmit,
    handleCustomMailSubmit,
  } = useEmailIntegrationConnect({ enabled, onConnected });

  return (
    <>
      <div className="dashboard-email-connect-options">
        {EMAIL_PROVIDER_OPTIONS.map((option) => {
          const connected = connectedProviders.has(option.id);
          const busy = busyProvider === option.id;

          return (
            <article key={option.id} className="dashboard-email-connect-option">
              <span className="dashboard-email-connect-option-icon" aria-hidden>
                <IntegrationBrandLogo provider={option.id} title={option.name} />
              </span>
              <div className="dashboard-email-connect-option-body">
                <div className="dashboard-email-connect-option-head">
                  <strong>{option.name}</strong>
                  <span>{option.provider}</span>
                </div>
                <p>{option.description}</p>
              </div>
              {connected ? (
                <span className="dashboard-email-connect-option-status">
                  <MaterialIcon name="check_circle" className="text-sm" />
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  className={`${dashboardBtnPrimaryClass} dashboard-email-connect-option-btn`}
                  onClick={() => connectProvider(option.id)}
                  disabled={Boolean(busyProvider)}
                >
                  {busy ? (
                    <>
                      <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="link" className="text-sm" />
                      Connect
                    </>
                  )}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {notice ? (
        <p className="dashboard-email-connect-notice" role="status">
          {notice}
        </p>
      ) : null}

      <OutlookConnectModal
        open={outlookModalOpen}
        busy={busyProvider === "outlook"}
        elevated
        onClose={() => setOutlookModalOpen(false)}
      />
      <ZohoMailConnectModal
        open={zohoMailModalOpen}
        busy={busyProvider === "zoho_mail"}
        elevated
        onClose={() => setZohoMailModalOpen(false)}
        onSubmit={(values) => void handleZohoMailSubmit(values)}
      />
      <CustomMailConnectModal
        open={customMailModalOpen}
        busy={busyProvider === "custom_mail"}
        elevated
        onClose={() => setCustomMailModalOpen(false)}
        onSubmit={(values) => void handleCustomMailSubmit(values)}
      />
    </>
  );
}
