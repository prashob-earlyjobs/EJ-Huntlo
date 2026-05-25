const mongoose = require("mongoose");
const RevealedContact = require("../models/RevealedContact");
const CandidateContactCache = require("../models/CandidateContactCache");
const PeopleScoutRevealedContact = require("../models/PeopleScoutRevealedContact");
const {
  looksValidContact,
  extractRevealValues,
  normalizeLinkedinProfileUrl,
  linkedinCacheLookupKeys,
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
  const keys = linkedinCacheLookupKeys(linkedinProfileUrl);
  if (keys.length === 0) return [];

  const canonicalKey = keys[0];

  for (const linkedinKey of keys) {
    const shared = await CandidateContactCache.findOne({
      linkedinProfileUrl: linkedinKey,
      revealType,
    }).lean();

    let values = filterValidValues(shared?.values, revealType);
    if (values.length > 0) {
      if (linkedinKey !== canonicalKey) {
        await upsertSharedContactCache(canonicalKey, revealType, values, {
          status: shared?.status || "migrated",
        });
      }
      return values;
    }

    const anyUnlock = await RevealedContact.findOne({
      linkedinProfileUrl: linkedinKey,
      revealType,
    })
      .sort({ updatedAt: -1 })
      .lean();

    values = filterValidValues(anyUnlock?.values, revealType);
    if (values.length > 0) {
      await upsertSharedContactCache(canonicalKey, revealType, values, {
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
      await upsertSharedContactCache(canonicalKey, revealType, values, {
        status: scoutUnlock?.status || "migrated_scout",
      });
      return values;
    }
  }

  return [];
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
  const keys = linkedinCacheLookupKeys(linkedinProfileUrl);
  if (keys.length === 0 || !mongoose.Types.ObjectId.isValid(String(userId))) {
    return null;
  }

  const uid = new mongoose.Types.ObjectId(String(userId));
  let emptyUnlock = null;

  for (const linkedinKey of keys) {
    const unlock = await RevealedContact.findOne({
      userId: uid,
      linkedinProfileUrl: linkedinKey,
      revealType,
    }).lean();

    if (unlock) {
      if (filterValidValues(unlock.values, revealType).length > 0) {
        return unlock;
      }
      if (!emptyUnlock) emptyUnlock = unlock;
      continue;
    }

    const scoutUnlock = await PeopleScoutRevealedContact.findOne({
      userId: uid,
      linkedinProfileUrl: linkedinKey,
      revealType,
    }).lean();

    if (scoutUnlock) {
      if (filterValidValues(scoutUnlock.values, revealType).length > 0) {
        return scoutUnlock;
      }
      if (!emptyUnlock) emptyUnlock = scoutUnlock;
    }
  }

  return emptyUnlock;
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
 * - Same user, already unlocked (including prior not-found) → DB only, no Future Jobs, no credit.
 * - New user, contact in shared cache → return values, no Future Jobs, deduct credit once.
 * - Not in cache → call Future Jobs once, store shared + user unlock, deduct credit if found.
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

async function resolveCachedValuesForUser(userId, linkedinKey, revealType, userUnlock) {
  let values = filterValidValues(userUnlock?.values, revealType);
  if (values.length === 0) {
    values = await loadSharedContactValues(linkedinKey, revealType);
  }
  if (values.length > 0 && userUnlock) {
    const stored = filterValidValues(userUnlock.values, revealType);
    if (stored.length === 0) {
      await recordUserContactUnlock(userId, linkedinKey, revealType, values, {
        status: userUnlock.status || "backfilled_from_shared",
        sourcingSessionId: userUnlock.sourcingSessionId || "",
      });
    }
  }
  return values;
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

  // Same user + profile + type already attempted — never call Future Jobs again.
  if (userUnlock) {
    const values = await resolveCachedValuesForUser(
      userId,
      linkedinKey,
      revealType,
      userUnlock
    );
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

    const unlockKey = normalizeLinkedinProfileUrl(userUnlock.linkedinProfileUrl);
    if (unlockKey === linkedinKey) {
      const notFoundResponse = {
        success: false,
        found: false,
        charged: false,
        source: "user_cache",
        revealType,
        values: [],
        value: "",
        message: "Contact not found",
      };
      await logContactRevealEvent(userId, product, revealType, {
        ...notFoundResponse,
        linkedinProfileUrl: linkedinKey,
      });
      return notFoundResponse;
    }
    // Legacy lowercase not_found — fall through and retry Future Jobs with correct-case URL.
  }

  const sharedValues = await loadSharedContactValues(linkedinKey, revealType);

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
    const notFoundResponse = {
      success: false,
      found: false,
      charged: false,
      source: "cache_miss",
      revealType,
      values: [],
      value: "",
      message: "Contact not available",
    };
    await logContactRevealEvent(userId, product, revealType, {
      ...notFoundResponse,
      linkedinProfileUrl: linkedinKey,
    });
    return notFoundResponse;
  }

  await assertQuota();
  const fj = await fetchFromFutureJobs();
  const values = extractRevealValues(fj, revealType);

  if (values.length === 0) {
    const message =
      (typeof fj?.message === "string" && fj.message.trim()) ||
      "Contact not found";
    await recordUserContactUnlock(userId, linkedinKey, revealType, [], {
      ...unlockMeta,
      status: "not_found",
    });
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

/**
 * Return email/phone already unlocked by this user (no Future Jobs call, no credit).
 */
async function lookupUserRevealedContacts(userId, linkedinUrls) {
  const keys = [
    ...new Set(
      (Array.isArray(linkedinUrls) ? linkedinUrls : [])
        .map((url) => normalizeLinkedinProfileUrl(url))
        .filter(Boolean)
    ),
  ];

  const contacts = {};
  for (const key of keys) {
    contacts[key] = { email: "", phone: "" };
    for (const revealType of ["EMAIL", "PHONE"]) {
      const unlock = await findUserContactUnlock(userId, key, revealType);
      if (!unlock) continue;

      let values = filterValidValues(unlock.values, revealType);
      if (values.length === 0) {
        values = await loadSharedContactValues(key, revealType);
      }
      const value = values[0] || "";
      if (revealType === "EMAIL") contacts[key].email = value;
      else contacts[key].phone = value;
    }
  }

  return contacts;
}

module.exports = {
  resolveContactReveal,
  loadSharedContactValues,
  filterValidValues,
  upsertSharedContactCache,
  recordUserContactUnlock,
  findUserContactUnlock,
  lookupUserRevealedContacts,
};
