const VOICE_CALL_RETRY_INTERVAL_OPTIONS = [3, 6, 9, 12, 24];
const VOICE_CALL_RETRY_COUNT_MIN = 2;
const VOICE_CALL_RETRY_COUNT_MAX = 10;

const DEFAULT_VOICE_CALL_RETRY_CONFIG = {
  maxRetryCount: 0,
  retryIntervalHours: 0,
};

const DEFAULT_ENABLED_VOICE_CALL_RETRY_CONFIG = {
  maxRetryCount: 2,
  retryIntervalHours: 6,
};

function normalizeVoiceCallRetryConfig(raw) {
  const maxRetryCount = Number(raw?.maxRetryCount ?? raw?.max_retry_count ?? 0);
  const retryIntervalHours = Number(raw?.retryIntervalHours ?? raw?.retry_interval_hours ?? 0);

  if (!Number.isFinite(maxRetryCount) || maxRetryCount <= 0) {
    return { ...DEFAULT_VOICE_CALL_RETRY_CONFIG };
  }

  const count = Math.min(
    VOICE_CALL_RETRY_COUNT_MAX,
    Math.max(VOICE_CALL_RETRY_COUNT_MIN, Math.floor(maxRetryCount))
  );
  const interval = VOICE_CALL_RETRY_INTERVAL_OPTIONS.includes(Math.floor(retryIntervalHours))
    ? Math.floor(retryIntervalHours)
    : DEFAULT_ENABLED_VOICE_CALL_RETRY_CONFIG.retryIntervalHours;

  return { maxRetryCount: count, retryIntervalHours: interval };
}

function buildHunarRetryConfig(raw) {
  const normalized = normalizeVoiceCallRetryConfig(raw);
  return {
    max_retry_count: normalized.maxRetryCount,
    retry_interval_hours: normalized.retryIntervalHours,
  };
}

function resolveCampaignVoiceCallRetryConfig(campaign) {
  return normalizeVoiceCallRetryConfig(campaign?.voiceAgentConfig?.retryConfig);
}

module.exports = {
  VOICE_CALL_RETRY_INTERVAL_OPTIONS,
  VOICE_CALL_RETRY_COUNT_MIN,
  VOICE_CALL_RETRY_COUNT_MAX,
  DEFAULT_VOICE_CALL_RETRY_CONFIG,
  normalizeVoiceCallRetryConfig,
  buildHunarRetryConfig,
  resolveCampaignVoiceCallRetryConfig,
};
