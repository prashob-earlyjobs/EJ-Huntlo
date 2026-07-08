const mongoose = require("mongoose");
const SavedCandidate = require("../models/SavedCandidate");
const { userIdFilterForActor } = require("../utils/orgScope");
const { lookupUserRevealedContacts } = require("./contactRevealService");
const {
  normalizeEmail,
  normalizePhone,
  readContactFromRawDoc,
} = require("./outreachModuleContactResolver");

function userOid(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

async function poolAccessFilter(actorUserId) {
  const orgFilter = await userIdFilterForActor(actorUserId);
  if (orgFilter) return orgFilter;
  if (!mongoose.Types.ObjectId.isValid(String(actorUserId))) return null;
  return { userId: userOid(actorUserId) };
}

function formatPoolCandidate(doc, revealedByUrl = {}) {
  const fromRaw = readContactFromRawDoc(doc?.rawDoc);
  const linkedinUrl = String(doc.linkedinProfileUrl || doc.rawDoc?.linkedinProfileUrl || "").trim();
  const revealed = linkedinUrl ? revealedByUrl[linkedinUrl] || {} : {};
  const email = normalizeEmail(fromRaw.email || revealed.email);
  const phone = normalizePhone(fromRaw.phone || revealed.phone);

  return {
    id: String(doc._id),
    name: doc.name || "",
    role: doc.role || "",
    email: email || "-",
    phone: phone || "-",
    location: doc.location || "",
    experience: doc.experience || "",
    matchScore:
      doc.finalScore != null && Number.isFinite(Number(doc.finalScore))
        ? Math.round(Number(doc.finalScore))
        : 0,
    status: doc.status || "Saved",
  };
}

function csvCandidateId(email, phone, name, index) {
  const e = String(email || "").trim().toLowerCase();
  if (e) return `csv-email:${e}`;
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits) return `csv-phone:${digits}`;
  const slug = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `csv-row:${index}:${slug || "contact"}`;
}

/**
 * Read-only candidate pool for the outreach module UI (saved talent pool).
 * Does not modify SavedCandidate or existing candidate APIs.
 */
async function listOutreachModuleCandidatePool(actorUserId, options = {}) {
  const access = await poolAccessFilter(actorUserId);
  if (!access) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const search = String(options.search || "").trim().toLowerCase();
  const location = String(options.location || "").trim();
  const experience = String(options.experience || "").trim();

  const docs = await SavedCandidate.find(access)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(500)
    .lean();

  const linkedinUrls = docs
    .map((doc) => String(doc.linkedinProfileUrl || doc.rawDoc?.linkedinProfileUrl || "").trim())
    .filter(Boolean);
  const revealedByUrl =
    linkedinUrls.length > 0
      ? await lookupUserRevealedContacts(actorUserId, linkedinUrls)
      : {};

  let candidates = docs.map((doc) => formatPoolCandidate(doc, revealedByUrl));

  if (search) {
    candidates = candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.role.toLowerCase().includes(search)
    );
  }
  if (location) {
    candidates = candidates.filter((c) => c.location === location);
  }
  if (experience) {
    candidates = candidates.filter((c) => c.experience.startsWith(experience));
  }

  return { candidates };
}

/**
 * Upsert saved candidates from outreach CSV rows and return pool-shaped records.
 */
async function importOutreachModuleCandidatesFromCsv(actorUserId, contacts = []) {
  const access = await poolAccessFilter(actorUserId);
  if (!access) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    const err = new Error("At least one contact is required");
    err.statusCode = 400;
    throw err;
  }

  if (contacts.length > 500) {
    const err = new Error("Maximum 500 contacts per CSV import");
    err.statusCode = 400;
    throw err;
  }

  const userObjectId = userOid(actorUserId);

  const saved = [];

  for (let i = 0; i < contacts.length; i += 1) {
    const row = contacts[i] || {};
    const name = String(row.name || "").trim();
    const email = String(row.email || "").trim();
    const phone = String(row.phone || "").trim();
    const role = String(row.role || "").trim();
    const company = String(row.company || "").trim();
    const location = String(row.location || "").trim();

    if (!name || !email || !phone || !role || !company) {
      const err = new Error(`Row ${i + 1}: name, email, phone, role, and company are required`);
      err.statusCode = 400;
      throw err;
    }

    const candidateId = csvCandidateId(email, phone, name, i);
    const doc = await SavedCandidate.findOneAndUpdate(
      {
        ...access,
        candidateId,
      },
      {
        $set: {
          userId: userObjectId,
          sourcingSessionId: "outreach-csv",
          candidateId,
          name,
          role,
          currentCompany: company,
          location,
          experience: "",
          status: "Imported",
          rawDoc: {
            email,
            phone,
            company,
            importSource: "outreach_csv",
          },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true }
    );

    const formatted = formatPoolCandidate(doc, {});
    saved.push({
      ...formatted,
      email: formatted.email !== "-" ? formatted.email : email,
      phone: formatted.phone !== "-" ? formatted.phone : phone,
    });
  }

  return { candidates: saved, imported: saved.length };
}

module.exports = {
  listOutreachModuleCandidatePool,
  importOutreachModuleCandidatesFromCsv,
};
