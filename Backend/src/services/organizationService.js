const mongoose = require("mongoose");
const User = require("../models/User");
const Organization = require("../models/Organization");

/**
 * @typedef {object} OrgContext
 * @property {import("mongoose").Types.ObjectId} actorId
 * @property {import("mongoose").Types.ObjectId | null} organizationId
 * @property {import("mongoose").Types.ObjectId} billingUserId
 * @property {"owner"|"member"|null} accountRole
 * @property {import("mongoose").Types.ObjectId[]} scopeUserIds
 * @property {boolean} isOwner
 * @property {boolean} isMember
 * @property {boolean} isAdmin
 */

async function loadUser(userOrId) {
  if (!userOrId) return null;
  if (userOrId._id) return userOrId;
  if (!mongoose.Types.ObjectId.isValid(String(userOrId))) return null;
  return User.findById(userOrId);
}

/**
 * Create workspace for a user completing onboarding (master / owner).
 */
async function createOrganizationForOwner(user) {
  if (!user?._id) return null;
  if (user.organizationId) {
    return Organization.findById(user.organizationId);
  }

  const org = await Organization.create({
    name: String(user.companyName || user.fullName || "Workspace").trim().slice(0, 200),
    ownerUserId: user._id,
  });

  user.organizationId = org._id;
  user.accountRole = "owner";
  user.ownerUserId = user._id;
  user.memberStatus = "active";
  if (!user.memberPermission) user.memberPermission = "full";
  await user.save();

  return org;
}

/**
 * Backfill org for legacy owners who completed onboarding before teams shipped.
 */
async function ensureOrganizationForOwner(user) {
  if (!user?._id || user.role === "admin") return user;
  if (user.accountRole === "member") return user;
  if (!user.onboardingCompleted) return user;
  if (user.organizationId && user.accountRole === "owner") {
    if (!user.ownerUserId) {
      user.ownerUserId = user._id;
      await user.save();
    }
    return user;
  }

  await createOrganizationForOwner(user);
  return User.findById(user._id);
}

/**
 * Plan quotas and usage counters live on the billing user (master for members).
 */
async function getBillingUser(userOrId) {
  const user = await loadUser(userOrId);
  if (!user) return null;
  if (user.role === "admin") return user;

  if (
    user.accountRole === "member" &&
    user.ownerUserId &&
    mongoose.Types.ObjectId.isValid(String(user.ownerUserId))
  ) {
    const owner = await User.findById(user.ownerUserId);
    if (owner) return owner;
  }

  return user;
}

async function getBillingUserId(userOrId) {
  const billing = await getBillingUser(userOrId);
  return billing?._id || null;
}

/**
 * User ids whose candidate/search/scout data the actor may access.
 */
async function getScopeUserIds(userOrId) {
  const user = await loadUser(userOrId);
  if (!user?._id) return [];

  if (user.role === "admin") return [];

  if (user.accountRole === "member") {
    return [user._id];
  }

  if (user.accountRole === "owner" && user.organizationId) {
    const members = await User.find({
      organizationId: user.organizationId,
      role: { $ne: "admin" },
    })
      .select("_id")
      .lean();
    const ids = members.map((m) => m._id);
    if (!ids.some((id) => String(id) === String(user._id))) ids.push(user._id);
    return ids;
  }

  return [user._id];
}

/**
 * @param {string|import("mongoose").Types.ObjectId} userOrId
 * @returns {Promise<OrgContext|null>}
 */
async function resolveOrgContext(userOrId) {
  const user = await loadUser(userOrId);
  if (!user?._id) return null;

  if (user.role === "admin") {
    return {
      actorId: user._id,
      organizationId: null,
      billingUserId: user._id,
      accountRole: null,
      scopeUserIds: [],
      isOwner: false,
      isMember: false,
      isAdmin: true,
    };
  }

  const billingUser = await getBillingUser(user);
  const scopeUserIds = await getScopeUserIds(user);

  return {
    actorId: user._id,
    organizationId: user.organizationId || null,
    billingUserId: billingUser?._id || user._id,
    accountRole: user.accountRole || null,
    scopeUserIds,
    isOwner: user.accountRole === "owner",
    isMember: user.accountRole === "member",
    isAdmin: false,
  };
}

function scopeUserObjectIds(scopeUserIds) {
  return (scopeUserIds || [])
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
}

async function listOrganizationMemberIds(organizationId) {
  if (!organizationId || !mongoose.Types.ObjectId.isValid(String(organizationId))) {
    return [];
  }
  const members = await User.find({
    organizationId: new mongoose.Types.ObjectId(String(organizationId)),
    role: { $ne: "admin" },
  })
    .select("_id")
    .lean();
  return members.map((m) => m._id);
}

async function assertTeamOwner(userOrId) {
  const user = await loadUser(userOrId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (user.role === "admin") return user;
  if (user.accountRole !== "owner" || !user.organizationId) {
    const err = new Error("Only the workspace owner can manage team members");
    err.statusCode = 403;
    throw err;
  }
  return user;
}

module.exports = {
  createOrganizationForOwner,
  ensureOrganizationForOwner,
  getBillingUser,
  getBillingUserId,
  getScopeUserIds,
  resolveOrgContext,
  scopeUserObjectIds,
  listOrganizationMemberIds,
  assertTeamOwner,
};
