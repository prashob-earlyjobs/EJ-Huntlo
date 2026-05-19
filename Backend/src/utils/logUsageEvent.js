const UsageEvent = require("../models/UsageEvent");

function analyticsSource({ success, found, source }) {
  if (success === false || found === false) return "not_found";
  return source || "futurejobs";
}

function revealEventType(revealType) {
  return revealType === "EMAIL" ? "email_unveil" : "phone_unveil";
}

/**
 * Persist a usage analytics event. Failures are logged but never thrown.
 */
async function logUsageEvent({
  userId,
  eventType,
  source,
  product,
  charged = false,
  metadata = {},
}) {
  if (!userId || !eventType || !source || !product) return;

  try {
    const meta = {};
    if (metadata.linkedinProfileUrl) {
      meta.linkedinProfileUrl = String(metadata.linkedinProfileUrl).slice(0, 512);
    }
    if (metadata.lookupId) {
      meta.lookupId = String(metadata.lookupId).slice(0, 64);
    }
    if (metadata.queryType) {
      meta.queryType = String(metadata.queryType).slice(0, 32);
    }

    await UsageEvent.create({
      userId,
      eventType,
      source,
      product,
      charged: Boolean(charged),
      metadata: meta,
    });
  } catch (err) {
    console.error("[logUsageEvent]", err.message);
  }
}

module.exports = {
  logUsageEvent,
  analyticsSource,
  revealEventType,
};
