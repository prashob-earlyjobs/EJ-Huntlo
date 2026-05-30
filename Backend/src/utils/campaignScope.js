const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const { userIdFilterForActor } = require("./orgScope");

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function campaignNotFoundError(message = "Campaign not found") {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

/**
 * Mongo filter for campaigns the actor may access (org owner → all members; member → self).
 */
async function campaignAccessFilterForActor(actorUserId) {
  const filter = await userIdFilterForActor(actorUserId);
  if (filter) return filter;
  if (!mongoose.Types.ObjectId.isValid(String(actorUserId))) return null;
  return { userId: userOid(actorUserId) };
}

function campaignOwnerUserId(campaign) {
  return String(campaign?.userId || "");
}

async function findCampaignInScope(actorUserId, campaignId, { lean = true, select } = {}) {
  if (!mongoose.Types.ObjectId.isValid(String(campaignId))) {
    const err = new Error("Invalid campaign id");
    err.statusCode = 400;
    throw err;
  }

  const access = await campaignAccessFilterForActor(actorUserId);
  if (!access) {
    throw campaignNotFoundError();
  }

  const oid = new mongoose.Types.ObjectId(String(campaignId));
  let query = Campaign.findOne({ _id: oid, ...access });
  if (select) query = query.select(select);
  if (lean) query = query.lean();

  const doc = await query;
  if (!doc) {
    throw campaignNotFoundError();
  }
  return doc;
}

async function findCampaignDocumentInScope(actorUserId, campaignId, { select } = {}) {
  if (!mongoose.Types.ObjectId.isValid(String(campaignId))) {
    const err = new Error("Invalid campaign id");
    err.statusCode = 400;
    throw err;
  }

  const access = await campaignAccessFilterForActor(actorUserId);
  if (!access) {
    throw campaignNotFoundError();
  }

  const oid = new mongoose.Types.ObjectId(String(campaignId));
  let query = Campaign.findOne({ _id: oid, ...access });
  if (select) query = query.select(select);
  const doc = await query;
  if (!doc) {
    throw campaignNotFoundError();
  }
  return doc;
}

module.exports = {
  campaignAccessFilterForActor,
  campaignOwnerUserId,
  findCampaignInScope,
  findCampaignDocumentInScope,
};
