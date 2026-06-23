const { isQaEnv } = require("../config/appEnv");

const VOICE_CALL_RETRY_INTERVAL_HOUR_OPTIONS = [3, 6, 9, 12, 24];
const VOICE_CALL_RETRY_INTERVAL_MINUTE_OPTIONS = [3, 6, 9, 12, 24];
const VOICE_CALL_RETRY_COUNT_MIN = 2;
const VOICE_CALL_RETRY_COUNT_MAX = 10;

const DEFAULT_VOICE_CALL_RETRY_CONFIG = {
  maxRetryCount: 0,
  retryIntervalHours: 0,
  retryIntervalMinutes: 0,
};

function getDefaultEnabledVoiceCallRetryConfig() {
  if (isQaEnv()) {
    return { maxRetryCount: 2, retryIntervalHours: 0, retryIntervalMinutes: 6 };
  }
  return { maxRetryCount: 2, retryIntervalHours: 6, retryIntervalMinutes: 0 };
}

function normalizeVoiceCallRetryConfig(raw) {
  const maxRetryCount = Number(raw?.maxRetryCount ?? raw?.max_retry_count ?? 0);

  if (!Number.isFinite(maxRetryCount) || maxRetryCount <= 0) {
    return { ...DEFAULT_VOICE_CALL_RETRY_CONFIG };
  }

  const count = Math.min(
    VOICE_CALL_RETRY_COUNT_MAX,
    Math.max(VOICE_CALL_RETRY_COUNT_MIN, Math.floor(maxRetryCount))
  );
  const defaults = getDefaultEnabledVoiceCallRetryConfig();

  if (isQaEnv()) {
    const retryIntervalMinutes = Number(raw?.retryIntervalMinutes ?? raw?.retry_interval_minutes ?? 0);
    const interval = VOICE_CALL_RETRY_INTERVAL_MINUTE_OPTIONS.includes(
      Math.floor(retryIntervalMinutes)
    )
      ? Math.floor(retryIntervalMinutes)
      : defaults.retryIntervalMinutes;
    return { maxRetryCount: count, retryIntervalHours: 0, retryIntervalMinutes: interval };
  }

  const retryIntervalHours = Number(raw?.retryIntervalHours ?? raw?.retry_interval_hours ?? 0);
  const interval = VOICE_CALL_RETRY_INTERVAL_HOUR_OPTIONS.includes(Math.floor(retryIntervalHours))
    ? Math.floor(retryIntervalHours)
    : defaults.retryIntervalHours;

  return { maxRetryCount: count, retryIntervalHours: interval, retryIntervalMinutes: 0 };
}

function buildHunarRetryConfig(raw) {
  const normalized = normalizeVoiceCallRetryConfig(raw);

  if (isQaEnv() && normalized.maxRetryCount > 0) {
    return {
      max_retry_count: normalized.maxRetryCount,
      retry_interval_minutes: normalized.retryIntervalMinutes,
    };
  }

  return {
    max_retry_count: normalized.maxRetryCount,
    retry_interval_hours: normalized.retryIntervalHours,
  };
}

function resolveCampaignVoiceCallRetryConfig(campaign) {
  return normalizeVoiceCallRetryConfig(campaign?.voiceAgentConfig?.retryConfig);
}

module.exports = {
  VOICE_CALL_RETRY_INTERVAL_HOUR_OPTIONS,
  VOICE_CALL_RETRY_INTERVAL_MINUTE_OPTIONS,
  VOICE_CALL_RETRY_COUNT_MIN,
  VOICE_CALL_RETRY_COUNT_MAX,
  DEFAULT_VOICE_CALL_RETRY_CONFIG,
  normalizeVoiceCallRetryConfig,
  buildHunarRetryConfig,
  resolveCampaignVoiceCallRetryConfig,
};
