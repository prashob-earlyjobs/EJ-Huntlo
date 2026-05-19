const mongoose = require("mongoose");
const RevealedContact = require("../models/RevealedContact");
const CandidateContactCache = require("../models/CandidateContactCache");
const PeopleScoutRevealedContact = require("../models/PeopleScoutRevealedContact");
const {
  looksValidContact,
  extractRevealValues,
  normalizeLinkedinProfileUrl,
} = require("../utils/contactReveal");
const {
  logUsageEvent,
  analyticsSource,
  revealEventType,
} = require("../utils/logUsageEvent");

function filterValidValues(values, revealType) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = new Set();
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (!looksValidContact(s, revealType)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

async function upsertSharedContactCache(
  linkedinProfileUrl,
  revealType,
  values,
  { status = "", firstRevealedByUserId = null } = {}
) {
  const valid = filterValidValues(values, revealType);
  if (valid.length === 0) return null;

  const set = {
    values: valid,
    status: status || "",
  };
  const update = { $set: set };
  if (firstRevealedByUserId && mongoose.Types.ObjectId.isValid(String(firstRevealedByUserId))) {
    update.$setOnInsert = {
      firstRevealedByUserId: new mongoose.Types.ObjectId(String(firstRevealedByUserId)),
    };
  }

  return CandidateContactCache.findOneAndUpdate(
    { linkedinProfileUrl, revealType },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

async function loadSharedContactValues(linkedinProfileUrl, revealType) {
  const linkedinKey = normalizeLinkedinProfileUrl(linkedinProfileUrl);
  if (!linkedinKey) return [];

  const shared = await CandidateContactCache.findOne({
    linkedinProfileUrl: linkedinKey,
    revealType,
  }).lean();

  let values = filterValidValues(shared?.values, revealType);
  if (values.length > 0) return values;

  const anyUnlock = await RevealedContact.findOne({
    linkedinProfileUrl: linkedinKey,
    revealType,
  })
    .sort({ updatedAt: -1 })
    .lean();

  values = filterValidValues(anyUnlock?.values, revealType);
  if (values.length > 0) {
    await upsertSharedContactCache(linkedinKey, revealType, values, {
      status: anyUnlock?.status || "migrated",
    });
    return values;
  }

  const scoutUnlock = await PeopleScoutRevealedContact.findOne({
    linkedinProfileUrl: linkedinKey,
    revealType,
  })
    .sort({ updatedAt: -1 })
    .lean();

  values = filterValidValues(scoutUnlock?.values, revealType);
  if (values.length > 0) {
    await upsertSharedContactCache(linkedinKey, revealType, values, {
      status: scoutUnlock?.status || "migrated_scout",
    });
  }

  return values;
}

async function recordUserContactUnlock(
  userId,
  linkedinProfileUrl,
  revealType,
  values,
  unlockMeta = {}
) {
  const linkedinKey = normalizeLinkedinProfileUrl(linkedinProfileUrl);
  const uid = new mongoose.Types.ObjectId(String(userId));
  const valid = filterValidValues(values, revealType);

  const set = {
    values: valid,
    ...unlockMeta,
  };

  return RevealedContact.findOneAndUpdate(
    {
      userId: uid,
      linkedinProfileUrl: linkedinKey,
      revealType,
    },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

async function findUserContactUnlock(userId, linkedinProfileUrl, revealType) {
  const linkedinKey = normalizeLinkedinProfileUrl(linkedinProfileUrl);
  if (!linkedinKey || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return null;
  }

  const uid = new mongoose.Types.ObjectId(String(userId));

  const unlock = await RevealedContact.findOne({
    userId: uid,
    linkedinProfileUrl: linkedinKey,
    revealType,
  }).lean();

  if (unlock) return unlock;

  return PeopleScoutRevealedContact.findOne({
    userId: uid,
    linkedinProfileUrl: linkedinKey,
    revealType,
  }).lean();
}

function buildRevealResponse({ source, charged, revealType, values, futureJobs }) {
  const payload = {
    success: true,
    found: values.length > 0,
    source,
    charged,
    revealType,
    values,
    value: values[0] || "",
  };
  if (futureJobs) payload.futureJobs = futureJobs;
  return payload;
}

/**
 * Resolve contact reveal with shared cache + per-user unlock ledger.
 *
 * - Same user, already unlocked → return cached values, no Future Jobs, no credit.
 * - New user, contact in shared cache → return values, no Future Jobs, deduct credit.
 * - Not in cache → call Future Jobs, store shared + user unlock, deduct credit.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} opts.linkedinProfileUrl
 * @param {"PHONE"|"EMAIL"} opts.revealType
 * @param {() => Promise<void>} opts.assertQuota
 * @param {() => Promise<void>} opts.incrementUsage
 * @param {() => Promise<object>} [opts.fetchFromFutureJobs]
 * @param {string[]} [opts.prefetchedValues] — e.g. from People Scout profile snapshot
 * @param {object} [opts.unlockMeta] — extra fields on RevealedContact (sourcingSessionId, etc.)
 */
async function logContactRevealEvent(userId, product, revealType, response) {
  await logUsageEvent({
    userId,
    eventType: revealEventType(revealType),
    source: analyticsSource(response),
    product,
    charged: Boolean(response.charged),
    metadata: {
      linkedinProfileUrl: response.linkedinProfileUrl || "",
      lookupId: response.lookupId || "",
    },
  });
}

async function resolveContactReveal({
  userId,
  linkedinProfileUrl,
  revealType,
  product = "sourcing",
  assertQuota,
  incrementUsage,
  fetchFromFutureJobs,
  prefetchedValues = null,
  unlockMeta = {},
}) {
  const linkedinKey = normalizeLinkedinProfileUrl(linkedinProfileUrl);
  if (!linkedinKey) {
    const err = new Error("linkedin_profile_url is required");
    err.statusCode = 400;
    throw err;
  }

  const userUnlock = await findUserContactUnlock(userId, linkedinKey, revealType);

  if (prefetchedValues && prefetchedValues.length > 0) {
    await upsertSharedContactCache(linkedinKey, revealType, prefetchedValues, {
      status: unlockMeta.status || "profile_snapshot",
      firstRevealedByUserId: userId,
    });
  }

  let sharedValues = await loadSharedContactValues(linkedinKey, revealType);

  if (userUnlock) {
    const values =
      sharedValues.length > 0
        ? sharedValues
        : filterValidValues(userUnlock.values, revealType);
    if (values.length > 0) {
      const response = buildRevealResponse({
        source: "user_cache",
        charged: false,
        revealType,
        values,
      });
      await logContactRevealEvent(userId, product, revealType, {
        ...response,
        linkedinProfileUrl: linkedinKey,
      });
      return response;
    }
  }

  if (sharedValues.length > 0) {
    await assertQuota();
    await recordUserContactUnlock(
      userId,
      linkedinKey,
      revealType,
      sharedValues,
      unlockMeta
    );
    await incrementUsage();
    const response = buildRevealResponse({
      source: "shared_cache",
      charged: true,
      revealType,
      values: sharedValues,
    });
    await logContactRevealEvent(userId, product, revealType, {
      ...response,
      linkedinProfileUrl: linkedinKey,
    });
    return response;
  }

  if (typeof fetchFromFutureJobs !== "function") {
    const err = new Error("Contact not available");
    err.statusCode = 404;
    throw err;
  }

  await assertQuota();
  const fj = await fetchFromFutureJobs();
  const values = extractRevealValues(fj, revealType);

  if (values.length === 0) {
    const message =
      (typeof fj?.message === "string" && fj.message.trim()) ||
      "Contact not found";
    const response = {
      success: false,
      found: false,
      charged: false,
      source: "futurejobs",
      revealType,
      values: [],
      value: "",
      message,
      futureJobs: fj,
    };
    await logContactRevealEvent(userId, product, revealType, {
      ...response,
      linkedinProfileUrl: linkedinKey,
    });
    return response;
  }

  await upsertSharedContactCache(linkedinKey, revealType, values, {
    status: typeof fj?.status === "string" ? fj.status : "",
    firstRevealedByUserId: userId,
  });

  await recordUserContactUnlock(userId, linkedinKey, revealType, values, {
    ...unlockMeta,
    status:
      typeof fj?.status === "string" ? fj.status : unlockMeta.status || "",
  });
  await incrementUsage();

  const response = buildRevealResponse({
    source: "futurejobs",
    charged: true,
    revealType,
    values,
    futureJobs: fj,
  });
  await logContactRevealEvent(userId, product, revealType, {
    ...response,
    linkedinProfileUrl: linkedinKey,
  });
  return response;
}

module.exports = {
  resolveContactReveal,
  loadSharedContactValues,
  filterValidValues,
  upsertSharedContactCache,
  recordUserContactUnlock,
  findUserContactUnlock,
};
