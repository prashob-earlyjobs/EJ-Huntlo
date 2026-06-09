const mongoose = require("mongoose");
const CampaignRevealJob = require("../models/CampaignRevealJob");
const { loadAllContactsForCampaign } = require("./campaignContactService");
const {
  findCampaignInScope,
  campaignOwnerUserId,
} = require("../utils/campaignScope");

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
  const types = [
    ...new Set(
      raw.map((t) => String(t).toUpperCase()).filter((t) => t === "EMAIL" || t === "PHONE")
    ),
  ];
  return types.length > 0 ? types : ["EMAIL", "PHONE"];
}

function formatRevealJob(doc) {
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

function contactUnveilIsActive(jobStatus, entry) {
  if (jobStatus !== "pending" && jobStatus !== "running") return false;
  const activeStatuses = new Set(["queued", "running"]);
  return (
    activeStatuses.has(String(entry.emailStatus || "")) ||
    activeStatuses.has(String(entry.phoneStatus || ""))
  );
}

function buildUnveilDetail(entry, revealTypes) {
  const parts = [];
  if (String(entry.detail || "").trim()) {
    parts.push(String(entry.detail).trim());
    return parts.join(" · ");
  }
  if (revealTypes.includes("EMAIL")) {
    if (entry.emailStatus === "revealed") parts.push("Email revealed");
    else if (entry.emailStatus === "not_found") parts.push("Email not found");
    else if (entry.emailStatus === "skipped") parts.push("Email already on file");
    else if (entry.emailStatus === "running") parts.push("Unveiling email");
    else if (entry.emailStatus === "queued") parts.push("Email waiting");
    else if (entry.emailStatus === "failed") parts.push("Email unveil failed");
  }
  if (revealTypes.includes("PHONE")) {
    if (entry.phoneStatus === "revealed") parts.push("Phone revealed");
    else if (entry.phoneStatus === "not_found") parts.push("Phone not found");
    else if (entry.phoneStatus === "skipped") parts.push("Phone already on file");
    else if (entry.phoneStatus === "running") parts.push("Unveiling phone");
    else if (entry.phoneStatus === "queued") parts.push("Phone waiting");
    else if (entry.phoneStatus === "failed") parts.push("Phone unveil failed");
  }
  return parts.join(" · ");
}

/**
 * Convert persisted reveal jobs into Activity tab events (full unveil history).
 */
function buildUnveilActivityFromRevealJobs(jobs) {
  if (!Array.isArray(jobs)) return [];

  const activities = [];
  for (const job of jobs) {
    if (!job) continue;
    const revealTypes = normalizeRevealTypes(job.revealTypes);
    const jobStatus = job.status || "pending";
    const jobFallbackAt = job.updatedAt || job.createdAt || new Date();

    for (const entry of job.contactProgress || []) {
      const candidateKey = String(entry.candidateKey || "").trim();
      if (!candidateKey) continue;

      const emailRequested =
        revealTypes.includes("EMAIL") && entry.emailStatus !== "not_requested";
      const phoneRequested =
        revealTypes.includes("PHONE") && entry.phoneStatus !== "not_requested";
      if (!emailRequested && !phoneRequested) continue;

      const at = entry.updatedAt || jobFallbackAt;
      activities.push({
        type: "unveil",
        candidateKey,
        contactName: String(entry.name || "").trim() || "Candidate",
        contactEmail: String(entry.email || "").trim(),
        contactPhone: String(entry.phone || "").trim(),
        at,
        detail: buildUnveilDetail(entry, revealTypes),
        unveil: {
          revealTypes,
          emailStatus: entry.emailStatus,
          phoneStatus: entry.phoneStatus,
          email: String(entry.email || "").trim(),
          phone: String(entry.phone || "").trim(),
          isActive: contactUnveilIsActive(jobStatus, entry),
          jobId: job.id,
        },
      });
    }
  }

  return activities;
}

function synthesizeContactProgress(job, contacts) {
  const revealTypes = normalizeRevealTypes(job.revealTypes);
  const keySet = new Set(
    (Array.isArray(job.candidateKeys) ? job.candidateKeys : [])
      .map((k) => String(k).trim())
      .filter(Boolean)
  );
  if (keySet.size === 0) return [];

  const fallbackAt = job.updatedAt || job.createdAt || new Date().toISOString();
  return contacts
    .filter((c) => keySet.has(String(c.candidateKey || "").trim()))
    .map((contact) => {
      const hasEmail = Boolean(String(contact.email || "").trim());
      const hasPhone = Boolean(String(contact.phone || "").trim());
      const emailStatus = revealTypes.includes("EMAIL")
        ? hasEmail
          ? "revealed"
          : "not_found"
        : "not_requested";
      const phoneStatus = revealTypes.includes("PHONE")
        ? hasPhone
          ? "revealed"
          : "not_found"
        : "not_requested";
      const detail = buildUnveilDetail(
        {
          emailStatus,
          phoneStatus,
          detail: "",
        },
        revealTypes
      );
      return {
        candidateKey: contact.candidateKey,
        name: String(contact.name || "").trim(),
        emailStatus,
        phoneStatus,
        email: String(contact.email || "").trim(),
        phone: String(contact.phone || "").trim(),
        detail,
        updatedAt: fallbackAt,
      };
    });
}

/**
 * Build unveil activity rows for a campaign, including legacy jobs missing contactProgress.
 */
async function buildUnveilActivitiesForCampaign(actorUserId, campaignId) {
  const jobs = await listRevealJobsForCampaign(actorUserId, campaignId);
  if (jobs.length === 0) return [];

  const withProgress = jobs.filter((job) => (job.contactProgress || []).length > 0);
  const legacyJobs = jobs.filter(
    (job) => !(job.contactProgress || []).length && (job.candidateKeys || []).length > 0
  );

  let activities = buildUnveilActivityFromRevealJobs(withProgress);

  if (legacyJobs.length > 0) {
    const contacts = await loadAllContactsForCampaign(campaignId);
    for (const job of legacyJobs) {
      const contactProgress = synthesizeContactProgress(job, contacts);
      if (contactProgress.length === 0) continue;
      activities = activities.concat(
        buildUnveilActivityFromRevealJobs([{ ...job, contactProgress }])
      );
    }
  }

  return activities;
}

async function listRevealJobsForCampaign(actorUserId, campaignId, limit = 50) {
  if (
    !mongoose.Types.ObjectId.isValid(actorUserId) ||
    !mongoose.Types.ObjectId.isValid(campaignId)
  ) {
    return [];
  }

  const campaign = await findCampaignInScope(actorUserId, campaignId, { select: "userId" });
  const ownerUserId = campaignOwnerUserId(campaign);

  const jobs = await CampaignRevealJob.find({
    userId: new mongoose.Types.ObjectId(ownerUserId),
    campaignId: new mongoose.Types.ObjectId(campaignId),
  })
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(100, limit)))
    .lean();

  return jobs.map((doc) => formatRevealJob(doc)).filter(Boolean);
}

module.exports = {
  buildUnveilActivityFromRevealJobs,
  buildUnveilActivitiesForCampaign,
  listRevealJobsForCampaign,
};
