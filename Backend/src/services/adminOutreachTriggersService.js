const OutreachModuleEnrollment = require("../models/OutreachModuleEnrollment");
const OutreachModuleCampaign = require("../models/OutreachModuleCampaign");
const User = require("../models/User");
const {
  buildExecutionPlan,
  findNextPendingAutomatableStep,
} = require("./outreachModuleSendService");
const { scheduledSendAt } = require("../utils/outreachScheduleUtils");

const VALID_PHASES = new Set(["upcoming", "completed", "all"]);

function normalizePhase(raw) {
  const key = String(raw || "upcoming").trim().toLowerCase();
  return VALID_PHASES.has(key) ? key : "upcoming";
}

function formatStepChannel(channel) {
  const key = String(channel || "").trim().toLowerCase();
  if (key === "whatsapp") return "WhatsApp";
  if (key === "email") return "Email";
  if (key === "voice") return "Voice";
  if (key === "linkedin") return "LinkedIn";
  return channel || "";
}

function buildEnrollmentBaseRow(enrollment, campaign, owner) {
  return {
    enrollmentId: String(enrollment._id),
    campaignId: String(enrollment.outreachModuleCampaignId),
    campaignName: campaign?.name || "",
    campaignStatus: campaign?.status || "",
    ownerName: owner?.fullName || "",
    ownerEmail: owner?.email || "",
    candidateName: enrollment.contactName || "",
    candidateEmail: enrollment.contactEmail || "",
    candidatePhone: enrollment.contactPhone || "",
    sentCount: Number(enrollment.sentCount) || 0,
    replyCount: Number(enrollment.replyCount) || 0,
    enrollmentStatus: String(enrollment.status || ""),
    lastError: String(enrollment.lastError || "").trim(),
    lastSentAt: enrollment.lastSentAt
      ? new Date(enrollment.lastSentAt).toISOString()
      : null,
  };
}

function buildEnrollmentFilter({ campaignId = "", phase = "upcoming" } = {}) {
  const campaignKey = String(campaignId || "").trim();
  const scoped = campaignKey ? { outreachModuleCampaignId: campaignKey } : {};

  if (phase === "completed") {
    return {
      ...scoped,
      $or: [
        { sentCount: { $gt: 0 } },
        { status: { $in: ["failed", "skipped"] } },
      ],
    };
  }

  if (phase === "all") {
    return {
      ...scoped,
      $or: [
        { status: "active", nextSendAt: { $ne: null } },
        { sentCount: { $gt: 0 } },
      ],
    };
  }

  return {
    ...scoped,
    status: "active",
    nextSendAt: { $ne: null },
  };
}

/** Already-sent steps for an enrollment. */
function buildCompletedEnrollmentTriggers(enrollment, campaign, owner) {
  const sentCount = Number(enrollment.sentCount) || 0;
  const plan = campaign ? buildExecutionPlan(campaign) : [];
  const sequenceTotal = plan.length;
  if (sentCount <= 0 && !["failed", "skipped"].includes(String(enrollment.status || ""))) {
    return [];
  }

  const sentSteps =
    sentCount > 0
      ? plan.filter((step) => step.order <= sentCount && step.channel !== "linkedin")
      : [];

  const base = buildEnrollmentBaseRow(enrollment, campaign, owner);
  const lastSentAt = enrollment.lastSentAt ? new Date(enrollment.lastSentAt) : null;
  const rows = sentSteps.map((step) => {
    const isLastSent = step.order === sentCount;
    const completedAt =
      isLastSent && lastSentAt && !Number.isNaN(lastSentAt.getTime())
        ? lastSentAt.toISOString()
        : null;

    return {
      ...base,
      triggerKey: `${enrollment._id}:done:${step.order}`,
      currentStepOrder: step.order,
      stepLabel: step.label || `Step ${step.order}`,
      channel: formatStepChannel(step.channel || ""),
      condition: step.condition || "",
      nextSendAt: completedAt,
      completedAt,
      triggerPhase: "completed",
      isDue: false,
      isProjected: false,
      isManual: false,
      isFailed: false,
      queueIndex: step.order,
      queueTotal: sequenceTotal || sentCount,
    };
  });

  const status = String(enrollment.status || "");
  if (["failed", "skipped"].includes(status)) {
    const failedStep =
      plan.find((step) => step.order === Number(enrollment.currentStepOrder)) ||
      findNextPendingAutomatableStep(plan, enrollment);
    if (failedStep && !rows.some((row) => row.currentStepOrder === failedStep.order)) {
      rows.push({
        ...base,
        triggerKey: `${enrollment._id}:failed:${failedStep.order}`,
        currentStepOrder: failedStep.order,
        stepLabel: failedStep.label || `Step ${failedStep.order}`,
        channel: formatStepChannel(failedStep.channel || ""),
        condition: failedStep.condition || "",
        nextSendAt: null,
        completedAt: enrollment.updatedAt
          ? new Date(enrollment.updatedAt).toISOString()
          : null,
        triggerPhase: "completed",
        isDue: false,
        isProjected: false,
        isManual: false,
        isFailed: true,
        queueIndex: failedStep.order,
        queueTotal: sequenceTotal || failedStep.order,
      });
    }
  }

  return rows;
}

/** Remaining sequence steps (actual + projected). */
function buildUpcomingEnrollmentTriggers(enrollment, campaign, owner, now) {
  const plan = campaign ? buildExecutionPlan(campaign) : [];
  const sequenceTotal = plan.length;
  const currentStepOrder = Number(enrollment.currentStepOrder) || 1;
  const baseNextAt = enrollment.nextSendAt ? new Date(enrollment.nextSendAt) : null;
  if (enrollment.status !== "active" || !baseNextAt || Number.isNaN(baseNextAt.getTime())) {
    return [];
  }

  const remainingSteps = plan.filter((step) => step.order >= currentStepOrder);
  if (remainingSteps.length === 0) return [];

  const base = buildEnrollmentBaseRow(enrollment, campaign, owner);
  const rows = [];
  let projectedAt = baseNextAt;

  for (let i = 0; i < remainingSteps.length; i += 1) {
    const step = remainingSteps[i];
    if (i > 0) {
      projectedAt = scheduledSendAt(projectedAt, step.delay);
    }

    const isManual = step.channel === "linkedin";
    const sendAt = i === 0 ? baseNextAt : projectedAt;
    rows.push({
      ...base,
      triggerKey: `${enrollment._id}:upcoming:${step.order}`,
      currentStepOrder: step.order,
      stepLabel: step.label || `Step ${step.order}`,
      channel: formatStepChannel(step.channel || ""),
      condition: step.condition || "",
      nextSendAt: isManual ? null : sendAt.toISOString(),
      completedAt: null,
      triggerPhase: "upcoming",
      isDue: !isManual && sendAt.getTime() <= now.getTime(),
      isProjected: step.order > currentStepOrder,
      isManual,
      isFailed: false,
      queueIndex: step.order,
      queueTotal: sequenceTotal || remainingSteps.length,
    });
  }

  return rows;
}

function triggerSortTime(row) {
  const iso =
    row.triggerPhase === "completed"
      ? row.completedAt || row.lastSentAt || row.nextSendAt
      : row.nextSendAt;
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function sortTriggers(triggers, phase) {
  if (phase === "completed") {
    return [...triggers].sort((a, b) => triggerSortTime(b) - triggerSortTime(a));
  }
  return [...triggers].sort((a, b) => triggerSortTime(a) - triggerSortTime(b));
}

/**
 * List outreach module triggers — upcoming queue, completed sends, or both.
 */
async function listAdminUpcomingOutreachTriggers({
  page = 1,
  limit = 25,
  campaignId = "",
  dueOnly = false,
  phase = "upcoming",
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const skip = (safePage - 1) * safeLimit;
  const safePhase = normalizePhase(phase);
  const now = new Date();

  const enrollmentFilter = buildEnrollmentFilter({ campaignId, phase: safePhase });
  const sortField =
    safePhase === "completed" ? { lastSentAt: -1, updatedAt: -1 } : { nextSendAt: 1 };

  const enrollments = await OutreachModuleEnrollment.find(enrollmentFilter)
    .sort(sortField)
    .lean();

  const campaignIds = [
    ...new Set(enrollments.map((row) => String(row.outreachModuleCampaignId))),
  ];
  const userIds = [...new Set(enrollments.map((row) => String(row.userId)))];

  const [campaigns, users] = await Promise.all([
    campaignIds.length
      ? OutreachModuleCampaign.find({ _id: { $in: campaignIds } })
          .select("name status mode userId sequenceSteps channel channelMessage")
          .lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("fullName email")
          .lean()
      : [],
  ]);

  const campaignById = new Map(campaigns.map((row) => [String(row._id), row]));
  const userById = new Map(users.map((row) => [String(row._id), row]));

  let triggers = [];
  for (const enrollment of enrollments) {
    const campaign = campaignById.get(String(enrollment.outreachModuleCampaignId));
    const owner = userById.get(String(enrollment.userId));

    if (safePhase === "upcoming" || safePhase === "all") {
      triggers.push(...buildUpcomingEnrollmentTriggers(enrollment, campaign, owner, now));
    }
    if (safePhase === "completed" || safePhase === "all") {
      triggers.push(...buildCompletedEnrollmentTriggers(enrollment, campaign, owner));
    }
  }

  triggers = sortTriggers(triggers, safePhase);

  const upcomingRows = triggers.filter((row) => row.triggerPhase === "upcoming");
  const completedRows = triggers.filter((row) => row.triggerPhase === "completed");
  const dueCount = upcomingRows.filter((row) => row.isDue).length;
  const upcomingCount = upcomingRows.length - dueCount;
  const completedCount = completedRows.length;
  const allTotal = triggers.length;

  if (dueOnly && safePhase !== "completed") {
    triggers = triggers.filter((row) => row.triggerPhase === "upcoming" && row.isDue);
  }

  const total = triggers.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const currentPage = Math.min(safePage, totalPages);
  const pageRows = triggers.slice(skip, skip + safeLimit);

  return {
    triggers: pageRows,
    summary: {
      total: allTotal,
      due: dueCount,
      upcoming: upcomingCount,
      completed: completedCount,
    },
    pagination: {
      page: currentPage,
      limit: safeLimit,
      total,
      totalPages,
      hasMore: currentPage < totalPages,
    },
    generatedAt: now.toISOString(),
  };
}

module.exports = {
  listAdminUpcomingOutreachTriggers,
};
