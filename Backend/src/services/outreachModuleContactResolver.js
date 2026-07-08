const mongoose = require("mongoose");
const SavedCandidate = require("../models/SavedCandidate");
const { lookupUserRevealedContacts } = require("./contactRevealService");
const { normalizeToE164 } = require("./whatsappPhoneUtils");

function normalizeEmail(raw) {
  const email = String(raw || "").trim();
  return email.includes("@") ? email : "";
}

function normalizePhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  return normalizeToE164(trimmed) || trimmed;
}

function readContactFromRawDoc(rawDoc) {
  if (rawDoc == null) return { email: "", phone: "", company: "" };
  if (typeof rawDoc !== "object") {
    return { email: "", phone: "", company: "" };
  }
  return {
    email: normalizeEmail(rawDoc.email || rawDoc.workEmail || rawDoc.personalEmail),
    phone: normalizePhone(rawDoc.phone || rawDoc.mobile || rawDoc.phoneNumber),
    company: String(rawDoc.company || rawDoc.currentCompany || "").trim(),
  };
}

/**
 * Resolve email/phone for outreach module candidates from SavedCandidate + reveal cache.
 */
async function resolveContactsForOutreachModuleCampaign(campaignDoc, actorUserId) {
  const candidates = Array.isArray(campaignDoc.candidates) ? campaignDoc.candidates : [];
  if (candidates.length === 0) return [];

  const refIds = candidates
    .map((c) => String(c.candidateRefId || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const savedDocs = refIds.length
    ? await SavedCandidate.find({ _id: { $in: refIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
    : [];
  const savedById = new Map(savedDocs.map((doc) => [String(doc._id), doc]));

  const linkedinUrls = savedDocs
    .map((doc) => String(doc.linkedinProfileUrl || doc.rawDoc?.linkedinProfileUrl || "").trim())
    .filter(Boolean);
  const revealedByUrl =
    linkedinUrls.length > 0
      ? await lookupUserRevealedContacts(actorUserId, linkedinUrls)
      : {};

  const resolved = [];

  for (const candidate of candidates) {
    const candidateRefId = String(candidate.candidateRefId || "").trim();
    const saved = savedById.get(candidateRefId);
    const fromRaw = readContactFromRawDoc(saved?.rawDoc);
    const linkedinUrl = String(
      saved?.linkedinProfileUrl || saved?.rawDoc?.linkedinProfileUrl || ""
    ).trim();
    const revealed = linkedinUrl ? revealedByUrl[linkedinUrl] || {} : {};

    const email = normalizeEmail(fromRaw.email || revealed.email);
    const phone = normalizePhone(fromRaw.phone || revealed.phone);
    const company =
      fromRaw.company ||
      String(saved?.currentCompany || candidate.role || "").trim();

    resolved.push({
      candidateRefId,
      candidateKey: candidateRefId,
      name: String(candidate.name || saved?.name || "").trim(),
      email,
      phone,
      role: String(candidate.role || saved?.role || "").trim(),
      company,
      embeddedCandidateId: String(candidate._id || ""),
    });
  }

  return resolved;
}

module.exports = {
  resolveContactsForOutreachModuleCampaign,
  normalizeEmail,
  normalizePhone,
  readContactFromRawDoc,
};
