const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const OutreachPlan = require("../models/OutreachPlan");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");
const { lookupUserRevealedContacts } = require("./contactRevealService");
const { deleteEnrollmentsForCampaign } = require("./campaignOutreachSendService");
const { deleteRepliesForCampaign } = require("./campaignReplySyncService");
const { normalizeLinkedinProfileUrl } = require("../utils/contactReveal");

/** WhatsApp campaign testing — E.164 India. Replace/remove when using real contact phones. */
const WHATSAPP_TEST_PHONE_E164 = "+918714500637";

function normalizeContact(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidateKey = String(raw.candidateKey || "").trim();
  if (!candidateKey) return null;
  // TODO(whatsapp-test): Restore phone from API payload (must be E.164, e.g. +91XXXXXXXXXX for India).
  // const phoneFromPayload = String(raw.phone || "").trim();
  const phone = WHATSAPP_TEST_PHONE_E164;
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

function formatCampaign(doc) {
  const contacts = Array.isArray(doc.contacts) ? doc.contacts : [];
  return {
    id: String(doc._id),
    name: doc.name || "",
    outreachPlanId: doc.outreachPlanId ? String(doc.outreachPlanId) : "",
    outreachChannel:
      doc.outreachChannel === "whatsapp" ? "whatsapp" : "gmail",
    outreachStatus: doc.outreachStatus || "idle",
    outreachStartedAt: doc.outreachStartedAt
      ? new Date(doc.outreachStartedAt).toISOString()
      : null,
    contactCount: contacts.length,
    contacts: contacts.map(formatContact),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
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

async function listCampaigns(userId) {
  const docs = await Campaign.find({ userId: userOid(userId) })
    .sort({ updatedAt: -1 })
    .lean();
  return docs.map(formatCampaign);
}

async function getCampaign(userId, campaignId) {
  const oid = assertValidCampaignId(campaignId);
  const doc = await Campaign.findOne({ _id: oid, userId: userOid(userId) }).lean();
  if (!doc) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }
  return formatCampaign(doc);
}

async function createCampaign(userId, { name, contacts }) {
  const campaignName = String(name || "").trim();
  if (!campaignName) {
    const err = new Error("Campaign name is required");
    err.statusCode = 400;
    throw err;
  }
  const doc = await Campaign.create({
    userId: userOid(userId),
    name: campaignName,
    contacts: normalizeContacts(contacts),
  });
  return formatCampaign(doc.toObject());
}

async function addContactsToCampaign(userId, campaignId, contacts) {
  const oid = assertValidCampaignId(campaignId);
  const doc = await Campaign.findOne({ _id: oid, userId: userOid(userId) });
  if (!doc) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

  const incoming = normalizeContacts(contacts);
  const existingKeys = new Set(
    (doc.contacts || []).map((c) => String(c.candidateKey || "").trim()).filter(Boolean)
  );

  let addedCount = 0;
  const addedCandidateKeys = [];
  for (const contact of incoming) {
    if (existingKeys.has(contact.candidateKey)) continue;
    existingKeys.add(contact.candidateKey);
    doc.contacts.push(contact);
    addedCandidateKeys.push(contact.candidateKey);
    addedCount += 1;
  }

  if (addedCount > 0) {
    await doc.save();
  }

  const skippedCount = incoming.length - addedCount;
  return {
    campaign: formatCampaign(doc.toObject()),
    addedCount,
    skippedCount,
    addedCandidateKeys,
  };
}

async function updateCampaignContactFields(userId, campaignId, candidateKey, email, phone) {
  await Campaign.updateOne(
    {
      _id: assertValidCampaignId(campaignId),
      userId: userOid(userId),
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
async function syncCampaignContactsFromUserCache(userId, campaignId) {
  const campaign = await getCampaign(userId, campaignId);
  const linkedinUrls = (campaign.contacts || [])
    .map((c) => c.linkedinUrl)
    .filter(Boolean);
  if (linkedinUrls.length === 0) return campaign;

  const lookup = await lookupUserRevealedContacts(userId, linkedinUrls);

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
      userId,
      campaignId,
      contact.candidateKey,
      email,
      phone
    );
  }

  return getCampaign(userId, campaignId);
}

async function setCampaignOutreachPlan(
  userId,
  campaignId,
  outreachPlanId,
  outreachChannel = "gmail"
) {
  const oid = assertValidCampaignId(campaignId);
  const doc = await Campaign.findOne({ _id: oid, userId: userOid(userId) });
  if (!doc) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }

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
    const ownerOid = userOid(userId);
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

async function deleteCampaign(userId, campaignId) {
  const oid = assertValidCampaignId(campaignId);
  const result = await Campaign.deleteOne({ _id: oid, userId: userOid(userId) });
  if (result.deletedCount === 0) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }
  await deleteEnrollmentsForCampaign(campaignId);
  await deleteRepliesForCampaign(campaignId);
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  addContactsToCampaign,
  setCampaignOutreachPlan,
  syncCampaignContactsFromUserCache,
  deleteCampaign,
};
