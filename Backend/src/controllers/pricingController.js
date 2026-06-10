const PricingPlan = require("../models/PricingPlan");
const PricingPlansMeta = require("../models/PricingPlansMeta");
const PricingPlansConfig = require("../models/PricingPlansConfig");

const DEFAULT_POPULAR_BADGE = "⭐ Most Popular";

const QUOTA_MAX = 1e9;

/** Until admin saves explicit flags, growth/enterprise keep prior product access. */
function legacyPlanProductAccess(planId) {
  const id = String(planId || "").trim().toLowerCase();
  const enabled = id === "growth" || id === "enterprise";
  return {
    campaignsEnabled: enabled,
    integrationsEnabled: enabled,
    outreachesEnabled: enabled,
  };
}

function resolvePlanProductFlag(stored, planId, key) {
  if (typeof stored === "boolean") return stored;
  return legacyPlanProductAccess(planId)[key];
}

function tierUsesOutreachQuotas(tier) {
  return Boolean(tier.campaignsEnabled || tier.outreachesEnabled);
}

/** Accepts number or numeric string (e.g. legacy "300 searches"); returns null if unset/invalid. */
function normalizeQuotaNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    return Math.min(Math.floor(v), QUOTA_MAX);
  }
  if (typeof v === "string") {
    const compact = v.replace(/,/g, "");
    const m = compact.match(/\d+/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, QUOTA_MAX) : null;
  }
  return null;
}

/** Read from DB: legacy strings or numbers → number | null. */
function coerceStoredQuota(v) {
  return normalizeQuotaNumber(v);
}

function quotaDisplayLine(n, kind) {
  const q = normalizeQuotaNumber(n);
  if (q === null) return null;
  switch (kind) {
    case "searches":
      return `${q} searches`;
    case "unlocks":
      return `${q} candidate unlocks`;
    case "emails":
      return `${q} verified emails`;
    case "phones":
      return `${q} phone numbers`;
    case "subUsers":
      if (q === 0) return "No sub-users (owner only)";
      return q === 1 ? "1 sub-user" : `${q} sub-users`;
    case "emailOutreaches":
      return `${q} email outreaches`;
    case "whatsappOutreaches":
      return `${q} WhatsApp outreaches`;
    default:
      return null;
  }
}

function quotaStripSetFromNumbers(defTier) {
  const subLine =
    defTier.maxSubUsers === null || defTier.maxSubUsers === undefined
      ? "Unlimited sub-users"
      : quotaDisplayLine(defTier.maxSubUsers, "subUsers");
  return new Set(
    [
      quotaDisplayLine(defTier.searches, "searches"),
      quotaDisplayLine(defTier.candidateUnlocks, "unlocks"),
      quotaDisplayLine(defTier.verifiedEmails, "emails"),
      quotaDisplayLine(defTier.phoneNumbers, "phones"),
      quotaDisplayLine(defTier.emailOutreaches, "emailOutreaches"),
      quotaDisplayLine(defTier.whatsappOutreaches, "whatsappOutreaches"),
      subLine,
    ].filter(Boolean)
  );
}

function normalizePayload(body) {
  const intro = typeof body?.intro === "string" ? body.intro.trim() : "";
  const tiersIn = Array.isArray(body?.tiers) ? body.tiers : [];
  const tiers = tiersIn.slice(0, 5).map((t, idx) => {
    const id =
      typeof t?.id === "string" && t.id.trim()
        ? t.id.trim().slice(0, 40)
        : `tier-${idx}`;
    const name = typeof t?.name === "string" ? t.name.trim().slice(0, 80) : "Plan";
    const primaryPrice =
      typeof t?.primaryPrice === "string" ? t.primaryPrice.trim().slice(0, 120) : "";
    const secondaryPrice =
      typeof t?.secondaryPrice === "string" ? t.secondaryPrice.trim().slice(0, 160) : "";
    const description =
      typeof t?.description === "string" ? t.description.trim().slice(0, 2000) : "";
    const searches = normalizeQuotaNumber(t?.searches);
    const candidateUnlocks = normalizeQuotaNumber(t?.candidateUnlocks);
    const verifiedEmails = normalizeQuotaNumber(t?.verifiedEmails);
    const phoneNumbers = normalizeQuotaNumber(t?.phoneNumbers);
    const emailOutreaches = normalizeQuotaNumber(t?.emailOutreaches);
    const whatsappOutreaches = normalizeQuotaNumber(t?.whatsappOutreaches);
    const maxSubUsers =
      t?.maxSubUsers === null || t?.maxSubUsers === undefined || t?.maxSubUsers === ""
        ? null
        : normalizeQuotaNumber(t?.maxSubUsers);
    const features = Array.isArray(t?.features)
      ? t.features
          .map((f) => String(f ?? "").trim())
          .filter(Boolean)
          .slice(0, 40)
      : [];
    const isPopular = Boolean(t?.isPopular);
    const popularBadge =
      typeof t?.popularBadge === "string"
        ? t.popularBadge.trim().slice(0, 80)
        : DEFAULT_POPULAR_BADGE;
    return {
      id,
      name,
      primaryPrice,
      secondaryPrice,
      description,
      searches,
      candidateUnlocks,
      verifiedEmails,
      phoneNumbers,
      emailOutreaches,
      whatsappOutreaches,
      maxSubUsers,
      features,
      campaignsEnabled: Boolean(t?.campaignsEnabled),
      integrationsEnabled: Boolean(t?.integrationsEnabled),
      outreachesEnabled: Boolean(t?.outreachesEnabled),
      isPopular,
      popularBadge,
    };
  });
  return { intro, tiers };
}

function validatePlansPayload(data) {
  if (!data.intro) {
    return "intro is required";
  }
  if (!Array.isArray(data.tiers) || data.tiers.length === 0) {
    return "At least one pricing tier is required";
  }
  for (let i = 0; i < data.tiers.length; i += 1) {
    const t = data.tiers[i];
    if (!t.name) return `Tier ${i + 1}: name is required`;
    if (!t.primaryPrice) return `Tier ${i + 1}: primary price is required`;
  }
  return null;
}

function enrichPlansData(raw) {
  const intro =
    typeof raw.intro === "string" && raw.intro.trim() ? raw.intro.trim() : "";
  const srcTiers = Array.isArray(raw.tiers) ? raw.tiers : [];

  const tiers = srcTiers.map((tier) => {
    const merged = { ...tier };
    merged.campaignsEnabled = resolvePlanProductFlag(
      tier.campaignsEnabled,
      tier.id,
      "campaignsEnabled"
    );
    merged.integrationsEnabled = resolvePlanProductFlag(
      tier.integrationsEnabled,
      tier.id,
      "integrationsEnabled"
    );
    merged.outreachesEnabled = resolvePlanProductFlag(
      tier.outreachesEnabled,
      tier.id,
      "outreachesEnabled"
    );

    const pick = (key) => normalizeQuotaNumber(tier[key]);
    merged.searches = pick("searches");
    merged.candidateUnlocks = pick("candidateUnlocks");
    merged.verifiedEmails = pick("verifiedEmails");
    merged.phoneNumbers = pick("phoneNumbers");
    if (tierUsesOutreachQuotas(merged)) {
      merged.emailOutreaches = pick("emailOutreaches");
      merged.whatsappOutreaches = pick("whatsappOutreaches");
    } else {
      merged.emailOutreaches = null;
      merged.whatsappOutreaches = null;
    }
    const pickSubUsers = () => {
      if (Object.prototype.hasOwnProperty.call(tier, "maxSubUsers") && tier.maxSubUsers === null) {
        return null;
      }
      const n = normalizeQuotaNumber(tier.maxSubUsers);
      return n !== null ? n : 0;
    };
    merged.maxSubUsers = pickSubUsers();

    const strip = quotaStripSetFromNumbers(merged);
    let feats = Array.isArray(tier.features)
      ? tier.features.map((f) => String(f).trim()).filter(Boolean)
      : [];
    feats = feats.filter((f) => !strip.has(f));
    merged.features = feats.slice(0, 40);
    return merged;
  });

  return { intro, tiers };
}

function iso(d) {
  if (!d) return undefined;
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
}

function planDocumentToTierPayload(doc) {
  if (!doc) return null;
  const o = doc;
  return {
    id: o.planId,
    name: o.name || "Plan",
    primaryPrice: o.primaryPrice || "",
    secondaryPrice: o.secondaryPrice || "",
    description: o.description || "",
    searches: coerceStoredQuota(o.searches),
    candidateUnlocks: coerceStoredQuota(o.candidateUnlocks),
    verifiedEmails: coerceStoredQuota(o.verifiedEmails),
    phoneNumbers: coerceStoredQuota(o.phoneNumbers),
    emailOutreaches: coerceStoredQuota(o.emailOutreaches),
    whatsappOutreaches: coerceStoredQuota(o.whatsappOutreaches),
    maxSubUsers:
      o.maxSubUsers === null
        ? null
        : o.maxSubUsers === undefined
          ? undefined
          : coerceStoredQuota(o.maxSubUsers),
    features: Array.isArray(o.features) ? o.features : [],
    campaignsEnabled: resolvePlanProductFlag(o.campaignsEnabled, o.planId, "campaignsEnabled"),
    integrationsEnabled: resolvePlanProductFlag(
      o.integrationsEnabled,
      o.planId,
      "integrationsEnabled"
    ),
    outreachesEnabled: resolvePlanProductFlag(o.outreachesEnabled, o.planId, "outreachesEnabled"),
    isPopular: Boolean(o.isPopular),
    popularBadge: o.popularBadge || "⭐ Most Popular",
    lastUpdated: iso(o.updatedAt),
  };
}

async function upsertPricingPlanFromNormalized(t, sortOrder) {
  await PricingPlan.findOneAndUpdate(
    { planId: t.id },
    {
      $set: {
        planId: t.id,
        sortOrder,
        name: t.name,
        primaryPrice: t.primaryPrice,
        secondaryPrice: t.secondaryPrice,
        description: t.description,
        searches: t.searches,
        candidateUnlocks: t.candidateUnlocks,
        verifiedEmails: t.verifiedEmails,
        phoneNumbers: t.phoneNumbers,
        emailOutreaches: t.emailOutreaches,
        whatsappOutreaches: t.whatsappOutreaches,
        maxSubUsers: t.maxSubUsers,
        features: t.features,
        campaignsEnabled: Boolean(t.campaignsEnabled),
        integrationsEnabled: Boolean(t.integrationsEnabled),
        outreachesEnabled: Boolean(t.outreachesEnabled),
        isPopular: t.isPopular,
        popularBadge: t.popularBadge,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
}

/** Legacy: one Mixed document; migrate once to per-plan docs + meta. */
async function migrateFromLegacyIfNeeded() {
  const legacy = await PricingPlansConfig.findOne({ key: "singleton" }).lean();
  if (!legacy?.data || typeof legacy.data !== "object") return;

  const raw = legacy.data;
  const tiersIn = Array.isArray(raw.tiers) && raw.tiers.length > 0 ? raw.tiers : [];
  const intro = typeof raw.intro === "string" && raw.intro.trim() ? raw.intro.trim() : "";
  if (!intro && tiersIn.length === 0) return;

  const normalized = normalizePayload({ intro, tiers: tiersIn });

  await PricingPlansMeta.findOneAndUpdate(
    { key: "singleton" },
    { $set: { key: "singleton", intro: normalized.intro } },
    { upsert: true, returnDocument: "after" }
  );

  for (let i = 0; i < normalized.tiers.length; i += 1) {
    await upsertPricingPlanFromNormalized(normalized.tiers[i], i);
  }

  await PricingPlansConfig.deleteOne({ key: "singleton" });
}

async function ensureMetaIfPlansExist() {
  const n = await PricingPlan.countDocuments();
  if (n === 0) return;
  const meta = await PricingPlansMeta.findOne({ key: "singleton" }).lean();
  if (!meta) {
    await PricingPlansMeta.create({
      key: "singleton",
      intro: "",
    });
  }
}

async function loadPlansFromDatabase() {
  const metaDoc = await PricingPlansMeta.findOne({ key: "singleton" }).lean();
  const planDocs = await PricingPlan.find().sort({ sortOrder: 1 }).lean();

  const intro =
    typeof metaDoc?.intro === "string" && metaDoc.intro.trim() ? metaDoc.intro.trim() : "";

  const tiers = planDocs.map(planDocumentToTierPayload).filter(Boolean);
  const enriched = enrichPlansData({ intro, tiers });

  const introUpdatedAt = iso(metaDoc?.updatedAt);
  let plansSectionUpdatedAt = introUpdatedAt;
  for (const doc of planDocs) {
    const lu = iso(doc.updatedAt);
    if (lu && (!plansSectionUpdatedAt || lu > plansSectionUpdatedAt)) {
      plansSectionUpdatedAt = lu;
    }
  }

  return {
    plans: enriched,
    fromDatabase: planDocs.length > 0,
    introUpdatedAt,
    plansSectionUpdatedAt,
  };
}

/**
 * GET /api/pricing-plans — public (for user dashboard)
 */
const getPricingPlans = async (_req, res) => {
  try {
    await migrateFromLegacyIfNeeded();
    await ensureMetaIfPlansExist();

    const payload = await loadPlansFromDatabase();
    return res.status(200).json({
      success: true,
      plans: payload.plans,
      fromDatabase: payload.fromDatabase,
      introUpdatedAt: payload.introUpdatedAt,
      plansSectionUpdatedAt: payload.plansSectionUpdatedAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load pricing plans",
    });
  }
};

/**
 * PUT /api/pricing-plans — admin only
 * Body: { intro, tiers: [...] }
 * Quota fields (searches, candidateUnlocks, verifiedEmails, phoneNumbers, emailOutreaches, whatsappOutreaches, maxSubUsers) are stored as numbers only; maxSubUsers null = unlimited.
 */
const updatePricingPlans = async (req, res) => {
  try {
    const normalized = normalizePayload(req.body);
    const err = validatePlansPayload(normalized);
    if (err) {
      return res.status(400).json({ success: false, message: err });
    }

    await PricingPlansMeta.findOneAndUpdate(
      { key: "singleton" },
      { $set: { key: "singleton", intro: normalized.intro } },
      { upsert: true, returnDocument: "after" }
    );

    const validIds = normalized.tiers.map((t) => t.id);
    for (let i = 0; i < normalized.tiers.length; i += 1) {
      await upsertPricingPlanFromNormalized(normalized.tiers[i], i);
    }

    await PricingPlan.deleteMany({ planId: { $nin: validIds } });

    const payload = await loadPlansFromDatabase();
    return res.status(200).json({
      success: true,
      plans: payload.plans,
      introUpdatedAt: payload.introUpdatedAt,
      plansSectionUpdatedAt: payload.plansSectionUpdatedAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save pricing plans",
    });
  }
};

async function getEnrichedTiers() {
  await migrateFromLegacyIfNeeded();
  await ensureMetaIfPlansExist();
  const payload = await loadPlansFromDatabase();
  return payload.plans.tiers;
}

module.exports = {
  getPricingPlans,
  updatePricingPlans,
  getEnrichedTiers,
};
