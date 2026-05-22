const mongoose = require("mongoose");
const SourcingSession = require("../models/SourcingSession");
const {
  resolveOrgContext,
  scopeUserObjectIds,
} = require("../services/organizationService");

/**
 * Mongo filter: { userId: { $in: scope } } for org-wide candidate data.
 */
async function userIdFilterForActor(actorUserId) {
  const ctx = await resolveOrgContext(actorUserId);
  if (!ctx) return null;
  if (ctx.isAdmin) return null;
  const ids = scopeUserObjectIds(ctx.scopeUserIds);
  if (ids.length === 0) return null;
  return { userId: { $in: ids } };
}

/**
 * Verify session belongs to actor's org scope (owner sees all members' sessions).
 */
async function findSessionInScope(actorUserId, futureJobsSessionId) {
  const sid = String(futureJobsSessionId || "").trim();
  if (!sid) return null;

  const ctx = await resolveOrgContext(actorUserId);
  if (!ctx) return null;

  const scopeIds = scopeUserObjectIds(ctx.scopeUserIds);
  if (scopeIds.length === 0) return null;

  return SourcingSession.findOne({
    futureJobsSessionId: sid,
    userId: { $in: scopeIds },
  }).lean();
}

function forbidden(message = "Access denied") {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

module.exports = {
  userIdFilterForActor,
  findSessionInScope,
  forbidden,
};
