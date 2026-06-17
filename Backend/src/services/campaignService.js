const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const OutreachPlan = require("../models/OutreachPlan");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const { lookupUserRevealedContacts } = require("./contactRevealService");
const { deleteEnrollmentsForCampaign } = require("./campaignOutreachSendService");
const { deleteRepliesForCampaign } = require("./campaignReplySyncService");
const { normalizeLinkedinProfileUrl } = require("../utils/contactReveal");
const {
  campaignAccessFilterForActor,
  campaignOwnerUserId,
  findCampaignInScope,
  findCampaignDocumentInScope,
} = require("../utils/campaignScope");
const { normalizeToE164 } = require("./whatsappPhoneUtils");
const {
  CAMPAIGN_MAX_CONTACTS,
  CAMPAIGN_CONTACT_LIMIT_MESSAGE,
} = require("../constants/campaignLimits");
const {
  assertOutreachCreditsAvailable,
  logOutreachCreditUsage,
  outreachChannelToCreditChannel,
} = require("./outreachCreditsService");
const User = require("../models/User");
const { resolveTierForUser } = require("./planQuotas");
const {
  addContactsToCampaignCollection,
  countContactsForCampaign,
  deleteAllContactsForCampaign,
  ensureContactsMigrated,
  getExistingCandidateKeys,
  insertContactsForCampaign,
  listCampaignContactsPaginated,
  loadAllContactsForCampaign,
  removeContactFromCampaignCollection,
  sumContactCountsForCampaigns,
  updateCampaignContactFields,
} = require("./campaignContactService");

async function assertCampaignsEnabledForUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error("Invalid session");
    err.statusCode = 401;
    throw err;
  }
  const { tier } = await resolveTierForUser(user);
  if (!tier?.campaignsEnabled) {
    const err = new Error("Campaigns are not available on your current plan.");
    err.statusCode = 403;
    err.code = "PLAN_CAMPAIGNS_DISABLED";
    throw err;
  }
}

/** WhatsApp campaign testing — E.164 India. Replace/remove when using real contact phones. */
const WHATSAPP_TEST_PHONE_E164 = "+918714500637";

function normalizeContact(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidateKey = String(raw.candidateKey || "").trim();
  if (!candidateKey) return null;
  const phoneFromPayload = String(raw.phone || "").trim();
  const phone =
    phoneFromPayload ||
    (process.env.WHATSAPP_USE_TEST_PHONE === "1" ? WHATSAPP_TEST_PHONE_E164 : "");
  return {
    candidateKey,
    candidateId: String(raw.candidateId || "").trim(),
    name: String(raw.name || "").trim(),
    email: String(raw.email || "").trim(),
    phone,
    role: String(raw.role || "").trim(),
    company: String(raw.company || "").trim(),
    location: String(raw.location || "").trim(),
    linkedinUrl: String(raw.linkedinUrl || "").trim(),
    sourcingSessionId: String(raw.sourcingSessionId || "").trim(),
    addedAt: raw.addedAt ? new Date(raw.addedAt) : new Date(),
  };
}

function normalizeContacts(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const contact = normalizeContact(item);
    if (!contact || seen.has(contact.candidateKey)) continue;
    seen.add(contact.candidateKey);
    out.push(contact);
  }
  return out;
}

function formatContact(doc) {
  return {
    id: doc._id ? String(doc._id) : "",
    candidateKey: doc.candidateKey || "",
    candidateId: doc.candidateId || "",
    name: doc.name || "",
    email: doc.email || "",
    phone: doc.phone || "",
    role: doc.role || "",
    company: doc.company || "",
    location: doc.location || "",
    linkedinUrl: doc.linkedinUrl || "",
    sourcingSessionId: doc.sourcingSessionId || "",
    addedAt: doc.addedAt ? new Date(doc.addedAt).toISOString() : new Date().toISOString(),
  };
}

function normalizeCalendlyAutomation(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const enabled = Boolean(o?.enabled);
  if (!enabled) {
    return {
      enabled: false,
      meetingUri: "",
      meetingName: "",
      schedulingUrl: "",
      durationMinutes: 0,
      kind: "",
    };
  }
  return {
    enabled: true,
    meetingUri: String(o?.meetingUri || "").trim(),
    meetingName: String(o?.meetingName || "").trim(),
    schedulingUrl: String(o?.schedulingUrl || "").trim(),
    durationMinutes: Math.max(0, Number(o?.durationMinutes) || 0),
    kind: String(o?.kind || "").trim(),
  };
}

function resolveContactCount(doc) {
  const embedded = Array.isArray(doc?.contacts) ? doc.contacts.length : 0;
  const stored =
    typeof doc?.contactCount === "number" && Number.isFinite(doc.contactCount)
      ? Math.max(0, Math.floor(doc.contactCount))
      : 0;
  return Math.max(stored, embedded);
}

function formatCampaign(doc, listStats, options = {}) {
  const includeContacts = options.includeContacts === true;
  const contacts = includeContacts
    ? Array.isArray(options.contacts)
      ? options.contacts.map(formatContact)
      : []
    : [];
  const contactCount =
    typeof options.contactCount === "number"
      ? Math.max(0, options.contactCount)
      : resolveContactCount(doc);
  const stats =
    listStats && typeof listStats === "object"
      ? listStats
      : null;
  const contactsSent = stats ? Math.max(0, Number(stats.sent) || 0) : undefined;
  const interestedCount = stats ? Math.max(0, Number(stats.interested) || 0) : undefined;
  const lastActivityAt = stats ? resolveLastActivityAt(doc, stats) : undefined;

  return {
    id: String(doc._id),
    name: doc.name || "",
    jobTitle: String(doc.jobTitle || "").trim(),
    jobDescription: String(doc.jobDescription || "").trim(),
    calendlyAutomation: normalizeCalendlyAutomation(doc.calendlyAutomation),
    outreachPlanId: doc.outreachPlanId ? String(doc.outreachPlanId) : "",
    outreachChannel:
      doc.outreachChannel === "whatsapp"
        ? "whatsapp"
        : doc.outreachChannel === "voice_call"
          ? "voice_call"
          : "gmail",
    emailIntegrationId: doc.emailIntegrationId ? String(doc.emailIntegrationId) : "",
    outreachStatus: doc.outreachStatus || "idle",
    outreachStartedAt: doc.outreachStartedAt
      ? new Date(doc.outreachStartedAt).toISOString()
      : null,
    whatsAppInterestedCount: Math.max(0, Number(doc.whatsAppInterestedCount) || 0),
    whatsAppNotInterestedCount: Math.max(0, Number(doc.whatsAppNotInterestedCount) || 0),
    contactCount,
    contacts,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(contactsSent !== undefined ? { contactsSent } : {}),
    ...(interestedCount !== undefined ? { interestedCount } : {}),
    ...(lastActivityAt !== undefined ? { lastActivityAt } : {}),
  };
}

/** Latest real outreach event (send, reply, disposition) — not doc/sync metadata. */
function resolveLastActivityAt(doc, listStats) {
  const stamps = [
    listStats?.maxLastSent,
    listStats?.maxLastReply,
    listStats?.maxDispositionAt,
  ]
    .map((value) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? time : 0;
    })
    .filter((time) => time > 0);
  if (stamps.length > 0) {
    return new Date(Math.max(...stamps)).toISOString();
  }
  const fallback = doc.outreachStartedAt || doc.createdAt;
  if (!fallback) return null;
  const time = new Date(fallback).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

async function loadCampaignListStats(actorUserId, campaignIds) {
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    return new Map();
  }
  const oids = campaignIds
    .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  if (oids.length === 0) return new Map();

  const access = await campaignAccessFilterForActor(actorUserId);
  const match = { campaignId: { $in: oids } };
  if (access?.userId) {
    match.userId = access.userId;
  }

  const rows = await CampaignSequenceEnrollment.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$campaignId",
        sent: { $sum: { $cond: [{ $gt: ["$sentCount", 0] }, 1, 0] } },
        interested: {
          $sum: { $cond: [{ $eq: ["$replyDisposition", "interested"] }, 1, 0] },
        },
        maxLastSent: { $max: "$lastSentAt" },
        maxLastReply: { $max: "$lastReplyAt" },
        maxDispositionAt: { $max: "$replyDispositionAt" },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), row);
  }
  return map;
}

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function assertValidCampaignId(campaignId) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    const err = new Error("Invalid campaign id");
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(campaignId);
}

async function listCampaigns(actorUserId, options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 15));
  const skip = (page - 1) * limit;

  const filter = await campaignAccessFilterForActor(actorUserId);
  if (!filter) {
    const err = new Error("Invalid session");
    err.statusCode = 401;
    throw err;
  }

  const [docs, total, active, totalContacts] = await Promise.all([
    Campaign.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(filter),
    Campaign.countDocuments({ ...filter, outreachStatus: "active" }),
    sumContactCountsForCampaigns(filter),
  ]);

  const statsById = await loadCampaignListStats(
    actorUserId,
    docs.map((doc) => doc._id)
  );
  const emptyListStats = {
    sent: 0,
    interested: 0,
    maxLastSent: null,
    maxLastReply: null,
    maxDispositionAt: null,
  };
  const campaigns = docs.map((doc) =>
    formatCampaign(doc, statsById.get(String(doc._id)) || emptyListStats)
  );
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, totalPages);
  const hasMore = safePage < totalPages;

  return {
    campaigns,
    summary: {
      total,
      active,
      contacts: totalContacts,
    },
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasMore,
    },
  };
}

async function listCampaignContacts(actorUserId, campaignId, options = {}) {
  assertValidCampaignId(campaignId);
  await findCampaignInScope(actorUserId, campaignId, { select: "_id" });
  return listCampaignContactsPaginated(campaignId, options);
}

async function getCampaign(actorUserId, campaignId) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  await ensureContactsMigrated(campaignId);
  const contacts = await loadAllContactsForCampaign(campaignId);
  const contactCount = contacts.length;
  return formatCampaign(doc, null, { includeContacts: true, contacts, contactCount });
}

async function createCampaign(userId, { name, contacts }) {
  await assertCampaignsEnabledForUser(userId);
  const campaignName = String(name || "").trim();
  if (!campaignName) {
    const err = new Error("Campaign name is required");
    err.statusCode = 400;
    throw err;
  }
  const normalized = normalizeContacts(contacts);
  if (normalized.length > CAMPAIGN_MAX_CONTACTS) {
    const err = new Error(CAMPAIGN_CONTACT_LIMIT_MESSAGE);
    err.statusCode = 409;
    err.code = "CAMPAIGN_CONTACT_LIMIT_EXCEEDED";
    err.campaignContactLimit = {
      max: CAMPAIGN_MAX_CONTACTS,
      current: 0,
      incoming: normalized.length,
      remaining: CAMPAIGN_MAX_CONTACTS,
    };
    throw err;
  }
  if (normalized.length > 0) {
    await assertOutreachCreditsAvailable(
      userId,
      outreachChannelToCreditChannel("gmail"),
      normalized.length
    );
  }
  const doc = await Campaign.create({
    userId: userOid(userId),
    name: campaignName,
    contacts: [],
    contactCount: 0,
  });

  if (normalized.length > 0) {
    await insertContactsForCampaign(String(doc._id), userId, normalized);
    await logOutreachCreditUsage(
      userId,
      outreachChannelToCreditChannel("gmail"),
      normalized.length
    );
  }

  const contactCount = normalized.length;
  return {
    campaign: formatCampaign(doc.toObject(), null, { contactCount }),
    limitSkippedCount: 0,
  };
}

function assertCampaignAcceptsNewContacts(campaignDoc) {
  const status = String(campaignDoc?.outreachStatus || "idle").trim() || "idle";
  if (status === "idle") return;
  const err = new Error(
    "This campaign has already been launched. Contacts cannot be added after launch."
  );
  err.statusCode = 409;
  err.code = "CAMPAIGN_CONTACTS_LOCKED";
  throw err;
}

async function addContactsToCampaign(actorUserId, campaignId, contacts) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  assertCampaignAcceptsNewContacts(doc);

  const incoming = normalizeContacts(contacts);
  const currentCount = await countContactsForCampaign(campaignId);
  const remaining = Math.max(0, CAMPAIGN_MAX_CONTACTS - currentCount);

  const existingKeys = await getExistingCandidateKeys(campaignId);

  let newUniqueCount = 0;
  for (const contact of incoming) {
    if (!existingKeys.has(contact.candidateKey)) {
      newUniqueCount += 1;
    }
  }

  if (remaining <= 0 && newUniqueCount > 0) {
    const err = new Error(CAMPAIGN_CONTACT_LIMIT_MESSAGE);
    err.statusCode = 409;
    err.code = "CAMPAIGN_CONTACT_LIMIT_EXCEEDED";
    err.campaignContactLimit = {
      max: CAMPAIGN_MAX_CONTACTS,
      current: currentCount,
      incoming: newUniqueCount,
      remaining: 0,
    };
    throw err;
  }

  if (newUniqueCount > remaining) {
    const err = new Error(CAMPAIGN_CONTACT_LIMIT_MESSAGE);
    err.statusCode = 409;
    err.code = "CAMPAIGN_CONTACT_LIMIT_EXCEEDED";
    err.campaignContactLimit = {
      max: CAMPAIGN_MAX_CONTACTS,
      current: currentCount,
      incoming: newUniqueCount,
      remaining,
    };
    throw err;
  }

  if (newUniqueCount > 0) {
    const creditChannel = outreachChannelToCreditChannel(doc.outreachChannel);
    await assertOutreachCreditsAvailable(actorUserId, creditChannel, newUniqueCount);
  }

  const ownerUserId = campaignOwnerUserId(doc);
  const { addedCount, skippedCount, addedCandidateKeys } =
    await addContactsToCampaignCollection(campaignId, ownerUserId, incoming);

  if (addedCount > 0) {
    const creditChannel = outreachChannelToCreditChannel(doc.outreachChannel);
    await logOutreachCreditUsage(actorUserId, creditChannel, addedCount);
  }

  const updatedCount = currentCount + addedCount;
  const refreshed = doc.toObject();
  refreshed.contactCount = updatedCount;

  return {
    campaign: formatCampaign(refreshed, null, { contactCount: updatedCount }),
    addedCount,
    skippedCount,
    limitSkippedCount: 0,
    addedCandidateKeys,
  };
}

async function removeContactFromCampaign(actorUserId, campaignId, candidateKey) {
  const key = String(candidateKey || "").trim();
  if (!key) {
    const err = new Error("candidateKey is required");
    err.statusCode = 400;
    throw err;
  }

  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  const before = await countContactsForCampaign(campaignId);
  const removed = await removeContactFromCampaignCollection(campaignId, key);
  const after = Math.max(0, before - removed);

  const refreshed = doc.toObject();
  refreshed.contactCount = after;

  return {
    campaign: formatCampaign(refreshed, null, { contactCount: after }),
    removed,
  };
}

/**
 * Fill missing email/phone on campaign contacts from the user's reveal cache.
 * Never overwrites values already set (including manual DB/UI edits).
 */
async function syncCampaignContactsFromUserCache(actorUserId, campaignId) {
  const campaignDoc = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaignDoc);
  const contacts = await loadAllContactsForCampaign(campaignId);
  const linkedinUrls = contacts.map((c) => c.linkedinUrl).filter(Boolean);
  if (linkedinUrls.length === 0) {
    return formatCampaign(campaignDoc, null, {
      includeContacts: true,
      contacts,
      contactCount: contacts.length,
    });
  }

  const lookup = await lookupUserRevealedContacts(ownerUserId, linkedinUrls);

  for (const contact of contacts) {
    const key = normalizeLinkedinProfileUrl(contact.linkedinUrl);
    const cached = lookup[key];
    if (!cached) continue;

    const existingEmail = String(contact.email || "").trim();
    const existingPhone = String(contact.phone || "").trim();
    const email = existingEmail || String(cached.email || "").trim();
    const phone = existingPhone || String(cached.phone || "").trim();

    if (!email && !phone) continue;
    if (email === existingEmail && phone === existingPhone) continue;

    await updateCampaignContactFields(
      campaignId,
      contact.candidateKey,
      email,
      phone
    );
  }

  return getCampaign(actorUserId, campaignId);
}

async function setCampaignOutreachPlan(
  actorUserId,
  campaignId,
  outreachPlanId,
  outreachChannel = "gmail"
) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  const ownerOid = userOid(campaignOwnerUserId(doc));

  const channel =
    outreachChannel === "whatsapp"
      ? "whatsapp"
      : outreachChannel === "voice_call"
        ? "voice_call"
        : "gmail";
  const contactCount = await countContactsForCampaign(campaignId);
  const previousChannel =
    doc.outreachChannel === "whatsapp"
      ? "whatsapp"
      : doc.outreachChannel === "voice_call"
        ? "voice_call"
        : "gmail";

  if (channel === "voice_call") {
    doc.outreachPlanId = null;
    doc.outreachChannel = "voice_call";
    await doc.save();

    const refreshed = doc.toObject();
    refreshed.contactCount = contactCount;
    return formatCampaign(refreshed, null, { contactCount });
  }

  if (contactCount > 0 && channel !== previousChannel) {
    await assertOutreachCreditsAvailable(
      actorUserId,
      outreachChannelToCreditChannel(channel),
      contactCount,
      { excludeCampaignId: String(doc._id) }
    );
  }

  const raw = outreachPlanId === null || outreachPlanId === undefined ? "" : String(outreachPlanId).trim();
  if (!raw) {
    doc.outreachPlanId = null;
    doc.outreachChannel = "gmail";
  } else {
    if (!mongoose.Types.ObjectId.isValid(raw)) {
      const err = new Error("Invalid outreach plan id");
      err.statusCode = 400;
      throw err;
    }
    const planOid = new mongoose.Types.ObjectId(raw);
    if (channel === "whatsapp") {
      const plan = await WhatsAppOutreachPlan.findOne({ _id: planOid, userId: ownerOid }).lean();
      if (!plan) {
        const err = new Error("WhatsApp outreach plan not found");
        err.statusCode = 404;
        throw err;
      }
    } else {
      const plan = await OutreachPlan.findOne({ _id: planOid, userId: ownerOid }).lean();
      if (!plan) {
        const err = new Error("Outreach plan not found");
        err.statusCode = 404;
        throw err;
      }
    }
    doc.outreachPlanId = planOid;
    doc.outreachChannel = channel;
  }

  await doc.save();

  if (contactCount > 0 && channel !== previousChannel) {
    await logOutreachCreditUsage(
      actorUserId,
      outreachChannelToCreditChannel(channel),
      contactCount
    );
  }

  const refreshed = doc.toObject();
  refreshed.contactCount = contactCount;
  return formatCampaign(refreshed, null, { contactCount });
}

async function updateCampaignJobDescription(actorUserId, campaignId, payload = {}) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.jobDescription !== undefined) {
      doc.jobDescription = String(payload.jobDescription || "").trim();
    }
    if (payload.jobTitle !== undefined) {
      doc.jobTitle = String(payload.jobTitle || "").trim();
    }
  } else {
    doc.jobDescription = String(payload || "").trim();
  }
  await doc.save();
  const contactCount = await countContactsForCampaign(campaignId);
  const refreshed = doc.toObject();
  refreshed.contactCount = contactCount;
  return formatCampaign(refreshed, null, { contactCount });
}

async function updateCampaignCalendlyAutomation(actorUserId, campaignId, calendlyAutomation) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  doc.calendlyAutomation = normalizeCalendlyAutomation(calendlyAutomation);
  await doc.save();
  const contactCount = await countContactsForCampaign(campaignId);
  const refreshed = doc.toObject();
  refreshed.contactCount = contactCount;
  return formatCampaign(refreshed, null, { contactCount });
}

async function deleteCampaign(actorUserId, campaignId) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  await deleteAllContactsForCampaign(campaignId);
  await Campaign.deleteOne({ _id: doc._id });
  await deleteEnrollmentsForCampaign(campaignId);
  await deleteRepliesForCampaign(campaignId);
}

module.exports = {
  listCampaigns,
  listCampaignContacts,
  getCampaign,
  createCampaign,
  addContactsToCampaign,
  removeContactFromCampaign,
  setCampaignOutreachPlan,
  updateCampaignJobDescription,
  updateCampaignCalendlyAutomation,
  syncCampaignContactsFromUserCache,
  deleteCampaign,
};
