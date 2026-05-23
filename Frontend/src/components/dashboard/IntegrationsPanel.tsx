"use client";

import { useCallback, useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import {
  WhatsAppConnectModal,
  type WhatsAppConnectFormValues,
} from "@/components/dashboard/WhatsAppConnectModal";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";

const ENTERPRISE_PLAN_ID = "enterprise";
const ENTERPRISE_LOCKED_MESSAGE =
  "Integrations are available on the Enterprise plan only. Upgrade to connect Gmail, WhatsApp, and Google Calendar.";

type IntegrationRow = {
  id: string;
  provider: string;
  integration: string;
  providerLabel: string;
  senderName: string;
  email: string;
  status: string;
};

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
    id: "whatsapp",
    name: "WhatsApp",
    provider: "Meta",
    description: "Message candidates on WhatsApp from your workspace.",
    connectable: true,
  },
];

type ConnectOptionCardProps = {
  option: ConnectOption;
  locked: boolean;
  connected: boolean;
  busy: boolean;
  onLocked: () => void;
  onConnect: () => void;
};

function ConnectOptionCard({
  option,
  locked,
  connected,
  busy,
  onLocked,
  onConnect,
}: ConnectOptionCardProps) {
  const handleClick = () => {
    if (locked) {
      onLocked();
      return;
    }
    if (!connected) onConnect();
  };

  return (
    <article
      className={`dashboard-integration-card dashboard-integration-card--compact${
        locked ? " dashboard-integration-card--locked" : ""
      }${option.comingSoon ? " dashboard-integration-card--soon" : ""}`}
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
              : connected
                ? " dashboard-integration-status--connected"
                : option.comingSoon
                  ? " dashboard-integration-status--soon"
                  : ""
          }`}
        >
          {!locked && (connected || !option.comingSoon) ? (
            <span className="dashboard-integration-status-dot" aria-hidden />
          ) : null}
          {locked ? (
            <>
              <MaterialIcon name="workspace_premium" className="text-sm" aria-hidden />
              Enterprise
            </>
          ) : connected ? (
            "Connected"
          ) : option.comingSoon ? (
            "Coming soon"
          ) : (
            "Not connected"
          )}
        </span>
      </div>

      <h4 className="dashboard-integration-name">{option.name}</h4>
      <p className="dashboard-integration-desc">{option.description}</p>
      <p className="dashboard-integration-provider-label">{option.provider}</p>

      {!connected ? (
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
              Enterprise plan required
            </>
          ) : busy ? (
            <>
              <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
              Connecting…
            </>
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
  onViewPlans: () => void;
};

export function IntegrationsPanel({ currentPlanId, onViewPlans }: Props) {
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const connectedProviders = new Set(integrations.map((row) => row.provider));

  const showEnterpriseNotice = useCallback(() => {
    setNotice(ENTERPRISE_LOCKED_MESSAGE);
  }, []);

  const loadIntegrations = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token || !isEnterprise) {
      setIntegrations([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/integrations`, {
        headers: authHeaders(auth.token),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.integrations)) {
        setIntegrations(data.integrations as IntegrationRow[]);
      } else {
        setIntegrations([]);
      }
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, isEnterprise]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const gmailLogin = useGoogleLogin({
    flow: "auth-code",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
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
            const rest = prev.filter((r) => r.provider !== row.provider);
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
    if (!isEnterprise) {
      showEnterpriseNotice();
      return;
    }
    setNotice("");
    setBusyProvider("gmail");
    gmailLogin();
  }, [isEnterprise, showEnterpriseNotice, gmailLogin]);

  const handleConnectWhatsApp = useCallback(() => {
    if (!isEnterprise) {
      showEnterpriseNotice();
      return;
    }
    setNotice("");
    setWhatsappModalOpen(true);
  }, [isEnterprise, showEnterpriseNotice]);

  const handleWhatsAppSubmit = useCallback(
    async (values: WhatsAppConnectFormValues) => {
      setBusyProvider("whatsapp");
      setNotice("");
      try {
        const auth = getStoredAuth();
        if (!auth?.token) {
          throw new Error("Please sign in again.");
        }
        const res = await fetch(`${apiBase}/api/integrations/whatsapp/connect`, {
          method: "POST",
          headers: authHeaders(auth.token),
          body: JSON.stringify({
            gupshupMode: values.gupshupMode,
            gupshupUserId: values.gupshupUserId,
            gupshupPassword: values.gupshupPassword,
          }),
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
        const viaHuntlo = values.gupshupMode === "huntlo";
        setNotice(
          viaHuntlo
            ? "Huntlo WhatsApp connected."
            : `WhatsApp connected for Gupshup user ${values.gupshupUserId}.`
        );
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Failed to connect WhatsApp.");
      } finally {
        setBusyProvider(null);
      }
    },
    [apiBase, loadIntegrations]
  );

  const handleDisconnect = useCallback(
    async (provider: string) => {
      if (!isEnterprise) return;
      setNotice("");
      setBusyProvider(provider);
      const auth = getStoredAuth();
      if (auth?.token) {
        try {
          const res = await fetch(`${apiBase}/api/integrations/${provider}`, {
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
          setIntegrations((prev) => prev.filter((r) => r.provider !== provider));
          setNotice("Integration disconnected.");
        } catch (err) {
          setNotice(
            err instanceof Error ? err.message : "Failed to disconnect integration."
          );
        }
      }
      setBusyProvider(null);
    },
    [apiBase, isEnterprise]
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
            {!isEnterprise ? (
              <span className="dashboard-integration-enterprise-pill">
                <MaterialIcon name="lock" className="text-sm" aria-hidden />
                Enterprise
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="dashboard-card-body-scroll">
        <div className="dashboard-integration-connect-section">
          <h4 className="dashboard-integration-section-label">Available to connect</h4>
          <div className="dashboard-integration-grid dashboard-integration-grid--connect">
            {CONNECT_OPTIONS.map((option) => (
              <ConnectOptionCard
                key={option.id}
                option={option}
                locked={!isEnterprise}
                connected={isEnterprise && connectedProviders.has(option.id)}
                busy={busyProvider === option.id}
                onLocked={showEnterpriseNotice}
                onConnect={
                  option.id === "gmail"
                    ? handleConnectGmail
                    : option.id === "whatsapp"
                      ? handleConnectWhatsApp
                      : () => undefined
                }
              />
            ))}
          </div>
        </div>

        {!isEnterprise ? (
          <div className="dashboard-integration-summary">
            <span className="dashboard-integration-summary-stat">
              Available on Enterprise plan
            </span>
            <p className="dashboard-text-body">
              Upgrade to unlock Gmail, WhatsApp, and Google Calendar integrations.
            </p>
          </div>
        ) : null}

        {notice ? (
          <div className="dashboard-integration-notice-wrap">
            <p className="dashboard-alert-notice">{notice}</p>
            {!isEnterprise && notice === ENTERPRISE_LOCKED_MESSAGE ? (
              <button
                type="button"
                onClick={onViewPlans}
                className="dashboard-btn-primary mt-3 px-4 py-2 text-sm"
              >
                <MaterialIcon name="workspace_premium" className="text-base" />
                View Enterprise plan
              </button>
            ) : null}
          </div>
        ) : null}

        <h4 className="dashboard-integration-section-label mt-2">Connected accounts</h4>
        <div className="dashboard-table-wrap mt-3">
          <table className="dashboard-table">
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
              {!isEnterprise ? (
                <tr>
                  <td colSpan={6} className="dashboard-pricing-table-empty">
                    Upgrade to Enterprise to connect integrations.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={6} className="dashboard-pricing-table-empty">
                    Loading integrations…
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
                  const disconnecting = busyProvider === row.provider;
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
                          Connected
                        </span>
                      </td>
                      <td className="dashboard-table-actions-cell">
                        <button
                          type="button"
                          onClick={() => void handleDisconnect(row.provider)}
                          disabled={disconnecting}
                          className="dashboard-btn-secondary px-3 py-1.5 text-xs disabled:opacity-55"
                        >
                          {disconnecting ? (
                            <>
                              <span className="dashboard-reveal-spinner shrink-0" aria-hidden />
                              Disconnecting…
                            </>
                          ) : (
                            <>
                              <MaterialIcon name="link_off" className="text-sm" />
                              Disconnect
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
    </section>
  );
}
