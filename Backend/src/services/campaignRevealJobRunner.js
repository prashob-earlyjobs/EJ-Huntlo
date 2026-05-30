const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignRevealJob = require("../models/CampaignRevealJob");
const { revealSingleContactItem } = require("./bulkRevealService");
const { getCampaign, syncCampaignContactsFromUserCache } = require("./campaignService");

function userOid(userId) {
  return new mongoose.Types.ObjectId(userId);
}

async function updateCampaignContactFields(userId, campaignId, candidateKey, email, phone) {
  await Campaign.updateOne(
    {
      _id: new mongoose.Types.ObjectId(campaignId),
      userId: userOid(userId),
      "contacts.candidateKey": candidateKey,
    },
    {
      $set: {
        "contacts.$.email": String(email || "").trim(),
        "contacts.$.phone": String(phone || "").trim(),
      },
    }
  );
}

/**
 * Runs in a child process — reveals contacts and writes email/phone onto the campaign.
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
  const candidateKeyFilter =
    Array.isArray(job.candidateKeys) && job.candidateKeys.length > 0
      ? new Set(job.candidateKeys.map((k) => String(k).trim()).filter(Boolean))
      : null;

  job.status = "running";
  job.processed = 0;
  job.revealedEmailCount = 0;
  job.revealedPhoneCount = 0;
  job.errorMessage = "";
  await job.save();

  try {
    const campaign = await getCampaign(userId, campaignId);
    const contacts = (campaign.contacts || []).filter((c) => {
      if (candidateKeyFilter && !candidateKeyFilter.has(c.candidateKey)) return false;
      const linkedin = String(c.linkedinUrl || "").trim();
      const sessionId = String(c.sourcingSessionId || "").trim();
      if (!linkedin || !sessionId) return false;
      const needsEmail = !String(c.email || "").trim();
      const needsPhone = !String(c.phone || "").trim();
      return needsEmail || needsPhone;
    });

    job.total = contacts.length;
    await job.save();

    for (const contact of contacts) {
      try {
        const revealed = await revealSingleContactItem(userId, {
          sourcingSessionId: contact.sourcingSessionId,
          linkedin_profile_url: contact.linkedinUrl,
        });

        // Keep manual overrides — only fill empty email/phone from reveal API.
        const existingEmail = String(contact.email || "").trim();
        const existingPhone = String(contact.phone || "").trim();
        const email =
          existingEmail || revealed.email?.trim() || "";
        const phone =
          existingPhone || revealed.phone?.trim() || "";

        if (email !== existingEmail || phone !== existingPhone) {
          await updateCampaignContactFields(
            userId,
            campaignId,
            contact.candidateKey,
            email,
            phone
          );
        }

        if (email) job.revealedEmailCount += 1;
        if (phone) job.revealedPhoneCount += 1;

        if (revealed.errors?.length) {
          console.warn("[campaign-reveal-job] reveal errors", {
            jobId,
            candidateKey: contact.candidateKey,
            linkedinUrl: contact.linkedinUrl,
            errors: revealed.errors,
          });
        }
      } catch (error) {
        if (error?.code === "QUOTA_EXCEEDED") {
          job.status = "quota_exceeded";
          job.errorMessage = error.message || "Plan quota exceeded";
          job.processed += 1;
          await job.save();
          return job.toObject();
        }
        console.error("[campaign-reveal-job] contact error", {
          jobId,
          candidateKey: contact.candidateKey,
          message: error.message,
        });
      }

      job.processed += 1;
      if (job.processed % 3 === 0 || job.processed === job.total) {
        await job.save();
      }
    }

    await syncCampaignContactsFromUserCache(userId, campaignId);

    job.status = "completed";
    await job.save();
    return job.toObject();
  } catch (error) {
    job.status = "failed";
    job.errorMessage = error.message || "Reveal job failed";
    await job.save();
    throw error;
  }
}

module.exports = { runCampaignRevealJob };
