const mongoose = require("mongoose");
const PeopleScoutLookup = require("../models/PeopleScoutLookup");
const PeopleScoutRevealedContact = require("../models/PeopleScoutRevealedContact");
const { scoutPeopleLookup, scoutPeopleRevealContact } = require("../services/futureJobs");
const {
  looksValidContact,
  extractRevealValues,
  normalizeLinkedinProfileUrl,
} = require("../utils/contactReveal");
const { logApi, safeJsonPreview } = require("../utils/logger");
const { incrementUserUsage } = require("../utils/incrementUserUsage");

function bumpScoutRevealUsage(userId, revealType) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) return;
  const uid = String(userId);
  const p =
    revealType === "EMAIL"
      ? incrementUserUsage(uid, "emailUnveils")
      : revealType === "PHONE"
        ? incrementUserUsage(uid, "mobileUnveils")
        : Promise.resolve();
  void p.catch(() => {});
}

function clampInt(n, min, max, fallback) {
  const v = parseInt(String(n), 10);
  if (Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function extractSummaryFromFjProfile(profile) {
  if (!profile || typeof profile !== "object") return null;
  const current =
    Array.isArray(profile.current_employers) && profile.current_employers.length > 0
      ? profile.current_employers[0]
      : null;
  const fjProfileId = profile._id != null ? String(profile._id) : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const title = typeof profile.title === "string" ? profile.title.trim() : "";
  const headline = typeof profile.headline === "string" ? profile.headline.trim() : "";
  const location = typeof profile.location === "string" ? profile.location.trim() : "";
  const company = current && typeof current.employer_name === "string"
    ? current.employer_name.trim()
    : "";
  const role =
    current && typeof current.employee_title === "string"
      ? current.employee_title.trim()
      : title;
  const linkedinFlagshipUrl =
    typeof profile.linkedin_flagship_url === "string"
      ? profile.linkedin_flagship_url.trim()
      : "";
  const linkedinProfileUrl =
    typeof profile.linkedin_profile_url === "string"
      ? profile.linkedin_profile_url.trim()
      : "";
  const profilePictureUrl =
    typeof profile.profile_picture_url === "string"
      ? profile.profile_picture_url.trim()
      : "";
  const numConnections =
    typeof profile.num_of_connections === "number" ? profile.num_of_connections : null;

  return {
    fjProfileId,
    name,
    title,
    headline,
    location,
    company,
    role,
    linkedinFlagshipUrl,
    linkedinProfileUrl,
    profilePictureUrl,
    numConnections,
  };
}

function buildFjLookupPayload(body) {
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const linkedin_url =
    typeof body?.linkedin_url === "string" ? body.linkedin_url.trim() : "";
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (email && linkedin_url) {
    return { error: "Send only one of email, linkedin_url, or query" };
  }

  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Invalid email format" };
    }
    return {
      payload: { email },
      queryType: "email",
      queryLabel: email.toLowerCase(),
    };
  }

  if (linkedin_url) {
    const lower = linkedin_url.toLowerCase();
    if (!lower.includes("linkedin.com") && !lower.includes("lnkd.in")) {
      return { error: "linkedin_url must be a LinkedIn URL" };
    }
    return {
      payload: { linkedin_url },
      queryType: "linkedin_url",
      queryLabel: linkedin_url,
    };
  }

  if (query) {
    const lower = query.toLowerCase();
    if (lower.includes("linkedin.com") || lower.includes("lnkd.in")) {
      return {
        payload: { linkedin_url: query },
        queryType: "linkedin_url",
        queryLabel: query,
      };
    }
    if (query.includes("@")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
        return { error: "Invalid email in query" };
      }
      return {
        payload: { email: query },
        queryType: "email",
        queryLabel: query.toLowerCase(),
      };
    }
    return { error: "Enter a valid email or LinkedIn profile URL" };
  }

  return { error: "Provide email, linkedin_url, or query" };
}

function pickLinkedinKeyForCache(lookup) {
  const prof =
    lookup.fjResponseData &&
    lookup.fjResponseData.profile &&
    typeof lookup.fjResponseData.profile === "object"
      ? lookup.fjResponseData.profile
      : null;
  const fromProfile =
    prof && typeof prof.linkedin_profile_url === "string"
      ? prof.linkedin_profile_url.trim()
      : "";
  const stored = normalizeLinkedinProfileUrl(lookup.linkedinProfileUrl);
  const flagship = normalizeLinkedinProfileUrl(lookup.linkedinFlagshipUrl);
  return normalizeLinkedinProfileUrl(fromProfile || stored || flagship);
}

function extractContactFromStoredProfile(profile, revealType) {
  if (!profile || typeof profile !== "object") return "";
  if (revealType === "EMAIL") {
    const e = profile.email;
    if (typeof e === "string" && looksValidContact(e, "EMAIL")) return e.trim();
    return "";
  }
  const candidates = [profile.phone, profile.mobile, profile.phone_number, profile.mobile_phone];
  for (const c of candidates) {
    if (typeof c === "string" && looksValidContact(c, "PHONE")) return c.trim();
  }
  return "";
}

/**
 * POST /api/candidates/scout-people/reveal-contact
 * Body: { lookupId, revealType: "PHONE" | "EMAIL" }
 */
const revealPeopleScoutContact = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const lookupId = String(req.body?.lookupId || "").trim();
    const revealType = String(req.body?.revealType || "").trim().toUpperCase();

    if (!lookupId || !mongoose.Types.ObjectId.isValid(lookupId)) {
      logApi("candidates/scout-people/reveal-contact", "bad request", {
        reason: "invalid_lookupId",
        userId,
      });
      return res.status(400).json({
        success: false,
        message: "Valid lookupId is required",
      });
    }

    if (revealType !== "PHONE" && revealType !== "EMAIL") {
      logApi("candidates/scout-people/reveal-contact", "bad request", {
        reason: "invalid_revealType",
        userId,
        revealType,
      });
      return res.status(400).json({
        success: false,
        message: "revealType must be PHONE or EMAIL",
      });
    }

    const lookup = await PeopleScoutLookup.findOne({
      _id: new mongoose.Types.ObjectId(lookupId),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!lookup) {
      logApi("candidates/scout-people/reveal-contact", "lookup not found", {
        userId,
        lookupId,
      });
      return res.status(404).json({
        success: false,
        message: "People Scout lookup not found",
      });
    }

    const linkedinKey = pickLinkedinKeyForCache(lookup);
    if (!linkedinKey) {
      logApi("candidates/scout-people/reveal-contact", "missing linkedin key", {
        userId,
        lookupId,
        revealType,
      });
      return res.status(400).json({
        success: false,
        message: "LinkedIn profile URL is missing for this lookup",
      });
    }

    logApi("candidates/scout-people/reveal-contact", "incoming", {
      userId,
      lookupId,
      revealType,
      scoutId: String(lookup.scoutId || ""),
      savedQueryType: lookup.queryType,
      linkedinKeyLen: linkedinKey.length,
    });

    const cached = await PeopleScoutRevealedContact.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      linkedinProfileUrl: linkedinKey,
      revealType,
    }).lean();

    const cachedValid =
      cached && Array.isArray(cached.values)
        ? cached.values
            .map((v) => String(v).trim())
            .filter((v) => looksValidContact(v, revealType))
        : [];

    if (cachedValid.length > 0) {
      logApi("candidates/scout-people/reveal-contact", "cache hit", {
        userId,
        lookupId,
        revealType,
        count: cachedValid.length,
      });
      bumpScoutRevealUsage(userId, revealType);
      return res.status(200).json({
        success: true,
        source: "cache",
        revealType,
        values: cachedValid,
        value: cachedValid[0] || "",
      });
    }

    const profile =
      lookup.fjResponseData &&
      lookup.fjResponseData.profile &&
      typeof lookup.fjResponseData.profile === "object"
        ? lookup.fjResponseData.profile
        : null;

    const fromProfile = extractContactFromStoredProfile(profile, revealType);
    if (fromProfile) {
      await PeopleScoutRevealedContact.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          linkedinProfileUrl: linkedinKey,
          revealType,
        },
        {
          $set: {
            values: [fromProfile],
            status: "profile_snapshot",
            scoutIdLastUsed: String(lookup.scoutId || ""),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      logApi("candidates/scout-people/reveal-contact", "profile snapshot", {
        userId,
        lookupId,
        revealType,
      });

      bumpScoutRevealUsage(userId, revealType);
      return res.status(200).json({
        success: true,
        source: "profile_snapshot",
        revealType,
        values: [fromProfile],
        value: fromProfile,
      });
    }

    const fj = await scoutPeopleRevealContact(linkedinKey, revealType);

    logApi("candidates/scout-people/reveal-contact", "futurejobs raw response", {
      userId,
      lookupId,
      revealType,
      linkedinKeyLen: linkedinKey.length,
      fjJson: safeJsonPreview(fj, 12000),
    });

    const values = extractRevealValues(fj, revealType);
    const upstreamMessage =
      typeof fj?.message === "string" && fj.message.trim() ? fj.message.trim() : "";

    if (values.length > 0) {
      await PeopleScoutRevealedContact.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          linkedinProfileUrl: linkedinKey,
          revealType,
        },
        {
          $set: {
            status: typeof fj?.status === "string" ? fj.status : "",
            values,
            scoutIdLastUsed: String(lookup.scoutId || ""),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    logApi("candidates/scout-people/reveal-contact", "revealed via futurejobs", {
      userId,
      lookupId,
      revealType,
      valueCount: values.length,
      upstreamMessage: upstreamMessage || undefined,
      cachedToDb: values.length > 0,
    });

    bumpScoutRevealUsage(userId, revealType);
    return res.status(200).json({
      success: true,
      source: "futurejobs",
      revealType,
      values,
      value: values[0] || "",
      upstreamMessage: upstreamMessage || undefined,
      futureJobs: fj,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/scout-people/reveal-contact", "error", {
      status,
      message: error.message,
      detailsPreview: error.details ? safeJsonPreview(error.details, 500) : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to reveal contact",
      details: error.details,
    });
  }
};

/**
 * POST /api/candidates/scout-people/lookup
 */
const lookupPeopleScout = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const parsed = buildFjLookupPayload(req.body || {});
    if (parsed.error) {
      logApi("candidates/scout-people/lookup", "validation failed", {
        userId,
        message: parsed.error,
      });
      return res.status(400).json({
        success: false,
        message: parsed.error,
      });
    }

    logApi("candidates/scout-people/lookup", "incoming", {
      userId,
      queryType: parsed.queryType,
      queryLabelLen: String(parsed.queryLabel || "").length,
    });

    const fj = await scoutPeopleLookup(parsed.payload);
    const d = fj?.data && typeof fj.data === "object" ? fj.data : null;
    const profile = d?.profile;
    const scoutId = d?.scoutId != null ? String(d.scoutId) : "";
    const summary = extractSummaryFromFjProfile(profile);

    const doc = await PeopleScoutLookup.create({
      userId: new mongoose.Types.ObjectId(userId),
      queryType: parsed.queryType,
      queryLabel: parsed.queryLabel,
      scoutId,
      fjProfileId: summary?.fjProfileId || "",
      name: summary?.name || "",
      title: summary?.title || "",
      headline: summary?.headline || "",
      location: summary?.location || "",
      company: summary?.company || "",
      role: summary?.role || "",
      linkedinFlagshipUrl: summary?.linkedinFlagshipUrl || "",
      linkedinProfileUrl: summary?.linkedinProfileUrl || "",
      profilePictureUrl: summary?.profilePictureUrl || "",
      numOfConnections: summary?.numConnections ?? null,
      fjStatus: typeof fj?.status === "string" ? fj.status : "",
      fjMessage: typeof fj?.message === "string" ? fj.message : "",
      fjResponseData: d,
    });

    logApi("candidates/scout-people/lookup", "ok", {
      userId,
      lookupId: doc._id.toString(),
      queryType: parsed.queryType,
      scoutId,
      hasProfile: Boolean(profile),
      fjStatus: typeof fj?.status === "string" ? fj.status : "",
    });

    void incrementUserUsage(String(userId), "linkedinLookups").catch(() => {});

    return res.status(200).json({
      success: true,
      lookupId: doc._id.toString(),
      futureJobs: fj,
      summary: summary
        ? {
            ...summary,
            scoutId,
          }
        : { scoutId },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    logApi("candidates/scout-people/lookup", "error", {
      userId: req.auth?.userId,
      status,
      message: error.message,
      detailsPreview: error.details ? safeJsonPreview(error.details, 500) : undefined,
    });
    return res.status(status).json({
      success: false,
      message: error.message || "People Scout lookup failed",
      details: error.details,
    });
  }
};

/**
 * GET /api/candidates/scout-people/recent?limit=20
 */
const listRecentPeopleScout = async (req, res) => {
  const userId = req.auth?.userId;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const limit = clampInt(req.query.limit, 1, 50, 20);

    logApi("candidates/scout-people/recent", "incoming", { userId, limit });

    const rows = await PeopleScoutLookup.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    logApi("candidates/scout-people/recent", "ok", {
      userId,
      limit,
      count: rows.length,
    });

    return res.status(200).json({
      success: true,
      lookups: rows.map((r) => ({
        id: r._id.toString(),
        queryType: r.queryType,
        queryLabel: r.queryLabel,
        scoutId: r.scoutId,
        name: r.name,
        role: r.role || r.title,
        company: r.company,
        location: r.location,
        headline: r.headline,
        linkedinUrl: r.linkedinFlagshipUrl || r.linkedinProfileUrl || "",
        thumbnailUrl: r.profilePictureUrl || "",
        createdAt: r.createdAt,
        fjStatus: r.fjStatus,
        fjMessage: r.fjMessage,
        profile:
          r.fjResponseData &&
          r.fjResponseData.profile &&
          typeof r.fjResponseData.profile === "object"
            ? r.fjResponseData.profile
            : null,
      })),
    });
  } catch (error) {
    logApi("candidates/scout-people/recent", "error", {
      userId: req.auth?.userId,
      message: error.message,
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list People Scout lookups",
    });
  }
};

module.exports = {
  lookupPeopleScout,
  listRecentPeopleScout,
  revealPeopleScoutContact,
};
