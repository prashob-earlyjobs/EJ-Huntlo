export type VoiceCallRetryConfig = {
  maxRetryCount: number;
  retryIntervalHours: number;
};

export const VOICE_CALL_RETRY_INTERVAL_OPTIONS = [3, 6, 9, 12, 24] as const;

export const VOICE_CALL_RETRY_COUNT_MIN = 2;
export const VOICE_CALL_RETRY_COUNT_MAX = 10;

export const DEFAULT_VOICE_CALL_RETRY_CONFIG: VoiceCallRetryConfig = {
  maxRetryCount: 0,
  retryIntervalHours: 0,
};

export const DEFAULT_ENABLED_VOICE_CALL_RETRY_CONFIG: VoiceCallRetryConfig = {
  maxRetryCount: 2,
  retryIntervalHours: 6,
};

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
  raw?: Partial<VoiceCallRetryConfig> | null
): VoiceCallRetryConfig {
  const maxRetryCount = Number(raw?.maxRetryCount ?? 0);
  const retryIntervalHours = Number(raw?.retryIntervalHours ?? 0);

  if (!Number.isFinite(maxRetryCount) || maxRetryCount <= 0) {
    return { ...DEFAULT_VOICE_CALL_RETRY_CONFIG };
  }

  const count = Math.min(
    VOICE_CALL_RETRY_COUNT_MAX,
    Math.max(VOICE_CALL_RETRY_COUNT_MIN, Math.floor(maxRetryCount))
  );
  const allowed = new Set<number>(VOICE_CALL_RETRY_INTERVAL_OPTIONS);
  const interval = allowed.has(Math.floor(retryIntervalHours))
    ? Math.floor(retryIntervalHours)
    : DEFAULT_ENABLED_VOICE_CALL_RETRY_CONFIG.retryIntervalHours;

  return { maxRetryCount: count, retryIntervalHours: interval };
}

export function parseVoiceCallRetryConfigFromApi(
  raw?: Record<string, unknown> | null
): VoiceCallRetryConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_VOICE_CALL_RETRY_CONFIG };
  return normalizeVoiceCallRetryConfig({
    maxRetryCount: Number(raw.maxRetryCount ?? raw.max_retry_count ?? 0),
    retryIntervalHours: Number(raw.retryIntervalHours ?? raw.retry_interval_hours ?? 0),
  });
}
