const mongoose = require("mongoose");
const { revealSourcingSessionContact } = require("./futureJobs");
const { resolveContactReveal } = require("./contactRevealService");
const { assertQuotaAvailableByUserId } = require("./planQuotas");
const { incrementUserUsage } = require("../utils/incrementUserUsage");
const {
  normalizeLinkedinProfileUrl,
  linkedinCacheLookupKeys,
} = require("../utils/contactReveal");
const { findSessionInScope } = require("../utils/orgScope");
const RevealedContact = require("../models/RevealedContact");
const PeopleScoutRevealedContact = require("../models/PeopleScoutRevealedContact");

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
 * Count reveals that would charge (no prior unlock for that type), then assert
 * full quota up front so bulk never starts a partial run.
 */
async function assertBulkRevealQuotaBeforeRun(userId, items, revealTypes) {
  const types = (Array.isArray(revealTypes) ? revealTypes : [])
    .map((t) => String(t || "").trim().toUpperCase())
    .filter((t) => t === "EMAIL" || t === "PHONE");
  if (types.length === 0 || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return { emailNeeded: 0, phoneNeeded: 0 };
  }

  const variantToCanonical = new Map();
  const allVariants = [];
  const itemKeys = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = normalizeLinkedinProfileUrl(
      String(item?.linkedin_profile_url || "").trim()
    );
    if (!key) continue;
    itemKeys.push(key);
    for (const variant of linkedinCacheLookupKeys(key)) {
      if (!variantToCanonical.has(variant)) {
        variantToCanonical.set(variant, key);
      }
      allVariants.push(variant);
    }
  }

  const uniqueItems = [...new Set(itemKeys)];
  if (uniqueItems.length === 0) {
    return { emailNeeded: 0, phoneNeeded: 0 };
  }

  const uniqueVariants = [...new Set(allVariants)];
  const uid = new mongoose.Types.ObjectId(String(userId));

  const [revealedDocs, scoutDocs] = await Promise.all([
    RevealedContact.find({
      userId: uid,
      linkedinProfileUrl: { $in: uniqueVariants },
      revealType: { $in: types },
    })
      .select("linkedinProfileUrl revealType")
      .lean(),
    PeopleScoutRevealedContact.find({
      userId: uid,
      linkedinProfileUrl: { $in: uniqueVariants },
      revealType: { $in: types },
    })
      .select("linkedinProfileUrl revealType")
      .lean(),
  ]);

  const unlocked = new Set();
  for (const doc of [...revealedDocs, ...scoutDocs]) {
    const canonical = variantToCanonical.get(doc.linkedinProfileUrl);
    if (!canonical) continue;
    const revealType = doc.revealType === "PHONE" ? "PHONE" : "EMAIL";
    unlocked.add(`${canonical}\0${revealType}`);
  }

  let emailNeeded = 0;
  let phoneNeeded = 0;
  for (const key of uniqueItems) {
    if (types.includes("EMAIL") && !unlocked.has(`${key}\0EMAIL`)) {
      emailNeeded += 1;
    }
    if (types.includes("PHONE") && !unlocked.has(`${key}\0PHONE`)) {
      phoneNeeded += 1;
    }
  }

  if (emailNeeded > 0) {
    await assertQuotaAvailableByUserId(userId, "emailUnveils", emailNeeded);
  }
  if (phoneNeeded > 0) {
    await assertQuotaAvailableByUserId(userId, "mobileUnveils", phoneNeeded);
  }

  return { emailNeeded, phoneNeeded };
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
  // Fail before any reveal if the full batch cannot fit in remaining credits.
  await assertBulkRevealQuotaBeforeRun(userId, items, revealTypes);

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
  assertBulkRevealQuotaBeforeRun,
};
