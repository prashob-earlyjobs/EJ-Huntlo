/** Send 403 for plan quota errors; returns true if response was sent. */
function respondIfQuotaExceeded(res, error) {
  if (error?.code === "QUOTA_EXCEEDED" || error?.statusCode === 403) {
    res.status(403).json({
      success: false,
      code: "QUOTA_EXCEEDED",
      message: error.message || "Plan quota exceeded",
    });
    return true;
  }
  return false;
}

module.exports = { respondIfQuotaExceeded };
