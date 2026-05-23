const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");

function normalizeContact(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidateKey = String(raw.candidateKey || "").trim();
  if (!candidateKey) return null;
  return {
    candidateKey,
    candidateId: String(raw.candidateId || "").trim(),
    name: String(raw.name || "").trim(),
    email: String(raw.email || "").trim(),
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
  for (const contact of incoming) {
    if (existingKeys.has(contact.candidateKey)) continue;
    existingKeys.add(contact.candidateKey);
    doc.contacts.push(contact);
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
  };
}

async function deleteCampaign(userId, campaignId) {
  const oid = assertValidCampaignId(campaignId);
  const result = await Campaign.deleteOne({ _id: oid, userId: userOid(userId) });
  if (result.deletedCount === 0) {
    const err = new Error("Campaign not found");
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  addContactsToCampaign,
  deleteCampaign,
};
