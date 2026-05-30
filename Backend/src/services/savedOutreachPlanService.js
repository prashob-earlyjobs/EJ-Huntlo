const mongoose = require("mongoose");
const OutreachPlan = require("../models/OutreachPlan");
const WhatsAppOutreachPlan = require("../models/WhatsAppOutreachPlan");

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

function parsePagination(options = {}) {
  const pageRaw = Number(options.page);
  const limitRaw = Number(options.limit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function formatListItem(doc) {
  return {
    id: String(doc._id),
    channel: doc.channel === "whatsapp" ? "whatsapp" : "gmail",
    name: doc.name || "",
    touchpointCount: Math.max(0, Number(doc.touchpointCount) || 0),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

/**
 * Paginated Gmail + WhatsApp saved sequences merged by updatedAt (newest first).
 */
async function listSavedOutreachPlans(userId, options = {}) {
  const ownerOid = userOid(userId);
  const { page, limit, skip } = parsePagination(options);
  const channelFilter =
    options.channel === "whatsapp" ? "whatsapp" : options.channel === "gmail" ? "gmail" : "all";
  const waCollection = WhatsAppOutreachPlan.collection.name;

  if (channelFilter === "gmail") {
    const filter = { userId: ownerOid };
    const [docs, total] = await Promise.all([
      OutreachPlan.find(filter)
        .select("name touchpoints updatedAt")
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OutreachPlan.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    return {
      plans: docs.map((doc) =>
        formatListItem({
          ...doc,
          channel: "gmail",
          touchpointCount: Array.isArray(doc.touchpoints) ? doc.touchpoints.length : 0,
        })
      ),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasMore: safePage < totalPages,
      },
    };
  }

  if (channelFilter === "whatsapp") {
    const filter = { userId: ownerOid };
    const [docs, total] = await Promise.all([
      WhatsAppOutreachPlan.find(filter)
        .select("name touchpoints updatedAt")
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WhatsAppOutreachPlan.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    return {
      plans: docs.map((doc) =>
        formatListItem({
          ...doc,
          channel: "whatsapp",
          touchpointCount: Array.isArray(doc.touchpoints) ? doc.touchpoints.length : 0,
        })
      ),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasMore: safePage < totalPages,
      },
    };
  }

  const listPipeline = [
    { $match: { userId: ownerOid } },
    {
      $project: {
        name: 1,
        updatedAt: 1,
        touchpointCount: { $size: { $ifNull: ["$touchpoints", []] } },
        channel: { $literal: "gmail" },
      },
    },
    {
      $unionWith: {
        coll: waCollection,
        pipeline: [
          { $match: { userId: ownerOid } },
          {
            $project: {
              name: 1,
              updatedAt: 1,
              touchpointCount: { $size: { $ifNull: ["$touchpoints", []] } },
              channel: { $literal: "whatsapp" },
            },
          },
        ],
      },
    },
    { $sort: { updatedAt: -1, _id: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const countPipeline = [
    { $match: { userId: ownerOid } },
    { $project: { _id: 1 } },
    {
      $unionWith: {
        coll: waCollection,
        pipeline: [{ $match: { userId: ownerOid } }, { $project: { _id: 1 } }],
      },
    },
    { $count: "total" },
  ];

  const [rows, countRows] = await Promise.all([
    OutreachPlan.aggregate(listPipeline),
    OutreachPlan.aggregate(countPipeline),
  ]);

  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, totalPages);

  return {
    plans: rows.map(formatListItem),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasMore: safePage < totalPages,
    },
  };
}

module.exports = {
  listSavedOutreachPlans,
  SAVED_OUTREACH_DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE,
};
