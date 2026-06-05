/**
 * Map Gupshup Gateway delivery-report fields to CampaignWhatsAppMessage status.
 * Aligned with EarlyJobs Whatsapp Portal WebhookController.mapGupshupStatusToInternalStatus.
 */

function mapGupshupDeliveryToInternal(eventType, cause, errCode) {
  const status = String(eventType || "").trim().toUpperCase();
  const causeUpper = String(cause || "").trim().toUpperCase();
  const code = parseInt(String(errCode || "").trim(), 10);

  if (status === "DELIVERED" || status === "SUCCESS") {
    return "delivered";
  }
  if (status === "SENT") {
    return "sent";
  }
  if (status === "READ") {
    return "read";
  }
  if (status === "FAILED" || status === "FAILURE" || status === "UNDELIV") {
    return "failed";
  }

  if (Number.isFinite(code)) {
    if (code === 0) return "delivered";
    if (code === 25) return "sent";
    if (code === 26) return "read";
    if (
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 38].includes(
        code
      )
    ) {
      return "failed";
    }
  }

  if (causeUpper === "SENT") {
    return "sent";
  }

  const failureCauses = [
    "ABSENT_SUBSCRIBER",
    "UNKNOWN_SUBSCRIBER",
    "BLOCKED_MASK",
    "SYSTEM_FAILURE",
    "CALL_BARRED",
    "SERVICE_DOWN",
    "DND_FAIL",
    "DND_TIMEOUT",
    "MSG_DOES_NOT_MATCH_TEMPLATE",
    "OUTSIDE_WORKING_HOURS",
    "BLOCKED",
    "BLOCKED_FOR_USER",
    "OTHER",
  ];
  if (failureCauses.includes(causeUpper)) {
    return "failed";
  }

  return "sent";
}

module.exports = {
  mapGupshupDeliveryToInternal,
};
