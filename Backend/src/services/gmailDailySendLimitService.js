const mongoose = require("mongoose");
const UserIntegration = require("../models/UserIntegration");

const GMAIL_DAILY_SEND_LIMIT = Math.max(
  1,
  Number(process.env.GMAIL_DAILY_SEND_LIMIT) || 200
);

const USAGE_TIMEZONE = String(process.env.GMAIL_DAILY_USAGE_TIMEZONE || "UTC").trim() || "UTC";

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function getUsageDateKey(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: USAGE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    /* fall through */
  }
  return date.toISOString().slice(0, 10);
}

async function findGmailIntegration(userId) {
  return UserIntegration.findOne({
    userId: userOid(userId),
    provider: "gmail",
  });
}

async function ensureGmailDailyUsageCurrent(integrationDoc) {
  if (!integrationDoc) return null;
  const today = getUsageDateKey();
  if (String(integrationDoc.gmailUsageDate || "") === today) {
    return integrationDoc;
  }

  integrationDoc.gmailUsageDate = today;
  integrationDoc.gmailDailySentCount = 0;
  integrationDoc.gmailDailyReservedCount = 0;
  await integrationDoc.save();
  return integrationDoc;
}

function buildLimitSnapshot(integrationDoc, requested = 0) {
  const limit = GMAIL_DAILY_SEND_LIMIT;
  const reserved = Math.max(0, Number(integrationDoc?.gmailDailyReservedCount) || 0);
  const sent = Math.max(0, Number(integrationDoc?.gmailDailySentCount) || 0);
  const remaining = Math.max(0, limit - reserved);
  return {
    limit,
    reserved,
    sent,
    remaining,
    requested: Math.max(0, Number(requested) || 0),
    usageDate: String(integrationDoc?.gmailUsageDate || getUsageDateKey()),
    integrationEmail: String(integrationDoc?.email || "").trim(),
  };
}

function throwDailyLimitExceeded(integrationDoc, requested) {
  const snapshot = buildLimitSnapshot(integrationDoc, requested);
  const err = new Error(
    `Gmail daily send limit reached for this account (${snapshot.limit}/day). ` +
      `${snapshot.remaining} remaining today; this campaign needs ${snapshot.requested}. ` +
      `Try again after midnight (${USAGE_TIMEZONE}) or reduce contacts.`
  );
  err.statusCode = 409;
  err.code = "GMAIL_DAILY_LIMIT_EXCEEDED";
  err.gmailDailyLimit = snapshot;
  throw err;
}

/**
 * Count contacts that will enroll with a sendable email on Gmail launch.
 */
function countGmailEnrollableContacts(contacts) {
  if (!Array.isArray(contacts)) return 0;
  let count = 0;
  for (const contact of contacts) {
    const email = String(contact?.email || "").trim();
    if (email && email.includes("@")) count += 1;
  }
  return count;
}

async function assertGmailDailySendCapacity(userId, requestedCount) {
  const requested = Math.max(0, Number(requestedCount) || 0);
  if (requested === 0) return buildLimitSnapshot(null, 0);

  const integration = await findGmailIntegration(userId);
  if (!integration?.accessToken) {
    const err = new Error("Gmail is not connected. Connect Gmail under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  await ensureGmailDailyUsageCurrent(integration);
  const snapshot = buildLimitSnapshot(integration, requested);
  if (requested > snapshot.remaining) {
    throwDailyLimitExceeded(integration, requested);
  }
  return snapshot;
}

/**
 * Gmail campaign launch: enforce daily cap from enrollable emails and total contacts.
 */
async function assertGmailLaunchCapacity(userId, contacts) {
  const list = Array.isArray(contacts) ? contacts : [];
  const totalContacts = list.length;
  const enrollable = countGmailEnrollableContacts(list);

  const integration = await findGmailIntegration(userId);
  if (!integration?.accessToken) {
    const err = new Error("Gmail is not connected. Connect Gmail under Integrations first.");
    err.statusCode = 400;
    throw err;
  }

  await ensureGmailDailyUsageCurrent(integration);

  if (totalContacts > GMAIL_DAILY_SEND_LIMIT) {
    const err = new Error(
      `This campaign has ${totalContacts} contacts, but your Gmail account can send at most ${GMAIL_DAILY_SEND_LIMIT} emails per day. Remove contacts or split into multiple campaigns/days.`
    );
    err.statusCode = 409;
    err.code = "GMAIL_DAILY_LIMIT_EXCEEDED";
    err.gmailDailyLimit = {
      ...buildLimitSnapshot(integration, totalContacts),
      totalContacts,
      enrollable,
    };
    throw err;
  }

  if (totalContacts > 0 && enrollable === 0) {
    const err = new Error(
      "No contacts have an email address yet. Unveil email when adding candidates to the campaign, or add contacts that already include email."
    );
    err.statusCode = 400;
    throw err;
  }

  if (enrollable > GMAIL_DAILY_SEND_LIMIT) {
    const err = new Error(
      `${enrollable} contacts have email addresses, but your Gmail daily limit is ${GMAIL_DAILY_SEND_LIMIT}. Remove ${enrollable - GMAIL_DAILY_SEND_LIMIT} contact(s) or launch tomorrow.`
    );
    err.statusCode = 409;
    err.code = "GMAIL_DAILY_LIMIT_EXCEEDED";
    err.gmailDailyLimit = {
      ...buildLimitSnapshot(integration, enrollable),
      totalContacts,
      enrollable,
    };
    throw err;
  }

  const snapshot = buildLimitSnapshot(integration, enrollable);
  if (enrollable > snapshot.remaining) {
    throwDailyLimitExceeded(integration, enrollable);
  }

  return { ...snapshot, totalContacts, enrollable };
}

async function reserveGmailDailySends(userId, count) {
  const n = Math.max(0, Number(count) || 0);
  if (n === 0) return;

  const integration = await findGmailIntegration(userId);
  if (!integration) return;

  await ensureGmailDailyUsageCurrent(integration);
  integration.gmailDailyReservedCount =
    (Number(integration.gmailDailyReservedCount) || 0) + n;
  await integration.save();
}

async function assertCanSendGmailToday(userId) {
  const integration = await findGmailIntegration(userId);
  if (!integration?.accessToken) {
    const err = new Error("Gmail is not connected.");
    err.statusCode = 400;
    throw err;
  }

  await ensureGmailDailyUsageCurrent(integration);
  const sent = Math.max(0, Number(integration.gmailDailySentCount) || 0);
  if (sent >= GMAIL_DAILY_SEND_LIMIT) {
    const err = new Error(
      `Gmail daily send limit reached (${GMAIL_DAILY_SEND_LIMIT}/day). Sending resumes after midnight (${USAGE_TIMEZONE}).`
    );
    err.statusCode = 429;
    err.code = "GMAIL_DAILY_LIMIT_EXCEEDED";
    err.gmailDailyLimit = buildLimitSnapshot(integration, 1);
    throw err;
  }
  return integration;
}

async function recordGmailSend(userId) {
  const integration = await findGmailIntegration(userId);
  if (!integration) return;

  await ensureGmailDailyUsageCurrent(integration);
  integration.gmailDailySentCount = (Number(integration.gmailDailySentCount) || 0) + 1;
  await integration.save();
}

async function resetAllGmailDailyUsage() {
  const today = getUsageDateKey();
  const result = await UserIntegration.updateMany(
    { provider: "gmail" },
    {
      $set: {
        gmailUsageDate: today,
        gmailDailySentCount: 0,
        gmailDailyReservedCount: 0,
      },
    }
  );
  if (result.modifiedCount > 0) {
    console.log(
      `[gmail-daily-limit] reset ${result.modifiedCount} integration(s) for ${today} (${USAGE_TIMEZONE})`
    );
  }
  return result;
}

module.exports = {
  GMAIL_DAILY_SEND_LIMIT,
  USAGE_TIMEZONE,
  getUsageDateKey,
  countGmailEnrollableContacts,
  assertGmailDailySendCapacity,
  assertGmailLaunchCapacity,
  reserveGmailDailySends,
  assertCanSendGmailToday,
  recordGmailSend,
  resetAllGmailDailyUsage,
  buildLimitSnapshot,
};
