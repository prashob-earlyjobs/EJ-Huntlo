const mongoose = require("mongoose");
const CampaignRevealJob = require("../models/CampaignRevealJob");
const {
  runCampaignRevealJob,
  buildContactProgressEntry,
} = require("./campaignRevealJobRunner");
const { loadAllContactsForCampaign } = require("./campaignContactService");
const {
  findCampaignInScope,
  campaignOwnerUserId,
} = require("../utils/campaignScope");

const runningJobIds = new Set();

function formatContactProgress(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const o = entry && typeof entry === "object" ? entry : {};
    return {
      candidateKey: String(o.candidateKey || "").trim(),
      name: String(o.name || "").trim(),
      emailStatus: String(o.emailStatus || "queued"),
      phoneStatus: String(o.phoneStatus || "queued"),
      email: String(o.email || "").trim(),
      phone: String(o.phone || "").trim(),
      detail: String(o.detail || "").trim(),
      updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : null,
    };
  });
}

function normalizeRevealTypes(raw) {
  if (!Array.isArray(raw)) return ["EMAIL", "PHONE"];
  const types = [...new Set(raw.map((t) => String(t).toUpperCase()).filter((t) => t === "EMAIL" || t === "PHONE"))];
  return types.length > 0 ? types : ["EMAIL", "PHONE"];
}

function normalizeContactForRevealCheck(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    linkedinUrl: String(raw.linkedinUrl || raw.linkedin_profile_url || "").trim(),
    sourcingSessionId: String(raw.sourcingSessionId || "").trim(),
    email: String(raw.email || "").trim(),
    phone: String(raw.phone || "").trim(),
  };
}

function countRevealQuotaNeeds(contacts, revealTypes) {
  const types = normalizeRevealTypes(revealTypes);
  let emailNeeded = 0;
  let phoneNeeded = 0;
  if (!Array.isArray(contacts)) return { emailNeeded, phoneNeeded };

  for (const raw of contacts) {
    const contact = normalizeContactForRevealCheck(raw);
    if (!contact) continue;
    if (!contact.linkedinUrl || !contact.sourcingSessionId) continue;
    if (types.includes("EMAIL") && !contact.email) emailNeeded += 1;
    if (types.includes("PHONE") && !contact.phone) phoneNeeded += 1;
  }

  return { emailNeeded, phoneNeeded };
}

/**
 * Fail before add/create when requested unveil types exceed plan quota for this batch.
 */
async function assertCampaignRevealQuotaAvailable(userId, contacts, revealTypes) {
  if (!userId || !Array.isArray(contacts) || contacts.length === 0) return;

  const { emailNeeded, phoneNeeded } = countRevealQuotaNeeds(contacts, revealTypes);
  if (emailNeeded <= 0 && phoneNeeded <= 0) return;

  const { assertQuotaAvailableByUserId } = require("./planQuotas");
  if (emailNeeded > 0) {
    await assertQuotaAvailableByUserId(userId, "emailUnveils", emailNeeded);
  }
  if (phoneNeeded > 0) {
    await assertQuotaAvailableByUserId(userId, "mobileUnveils", phoneNeeded);
  }
}

function formatJob(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(o._id),
    campaignId: String(o.campaignId),
    status: o.status || "pending",
    candidateKeys: Array.isArray(o.candidateKeys)
      ? o.candidateKeys.map((k) => String(k).trim()).filter(Boolean)
      : [],
    revealTypes: normalizeRevealTypes(o.revealTypes),
    total: o.total || 0,
    processed: o.processed || 0,
    revealedEmailCount: o.revealedEmailCount || 0,
    revealedPhoneCount: o.revealedPhoneCount || 0,
    contactProgress: formatContactProgress(o.contactProgress),
    errorMessage: o.errorMessage || "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/** Run reveal on the main server process (reliable on Windows; uses existing DB connection). */
function scheduleRevealJob(jobId) {
  if (runningJobIds.has(jobId)) return;
  runningJobIds.add(jobId);

  setImmediate(async () => {
    try {
      await runCampaignRevealJob(jobId);
    } catch (error) {
      console.error(`[campaign-reveal-job:${jobId}]`, error?.message || error);
    } finally {
      runningJobIds.delete(jobId);
    }
  });
}

async function createAndStartCampaignRevealJob(
  actorUserId,
  campaignId,
  candidateKeys = [],
  revealTypes = ["EMAIL", "PHONE"]
) {
  if (
    !mongoose.Types.ObjectId.isValid(actorUserId) ||
    !mongoose.Types.ObjectId.isValid(campaignId)
  ) {
    const err = new Error("Invalid user or campaign id");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const keys = Array.isArray(candidateKeys)
    ? [...new Set(candidateKeys.map((k) => String(k).trim()).filter(Boolean))]
    : [];

  const normalizedRevealTypes = normalizeRevealTypes(revealTypes);

  let contactProgress = [];
  if (keys.length > 0) {
    const allContacts = await loadAllContactsForCampaign(campaignId);
    const keySet = new Set(keys);
    const matched = allContacts.filter((c) => keySet.has(c.candidateKey));
    contactProgress = matched.map((c) =>
      buildContactProgressEntry(c, normalizedRevealTypes)
    );
    for (const key of keys) {
      if (!contactProgress.some((entry) => entry.candidateKey === key)) {
        contactProgress.push(
          buildContactProgressEntry(
            { candidateKey: key, name: "", email: "", phone: "" },
            normalizedRevealTypes
          )
        );
      }
    }
  }

  const job = await CampaignRevealJob.create({
    userId: new mongoose.Types.ObjectId(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    status: "pending",
    candidateKeys: keys,
    revealTypes: normalizedRevealTypes,
    total: contactProgress.length || keys.length || 0,
    processed: 0,
    contactProgress,
  });
  if (contactProgress.length > 0) {
    job.markModified("contactProgress");
    await job.save();
  }

  const jobId = String(job._id);
  scheduleRevealJob(jobId);

  return formatJob(job);
}

const {
  buildUnveilActivityFromRevealJobs,
  listRevealJobsForCampaign,
} = require("./campaignRevealActivityService");

async function getLatestRevealJobForCampaign(actorUserId, campaignId) {
  if (
    !mongoose.Types.ObjectId.isValid(actorUserId) ||
    !mongoose.Types.ObjectId.isValid(campaignId)
  ) {
    return null;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const job = await CampaignRevealJob.findOne({
    userId: new mongoose.Types.ObjectId(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return formatJob(job);
}

async function getActiveRevealJobForCampaign(actorUserId, campaignId) {
  if (
    !mongoose.Types.ObjectId.isValid(actorUserId) ||
    !mongoose.Types.ObjectId.isValid(campaignId)
  ) {
    return null;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const job = await CampaignRevealJob.findOne({
    userId: new mongoose.Types.ObjectId(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    status: { $in: ["pending", "running"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  return formatJob(job);
}

async function startCampaignRevealJob(
  actorUserId,
  campaignId,
  candidateKeys = null,
  revealTypes = ["EMAIL", "PHONE"]
) {
  return createAndStartCampaignRevealJob(
    actorUserId,
    campaignId,
    candidateKeys || [],
    revealTypes
  );
}

/**
 * Reveal missing email/phone for campaign contacts before launch (awaits completion).
 */
async function revealCampaignContactsForLaunch(actorUserId, campaignId) {
  if (
    !mongoose.Types.ObjectId.isValid(actorUserId) ||
    !mongoose.Types.ObjectId.isValid(campaignId)
  ) {
    const err = new Error("Invalid user or campaign id");
    err.statusCode = 400;
    throw err;
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const job = await CampaignRevealJob.create({
    userId: new mongoose.Types.ObjectId(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    status: "pending",
    candidateKeys: [],
    total: 0,
    processed: 0,
  });

  const jobId = String(job._id);
  await runCampaignRevealJob(jobId);

  const finished = await CampaignRevealJob.findById(jobId).lean();
  return formatJob(finished);
}

async function getCampaignRevealJob(actorUserId, jobId) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    const err = new Error("Invalid job id");
    err.statusCode = 400;
    throw err;
  }

  const job = await CampaignRevealJob.findById(jobId).lean();
  if (!job) {
    const err = new Error("Reveal job not found");
    err.statusCode = 404;
    throw err;
  }

  await findCampaignInScope(actorUserId, job.campaignId, { select: "_id" });

  return formatJob(job);
}

module.exports = {
  assertCampaignRevealQuotaAvailable,
  countRevealQuotaNeeds,
  createAndStartCampaignRevealJob,
  revealCampaignContactsForLaunch,
  listRevealJobsForCampaign,
  buildUnveilActivityFromRevealJobs,
  getLatestRevealJobForCampaign,
  getActiveRevealJobForCampaign,
  startCampaignRevealJob,
  getCampaignRevealJob,
  scheduleRevealJob,
};
