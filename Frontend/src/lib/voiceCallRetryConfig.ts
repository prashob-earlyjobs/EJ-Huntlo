import { isQaEnv } from "@/lib/appEnv";

export type VoiceCallRetryConfig = {
  maxRetryCount: number;
  retryIntervalHours: number;
  retryIntervalMinutes: number;
};

export const VOICE_CALL_RETRY_INTERVAL_HOUR_OPTIONS = [3, 6, 9, 12, 24] as const;
export const VOICE_CALL_RETRY_INTERVAL_MINUTE_OPTIONS = [3, 6, 9, 12, 24] as const;

export const VOICE_CALL_RETRY_COUNT_MIN = 2;
export const VOICE_CALL_RETRY_COUNT_MAX = 10;

export const DEFAULT_VOICE_CALL_RETRY_CONFIG: VoiceCallRetryConfig = {
  maxRetryCount: 0,
  retryIntervalHours: 0,
  retryIntervalMinutes: 0,
};

export function getDefaultEnabledVoiceCallRetryConfig(): VoiceCallRetryConfig {
  if (isQaEnv()) {
    return { maxRetryCount: 2, retryIntervalHours: 0, retryIntervalMinutes: 6 };
  }
  return { maxRetryCount: 2, retryIntervalHours: 6, retryIntervalMinutes: 0 };
}

export function getVoiceCallRetryIntervalOptions(): readonly number[] {
  return isQaEnv()
    ? VOICE_CALL_RETRY_INTERVAL_MINUTE_OPTIONS
    : VOICE_CALL_RETRY_INTERVAL_HOUR_OPTIONS;
}

export function getVoiceCallRetryIntervalUnitLabel(): "minutes" | "hours" {
  return isQaEnv() ? "minutes" : "hours";
}

export function getVoiceCallRetryIntervalValue(config: VoiceCallRetryConfig): number {
  return isQaEnv() ? config.retryIntervalMinutes : config.retryIntervalHours;
}

export function patchVoiceCallRetryInterval(
  config: VoiceCallRetryConfig,
  interval: number
): VoiceCallRetryConfig {
  if (isQaEnv()) {
    return normalizeVoiceCallRetryConfig({
      ...config,
      retryIntervalMinutes: interval,
      retryIntervalHours: 0,
    });
  }
  return normalizeVoiceCallRetryConfig({
    ...config,
    retryIntervalHours: interval,
    retryIntervalMinutes: 0,
  });
}

export function isVoiceCallRetryEnabled(config: VoiceCallRetryConfig): boolean {
  return config.maxRetryCount > 0;
}

export function buildVoiceCallRetryCountOptions(): number[] {
  return Array.from(
    { length: VOICE_CALL_RETRY_COUNT_MAX - VOICE_CALL_RETRY_COUNT_MIN + 1 },
    (_, index) => index + VOICE_CALL_RETRY_COUNT_MIN
  );
}

export function normalizeVoiceCallRetryConfig(
  raw?: Partial<VoiceCallRetryConfig> | null,
  qa = isQaEnv()
): VoiceCallRetryConfig {
  const maxRetryCount = Number(raw?.maxRetryCount ?? 0);

  if (!Number.isFinite(maxRetryCount) || maxRetryCount <= 0) {
    return { ...DEFAULT_VOICE_CALL_RETRY_CONFIG };
  }

  const count = Math.min(
    VOICE_CALL_RETRY_COUNT_MAX,
    Math.max(VOICE_CALL_RETRY_COUNT_MIN, Math.floor(maxRetryCount))
  );
  const defaults = getDefaultEnabledVoiceCallRetryConfig();

  if (qa) {
    const retryIntervalMinutes = Number(raw?.retryIntervalMinutes ?? 0);
    const allowed = new Set<number>(VOICE_CALL_RETRY_INTERVAL_MINUTE_OPTIONS);
    const interval = allowed.has(Math.floor(retryIntervalMinutes))
      ? Math.floor(retryIntervalMinutes)
      : defaults.retryIntervalMinutes;
    return { maxRetryCount: count, retryIntervalHours: 0, retryIntervalMinutes: interval };
  }

  const retryIntervalHours = Number(raw?.retryIntervalHours ?? 0);
  const allowed = new Set<number>(VOICE_CALL_RETRY_INTERVAL_HOUR_OPTIONS);
  const interval = allowed.has(Math.floor(retryIntervalHours))
    ? Math.floor(retryIntervalHours)
    : defaults.retryIntervalHours;

  return { maxRetryCount: count, retryIntervalHours: interval, retryIntervalMinutes: 0 };
}

export function parseVoiceCallRetryConfigFromApi(
  raw?: Record<string, unknown> | null
): VoiceCallRetryConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_VOICE_CALL_RETRY_CONFIG };
  return normalizeVoiceCallRetryConfig({
    maxRetryCount: Number(raw.maxRetryCount ?? raw.max_retry_count ?? 0),
    retryIntervalHours: Number(raw.retryIntervalHours ?? raw.retry_interval_hours ?? 0),
    retryIntervalMinutes: Number(raw.retryIntervalMinutes ?? raw.retry_interval_minutes ?? 0),
  });
}
