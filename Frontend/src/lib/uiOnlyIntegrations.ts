export type UiOnlyIntegrationRow = {
  id: string;
  provider: string;
  integration: string;
  providerLabel: string;
  senderName: string;
  email: string;
  status: string;
  uiOnly: true;
};

const STORAGE_KEY = "ejhunter_ui_mail_integrations";

export const UI_ONLY_MAIL_PROVIDERS = new Set(["custom_mail"]);

export function isUiOnlyMailProvider(provider: string): boolean {
  return UI_ONLY_MAIL_PROVIDERS.has(provider);
}

export function readUiOnlyIntegrations(): UiOnlyIntegrationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is UiOnlyIntegrationRow =>
        Boolean(row) &&
        typeof row === "object" &&
        isUiOnlyMailProvider(String((row as UiOnlyIntegrationRow).provider)) &&
        (row as UiOnlyIntegrationRow).uiOnly === true
    );
  } catch {
    return [];
  }
}

export function writeUiOnlyIntegrations(rows: UiOnlyIntegrationRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota / private mode
  }
}

export function upsertUiOnlyIntegration(row: UiOnlyIntegrationRow): UiOnlyIntegrationRow[] {
  const rest = readUiOnlyIntegrations().filter((item) => item.provider !== row.provider);
  const next = [row, ...rest];
  writeUiOnlyIntegrations(next);
  return next;
}

export function removeUiOnlyIntegration(provider: string): UiOnlyIntegrationRow[] {
  const next = readUiOnlyIntegrations().filter((item) => item.provider !== provider);
  writeUiOnlyIntegrations(next);
  return next;
}

export function buildUiOnlyIntegrationRow(
  provider: "custom_mail",
  {
    email,
    senderName,
  }: {
    email: string;
    senderName: string;
  }
): UiOnlyIntegrationRow {
  const labels: Record<
    typeof provider,
    { integration: string; providerLabel: string }
  > = {
    custom_mail: { integration: "Custom config", providerLabel: "SMTP" },
  };

  const meta = labels[provider];
  return {
    id: `ui-${provider}-${Date.now()}`,
    provider,
    integration: meta.integration,
    providerLabel: meta.providerLabel,
    senderName: senderName.trim() || email.split("@")[0] || "—",
    email: email.trim(),
    status: "connected",
    uiOnly: true,
  };
}
