const mongoose = require("mongoose");
const CampaignRevealJob = require("../models/CampaignRevealJob");
const { revealSingleContactItem } = require("./bulkRevealService");
const { getCampaign, syncCampaignContactsFromUserCache } = require("./campaignService");
const {
  loadAllContactsForCampaign,
  updateCampaignContactFields,
} = require("./campaignContactService");

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
    const allContacts = await loadAllContactsForCampaign(campaignId);
    const contacts = allContacts.filter((c) => {
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

        const existingEmail = String(contact.email || "").trim();
        const existingPhone = String(contact.phone || "").trim();
        const email = existingEmail || revealed.email?.trim() || "";
        const phone = existingPhone || revealed.phone?.trim() || "";

        if (email !== existingEmail || phone !== existingPhone) {
          await updateCampaignContactFields(
            campaignId,
            contact.candidateKey,
            email,
            phone
          );
        }

        if (email && !existingEmail) job.revealedEmailCount += 1;
        if (phone && !existingPhone) job.revealedPhoneCount += 1;
      } catch (itemErr) {
        console.warn(
          `[campaign-reveal-job] contact ${contact.candidateKey}:`,
          itemErr?.message || itemErr
        );
      }

      job.processed += 1;
      if (job.processed % 5 === 0 || job.processed === job.total) {
        await job.save();
      }
    }

    await syncCampaignContactsFromUserCache(userId, campaignId);

    job.status = "completed";
    job.errorMessage = "";
    await job.save();
    return { jobId, status: "completed" };
  } catch (err) {
    job.status = "failed";
    job.errorMessage = err instanceof Error ? err.message : "Reveal job failed";
    await job.save();
    throw err;
  }
}

module.exports = {
  runCampaignRevealJob,
};
