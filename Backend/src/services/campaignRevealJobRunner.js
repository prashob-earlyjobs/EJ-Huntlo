const mongoose = require("mongoose");
const CampaignRevealJob = require("../models/CampaignRevealJob");
const { revealSingleContactItem } = require("./bulkRevealService");
const { getCampaign, syncCampaignContactsFromUserCache } = require("./campaignService");
const {
  loadAllContactsForCampaign,
  updateCampaignContactFields,
} = require("./campaignContactService");

function normalizeRevealTypes(raw) {
  if (!Array.isArray(raw)) return ["EMAIL", "PHONE"];
  const types = [...new Set(raw.map((t) => String(t).toUpperCase()).filter((t) => t === "EMAIL" || t === "PHONE"))];
  return types.length > 0 ? types : ["EMAIL", "PHONE"];
}

function initialFieldStatus(requested, hasValue) {
  if (!requested) return "not_requested";
  if (hasValue) return "skipped";
  return "queued";
}

function buildContactProgressEntry(contact, revealTypes) {
  const hasEmail = Boolean(String(contact.email || "").trim());
  const hasPhone = Boolean(String(contact.phone || "").trim());
  return {
    candidateKey: contact.candidateKey,
    name: String(contact.name || "").trim(),
    emailStatus: initialFieldStatus(revealTypes.includes("EMAIL"), hasEmail),
    phoneStatus: initialFieldStatus(revealTypes.includes("PHONE"), hasPhone),
    email: hasEmail ? String(contact.email).trim() : "",
    phone: hasPhone ? String(contact.phone).trim() : "",
    detail: "",
    updatedAt: new Date(),
  };
}

function contactNeedsReveal(contact, revealTypes) {
  const linkedin = String(contact.linkedinUrl || "").trim();
  const sessionId = String(contact.sourcingSessionId || "").trim();
  if (!linkedin || !sessionId) return false;
  const needsEmail =
    revealTypes.includes("EMAIL") && !String(contact.email || "").trim();
  const needsPhone =
    revealTypes.includes("PHONE") && !String(contact.phone || "").trim();
  return needsEmail || needsPhone;
}

/**
 * Runs reveal for campaign contacts one-by-one and writes progress to the job document.
 */
async function runCampaignRevealJob(jobId) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new Error("Invalid job id");
  }

  const job = await CampaignRevealJob.findById(jobId);
  if (!job) {
    throw new Error("Reveal job not found");
  }

  const userId = String(job.userId);
  const campaignId = String(job.campaignId);
  const revealTypes = normalizeRevealTypes(job.revealTypes);
  const candidateKeyFilter =
    Array.isArray(job.candidateKeys) && job.candidateKeys.length > 0
      ? new Set(job.candidateKeys.map((k) => String(k).trim()).filter(Boolean))
      : null;

  job.status = "running";
  job.processed = 0;
  job.revealedEmailCount = 0;
  job.revealedPhoneCount = 0;
  job.errorMessage = "";
  job.revealTypes = revealTypes;
  await job.save();

  try {
    const allContacts = await loadAllContactsForCampaign(campaignId);
    const contacts = allContacts.filter((c) => {
      if (candidateKeyFilter && !candidateKeyFilter.has(c.candidateKey)) return false;
      return true;
    });

    job.contactProgress = contacts.map((c) => buildContactProgressEntry(c, revealTypes));
    job.total = contacts.length;
    job.markModified("contactProgress");
    await job.save();

    for (let index = 0; index < contacts.length; index += 1) {
      const contact = contacts[index];
      const progress = job.contactProgress[index];
      const linkedin = String(contact.linkedinUrl || "").trim();
      const sessionId = String(contact.sourcingSessionId || "").trim();

      if (!linkedin || !sessionId) {
        progress.detail = "Missing LinkedIn URL or sourcing session";
        if (revealTypes.includes("EMAIL") && progress.emailStatus === "queued") {
          progress.emailStatus = "failed";
        }
        if (revealTypes.includes("PHONE") && progress.phoneStatus === "queued") {
          progress.phoneStatus = "failed";
        }
        progress.updatedAt = new Date();
        job.processed += 1;
        job.markModified("contactProgress");
        await job.save();
        continue;
      }

      const existingEmail = String(contact.email || "").trim();
      const existingPhone = String(contact.phone || "").trim();
      const wantsEmail = revealTypes.includes("EMAIL") && !existingEmail;
      const wantsPhone = revealTypes.includes("PHONE") && !existingPhone;

      if (!wantsEmail && !wantsPhone) {
        progress.detail = "Contact details already on file";
        progress.updatedAt = new Date();
        job.processed += 1;
        job.markModified("contactProgress");
        await job.save();
        continue;
      }

      if (wantsEmail) progress.emailStatus = "running";
      if (wantsPhone) progress.phoneStatus = "running";
      progress.updatedAt = new Date();
      job.markModified("contactProgress");
      await job.save();

      try {
        const revealed = await revealSingleContactItem(
          userId,
          {
            sourcingSessionId: contact.sourcingSessionId,
            linkedin_profile_url: contact.linkedinUrl,
          },
          revealTypes
        );

        let email = existingEmail || revealed.email?.trim() || "";
        let phone = existingPhone || revealed.phone?.trim() || "";

        if (wantsEmail) {
          if (email && !existingEmail) {
            progress.emailStatus = "revealed";
            progress.email = email;
            job.revealedEmailCount += 1;
          } else if (revealed.errors?.some((e) => String(e).includes("EMAIL"))) {
            progress.emailStatus = "not_found";
          } else {
            progress.emailStatus = "not_found";
          }
        }

        if (wantsPhone) {
          if (phone && !existingPhone) {
            progress.phoneStatus = "revealed";
            progress.phone = phone;
            job.revealedPhoneCount += 1;
          } else {
            progress.phoneStatus = "not_found";
          }
        }

        if (email !== existingEmail || phone !== existingPhone) {
          await updateCampaignContactFields(
            campaignId,
            contact.candidateKey,
            email,
            phone
          );
          contact.email = email;
          contact.phone = phone;
        }

        const parts = [];
        if (wantsEmail && progress.emailStatus === "revealed") parts.push("email revealed");
        if (wantsPhone && progress.phoneStatus === "revealed") parts.push("phone revealed");
        if (wantsEmail && progress.emailStatus === "not_found") parts.push("email not found");
        if (wantsPhone && progress.phoneStatus === "not_found") parts.push("phone not found");
        progress.detail = parts.join(" · ") || "No new contact details";
      } catch (itemErr) {
        if (itemErr?.code === "QUOTA_EXCEEDED") {
          if (wantsEmail && progress.emailStatus === "running") {
            progress.emailStatus = "quota_exceeded";
          }
          if (wantsPhone && progress.phoneStatus === "running") {
            progress.phoneStatus = "quota_exceeded";
          }
          progress.detail =
            itemErr?.message || "Unveil quota exceeded for your plan";
          job.status = "quota_exceeded";
          job.errorMessage = progress.detail;
          job.processed += 1;
          progress.updatedAt = new Date();
          job.markModified("contactProgress");
          await job.save();
          await syncCampaignContactsFromUserCache(userId, campaignId);
          return { jobId, status: "quota_exceeded" };
        }

        console.warn(
          `[campaign-reveal-job] contact ${contact.candidateKey}:`,
          itemErr?.message || itemErr
        );
        if (wantsEmail && progress.emailStatus === "running") {
          progress.emailStatus = "failed";
        }
        if (wantsPhone && progress.phoneStatus === "running") {
          progress.phoneStatus = "failed";
        }
        progress.detail =
          itemErr instanceof Error ? itemErr.message : "Unveil failed";
      }

      progress.updatedAt = new Date();
      job.processed += 1;
      job.markModified("contactProgress");
      await job.save();
    }

    await syncCampaignContactsFromUserCache(userId, campaignId);

    if (job.status !== "quota_exceeded") {
      job.status = "completed";
      job.errorMessage = "";
    }
    job.markModified("contactProgress");
    await job.save();
    return { jobId, status: job.status };
  } catch (err) {
    job.status = "failed";
    job.errorMessage = err instanceof Error ? err.message : "Reveal job failed";
    await job.save();
    throw err;
  }
}

module.exports = {
  runCampaignRevealJob,
  buildContactProgressEntry,
  normalizeRevealTypes,
};
