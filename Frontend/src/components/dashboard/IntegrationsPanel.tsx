"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { MaterialIcon } from "@/components/landing/MaterialIcon";

export type IntegrationId = "gmail" | "whatsapp" | "google_calendar";

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
    return parsed.filter((id): id is IntegrationId => typeof id === "string" && allowed.has(id as IntegrationId));
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
  connected: boolean;
  busy: boolean;
  onToggle: () => void;
};

function IntegrationCard({ integration, connected, busy, onToggle }: IntegrationCardProps) {
  return (
    <article className="dashboard-integration-card">
      <div className="dashboard-integration-card-top">
        <span
          className="dashboard-integration-icon"
          style={{ "--integration-accent": integration.accent } as CSSProperties}
          aria-hidden
        >
          <MaterialIcon name={integration.icon} className="text-[22px]" />
        </span>
        <span
          className={`dashboard-integration-status${
            connected ? " dashboard-integration-status--connected" : ""
          }`}
        >
          <span className="dashboard-integration-status-dot" aria-hidden />
          {connected ? "Connected" : "Not connected"}
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
        onClick={onToggle}
        disabled={busy}
        className={
          connected
            ? "dashboard-btn-secondary w-full justify-center disabled:opacity-55"
            : "dashboard-btn-primary w-full justify-center disabled:opacity-55"
        }
      >
        {busy ? (
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

export function IntegrationsPanel() {
  const [connectedIds, setConnectedIds] = useState<IntegrationId[]>([]);
  const [ready, setReady] = useState(false);
  const [busyId, setBusyId] = useState<IntegrationId | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setConnectedIds(readConnectedIds());
    setReady(true);
  }, []);

  const toggleConnection = useCallback(async (id: IntegrationId) => {
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
  }, []);

  const connectedCount = connectedIds.length;

  if (!ready) {
    return (
      <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
        <div className="dashboard-shimmer h-8 w-48 rounded" />
        <div className="dashboard-integration-grid mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`integration-skel-${i}`} className="dashboard-integration-card dashboard-integration-card--static">
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
      </div>

      <div className="dashboard-card-body-scroll">
        <div className="dashboard-integration-summary">
          <span className="dashboard-integration-summary-stat tabular-nums">
            {connectedCount} of {INTEGRATION_OPTIONS.length} connected
          </span>
          <p className="dashboard-text-body">
            OAuth sign-in for each provider is coming soon. You can preview connections below.
          </p>
        </div>

        {notice ? <p className="dashboard-alert-notice">{notice}</p> : null}

        <div className="dashboard-integration-grid">
          {INTEGRATION_OPTIONS.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              connected={connectedIds.includes(integration.id)}
              busy={busyId === integration.id}
              onToggle={() => void toggleConnection(integration.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
