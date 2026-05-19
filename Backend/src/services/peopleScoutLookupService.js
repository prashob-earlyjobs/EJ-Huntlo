const mongoose = require("mongoose");
const PeopleScoutLookup = require("../models/PeopleScoutLookup");
const { logUsageEvent, analyticsSource } = require("../utils/logUsageEvent");

function lookupHasValidProfile(row) {
  if (!row || typeof row !== "object") return false;
  const profile = row.fjResponseData?.profile;
  if (profile && typeof profile === "object") {
    if (String(profile.name || "").trim()) return true;
    if (String(profile.linkedin_profile_url || "").trim()) return true;
    if (profile._id != null && String(profile._id).trim()) return true;
  }
  if (String(row.linkedinProfileUrl || "").trim()) return true;
  if (String(row.fjProfileId || "").trim()) return true;
  if (String(row.name || "").trim()) return true;
  return false;
}

function buildFutureJobsFromLookupRow(row) {
  const d =
    row.fjResponseData && typeof row.fjResponseData === "object"
      ? row.fjResponseData
      : null;
  return {
    status: row.fjStatus || "SUCCESS",
    statusCode: 200,
    message: row.fjMessage || "",
    data: d,
  };
}

function buildSummaryFromLookupRow(row) {
  const scoutId = row.scoutId != null ? String(row.scoutId) : "";
  return {
    fjProfileId: row.fjProfileId || "",
    name: row.name || "",
    title: row.title || "",
    headline: row.headline || "",
    location: row.location || "",
    company: row.company || "",
    role: row.role || "",
    linkedinFlagshipUrl: row.linkedinFlagshipUrl || "",
    linkedinProfileUrl: row.linkedinProfileUrl || "",
    profilePictureUrl: row.profilePictureUrl || "",
    numConnections: row.numOfConnections ?? null,
    scoutId,
  };
}

async function findUserLookup(userId, queryType, queryLabel) {
  const rows = await PeopleScoutLookup.find({
    userId: new mongoose.Types.ObjectId(String(userId)),
    queryType,
    queryLabel,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return rows.find((row) => lookupHasValidProfile(row)) || null;
}

async function findSharedLookup(queryType, queryLabel, excludeUserId) {
  const filter = { queryType, queryLabel };
  if (excludeUserId && mongoose.Types.ObjectId.isValid(String(excludeUserId))) {
    filter.userId = {
      $ne: new mongoose.Types.ObjectId(String(excludeUserId)),
    };
  }
  const rows = await PeopleScoutLookup.find(filter)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return rows.find((row) => lookupHasValidProfile(row)) || null;
}

async function cloneLookupForUser(userId, sourceRow, parsed) {
  return PeopleScoutLookup.create({
    userId: new mongoose.Types.ObjectId(String(userId)),
    queryType: parsed.queryType,
    queryLabel: parsed.queryLabel,
    scoutId: sourceRow.scoutId || "",
    fjProfileId: sourceRow.fjProfileId || "",
    name: sourceRow.name || "",
    title: sourceRow.title || "",
    headline: sourceRow.headline || "",
    location: sourceRow.location || "",
    company: sourceRow.company || "",
    role: sourceRow.role || "",
    linkedinFlagshipUrl: sourceRow.linkedinFlagshipUrl || "",
    linkedinProfileUrl: sourceRow.linkedinProfileUrl || "",
    profilePictureUrl: sourceRow.profilePictureUrl || "",
    numOfConnections: sourceRow.numOfConnections ?? null,
    fjStatus: sourceRow.fjStatus || "",
    fjMessage: sourceRow.fjMessage || "",
    fjResponseData: sourceRow.fjResponseData ?? null,
  });
}

function buildLookupResponse({ source, charged, lookupId, row }) {
  const summary = buildSummaryFromLookupRow(row);
  return {
    success: true,
    found: true,
    source,
    charged,
    lookupId,
    futureJobs: buildFutureJobsFromLookupRow(row),
    summary,
  };
}

/**
 * Resolve People Scout profile lookup: DB first, then Future Jobs.
 *
 * - Same user, prior successful lookup → no FJ, no credit
 * - Another user's cached lookup → no FJ, credit for this user
 * - Not in DB → Future Jobs; credit only if profile found
 */
async function resolvePeopleScoutLookup({
  userId,
  parsed,
  assertQuota,
  incrementUsage,
  fetchFromFutureJobs,
  extractSummaryFromProfile,
}) {
  const { queryType, queryLabel } = parsed;

  const userRow = await findUserLookup(userId, queryType, queryLabel);
  if (userRow && lookupHasValidProfile(userRow)) {
    const response = buildLookupResponse({
      source: "user_cache",
      charged: false,
      lookupId: userRow._id.toString(),
      row: userRow,
    });
    await logUsageEvent({
      userId,
      eventType: "people_scout_lookup",
      source: analyticsSource(response),
      product: "people_scout",
      charged: false,
      metadata: {
        lookupId: response.lookupId,
        queryType,
        linkedinProfileUrl: response.summary?.linkedinProfileUrl || "",
      },
    });
    return response;
  }

  const sharedRow = await findSharedLookup(queryType, queryLabel, userId);
  if (sharedRow) {
    await assertQuota();
    const doc = await cloneLookupForUser(userId, sharedRow, parsed);
    await incrementUsage();
    const response = buildLookupResponse({
      source: "shared_cache",
      charged: true,
      lookupId: doc._id.toString(),
      row: doc.toObject ? doc.toObject() : doc,
    });
    await logUsageEvent({
      userId,
      eventType: "people_scout_lookup",
      source: analyticsSource(response),
      product: "people_scout",
      charged: true,
      metadata: {
        lookupId: response.lookupId,
        queryType,
        linkedinProfileUrl: response.summary?.linkedinProfileUrl || "",
      },
    });
    return response;
  }

  await assertQuota();
  const fj = await fetchFromFutureJobs();
  const d = fj?.data && typeof fj.data === "object" ? fj.data : null;
  const profile = d?.profile;
  const scoutId = d?.scoutId != null ? String(d.scoutId) : "";
  const summaryFromProfile = extractSummaryFromProfile(profile);

  const rowPayload = {
    userId: new mongoose.Types.ObjectId(String(userId)),
    queryType,
    queryLabel,
    scoutId,
    fjProfileId: summaryFromProfile?.fjProfileId || "",
    name: summaryFromProfile?.name || "",
    title: summaryFromProfile?.title || "",
    headline: summaryFromProfile?.headline || "",
    location: summaryFromProfile?.location || "",
    company: summaryFromProfile?.company || "",
    role: summaryFromProfile?.role || "",
    linkedinFlagshipUrl: summaryFromProfile?.linkedinFlagshipUrl || "",
    linkedinProfileUrl: summaryFromProfile?.linkedinProfileUrl || "",
    profilePictureUrl: summaryFromProfile?.profilePictureUrl || "",
    numOfConnections: summaryFromProfile?.numConnections ?? null,
    fjStatus: typeof fj?.status === "string" ? fj.status : "",
    fjMessage: typeof fj?.message === "string" ? fj.message : "",
    fjResponseData: d,
  };

  const doc = await PeopleScoutLookup.create(rowPayload);
  const row = doc.toObject();

  if (!lookupHasValidProfile(row)) {
    const response = {
      success: false,
      found: false,
      charged: false,
      source: "futurejobs",
      lookupId: doc._id.toString(),
      message:
        (typeof fj?.message === "string" && fj.message.trim()) ||
        "Candidate not found",
      futureJobs: fj,
    };
    await logUsageEvent({
      userId,
      eventType: "people_scout_lookup",
      source: analyticsSource(response),
      product: "people_scout",
      charged: false,
      metadata: {
        lookupId: response.lookupId,
        queryType,
        linkedinProfileUrl: row.linkedinProfileUrl || "",
      },
    });
    return response;
  }

  await incrementUsage();
  const response = buildLookupResponse({
    source: "futurejobs",
    charged: true,
    lookupId: doc._id.toString(),
    row,
  });
  await logUsageEvent({
    userId,
    eventType: "people_scout_lookup",
    source: analyticsSource(response),
    product: "people_scout",
    charged: true,
    metadata: {
      lookupId: response.lookupId,
      queryType,
      linkedinProfileUrl: response.summary?.linkedinProfileUrl || "",
    },
  });
  return response;
}

module.exports = {
  lookupHasValidProfile,
  resolvePeopleScoutLookup,
  buildFutureJobsFromLookupRow,
  buildSummaryFromLookupRow,
};
