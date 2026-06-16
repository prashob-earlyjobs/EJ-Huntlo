const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");
const { isCustomMailConnected } = require("./customMailSendService");

const EMAIL_PROVIDERS = ["gmail", "outlook", "zoho_mail", "custom_mail"];

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function isEmailProvider(provider) {
  return EMAIL_PROVIDERS.includes(String(provider || ""));
}

function isZohoConnected(doc) {
  if (!doc) return false;
  if (doc.zohoAuthMode === "smtp") {
    return Boolean(doc.refreshToken && doc.email);
  }
  if (doc.zohoAuthMode === "oauth") {
    return Boolean(doc.accessToken);
  }
  return Boolean(doc.accessToken || doc.refreshToken);
}

function isOutlookConnected(doc) {
  return Boolean(doc?.accessToken);
}

function isGmailConnected(doc) {
  return Boolean(doc?.accessToken);
}

function isEmailIntegrationConnected(doc) {
  if (!doc || !isEmailProvider(doc.provider)) return false;
  if (doc.provider === "gmail") return isGmailConnected(doc);
  if (doc.provider === "outlook") return isOutlookConnected(doc);
  if (doc.provider === "zoho_mail") return isZohoConnected(doc);
  if (doc.provider === "custom_mail") return isCustomMailConnected(doc);
  return false;
}

async function listConnectedEmailIntegrations(userId) {
  const docs = await UserIntegration.find({
    userId: userOid(userId),
    provider: { $in: EMAIL_PROVIDERS },
  })
    .sort({ isDefaultEmail: -1, updatedAt: -1 })
    .lean();
  return docs.filter(isEmailIntegrationConnected);
}

async function resolveEmailIntegration(userId, integrationId) {
  const oid = userOid(userId);

  if (integrationId) {
    const doc = await UserIntegration.findOne({
      _id: new mongoose.Types.ObjectId(String(integrationId)),
      userId: oid,
      provider: { $in: EMAIL_PROVIDERS },
    });
    if (!doc || !isEmailIntegrationConnected(doc)) {
      const err = new Error("Email integration not found or disconnected.");
      err.statusCode = 400;
      throw err;
    }
    return doc;
  }

  const defaultDoc = await UserIntegration.findOne({
    userId: oid,
    isDefaultEmail: true,
    provider: { $in: EMAIL_PROVIDERS },
  });
  if (defaultDoc && isEmailIntegrationConnected(defaultDoc)) {
    return defaultDoc;
  }

  const connected = await listConnectedEmailIntegrations(userId);
  if (connected.length > 0) {
    return UserIntegration.findById(connected[0]._id);
  }

  const err = new Error(
    "No email integration connected. Connect Gmail, Outlook, Zoho Mail, or Custom SMTP under Integrations first."
  );
  err.statusCode = 400;
  throw err;
}

async function resolveEmailProviderForUser(userId, integrationId) {
  const doc = await resolveEmailIntegration(userId, integrationId);
  return doc.provider;
}

async function getEmailIntegrationDoc(userId, providerOrIntegrationId) {
  const raw = String(providerOrIntegrationId || "");
  if (mongoose.Types.ObjectId.isValid(raw)) {
    return resolveEmailIntegration(userId, raw);
  }
  const oid = userOid(userId);
  const defaultForProvider = await UserIntegration.findOne({
    userId: oid,
    provider: raw,
    isDefaultEmail: true,
  });
  if (defaultForProvider && isEmailIntegrationConnected(defaultForProvider)) {
    return defaultForProvider;
  }
  const specific = await UserIntegration.findOne({
    userId: oid,
    provider: raw,
  });
  if (specific && isEmailIntegrationConnected(specific)) {
    return specific;
  }
  const doc = await resolveEmailIntegration(userId);
  if (doc.provider === raw) {
    return doc;
  }
  const err = new Error(`${raw} is not connected.`);
  err.statusCode = 400;
  throw err;
}

async function getEmailIntegrationForCampaign(campaign) {
  const userId = String(campaign?.userId || "");
  const integrationId = campaign?.emailIntegrationId
    ? String(campaign.emailIntegrationId)
    : null;
  return resolveEmailIntegration(userId, integrationId);
}

async function getEmailIntegrationEmail(userId, providerOrIntegrationId) {
  const doc = await getEmailIntegrationDoc(userId, providerOrIntegrationId);
  return String(doc.email || "").trim();
}

async function getSenderFirstNameForEmail(userId, integrationId) {
  const doc = await resolveEmailIntegration(userId, integrationId);
  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  if (doc?.email?.includes("@")) {
    return doc.email.split("@")[0];
  }
  return "";
}

async function ensureDefaultEmailOnConnect(userOid, doc) {
  if (!isEmailIntegrationConnected(doc)) return doc;
  const hasDefault = await UserIntegration.exists({
    userId: userOid,
    isDefaultEmail: true,
    provider: { $in: EMAIL_PROVIDERS },
  });
  if (!hasDefault) {
    doc.isDefaultEmail = true;
    await doc.save();
  }
  return doc;
}

async function reassignDefaultEmailIntegration(userOid, excludeId) {
  const remaining = await UserIntegration.find({
    userId: userOid,
    provider: { $in: EMAIL_PROVIDERS },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .sort({ updatedAt: -1 })
    .lean();

  const next = remaining.find(isEmailIntegrationConnected);
  await UserIntegration.updateMany(
    { userId: userOid, isDefaultEmail: true },
    { $set: { isDefaultEmail: false } }
  );
  if (next) {
    await UserIntegration.updateOne({ _id: next._id }, { $set: { isDefaultEmail: true } });
  }
}

async function setDefaultEmailIntegration(userId, integrationId) {
  const doc = await resolveEmailIntegration(userId, integrationId);
  const oid = userOid(userId);
  await UserIntegration.updateMany(
    { userId: oid, isDefaultEmail: true },
    { $set: { isDefaultEmail: false } }
  );
  doc.isDefaultEmail = true;
  await doc.save();
  return doc;
}

module.exports = {
  EMAIL_PROVIDERS,
  isEmailProvider,
  isEmailIntegrationConnected,
  isOutlookConnected,
  isZohoConnected,
  isGmailConnected,
  listConnectedEmailIntegrations,
  resolveEmailIntegration,
  resolveEmailProviderForUser,
  getEmailIntegrationDoc,
  getEmailIntegrationForCampaign,
  getEmailIntegrationEmail,
  getSenderFirstNameForEmail,
  ensureDefaultEmailOnConnect,
  reassignDefaultEmailIntegration,
  setDefaultEmailIntegration,
};
