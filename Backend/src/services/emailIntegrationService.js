const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
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

/**
 * Which email provider to use for send + reply sync (Gmail > Outlook > Zoho).
 * @returns {"gmail" | "outlook" | "zoho_mail" | null}
 */
async function resolveEmailProviderForUser(userId) {
  const oid = userOid(userId);
  const [gmail, outlook, zoho] = await Promise.all([
    UserIntegration.findOne({ userId: oid, provider: "gmail" }).lean(),
    UserIntegration.findOne({ userId: oid, provider: "outlook" }).lean(),
    UserIntegration.findOne({ userId: oid, provider: "zoho_mail" }).lean(),
  ]);

  if (gmail?.accessToken) return "gmail";
  if (isOutlookConnected(outlook)) return "outlook";
  if (isZohoConnected(zoho)) return "zoho_mail";
  return null;
}

async function getEmailIntegrationDoc(userId, provider) {
  const oid = userOid(userId);
  if (provider === "gmail") {
    const doc = await UserIntegration.findOne({ userId: oid, provider: "gmail" });
    if (!doc?.accessToken) {
      const err = new Error("Gmail is not connected. Connect Gmail under Integrations first.");
      err.statusCode = 400;
      throw err;
    }
    return doc;
  }

  if (provider === "outlook") {
    const doc = await UserIntegration.findOne({ userId: oid, provider: "outlook" });
    if (!isOutlookConnected(doc)) {
      const err = new Error("Outlook is not connected. Connect Outlook under Integrations first.");
      err.statusCode = 400;
      throw err;
    }
    return doc;
  }

  if (provider === "zoho_mail") {
    const doc = await UserIntegration.findOne({ userId: oid, provider: "zoho_mail" });
    if (!isZohoConnected(doc)) {
      const err = new Error(
        "Zoho Mail is not connected. Connect Zoho Mail under Integrations first."
      );
      err.statusCode = 400;
      throw err;
    }
    return doc;
  }

  const err = new Error("Unknown email provider");
  err.statusCode = 400;
  throw err;
}

async function getEmailIntegrationEmail(userId, provider) {
  const doc = await getEmailIntegrationDoc(userId, provider);
  return String(doc.email || "").trim();
}

async function getSenderFirstNameForEmail(userId) {
  const provider = await resolveEmailProviderForUser(userId);
  if (!provider) return "";

  const doc = await UserIntegration.findOne({
    userId: userOid(userId),
    provider,
  })
    .select("senderName email")
    .lean();

  if (doc?.senderName?.trim()) {
    return doc.senderName.trim().split(/\s+/)[0] || doc.senderName.trim();
  }
  if (doc?.email?.includes("@")) {
    return doc.email.split("@")[0];
  }
  return "";
}

module.exports = {
  resolveEmailProviderForUser,
  getEmailIntegrationDoc,
  getEmailIntegrationEmail,
  getSenderFirstNameForEmail,
  isOutlookConnected,
  isZohoConnected,
};
