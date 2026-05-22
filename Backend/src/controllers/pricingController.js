const PricingPlan = require("../models/PricingPlan");
const PricingPlansMeta = require("../models/PricingPlansMeta");
const PricingPlansConfig = require("../models/PricingPlansConfig");

const DEFAULT_PRICING_PLANS = {
  intro:
    "Transparent limits in INR and USD. Upgrade when your outbound volume grows—no surprise overages on core allowances within each tier.",
  tiers: [
    {
      id: "trial",
      name: "Trial",
      primaryPrice: "Free trial",
      secondaryPrice: "",
      description:
        "Try Huntlo with limited searches and unlocks. Upgrade to Starter or Growth when you are ready.",
      searches: 50,
      candidateUnlocks: 25,
      verifiedEmails: 25,
      phoneNumbers: 10,
      maxSubUsers: 0,
      features: [
        "AI candidate search",
        "Filter drawer & session results",
        "Email outreach (limited)",
        "Upgrade anytime",
      ],
      isPopular: false,
      popularBadge: "⭐ Most Popular",
    },
    {
      id: "starter",
      name: "Starter",
      primaryPrice: "₹4,999/month",
      secondaryPrice: "(or $99/month)",
      description:
        "For solo recruiters and lean hiring teams starting with AI-powered sourcing and outreach.",
      searches: 300,
      candidateUnlocks: 100,
      verifiedEmails: 100,
      phoneNumbers: 100,
      maxSubUsers: 1,
      features: [
        "100 outreach credits",
        "AI sourcing workflows",
        "Email outreach",
        "Chrome extension",
        "Email + chat support",
      ],
      isPopular: false,
      popularBadge: "⭐ Most Popular",
    },
    {
      id: "growth",
      name: "Growth",
      primaryPrice: "₹19,999/month",
      secondaryPrice: "(or $399/month)",
      description:
        "For recruiting teams running active outbound hiring campaigns across multiple roles.",
      searches: 1500,
      candidateUnlocks: 700,
      verifiedEmails: 350,
      phoneNumbers: 120,
      maxSubUsers: 5,
      features: [
        "1,000 outreach credits",
        "WhatsApp + Email outreach",
        "AI personalization",
        "ATS integrations",
        "Team collaboration",
        "Priority support",
      ],
      isPopular: true,
      popularBadge: "⭐ Most Popular",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      primaryPrice: "Custom Pricing",
      secondaryPrice: "(Starts at ₹59,999/month or $1,499/month)",
      description:
        "For enterprise hiring operations, staffing firms, and large-scale recruiting teams.",
      searches: 10000,
      candidateUnlocks: 4000,
      verifiedEmails: 2000,
      phoneNumbers: 800,
      maxSubUsers: null,
      features: [
        "5,000+ outreach credits",
        "AI recruiter workflows",
        "AI voice outreach",
        "API access",
        "Enterprise integrations",
        "Advanced analytics",
        "Dedicated infrastructure",
        "Dedicated support team",
      ],
      isPopular: false,
      popularBadge: "⭐ Most Popular",
    },
  ],
};

const QUOTA_MAX = 1e9;

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
        : DEFAULT_PRICING_PLANS.tiers.find((d) => d.id === "growth")?.popularBadge ||
          "⭐ Most Popular";
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
      maxSubUsers,
      features,
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
    typeof raw.intro === "string" && raw.intro.trim()
      ? raw.intro.trim()
      : DEFAULT_PRICING_PLANS.intro;
  const srcTiers =
    Array.isArray(raw.tiers) && raw.tiers.length > 0 ? raw.tiers : DEFAULT_PRICING_PLANS.tiers;

  const tiers = srcTiers.map((tier, index) => {
    const def =
      DEFAULT_PRICING_PLANS.tiers.find((d) => d.id === tier.id) ||
      DEFAULT_PRICING_PLANS.tiers[index] ||
      {};
    const merged = { ...def, ...tier };
    const pick = (key) => {
      const n = normalizeQuotaNumber(tier[key]);
      if (n !== null) return n;
      return normalizeQuotaNumber(def[key]);
    };
    merged.searches = pick("searches");
    merged.candidateUnlocks = pick("candidateUnlocks");
    merged.verifiedEmails = pick("verifiedEmails");
    merged.phoneNumbers = pick("phoneNumbers");
    const pickSubUsers = () => {
      if (Object.prototype.hasOwnProperty.call(tier, "maxSubUsers") && tier.maxSubUsers === null) {
        return null;
      }
      const n = normalizeQuotaNumber(tier.maxSubUsers);
      if (n !== null) return n;
      if (def.maxSubUsers === null) return null;
      const d = normalizeQuotaNumber(def.maxSubUsers);
      return d !== null ? d : 0;
    };
    merged.maxSubUsers = pickSubUsers();

    const strip = quotaStripSetFromNumbers(def);
    let feats = Array.isArray(tier.features)
      ? tier.features.map((f) => String(f).trim()).filter(Boolean)
      : [];
    feats = feats.filter((f) => !strip.has(f));
    if (feats.length === 0 && Array.isArray(def.features)) {
      feats = [...def.features];
    }
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
    maxSubUsers:
      o.maxSubUsers === null
        ? null
        : o.maxSubUsers === undefined
          ? undefined
          : coerceStoredQuota(o.maxSubUsers),
    features: Array.isArray(o.features) ? o.features : [],
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
        maxSubUsers: t.maxSubUsers,
        features: t.features,
        isPopular: t.isPopular,
        popularBadge: t.popularBadge,
      },
    },
    { upsert: true, new: true }
  );
}

/** Legacy: one Mixed document; migrate once to per-plan docs + meta. */
async function migrateFromLegacyIfNeeded() {
  const legacy = await PricingPlansConfig.findOne({ key: "singleton" }).lean();
  if (!legacy?.data || typeof legacy.data !== "object") return;

  const raw = legacy.data;
  const tiersIn =
    Array.isArray(raw.tiers) && raw.tiers.length > 0 ? raw.tiers : DEFAULT_PRICING_PLANS.tiers;
  const intro =
    typeof raw.intro === "string" && raw.intro.trim()
      ? raw.intro.trim()
      : DEFAULT_PRICING_PLANS.intro;
  const normalized = normalizePayload({ intro, tiers: tiersIn });

  await PricingPlansMeta.findOneAndUpdate(
    { key: "singleton" },
    { $set: { key: "singleton", intro: normalized.intro } },
    { upsert: true, new: true }
  );

  for (let i = 0; i < normalized.tiers.length; i += 1) {
    await upsertPricingPlanFromNormalized(normalized.tiers[i], i);
  }

  await PricingPlansConfig.deleteOne({ key: "singleton" });
}

/** Fresh DB: seed default intro + default tiers as separate documents. */
async function ensurePricingDataSeeded() {
  const n = await PricingPlan.countDocuments();
  if (n > 0) return;

  const normalized = normalizePayload(DEFAULT_PRICING_PLANS);
  await PricingPlansMeta.findOneAndUpdate(
    { key: "singleton" },
    { $set: { key: "singleton", intro: normalized.intro } },
    { upsert: true, new: true }
  );

  for (let i = 0; i < normalized.tiers.length; i += 1) {
    await upsertPricingPlanFromNormalized(normalized.tiers[i], i);
  }
}

/** Ensure trial tier exists in DB (for deployments seeded before trial was added). */
async function ensureTrialPlanExists() {
  const exists = await PricingPlan.findOne({ planId: "trial" }).lean();
  if (exists) return;

  const def = DEFAULT_PRICING_PLANS.tiers.find((t) => t.id === "trial");
  if (!def) return;

  const first = await PricingPlan.findOne().sort({ sortOrder: 1 }).select("sortOrder").lean();
  const sortOrder =
    first && typeof first.sortOrder === "number" ? first.sortOrder - 1 : 0;
  const normalized = normalizePayload({
    intro: DEFAULT_PRICING_PLANS.intro,
    tiers: [def],
  });
  await upsertPricingPlanFromNormalized(normalized.tiers[0], sortOrder);
}

async function ensureMetaIfPlansExist() {
  const n = await PricingPlan.countDocuments();
  if (n === 0) return;
  const meta = await PricingPlansMeta.findOne({ key: "singleton" }).lean();
  if (!meta) {
    await PricingPlansMeta.create({
      key: "singleton",
      intro: DEFAULT_PRICING_PLANS.intro,
    });
  }
}

async function loadPlansFromDatabase() {
  const metaDoc = await PricingPlansMeta.findOne({ key: "singleton" }).lean();
  const planDocs = await PricingPlan.find().sort({ sortOrder: 1 }).lean();

  const intro =
    typeof metaDoc?.intro === "string" && metaDoc.intro.trim()
      ? metaDoc.intro.trim()
      : DEFAULT_PRICING_PLANS.intro;

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
    await ensurePricingDataSeeded();
    await ensureTrialPlanExists();
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
 * Quota fields (searches, candidateUnlocks, verifiedEmails, phoneNumbers, maxSubUsers) are stored as numbers only; maxSubUsers null = unlimited.
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
      { upsert: true, new: true }
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
  await ensurePricingDataSeeded();
  await ensureTrialPlanExists();
  await ensureMetaIfPlansExist();
  const payload = await loadPlansFromDatabase();
  return payload.plans.tiers;
}

module.exports = {
  getPricingPlans,
  updatePricingPlans,
  DEFAULT_PRICING_PLANS,
  getEnrichedTiers,
};
