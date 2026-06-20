const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignContact = require("../models/CampaignContact");
const CampaignSequenceEnrollment = require("../models/CampaignSequenceEnrollment");
const { normalizeToE164 } = require("./whatsappPhoneUtils");

/** WhatsApp campaign testing — E.164. Override via WHATSAPP_TEST_PHONE_E164 env. */
const WHATSAPP_TEST_PHONE_E164 = String(
  process.env.WHATSAPP_TEST_PHONE_E164 || "+918714500637"
).trim();

function normalizeContactPhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  return normalizeToE164(trimmed) || trimmed;
}

function campaignOid(campaignId) {
  return new mongoose.Types.ObjectId(String(campaignId));
}

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function normalizeContact(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidateKey = String(raw.candidateKey || "").trim();
  if (!candidateKey) return null;
  const phone =
    normalizeContactPhone(raw.phone) ||
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
    jd: String(raw.jd || "").trim(),
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
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {};
  return {
    id: o._id ? String(o._id) : "",
    candidateKey: o.candidateKey || "",
    candidateId: o.candidateId || "",
    name: o.name || "",
    email: o.email || "",
    phone: o.phone || "",
    role: o.role || "",
    company: o.company || "",
    location: o.location || "",
    linkedinUrl: o.linkedinUrl || "",
    sourcingSessionId: o.sourcingSessionId || "",
    jd: o.jd || "",
    addedAt: o.addedAt ? new Date(o.addedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Move legacy embedded `campaign.contacts[]` into CampaignContact (one-time per campaign).
 */
async function ensureContactsMigrated(campaignId) {
  const oid = campaignOid(campaignId);
  const campaign = await Campaign.findById(oid).select("contacts userId contactCount").lean();
  if (!campaign) return;

  const embedded = Array.isArray(campaign.contacts) ? campaign.contacts : [];
  const existingCount = await CampaignContact.countDocuments({ campaignId: oid });

  if (embedded.length === 0) {
    if (
      typeof campaign.contactCount !== "number" ||
      campaign.contactCount !== existingCount
    ) {
      await Campaign.updateOne({ _id: oid }, { $set: { contactCount: existingCount } });
    }
    return;
  }

  if (existingCount > 0) {
    await Campaign.updateOne(
      { _id: oid },
      { $set: { contacts: [], contactCount: existingCount } }
    );
    return;
  }

  const ownerId = campaign.userId;
  const toInsert = embedded
    .map((raw) => {
      const normalized = normalizeContact(raw);
      if (!normalized) return null;
      return {
        ...normalized,
        campaignId: oid,
        userId: ownerId,
      };
    })
    .filter(Boolean);

  if (toInsert.length > 0) {
    await CampaignContact.insertMany(toInsert, { ordered: false });
  }

  await Campaign.updateOne(
    { _id: oid },
    { $set: { contacts: [], contactCount: toInsert.length } }
  );
}

async function countContactsForCampaign(campaignId) {
  await ensureContactsMigrated(campaignId);
  return CampaignContact.countDocuments({ campaignId: campaignOid(campaignId) });
}

async function countContactsForUserCampaigns(userId, channel, excludeCampaignId) {
  const filter = { userId: userOid(userId) };
  if (channel === "whatsapp") {
    filter.outreachChannel = "whatsapp";
  } else {
    filter.outreachChannel = { $in: ["gmail", null] };
  }
  if (excludeCampaignId && mongoose.Types.ObjectId.isValid(String(excludeCampaignId))) {
    filter._id = { $ne: new mongoose.Types.ObjectId(String(excludeCampaignId)) };
  }

  const campaignIds = await Campaign.find(filter).distinct("_id");
  if (campaignIds.length === 0) return 0;
  return CampaignContact.countDocuments({ campaignId: { $in: campaignIds } });
}

async function sumContactCountsForCampaigns(campaignFilter) {
  const campaignIds = await Campaign.find(campaignFilter).distinct("_id");
  if (campaignIds.length === 0) return 0;
  return CampaignContact.countDocuments({ campaignId: { $in: campaignIds } });
}

async function getExistingCandidateKeys(campaignId) {
  await ensureContactsMigrated(campaignId);
  const rows = await CampaignContact.find({ campaignId: campaignOid(campaignId) })
    .select("candidateKey")
    .lean();
  return new Set(rows.map((r) => String(r.candidateKey || "").trim()).filter(Boolean));
}

async function loadAllContactsForCampaign(campaignId) {
  await ensureContactsMigrated(campaignId);
  const rows = await CampaignContact.find({ campaignId: campaignOid(campaignId) })
    .sort({ addedAt: -1, candidateKey: 1 })
    .lean();
  return rows.map(formatContact);
}

async function loadContactsByCandidateKeys(campaignId, candidateKeys) {
  await ensureContactsMigrated(campaignId);
  const keys = Array.isArray(candidateKeys)
    ? candidateKeys.map((k) => String(k || "").trim()).filter(Boolean)
    : [];
  if (keys.length === 0) return [];
  const rows = await CampaignContact.find({
    campaignId: campaignOid(campaignId),
    candidateKey: { $in: keys },
  }).lean();
  return rows.map(formatContact);
}

async function findContactByCandidateKey(campaignId, candidateKey) {
  await ensureContactsMigrated(campaignId);
  const key = String(candidateKey || "").trim();
  if (!key) return null;
  const row = await CampaignContact.findOne({
    campaignId: campaignOid(campaignId),
    candidateKey: key,
  }).lean();
  return row ? formatContact(row) : null;
}

async function contactExistsInCampaign(campaignId, candidateKey) {
  await ensureContactsMigrated(campaignId);
  const key = String(candidateKey || "").trim();
  if (!key) return false;
  const n = await CampaignContact.countDocuments({
    campaignId: campaignOid(campaignId),
    candidateKey: key,
  });
  return n > 0;
}

async function insertContactsForCampaign(campaignId, userId, contacts) {
  const oid = campaignOid(campaignId);
  const normalized = normalizeContacts(contacts);
  if (normalized.length === 0) return { inserted: 0 };

  const docs = normalized.map((contact) => ({
    ...contact,
    campaignId: oid,
    userId: userOid(userId),
  }));

  await CampaignContact.insertMany(docs, { ordered: true });
  await Campaign.updateOne({ _id: oid }, { $inc: { contactCount: docs.length } });
  return { inserted: docs.length };
}

async function addContactsToCampaignCollection(campaignId, userId, incoming) {
  await ensureContactsMigrated(campaignId);
  const oid = campaignOid(campaignId);
  const normalized = normalizeContacts(incoming);
  const existingKeys = await getExistingCandidateKeys(campaignId);

  const toInsert = [];
  const addedCandidateKeys = [];
  let skippedCount = 0;

  for (const contact of normalized) {
    if (existingKeys.has(contact.candidateKey)) {
      skippedCount += 1;
      continue;
    }
    existingKeys.add(contact.candidateKey);
    toInsert.push({
      ...contact,
      campaignId: oid,
      userId: userOid(userId),
    });
    addedCandidateKeys.push(contact.candidateKey);
  }

  if (toInsert.length > 0) {
    await CampaignContact.insertMany(toInsert, { ordered: true });
    await Campaign.updateOne({ _id: oid }, { $inc: { contactCount: toInsert.length } });
  }

  return {
    addedCount: toInsert.length,
    skippedCount,
    addedCandidateKeys,
  };
}

async function removeContactFromCampaignCollection(campaignId, candidateKey) {
  await ensureContactsMigrated(campaignId);
  const key = String(candidateKey || "").trim();
  if (!key) return 0;

  const result = await CampaignContact.deleteOne({
    campaignId: campaignOid(campaignId),
    candidateKey: key,
  });

  if (result.deletedCount > 0) {
    await Campaign.updateOne(
      { _id: campaignOid(campaignId) },
      { $inc: { contactCount: -result.deletedCount } }
    );
  }
  return result.deletedCount;
}

async function updateCampaignContactFields(campaignId, candidateKey, email, phone) {
  await ensureContactsMigrated(campaignId);
  const normalizedPhone = normalizeContactPhone(phone);
  await CampaignContact.updateOne(
    {
      campaignId: campaignOid(campaignId),
      candidateKey: String(candidateKey || "").trim(),
    },
    {
      $set: {
        email: String(email || "").trim(),
        phone: normalizedPhone,
      },
    }
  );
}

async function deleteAllContactsForCampaign(campaignId) {
  await CampaignContact.deleteMany({ campaignId: campaignOid(campaignId) });
  await Campaign.updateOne(
    { _id: campaignOid(campaignId) },
    { $set: { contactCount: 0, contacts: [] } }
  );
}

async function listCampaignContactsPaginated(campaignId, options = {}) {
  await ensureContactsMigrated(campaignId);
  const oid = campaignOid(campaignId);

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

  const match = { campaignId: oid };
  if (searchRegex) {
    match.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { role: searchRegex },
      { company: searchRegex },
      { phone: searchRegex },
    ];
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: CampaignSequenceEnrollment.collection.name,
        let: { cid: "$campaignId", key: "$candidateKey" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$campaignId", "$$cid"] },
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

  if (dispositionFilter === "interested") {
    pipeline.push({ $match: { replyDisposition: "interested" } });
  } else if (dispositionFilter === "not_interested") {
    pipeline.push({ $match: { replyDisposition: "not_interested" } });
  } else if (dispositionFilter === "awaiting") {
    pipeline.push({ $match: { replyDisposition: "unknown" } });
  }

  pipeline.push(
    { $sort: { addedAt: -1, candidateKey: 1 } },
    {
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    }
  );

  const [result] = await CampaignContact.aggregate(pipeline);
  const rawRows = Array.isArray(result?.rows) ? result.rows : [];
  const total =
    Array.isArray(result?.total) && result.total[0]?.count
      ? Number(result.total[0].count)
      : 0;
  const contacts = rawRows.map((row) => formatContact(row));
  const dispositionByCandidateKey = {};
  rawRows.forEach((row) => {
    const key = String(row?.candidateKey || "").trim();
    if (!key) return;
    dispositionByCandidateKey[key] =
      row?.replyDisposition === "interested" || row?.replyDisposition === "not_interested"
        ? row.replyDisposition
        : "unknown";
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

async function countContactsWithEmail(campaignId) {
  await ensureContactsMigrated(campaignId);
  return CampaignContact.countDocuments({
    campaignId: campaignOid(campaignId),
    email: { $regex: /@/ },
  });
}

async function countContactsWithPhone(campaignId) {
  await ensureContactsMigrated(campaignId);
  return CampaignContact.countDocuments({
    campaignId: campaignOid(campaignId),
    phone: { $nin: ["", null] },
  });
}

module.exports = {
  normalizeContact,
  normalizeContacts,
  formatContact,
  ensureContactsMigrated,
  countContactsForCampaign,
  countContactsForUserCampaigns,
  sumContactCountsForCampaigns,
  getExistingCandidateKeys,
  loadAllContactsForCampaign,
  loadContactsByCandidateKeys,
  findContactByCandidateKey,
  contactExistsInCampaign,
  insertContactsForCampaign,
  addContactsToCampaignCollection,
  removeContactFromCampaignCollection,
  updateCampaignContactFields,
  deleteAllContactsForCampaign,
  listCampaignContactsPaginated,
  countContactsWithEmail,
  countContactsWithPhone,
};
