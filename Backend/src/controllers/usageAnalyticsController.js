const mongoose = require("mongoose");
const UsageEvent = require("../models/UsageEvent");
const { getOutreachCreditsAnalytics } = require("../services/outreachCreditsService");
const { getVoiceCallCreditsAnalytics } = require("../services/voiceCallCreditsService");

const EVENT_TYPES = [
  "people_scout_lookup",
  "email_unveil",
  "phone_unveil",
];

const SOURCES = ["user_cache", "shared_cache", "futurejobs", "not_found"];

function emptySourceBreakdown() {
  const breakdown = {};
  for (const source of SOURCES) {
    breakdown[source] = { count: 0, credits: 0 };
  }
  breakdown.total = { count: 0, credits: 0 };
  return breakdown;
}

function emptySummary() {
  const summary = {};
  for (const eventType of EVENT_TYPES) {
    summary[eventType] = emptySourceBreakdown();
  }
  summary.grandTotal = { events: 0, credits: 0 };
  return summary;
}

function buildSummaryFromGroups(groups) {
  const summary = emptySummary();

  for (const row of groups) {
    const eventType = row?._id?.eventType;
    const source = row?._id?.source;
    if (!EVENT_TYPES.includes(eventType) || !SOURCES.includes(source)) continue;

    const count = Number(row.count) || 0;
    const credits = Number(row.credits) || 0;

    summary[eventType][source].count += count;
    summary[eventType][source].credits += credits;
    summary[eventType].total.count += count;
    summary[eventType].total.credits += credits;
    summary.grandTotal.events += count;
    summary.grandTotal.credits += credits;
  }

  return summary;
}

function parseDateFilter(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildUsageEventFilter(query) {
  const filter = {};
  const userId = String(query.userId || "").trim();
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error("Invalid user id filter");
      err.statusCode = 400;
      throw err;
    }
    filter.userId = new mongoose.Types.ObjectId(userId);
  }

  const eventType = String(query.eventType || "").trim();
  if (eventType) {
    if (!EVENT_TYPES.includes(eventType)) {
      const err = new Error("Invalid eventType filter");
      err.statusCode = 400;
      throw err;
    }
    filter.eventType = eventType;
  }

  const from = parseDateFilter(query.from);
  const to = parseDateFilter(query.to);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  return filter;
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const getUsageAnalyticsSummary = async (req, res) => {
  try {
    const filter = buildUsageEventFilter(req.query || {});
    const groups = await UsageEvent.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { eventType: "$eventType", source: "$source" },
          count: { $sum: 1 },
          credits: { $sum: { $cond: ["$charged", 1, 0] } },
        },
      },
    ]);

    const outreachCredits = await getOutreachCreditsAnalytics(
      String(req.query?.userId || "").trim()
    );
    const voiceCallCredits = await getVoiceCallCreditsAnalytics(
      String(req.query?.userId || "").trim()
    );

    return res.status(200).json({
      success: true,
      summary: buildSummaryFromGroups(groups),
      outreachCredits,
      voiceCallCredits,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch usage analytics summary",
    });
  }
};

const getUsageAnalyticsEvents = async (req, res) => {
  try {
    const filter = buildUsageEventFilter(req.query || {});
    const limit = clampInt(req.query.limit, 1, 200, 50);
    const page = clampInt(req.query.page, 1, 10000, 1);
    const skip = (page - 1) * limit;

    const [totalDocs, rows] = await Promise.all([
      UsageEvent.countDocuments(filter),
      UsageEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName email")
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

    return res.status(200).json({
      success: true,
      events: rows.map((row) => ({
        id: row._id.toString(),
        user:
          row.userId && typeof row.userId === "object"
            ? {
                id: row.userId._id.toString(),
                fullName: row.userId.fullName || "",
                email: row.userId.email || "",
              }
            : null,
        eventType: row.eventType,
        source: row.source,
        product: row.product,
        charged: Boolean(row.charged),
        metadata: row.metadata || {},
        createdAt: row.createdAt,
      })),
      pagination: {
        page,
        limit,
        totalDocs,
        totalPages,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch usage analytics events",
    });
  }
};

module.exports = {
  getUsageAnalyticsSummary,
  getUsageAnalyticsEvents,
};
