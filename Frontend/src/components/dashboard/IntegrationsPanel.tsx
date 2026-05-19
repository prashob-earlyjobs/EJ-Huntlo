"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type IntegrationId = "gmail" | "whatsapp" | "google_calendar";

const ENTERPRISE_PLAN_ID = "enterprise";
const ENTERPRISE_LOCKED_MESSAGE =
  "Integrations are available on the Enterprise plan only. Upgrade to connect Gmail, WhatsApp, and Google Calendar.";

type IntegrationDef = {
  id: IntegrationId;
  name: string;
  description: string;
  icon: string;
  accent: string;
  features: string[];
};

const INTEGRATIONS_STORAGE_KEY = "ejhunter_integrations_connected";

const INTEGRATION_OPTIONS: IntegrationDef[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and track candidate outreach from your work inbox.",
    icon: "mail",
    accent: "#EA4335",
    features: ["Send outreach emails", "Track opens & replies", "Use templates"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Message candidates on WhatsApp without leaving Huntlo.",
    icon: "chat",
    accent: "#25D366",
    features: ["Quick candidate messages", "Template messages", "Conversation history"],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Schedule interviews and sync availability with your calendar.",
    icon: "calendar_month",
    accent: "#4285F4",
    features: ["Book interview slots", "Send calendar invites", "Avoid double-booking"],
  },
];

function readConnectedIds(): IntegrationId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(INTEGRATION_OPTIONS.map((o) => o.id));
    return parsed.filter(
      (id): id is IntegrationId =>
        typeof id === "string" && allowed.has(id as IntegrationId)
    );
  } catch {
    return [];
  }
}

function writeConnectedIds(ids: IntegrationId[]) {
  try {
    localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

type IntegrationCardProps = {
  integration: IntegrationDef;
  locked: boolean;
  connected: boolean;
  busy: boolean;
  onLocked: () => void;
  onToggle: () => void;
};

function IntegrationCard({
  integration,
  locked,
  connected,
  busy,
  onLocked,
  onToggle,
}: IntegrationCardProps) {
  const handleAction = () => {
    if (locked) {
      onLocked();
      return;
    }
    onToggle();
  };

  return (
    <article
      className={`dashboard-integration-card${locked ? " dashboard-integration-card--locked" : ""}`}
    >
      {locked ? (
        <span className="dashboard-integration-lock-badge" aria-hidden>
          <MaterialIcon name="lock" className="text-[15px]" />
        </span>
      ) : null}

      <div className="dashboard-integration-card-top">
        <span
          className={`dashboard-integration-icon${
            locked ? " dashboard-integration-icon--locked" : ""
          }`}
          style={{ "--integration-accent": integration.accent } as CSSProperties}
          aria-hidden
        >
          {locked ? (
            <MaterialIcon name="lock" className="text-[20px]" />
          ) : (
            <MaterialIcon name={integration.icon} className="text-[22px]" />
          )}
        </span>
        <span
          className={`dashboard-integration-status${
            locked
              ? " dashboard-integration-status--locked"
              : connected
                ? " dashboard-integration-status--connected"
                : ""
          }`}
        >
          {!locked ? <span className="dashboard-integration-status-dot" aria-hidden /> : null}
          {locked ? (
            <>
              <MaterialIcon name="workspace_premium" className="text-sm" aria-hidden />
              Enterprise
            </>
          ) : connected ? (
            "Connected"
          ) : (
            "Not connected"
          )}
        </span>
      </div>

      <h4 className="dashboard-integration-name">{integration.name}</h4>
      <p className="dashboard-integration-desc">{integration.description}</p>

      <ul className="dashboard-integration-features">
        {integration.features.map((feature) => (
          <li key={feature}>
            <MaterialIcon name="check_circle" className="text-sm opacity-80" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleAction}
        disabled={busy && !locked}
        className={
          locked
            ? "dashboard-btn-secondary w-full justify-center"
            : connected
              ? "dashboard-btn-secondary w-full justify-center disabled:opacity-55"
              : "dashboard-btn-primary w-full justify-center disabled:opacity-55"
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
            {connected ? "Disconnecting…" : "Connecting…"}
          </>
        ) : connected ? (
          <>
            <MaterialIcon name="link_off" className="text-base" />
            Disconnect
          </>
        ) : (
          <>
            <MaterialIcon name="link" className="text-base" />
            Connect
          </>
        )}
      </button>
    </article>
  );
}

type Props = {
  currentPlanId: string;
  onViewPlans: () => void;
};

export function IntegrationsPanel({ currentPlanId, onViewPlans }: Props) {
  const isEnterprise = currentPlanId === ENTERPRISE_PLAN_ID;
  const [connectedIds, setConnectedIds] = useState<IntegrationId[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<IntegrationId | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setConnectedIds(readConnectedIds());
    setReady(true);
  }, []);

  const showEnterpriseNotice = useCallback(() => {
    setNotice(ENTERPRISE_LOCKED_MESSAGE);
  }, []);

  const toggleConnection = useCallback(
    async (id: IntegrationId) => {
      if (!isEnterprise) {
        showEnterpriseNotice();
        return;
      }
      setNotice("");
      setBusyId(id);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      const label = INTEGRATION_OPTIONS.find((o) => o.id === id)?.name ?? "Integration";
      setConnectedIds((prev) => {
        const wasConnected = prev.includes(id);
        const next = wasConnected ? prev.filter((x) => x !== id) : [...prev, id];
        writeConnectedIds(next);
        setNotice(
          wasConnected
            ? `${label} disconnected.`
            : `${label} connected. OAuth sign-in will be available in a future release.`
        );
        return next;
      });
      setBusyId(null);
    },
    [isEnterprise, showEnterpriseNotice]
  );

  const connectedCount = isEnterprise ? connectedIds.length : 0;

  if (!ready) {
    return (
      <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
        <div className="dashboard-shimmer h-8 w-48 rounded" />
        <div className="dashboard-integration-grid mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`integration-skel-${i}`}
              className="dashboard-integration-card dashboard-integration-card--static"
            >
              <div className="dashboard-shimmer h-10 w-10 rounded-lg" />
              <div className="dashboard-shimmer mt-4 h-5 w-32 rounded" />
              <div className="dashboard-shimmer mt-2 h-4 w-full max-w-xs rounded" />
              <div className="dashboard-shimmer mt-6 h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header">
        <div className="dashboard-results-toolbar dashboard-results-toolbar--pool">
          <div>
            <h3 className="flex items-center gap-2 dashboard-section-title">
              <MaterialIcon name="hub" className="text-xl text-[#0050cb]" />
              Integrations
            </h3>
            <p className="mt-1 mb-3 dashboard-text-body">
              Connect your tools to outreach, message, and schedule with candidates from one
              workspace.
            </p>
          </div>
          {!isEnterprise ? (
            <span className="dashboard-integration-enterprise-pill">
              <MaterialIcon name="lock" className="text-sm" aria-hidden />
              Enterprise
            </span>
          ) : null}
        </div>
      </div>

      <div className="dashboard-card-body-scroll">
        <div className="dashboard-integration-summary">
          {isEnterprise ? (
            <>
              <span className="dashboard-integration-summary-stat tabular-nums">
                {connectedCount} of {INTEGRATION_OPTIONS.length} connected
              </span>
              <p className="dashboard-text-body">
                OAuth sign-in for each provider is coming soon.
              </p>
            </>
          ) : (
            <>
              <span className="dashboard-integration-summary-stat">
                Available on Enterprise plan
              </span>
              <p className="dashboard-text-body">
                Upgrade to unlock Gmail, WhatsApp, and Google Calendar integrations.
              </p>
            </>
          )}
        </div>

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

        <div className="dashboard-integration-grid">
          {INTEGRATION_OPTIONS.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              locked={!isEnterprise}
              connected={isEnterprise && connectedIds.includes(integration.id)}
              busy={busyId === integration.id}
              onLocked={showEnterpriseNotice}
              onToggle={() => void toggleConnection(integration.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
