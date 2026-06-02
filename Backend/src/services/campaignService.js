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
const { CAMPAIGN_MAX_CONTACTS } = require("../constants/campaignLimits");

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

function formatCampaign(doc, listStats) {
  const contacts = Array.isArray(doc.contacts) ? doc.contacts : [];
  const contactCount = contacts.length;
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
    jobDescription: String(doc.jobDescription || "").trim(),
    calendlyAutomation: normalizeCalendlyAutomation(doc.calendlyAutomation),
    outreachPlanId: doc.outreachPlanId ? String(doc.outreachPlanId) : "",
    outreachChannel:
      doc.outreachChannel === "whatsapp" ? "whatsapp" : "gmail",
    outreachStatus: doc.outreachStatus || "idle",
    outreachStartedAt: doc.outreachStartedAt
      ? new Date(doc.outreachStartedAt).toISOString()
      : null,
    whatsAppInterestedCount: Math.max(0, Number(doc.whatsAppInterestedCount) || 0),
    whatsAppNotInterestedCount: Math.max(0, Number(doc.whatsAppNotInterestedCount) || 0),
    contactCount,
    contacts: contacts.map(formatContact),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(contactsSent !== undefined ? { contactsSent } : {}),
    ...(interestedCount !== undefined ? { interestedCount } : {}),
    ...(lastActivityAt !== undefined ? { lastActivityAt } : {}),
  };
}

function resolveLastActivityAt(doc, listStats) {
  const stamps = [
    doc.updatedAt,
    doc.createdAt,
    listStats?.maxLastSent,
    listStats?.maxLastReply,
    listStats?.maxDispositionAt,
    listStats?.maxEnrollmentUpdated,
  ]
    .map((value) => {
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? time : 0;
    })
    .filter((time) => time > 0);
  if (stamps.length === 0) return null;
  return new Date(Math.max(...stamps)).toISOString();
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
        maxEnrollmentUpdated: { $max: "$updatedAt" },
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

  const [docs, total, active, contactsAgg] = await Promise.all([
    Campaign.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(filter),
    Campaign.countDocuments({ ...filter, outreachStatus: "active" }),
    Campaign.aggregate([
      { $match: filter },
      {
        $project: {
          contactCount: { $size: { $ifNull: ["$contacts", []] } },
        },
      },
      { $group: { _id: null, total: { $sum: "$contactCount" } } },
    ]),
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
    maxEnrollmentUpdated: null,
  };
  const campaigns = docs.map((doc) =>
    formatCampaign(doc, statsById.get(String(doc._id)) || emptyListStats)
  );
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, totalPages);
  const hasMore = safePage < totalPages;
  const totalContacts =
    contactsAgg && contactsAgg[0] && typeof contactsAgg[0].total === "number"
      ? contactsAgg[0].total
      : 0;

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
  const oid = assertValidCampaignId(campaignId);
  await findCampaignInScope(actorUserId, campaignId, { select: "_id" });

  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const search = String(options.search || "").trim();
  const disposition = String(options.disposition || "").trim();
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 15));
  const skip = (page - 1) * limit;
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : null;
  const dispositionFilter =
    disposition === "interested" || disposition === "not_interested" || disposition === "awaiting"
      ? disposition
      : "all";

  const pipeline = [
    { $match: { _id: oid } },
    { $unwind: "$contacts" },
    {
      $lookup: {
        from: CampaignSequenceEnrollment.collection.name,
        let: { campaignId: "$_id", key: "$contacts.candidateKey" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$campaignId", "$$campaignId"] },
                  { $eq: ["$candidateKey", "$$key"] },
                ],
              },
            },
          },
          { $project: { _id: 0, replyDisposition: 1 } },
          { $limit: 1 },
        ],
        as: "enrollmentRows",
      },
    },
    {
      $addFields: {
        replyDisposition: {
          $ifNull: [{ $first: "$enrollmentRows.replyDisposition" }, "unknown"],
        },
      },
    },
  ];

  if (searchRegex) {
    pipeline.push({
      $match: {
        $or: [
          { "contacts.name": searchRegex },
          { "contacts.email": searchRegex },
          { "contacts.role": searchRegex },
          { "contacts.company": searchRegex },
          { "contacts.phone": searchRegex },
        ],
      },
    });
  }

  if (dispositionFilter === "interested") {
    pipeline.push({ $match: { replyDisposition: "interested" } });
  } else if (dispositionFilter === "not_interested") {
    pipeline.push({ $match: { replyDisposition: "not_interested" } });
  } else if (dispositionFilter === "awaiting") {
    pipeline.push({ $match: { replyDisposition: "unknown" } });
  }

  pipeline.push(
    { $sort: { "contacts.addedAt": -1, "contacts.candidateKey": 1 } },
    {
      $facet: {
        rows: [
          { $skip: skip },
          { $limit: limit },
          { $project: { contact: "$contacts", replyDisposition: 1 } },
        ],
        total: [{ $count: "count" }],
      },
    },
  );

  const [result] = await Campaign.aggregate(pipeline);

  const rawRows = Array.isArray(result?.rows) ? result.rows : [];
  const total = Array.isArray(result?.total) && result.total[0]?.count ? Number(result.total[0].count) : 0;
  const contacts = rawRows.map((row) => formatContact(row.contact || {}));
  const dispositionByCandidateKey = {};
  rawRows.forEach((row) => {
    const key = String(row?.contact?.candidateKey || "").trim();
    if (!key) return;
    const value =
      row?.replyDisposition === "interested" || row?.replyDisposition === "not_interested"
        ? row.replyDisposition
        : "unknown";
    dispositionByCandidateKey[key] = value;
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    contacts,
    dispositionByCandidateKey,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

async function getCampaign(actorUserId, campaignId) {
  const doc = await findCampaignInScope(actorUserId, campaignId);
  return formatCampaign(doc);
}

async function createCampaign(userId, { name, contacts }) {
  const campaignName = String(name || "").trim();
  if (!campaignName) {
    const err = new Error("Campaign name is required");
    err.statusCode = 400;
    throw err;
  }
  const normalized = normalizeContacts(contacts);
  const limitSkippedCount = Math.max(0, normalized.length - CAMPAIGN_MAX_CONTACTS);
  const contactsToSave = normalized.slice(0, CAMPAIGN_MAX_CONTACTS);
  const doc = await Campaign.create({
    userId: userOid(userId),
    name: campaignName,
    contacts: contactsToSave,
  });
  return {
    campaign: formatCampaign(doc.toObject()),
    limitSkippedCount,
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
  const existingKeys = new Set(
    (doc.contacts || []).map((c) => String(c.candidateKey || "").trim()).filter(Boolean)
  );

  let addedCount = 0;
  let skippedCount = 0;
  let limitSkippedCount = 0;
  const addedCandidateKeys = [];
  for (const contact of incoming) {
    if (existingKeys.has(contact.candidateKey)) {
      skippedCount += 1;
      continue;
    }
    if ((doc.contacts?.length || 0) + addedCount >= CAMPAIGN_MAX_CONTACTS) {
      limitSkippedCount += 1;
      continue;
    }
    existingKeys.add(contact.candidateKey);
    doc.contacts.push(contact);
    addedCandidateKeys.push(contact.candidateKey);
    addedCount += 1;
  }

  if (addedCount > 0) {
    await doc.save();
  }

  return {
    campaign: formatCampaign(doc.toObject()),
    addedCount,
    skippedCount,
    limitSkippedCount,
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

  const before = Array.isArray(doc.contacts) ? doc.contacts.length : 0;
  doc.contacts = (doc.contacts || []).filter(
    (c) => String(c?.candidateKey || "").trim() !== key
  );
  const after = Array.isArray(doc.contacts) ? doc.contacts.length : 0;
  const removed = Math.max(0, before - after);
  if (removed > 0) {
    await doc.save();
  }

  return {
    campaign: formatCampaign(doc.toObject()),
    removed,
  };
}

async function updateCampaignContactFields(ownerUserId, campaignId, candidateKey, email, phone) {
  await Campaign.updateOne(
    {
      _id: assertValidCampaignId(campaignId),
      userId: userOid(ownerUserId),
      "contacts.candidateKey": candidateKey,
    },
    {
      $set: {
        "contacts.$.email": String(email || "").trim(),
        "contacts.$.phone": String(phone || "").trim(),
      },
    }
  );
}

/**
 * Fill missing email/phone on campaign contacts from the user's reveal cache.
 * Never overwrites values already set (including manual DB/UI edits).
 */
async function syncCampaignContactsFromUserCache(actorUserId, campaignId) {
  const campaignDoc = await findCampaignInScope(actorUserId, campaignId);
  const ownerUserId = campaignOwnerUserId(campaignDoc);
  const campaign = formatCampaign(campaignDoc);
  const linkedinUrls = (campaign.contacts || [])
    .map((c) => c.linkedinUrl)
    .filter(Boolean);
  if (linkedinUrls.length === 0) return campaign;

  const lookup = await lookupUserRevealedContacts(ownerUserId, linkedinUrls);

  for (const contact of campaign.contacts) {
    const key = normalizeLinkedinProfileUrl(contact.linkedinUrl);
    const cached = lookup[key];
    if (!cached) continue;

    const existingEmail = String(contact.email || "").trim();
    const existingPhone = String(contact.phone || "").trim();
    const email =
      existingEmail || String(cached.email || "").trim();
    const phone =
      existingPhone || String(cached.phone || "").trim();

    if (!email && !phone) continue;
    if (email === existingEmail && phone === existingPhone) continue;

    await updateCampaignContactFields(
      ownerUserId,
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

  const channel = outreachChannel === "whatsapp" ? "whatsapp" : "gmail";
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
  return formatCampaign(doc.toObject());
}

async function updateCampaignJobDescription(actorUserId, campaignId, jobDescription) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  doc.jobDescription = String(jobDescription || "").trim();
  await doc.save();
  return formatCampaign(doc.toObject());
}

async function updateCampaignCalendlyAutomation(actorUserId, campaignId, calendlyAutomation) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
  doc.calendlyAutomation = normalizeCalendlyAutomation(calendlyAutomation);
  await doc.save();
  return formatCampaign(doc.toObject());
}

async function deleteCampaign(actorUserId, campaignId) {
  const doc = await findCampaignDocumentInScope(actorUserId, campaignId);
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
