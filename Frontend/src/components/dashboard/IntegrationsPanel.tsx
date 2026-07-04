"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import {
  CalendlyConnectModal,
  type CalendlyConnectFormValues,
} from "@/components/dashboard/CalendlyConnectModal";
import {
  CustomMailConnectModal,
  type CustomMailConnectFormValues,
} from "@/components/dashboard/CustomMailConnectModal";
import { OutlookConnectModal } from "@/components/dashboard/OutlookConnectModal";
import {
  WhatsAppConnectModal,
  type WhatsAppConnectFormValues,
} from "@/components/dashboard/WhatsAppConnectModal";
import {
  ZohoMailConnectModal,
  type ZohoMailConnectFormValues,
} from "@/components/dashboard/ZohoMailConnectModal";
import { WhatsAppMetaWebhookSetupCard } from "@/components/dashboard/WhatsAppMetaWebhookSetupCard";
import { IntegrationsPanelSkeleton } from "@/components/dashboard/IntegrationsPanelSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import {
  hasIntegrationsAccess,
  INTEGRATIONS_LOCKED_MESSAGE,
} from "@/lib/planAccess";
import type { PricingPlansPayload } from "@/lib/pricingPlans";
import {
  buildUiOnlyIntegrationRow,
  isUiOnlyMailProvider,
  readUiOnlyIntegrations,
  removeUiOnlyIntegration,
  upsertUiOnlyIntegration,
  type UiOnlyIntegrationRow,
} from "@/lib/uiOnlyIntegrations";
import {
  connectCustomMail,
  testCustomMailIntegration,
} from "@/lib/customMailIntegrations";
import {
  disconnectEmailIntegrationById,
  isMultiAccountMailProvider,
  setDefaultEmailIntegration,
  testEmailIntegration,
} from "@/lib/emailIntegrations";
import { fetchWhatsAppMetaWebhookSetup, type MetaWebhookSetupPayload } from "@/lib/whatsappMetaWebhookSetup";

type IntegrationRow = {
  id: string;
  provider: string;
  integration: string;
  providerLabel: string;
  senderName: string;
  email: string;
  status: string;
  isDefaultEmail?: boolean;
  whatsappMode?: string;
  whatsappProvider?: string;
  uiOnly?: boolean;
};

function mergeIntegrationRows(
  apiRows: IntegrationRow[],
  uiRows: UiOnlyIntegrationRow[]
): IntegrationRow[] {
  const apiProviders = new Set(apiRows.map((row) => row.provider));
  const extra = uiRows.filter((row) => !apiProviders.has(row.provider));
  return [...apiRows, ...extra];
}

type ConnectOption = {
  id: string;
  name: string;
  provider: string;
  description: string;
  connectable: boolean;
  comingSoon?: boolean;
};

const CONNECT_OPTIONS: ConnectOption[] = [
  {
    id: "gmail",
    name: "Gmail",
    provider: "Google",
    description: "Send and track candidate outreach from your inbox.",
    connectable: true,
  },
  {
    id: "outlook",
    name: "Outlook",
    provider: "Microsoft",
    description: "Send outreach from Microsoft 365 or Outlook.com.",
    connectable: false,
    comingSoon: true,
  },
  {
    id: "zoho_mail",
    name: "Zoho Mail",
    provider: "Zoho",
    description: "Connect your Zoho Mail inbox for candidate email sequences.",
    connectable: true,
  },
  {
    id: "custom_mail",
    name: "Custom config",
    provider: "SMTP",
    description: "Bring your own SMTP server or corporate mail relay.",
    connectable: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    provider: "Meta",
    description: "Message candidates on WhatsApp from your workspace.",
    connectable: true,
  },
  {
    id: "calendly",
    name: "Calendly",
    provider: "Calendly",
    description: "Share scheduling links and book meetings with candidates.",
    connectable: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    provider: "LinkedIn",
    description: "Sync your LinkedIn account for outreach and profile enrichment.",
    connectable: false,
    comingSoon: true,
  },
];

type ConnectOptionCardProps = {
  option: ConnectOption;
  locked: boolean;
  connected: boolean;
  allowMultiple?: boolean;
  busy: boolean;
  onLocked: () => void;
  onConnect: () => void;
  onTest?: () => void;
};

function ConnectOptionCard({
  option,
  locked,
  connected,
  allowMultiple = false,
  busy,
  onLocked,
  onConnect,
  onTest,
}: ConnectOptionCardProps) {
  const showComingSoon = Boolean(option.comingSoon);
  const showConnected = connected && !showComingSoon && !allowMultiple;
  const showMultiConnected = connected && !showComingSoon && allowMultiple;

  const handleClick = () => {
    if (locked || showComingSoon) {
      if (locked) onLocked();
      return;
    }
    if (!connected || allowMultiple) onConnect();
  };

  return (
    <article
      className={`dashboard-integration-card dashboard-integration-card--compact${
        locked ? " dashboard-integration-card--locked" : ""
      }${showComingSoon ? " dashboard-integration-card--soon" : ""}`}
    >
      <div className="dashboard-integration-card-top">
        <span
          className={`dashboard-integration-icon dashboard-integration-icon--brand${
            locked ? " dashboard-integration-icon--locked" : ""
          }`}
          aria-hidden
        >
          <IntegrationBrandLogo provider={option.id} title={option.name} />
        </span>
        <span
          className={`dashboard-integration-status${
            locked
              ? " dashboard-integration-status--locked"
              : showConnected
                ? " dashboard-integration-status--connected"
                : showComingSoon
                  ? " dashboard-integration-status--soon"
                  : ""
          }`}
        >
          {!locked && (showConnected || !showComingSoon) ? (
            <span className="dashboard-integration-status-dot" aria-hidden />
          ) : null}
          {locked ? (
            <>
              <MaterialIcon name="workspace_premium" className="text-sm" aria-hidden />
              Growth+
            </>
          ) : showConnected ? (
            "Connected"
          ) : showMultiConnected ? (
            "Connected"
          ) : showComingSoon ? (
            "Coming soon"
          ) : (
            "Not connected"
          )}
        </span>
      </div>

      <h4 className="dashboard-integration-name">{option.name}</h4>
      <p className="dashboard-integration-desc">{option.description}</p>
      <p className="dashboard-integration-provider-label">{option.provider}</p>

      {showConnected && onTest && !locked ? (
        <button
          type="button"
          onClick={onTest}
          disabled={busy}
          className="dashboard-btn-secondary mt-auto w-full justify-center disabled:opacity-55"
        >
          <ButtonLoadingContent loading={busy} loadingLabel="Sending test">
            <span className="inline-flex items-center gap-2">
              <MaterialIcon name="send" className="text-base" />
              Test
            </span>
          </ButtonLoadingContent>
        </button>
      ) : showMultiConnected && !locked ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="dashboard-btn-secondary mt-auto w-full justify-center disabled:opacity-55"
        >
          <MaterialIcon name="add" className="text-base" />
          Add account
        </button>
      ) : !showConnected && !showMultiConnected && !showComingSoon ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={
            locked
              ? "dashboard-btn-secondary mt-auto w-full justify-center"
              : "dashboard-btn-primary mt-auto w-full justify-center disabled:opacity-55"
          }
        >
          {locked ? (
            <>
              <MaterialIcon name="lock" className="text-base" />
              Growth plan or higher
            </>
          ) : busy ? (
            <ButtonLoadingContent loading loadingLabel="Connecting">
              <span className="inline-flex items-center gap-2">
                <MaterialIcon name="link" className="text-base" />
                Connect
              </span>
            </ButtonLoadingContent>
          ) : (
            <>
              <MaterialIcon name="link" className="text-base" />
              Connect
            </>
          )}
        </button>
      ) : null}
    </article>
  );
}

type Props = {
  currentPlanId: string;
  planResolved?: boolean;
  pricingPlans?: PricingPlansPayload | null;
  pricingPlansReady?: boolean;
  onViewPlans: () => void;
};

export function IntegrationsPanel({
  currentPlanId,
  planResolved = false,
  pricingPlans = null,
  pricingPlansReady = false,
  onViewPlans,
}: Props) {
  const planAccessOpts = { plansReady: pricingPlansReady };
  const integrationsAllowed = hasIntegrationsAccess(currentPlanId, pricingPlans, planAccessOpts);
  const pricingAccessPending = !pricingPlansReady;
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listReady, setListReady] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [ownMetaWebhookSetup, setOwnMetaWebhookSetup] = useState<MetaWebhookSetupPayload | null>(
    null
  );
  const [ownMetaWebhookLoading, setOwnMetaWebhookLoading] = useState(false);
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [outlookModalOpen, setOutlookModalOpen] = useState(false);
  const [zohoMailModalOpen, setZohoMailModalOpen] = useState(false);
  const [customMailModalOpen, setCustomMailModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const connectedProviders = new Set(integrations.map((row) => row.provider));
  const AVAILABLE_INTEGRATION_COUNT = CONNECT_OPTIONS.length;
  const connectedCount = CONNECT_OPTIONS.filter((option) =>
    connectedProviders.has(option.id)
  ).length;

  const showPlanLockedNotice = useCallback(() => {
    setNotice(INTEGRATIONS_LOCKED_MESSAGE);
  }, []);

  const loadIntegrations = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || !integrationsAllowed) {
      setIntegrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/integrations`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      const uiRows = readUiOnlyIntegrations();
      if (data.success && Array.isArray(data.integrations)) {
        setIntegrations(
          mergeIntegrationRows(data.integrations as IntegrationRow[], uiRows)
        );
      } else {
        setIntegrations(uiRows);
      }
    } catch {
      setIntegrations(readUiOnlyIntegrations());
    } finally {
      setLoading(false);
    }
  }, [apiBase, integrationsAllowed]);

  useEffect(() => {
    if (!planResolved) return;
    if (!integrationsAllowed) {
      setIntegrations([]);
      setLoading(false);
      setListReady(true);
      return;
    }
    setListReady(false);
    void loadIntegrations();
  }, [planResolved, integrationsAllowed, loadIntegrations]);

  useEffect(() => {
    if (!loading) setListReady(true);
  }, [loading]);

  const hasOwnMetaWhatsApp = integrations.some(
    (row) => row.provider === "whatsapp" && row.whatsappMode === "own"
  );

  useEffect(() => {
    if (!integrationsAllowed || !hasOwnMetaWhatsApp) {
      setOwnMetaWebhookSetup(null);
      return;
    }
    const auth = getStoredAuth();
    if (!auth?.token) return;

    let cancelled = false;
    setOwnMetaWebhookLoading(true);
    void fetchWhatsAppMetaWebhookSetup(auth.token).then((setup) => {
      if (!cancelled) {
        setOwnMetaWebhookSetup(setup);
        setOwnMetaWebhookLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [integrationsAllowed, hasOwnMetaWhatsApp, integrations]);

  const showShimmer =
    !planResolved ||
    pricingAccessPending ||
    (integrationsAllowed && (!listReady || loading));

  const showPlanLocked = planResolved && pricingPlansReady && !integrationsAllowed;

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
        const row = data.integration as IntegrationRow | undefined;
        if (row?.id) {
          setIntegrations((prev) => {
            const rest = prev.filter((r) => r.id !== row.id);
            return [row, ...rest];
          });
          setNotice(
            row.email ? `Gmail connected as ${row.email}.` : "Gmail connected."
          );
        } else {
          setNotice("Gmail connected.");
          void loadIntegrations();
        }
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

  const handleConnectGmail = useCallback(() => {
    if (!integrationsAllowed) {
      showPlanLockedNotice();
      return;
    }
    setNotice("");
    setBusyProvider("gmail");
    gmailLogin();
  }, [integrationsAllowed, showPlanLockedNotice, gmailLogin]);

  const handleConnectWhatsApp = useCallback(() => {
    if (!integrationsAllowed) {
      showPlanLockedNotice();
      return;
    }
    setNotice("");
    setWhatsappModalOpen(true);
  }, [integrationsAllowed, showPlanLockedNotice]);

  const handleConnectCalendly = useCallback(() => {
    if (!integrationsAllowed) {
      showPlanLockedNotice();
      return;
    }
    setNotice("");
    setCalendlyModalOpen(true);
  }, [integrationsAllowed, showPlanLockedNotice]);

  const handleConnectOutlook = useCallback(() => {
    if (!integrationsAllowed) {
      showPlanLockedNotice();
      return;
    }
    setNotice("");
    setOutlookModalOpen(true);
  }, [integrationsAllowed, showPlanLockedNotice]);

  const handleConnectZohoMail = useCallback(() => {
    if (!integrationsAllowed) {
      showPlanLockedNotice();
      return;
    }
    setNotice("");
    setZohoMailModalOpen(true);
  }, [integrationsAllowed, showPlanLockedNotice]);

  const handleConnectCustomMail = useCallback(() => {
    if (!integrationsAllowed) {
      showPlanLockedNotice();
      return;
    }
    setNotice("");
    setCustomMailModalOpen(true);
  }, [integrationsAllowed, showPlanLockedNotice]);

  const applyUiOnlyConnection = useCallback(
    (provider: "custom_mail", email: string, senderName: string) => {
      const row = buildUiOnlyIntegrationRow(provider, { email, senderName });
      upsertUiOnlyIntegration(row);
      setIntegrations((prev) => {
        const apiRows = prev.filter((item) => !isUiOnlyMailProvider(item.provider));
        return mergeIntegrationRows(apiRows, readUiOnlyIntegrations());
      });
      return row;
    },
    []
  );

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
        const row = data.integration as IntegrationRow | undefined;
        if (row?.id) {
          setIntegrations((prev) => {
            const rest = prev.filter((r) => r.id !== row.id);
            return [row, ...rest];
          });
        } else {
          void loadIntegrations();
        }
        setZohoMailModalOpen(false);
        setNotice(
          row?.email ? `Zoho Mail connected as ${row.email}.` : "Zoho Mail connected."
        );
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect Zoho Mail.");
      } finally {
        setBusyProvider(null);
      }
    },
    [apiBase, loadIntegrations]
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
        const payload = {
          fromEmail: values.fromEmail,
          displayName: values.displayName,
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          security: values.security,
          username: values.username,
          password: values.password,
        };
        const { integration } = await connectCustomMail(auth.token, payload);
        const row = integration as IntegrationRow;
        if (row?.id) {
          setIntegrations((prev) => {
            const rest = prev.filter((r) => r.id !== row.id);
            return [row, ...rest];
          });
        } else {
          void loadIntegrations();
        }
        setCustomMailModalOpen(false);
        setNotice(
          row?.email ? `Custom mail connected for ${row.email}.` : "Custom mail connected."
        );
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to save mail config.");
      } finally {
        setBusyProvider(null);
      }
    },
    [loadIntegrations]
  );

  const handleTestCustomMail = useCallback(async () => {
    if (!integrationsAllowed) return;
    setNotice("");
    setBusyProvider("custom_mail");
    const auth = getStoredAuth();
    if (!auth?.token) {
      setNotice("Please sign in again.");
      setBusyProvider(null);
      return;
    }
    try {
      const message = await testCustomMailIntegration(auth.token);
      setNotice(message);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to send test email.");
    } finally {
      setBusyProvider(null);
    }
  }, [integrationsAllowed]);

  const handleWhatsAppSubmit = useCallback(
    async (values: WhatsAppConnectFormValues) => {
      setBusyProvider("whatsapp");
      setNotice("");
      try {
        const auth = getStoredAuth();
        if (!auth?.token) {
          throw new Error("Please sign in again.");
        }
        const isHuntlo = values.mode === "huntlo";
        const res = await fetch(`${apiBase}/api/integrations/whatsapp/connect`, {
          method: "POST",
          headers: authHeaders(auth.token),
          body: JSON.stringify(
            isHuntlo
              ? { whatsappMode: "huntlo" }
              : {
                  whatsappMode: "own",
                  provider: "meta_api",
                  phoneNumberId: values.metaPhoneNumberId,
                  accessToken: values.metaAccessToken,
                  wabaId: values.metaWabaId,
                  confirmWebhookSetup: values.confirmWebhookSetup,
                }
          ),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to connect WhatsApp"
          );
        }
        const row = data.integration as IntegrationRow | undefined;
        if (row?.id) {
          setIntegrations((prev) => {
            const rest = prev.filter((r) => r.provider !== "whatsapp");
            return [row, ...rest];
          });
        } else {
          void loadIntegrations();
        }
        setWhatsappModalOpen(false);
        if (isHuntlo) {
          setNotice(
            values.mode === "huntlo" && row?.providerLabel === "Gupshup"
              ? "Gupshup WhatsApp connected. You can launch WhatsApp campaigns from your workspace."
              : "Huntlo WhatsApp connected. You can launch WhatsApp campaigns from your workspace."
          );
        } else {
          const label =
            typeof row?.senderName === "string" && row.senderName
              ? row.senderName
              : values.metaPhoneNumberId;
          setNotice(`WhatsApp connected via Meta API (${label}).`);
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect WhatsApp.");
      } finally {
        setBusyProvider(null);
      }
    },
    [apiBase, loadIntegrations]
  );

  const handleCalendlySubmit = useCallback(
    async (values: CalendlyConnectFormValues) => {
      setBusyProvider("calendly");
      setNotice("");
      try {
        const auth = getStoredAuth();
        if (!auth?.token) {
          throw new Error("Please sign in again.");
        }
        const res = await fetch(`${apiBase}/api/integrations/calendly/connect`, {
          method: "POST",
          headers: authHeaders(auth.token),
          body: JSON.stringify({
            personalAccessToken: values.personalAccessToken,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to connect Calendly"
          );
        }
        const row = data.integration as IntegrationRow | undefined;
        if (row?.id) {
          setIntegrations((prev) => {
            const rest = prev.filter((r) => r.provider !== "calendly");
            return [row, ...rest];
          });
        } else {
          void loadIntegrations();
        }
        setCalendlyModalOpen(false);
        setNotice(
          row?.email
            ? `Calendly connected as ${row.email}.`
            : "Calendly connected."
        );
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect Calendly.");
      } finally {
        setBusyProvider(null);
      }
    },
    [apiBase, loadIntegrations]
  );

  const handleTestOutlook = useCallback(async () => {
    if (!integrationsAllowed) return;
    setNotice("");
    setBusyProvider("outlook");
    const auth = getStoredAuth();
    if (!auth?.token) {
      setNotice("Please sign in again.");
      setBusyProvider(null);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/integrations/outlook/test`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to send test email"
        );
      }
      setNotice(
        typeof data.message === "string"
          ? data.message
          : "Test email sent. Check your Outlook inbox."
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to send test email.");
    } finally {
      setBusyProvider(null);
    }
  }, [apiBase, integrationsAllowed]);

  const handleTestZohoMail = useCallback(async () => {
    if (!integrationsAllowed) return;
    setNotice("");
    setBusyProvider("zoho_mail");
    const auth = getStoredAuth();
    if (!auth?.token) {
      setNotice("Please sign in again.");
      setBusyProvider(null);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/integrations/zoho_mail/test`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Failed to send test email"
        );
      }
      setNotice(
        typeof data.message === "string"
          ? data.message
          : "Test email sent. Check your Zoho Mail inbox."
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to send test email.");
    } finally {
      setBusyProvider(null);
    }
  }, [apiBase, integrationsAllowed]);

  const handleDisconnect = useCallback(
    async (row: IntegrationRow) => {
      if (!integrationsAllowed) return;
      setNotice("");
      setBusyProvider(row.id);

      if (isUiOnlyMailProvider(row.provider)) {
        removeUiOnlyIntegration(row.provider);
        setIntegrations((prev) => {
          const apiRows = prev.filter((item) => !isUiOnlyMailProvider(item.provider));
          return mergeIntegrationRows(apiRows, readUiOnlyIntegrations());
        });
        setNotice("Integration disconnected.");
        setBusyProvider(null);
        return;
      }

      const auth = getStoredAuth();
      if (auth?.token) {
        try {
          if (isMultiAccountMailProvider(row.provider)) {
            await disconnectEmailIntegrationById(auth.token, row.id);
            setIntegrations((prev) => prev.filter((r) => r.id !== row.id));
          } else {
            const res = await fetch(`${apiBase}/api/integrations/${row.provider}`, {
              method: "DELETE",
              headers: authHeaders(auth.token),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(
                typeof data.message === "string"
                  ? data.message
                  : "Failed to disconnect integration"
              );
            }
            setIntegrations((prev) => prev.filter((r) => r.provider !== row.provider));
          }
          setNotice("Integration disconnected.");
        } catch (err) {
          setNotice(
            err instanceof Error ? err.message : "Failed to disconnect integration."
          );
        }
      }
      setBusyProvider(null);
    },
    [apiBase, integrationsAllowed]
  );

  const handleSetDefaultEmail = useCallback(
    async (integrationId: string) => {
      if (!integrationsAllowed) return;
      setNotice("");
      setBusyProvider(integrationId);
      const auth = getStoredAuth();
      if (!auth?.token) {
        setNotice("Please sign in again.");
        setBusyProvider(null);
        return;
      }
      try {
        await setDefaultEmailIntegration(auth.token, integrationId);
        setIntegrations((prev) =>
          prev.map((row) => ({
            ...row,
            isDefaultEmail:
              isMultiAccountMailProvider(row.provider) && row.id === integrationId,
          }))
        );
        setNotice("Default sender updated.");
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to set default sender.");
      } finally {
        setBusyProvider(null);
      }
    },
    [integrationsAllowed]
  );

  const handleTestEmailRow = useCallback(
    async (row: IntegrationRow) => {
      if (!integrationsAllowed) return;
      setNotice("");
      setBusyProvider(row.id);
      const auth = getStoredAuth();
      if (!auth?.token) {
        setNotice("Please sign in again.");
        setBusyProvider(null);
        return;
      }
      try {
        const message = await testEmailIntegration(auth.token, row.provider, row.id);
        setNotice(message);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to send test email.");
      } finally {
        setBusyProvider(null);
      }
    },
    [integrationsAllowed]
  );

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
        <div className="dashboard-results-toolbar dashboard-results-toolbar--pool">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 dashboard-section-title">
              <MaterialIcon name="hub" className="text-xl text-[#0050cb]" />
              Integrations
            </h3>
            <p className="mt-1 mb-3 dashboard-text-body">
              Connect your tools to outreach, message, and schedule with candidates from one
              workspace.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {showPlanLocked ? (
              <span className="dashboard-integration-enterprise-pill">
                <MaterialIcon name="lock" className="text-sm" aria-hidden />
                Growth+
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dashboard-card-body-scroll">
        {showShimmer ? (
          <IntegrationsPanelSkeleton />
        ) : (
        <>
        <div className="dashboard-integration-connect-section">
          <h4 className="dashboard-integration-section-label">Available to connect</h4>
          <div className="dashboard-integration-grid dashboard-integration-grid--connect">
            {CONNECT_OPTIONS.map((option) => (
              <ConnectOptionCard
                key={option.id}
                option={option}
                locked={showPlanLocked}
                connected={integrationsAllowed && connectedProviders.has(option.id)}
                allowMultiple={isMultiAccountMailProvider(option.id)}
                busy={busyProvider === option.id}
                onLocked={showPlanLockedNotice}
                onConnect={
                  option.id === "gmail"
                    ? handleConnectGmail
                    : option.id === "outlook"
                      ? handleConnectOutlook
                      : option.id === "zoho_mail"
                        ? handleConnectZohoMail
                        : option.id === "custom_mail"
                          ? handleConnectCustomMail
                          : option.id === "whatsapp"
                            ? handleConnectWhatsApp
                            : option.id === "calendly"
                              ? handleConnectCalendly
                              : () => undefined
                }
                onTest={
                  !isMultiAccountMailProvider(option.id) &&
                  option.id === "outlook" &&
                  integrationsAllowed &&
                  connectedProviders.has("outlook")
                    ? () => void handleTestOutlook()
                    : !isMultiAccountMailProvider(option.id) &&
                        option.id === "zoho_mail" &&
                        integrationsAllowed &&
                        connectedProviders.has("zoho_mail")
                      ? () => void handleTestZohoMail()
                      : !isMultiAccountMailProvider(option.id) &&
                          option.id === "custom_mail" &&
                          integrationsAllowed &&
                          connectedProviders.has("custom_mail")
                        ? () => void handleTestCustomMail()
                        : undefined
                }
              />
            ))}
          </div>
        </div>

        {!integrationsAllowed ? (
          <div className="dashboard-integration-summary">
            <span className="dashboard-integration-summary-stat">
              Available on Growth and Enterprise plans
            </span>
            <p className="dashboard-text-body">
              Upgrade to Growth or Enterprise to connect email, messaging, and scheduling tools.
            </p>
          </div>
        ) : null}

        {notice ? (
          <div className="dashboard-integration-notice-wrap">
            <p className="dashboard-alert-notice">{notice}</p>
            {showPlanLocked && notice === INTEGRATIONS_LOCKED_MESSAGE ? (
              <button
                type="button"
                onClick={onViewPlans}
                className="dashboard-btn-primary mt-3 px-4 py-2 text-sm"
              >
                <MaterialIcon name="workspace_premium" className="text-base" />
                View plans
              </button>
            ) : null}
          </div>
        ) : null}

        {hasOwnMetaWhatsApp ? (
          <div className="mt-4">
            <h4 className="dashboard-integration-section-label">Your Meta webhook settings</h4>
            <p className="dashboard-text-body mt-1 mb-3 text-sm">
              Use these values in your Meta Developer app so Huntlo can receive candidate replies.
            </p>
            <WhatsAppMetaWebhookSetupCard
              setup={ownMetaWebhookSetup}
              loading={ownMetaWebhookLoading}
              compact
            />
          </div>
        ) : null}

        <h4 className="dashboard-integration-section-label mt-2">Connected accounts</h4>
        <div
          className="dashboard-thin-scrollbar dashboard-campaigns-table-scroll mt-3"
          tabIndex={0}
          aria-label="Connected integrations table horizontal scroll"
        >
          <div className="dashboard-table-wrap dashboard-table-wrap--scroll-x">
          <table className="dashboard-table dashboard-table--integrations">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Provider</th>
                <th>Sender name</th>
                <th>Email</th>
                <th>Status</th>
                <th className="dashboard-table-actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showPlanLocked ? (
                <tr>
                  <td colSpan={6} className="dashboard-pricing-table-empty">
                    Upgrade to Growth or Enterprise to connect integrations.
                  </td>
                </tr>
              ) : integrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dashboard-pricing-table-empty">
                    No integrations connected yet. Use Connect on the cards above.
                  </td>
                </tr>
              ) : (
                integrations.map((row) => {
                  const disconnecting = busyProvider === row.id;
                  const isMail = isMultiAccountMailProvider(row.provider);
                  const showTest =
                    isMail &&
                    (row.provider === "outlook" ||
                      row.provider === "zoho_mail" ||
                      row.provider === "custom_mail");
                  const showDefaultControl = isMail;
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="flex items-center gap-2">
                          <IntegrationBrandLogo
                            provider={row.provider}
                            title={row.integration}
                            className="dashboard-integration-brand-logo--sm"
                          />
                          <span className="font-medium">{row.integration}</span>
                        </span>
                      </td>
                      <td>{row.providerLabel}</td>
                      <td>{row.senderName || "—"}</td>
                      <td>
                        {row.email ? (
                          <span className="truncate" title={row.email}>
                            {row.email}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className="dashboard-integration-status dashboard-integration-status--connected">
                          <span className="dashboard-integration-status-dot" aria-hidden />
                          {row.isDefaultEmail && isMail ? "Default" : "Connected"}
                        </span>
                      </td>
                      <td className="dashboard-table-actions-cell">
                        <div
                          className="dashboard-integration-actions-toolbar"
                          role="group"
                          aria-label={`${row.integration} actions`}
                        >
                          {showDefaultControl && !row.isDefaultEmail ? (
                            <button
                              type="button"
                              onClick={() => void handleSetDefaultEmail(row.id)}
                              disabled={busyProvider === row.id}
                              className="dashboard-integration-action-btn"
                            >
                              Set default
                            </button>
                          ) : showDefaultControl && row.isDefaultEmail ? (
                            <span className="dashboard-integration-action-btn dashboard-integration-action-btn--default">
                              Default
                            </span>
                          ) : null}
                          {showTest ? (
                            <button
                              type="button"
                              onClick={() => void handleTestEmailRow(row)}
                              disabled={busyProvider === row.id}
                              className="dashboard-integration-action-btn"
                            >
                              Test
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleDisconnect(row)}
                            disabled={disconnecting}
                            className="dashboard-integration-action-btn dashboard-integration-action-btn--danger"
                          >
                            <ButtonLoadingContent loading={disconnecting} loadingLabel="Disconnecting">
                              Disconnect
                            </ButtonLoadingContent>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
        </>
        )}
      </div>

      <WhatsAppConnectModal
        open={whatsappModalOpen}
        busy={busyProvider === "whatsapp"}
        onClose={() => {
          if (busyProvider === "whatsapp") return;
          setWhatsappModalOpen(false);
        }}
        onSubmit={(values) => void handleWhatsAppSubmit(values)}
      />

      <CalendlyConnectModal
        open={calendlyModalOpen}
        busy={busyProvider === "calendly"}
        onClose={() => {
          if (busyProvider === "calendly") return;
          setCalendlyModalOpen(false);
        }}
        onSubmit={(values) => void handleCalendlySubmit(values)}
      />

      <OutlookConnectModal
        open={outlookModalOpen}
        busy={busyProvider === "outlook"}
        onClose={() => {
          if (busyProvider === "outlook") return;
          setOutlookModalOpen(false);
        }}
      />

      <ZohoMailConnectModal
        open={zohoMailModalOpen}
        busy={busyProvider === "zoho_mail"}
        onClose={() => {
          if (busyProvider === "zoho_mail") return;
          setZohoMailModalOpen(false);
        }}
        onSubmit={(values) => void handleZohoMailSubmit(values)}
      />

      <CustomMailConnectModal
        open={customMailModalOpen}
        busy={busyProvider === "custom_mail"}
        onClose={() => {
          if (busyProvider === "custom_mail") return;
          setCustomMailModalOpen(false);
        }}
        onSubmit={(values) => void handleCustomMailSubmit(values)}
      />
    </section>
  );
}
