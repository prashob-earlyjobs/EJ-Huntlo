const mongoose = require("mongoose");
const CampaignRevealJob = require("../models/CampaignRevealJob");
const { runCampaignRevealJob } = require("./campaignRevealJobRunner");
const {
  findCampaignInScope,
  campaignOwnerUserId,
} = require("../utils/campaignScope");

const runningJobIds = new Set();

function formatJob(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(o._id),
    campaignId: String(o.campaignId),
    status: o.status || "pending",
    total: o.total || 0,
    processed: o.processed || 0,
    revealedEmailCount: o.revealedEmailCount || 0,
    revealedPhoneCount: o.revealedPhoneCount || 0,
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

async function createAndStartCampaignRevealJob(actorUserId, campaignId, candidateKeys = []) {
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

  const job = await CampaignRevealJob.create({
    userId: new mongoose.Types.ObjectId(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
    status: "pending",
    candidateKeys: keys,
    total: keys.length || 0,
    processed: 0,
  });

  const jobId = String(job._id);
  scheduleRevealJob(jobId);

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

async function startCampaignRevealJob(actorUserId, campaignId, candidateKeys = null) {
  return createAndStartCampaignRevealJob(actorUserId, campaignId, candidateKeys || []);
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
  createAndStartCampaignRevealJob,
  getActiveRevealJobForCampaign,
  startCampaignRevealJob,
  getCampaignRevealJob,
  scheduleRevealJob,
};
