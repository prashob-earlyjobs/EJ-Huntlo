const mongoose = require("mongoose");
const { revealSourcingSessionContact } = require("./futureJobs");
const { resolveContactReveal } = require("./contactRevealService");
const { assertQuotaAvailableByUserId } = require("./planQuotas");
const { incrementUserUsage } = require("../utils/incrementUserUsage");
const { normalizeLinkedinProfileUrl } = require("../utils/contactReveal");
const { findSessionInScope } = require("../utils/orgScope");

async function bumpSourcingRevealUsage(userId, revealType) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) return;
  const uid = String(userId);
  if (revealType === "EMAIL") {
    await incrementUserUsage(uid, "emailUnveils");
  } else if (revealType === "PHONE") {
    await incrementUserUsage(uid, "mobileUnveils");
  }
}

/**
 * Reveal email/phone for one candidate. Uses DB cache when already unlocked.
 */
async function revealSingleContactItem(
  userId,
  item,
  revealTypes = ["EMAIL", "PHONE"]
) {
  const sourcingSessionId = String(item?.sourcingSessionId || "").trim();
  const linkedinProfileUrl = String(item?.linkedin_profile_url || "").trim();
  const linkedinKey = normalizeLinkedinProfileUrl(linkedinProfileUrl);
  const row = {
    linkedin_profile_url: linkedinKey,
    email: "",
    phone: "",
    emailSource: null,
    phoneSource: null,
    emailCharged: false,
    phoneCharged: false,
    errors: [],
  };

  if (!linkedinKey) {
    row.errors.push("missing_linkedin");
    return row;
  }

  const sessionOwned =
    sourcingSessionId && (await findSessionInScope(userId, sourcingSessionId));

  for (const revealType of revealTypes) {
    try {
      const quotaKey = revealType === "EMAIL" ? "emailUnveils" : "mobileUnveils";
      const result = await resolveContactReveal({
        userId,
        linkedinProfileUrl: linkedinProfileUrl || linkedinKey,
        revealType,
        product: "sourcing",
        unlockMeta: { sourcingSessionId },
        assertQuota: () => assertQuotaAvailableByUserId(userId, quotaKey),
        incrementUsage: () => bumpSourcingRevealUsage(userId, revealType),
        fetchFromFutureJobs:
          sessionOwned && sourcingSessionId
            ? () =>
                revealSourcingSessionContact(
                  sourcingSessionId,
                  linkedinProfileUrl || linkedinKey,
                  revealType
                )
            : undefined,
      });

      if (!result.success) {
        row.errors.push(`${revealType}_not_found`);
        continue;
      }

      if (revealType === "EMAIL") {
        row.email = result.value || "";
        row.emailSource = result.source || null;
        row.emailCharged = Boolean(result.charged);
      } else {
        row.phone = result.value || "";
        row.phoneSource = result.source || null;
        row.phoneCharged = Boolean(result.charged);
      }
    } catch (error) {
      if (error?.code === "QUOTA_EXCEEDED") {
        error.revealType = revealType;
        throw error;
      }
      row.errors.push(
        `${revealType}_${error?.message ? String(error.message).slice(0, 80) : "error"}`
      );
    }
  }

  return row;
}

async function runBulkRevealItems(userId, items, revealTypes = ["EMAIL", "PHONE"]) {
  const results = [];
  for (const item of items) {
    const row = await revealSingleContactItem(userId, item, revealTypes);
    results.push(row);
  }
  return results;
}

module.exports = {
  revealSingleContactItem,
  runBulkRevealItems,
};
