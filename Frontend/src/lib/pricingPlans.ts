export type PricingTier = {
  id?: string;
  name: string;
  primaryPrice: string;
  secondaryPrice: string;
  description: string;
  searches?: number | null;
  candidateUnlocks?: number | null;
  verifiedEmails?: number | null;
  phoneNumbers?: number | null;
  features: string[];
  isPopular?: boolean;
  popularBadge?: string;
};

export type PricingPlansPayload = {
  intro: string;
  tiers: PricingTier[];
};

export function parsePricingQuotaFromApi(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (typeof v === "string" && v.trim()) {
    const m = v.replace(/,/g, "").match(/\d+/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

export function pricingQuotaDisplayLabel(
  n: number | null | undefined,
  kind: "searches" | "unlocks" | "emails" | "phones"
): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  const q = Math.floor(n);
  if (kind === "searches") return `${q.toLocaleString()} searches`;
  if (kind === "unlocks") return `${q.toLocaleString()} candidate unlocks`;
  if (kind === "emails") return `${q.toLocaleString()} verified emails`;
  return `${q.toLocaleString()} phone numbers`;
}

export function tierFeatureLines(tier: PricingTier): string[] {
  const quotaLines = [
    pricingQuotaDisplayLabel(tier.searches, "searches"),
    pricingQuotaDisplayLabel(tier.candidateUnlocks, "unlocks"),
    pricingQuotaDisplayLabel(tier.verifiedEmails, "emails"),
    pricingQuotaDisplayLabel(tier.phoneNumbers, "phones"),
  ].filter((line): line is string => line !== null);

  const features = tier.features
    .map((f) => String(f ?? "").trim())
    .filter((line) => line !== "");

  return [...quotaLines, ...features];
}

export function parsePricingPlansFromApi(plans: unknown): PricingPlansPayload | null {
  if (!plans || typeof plans !== "object") return null;
  const p = plans as Record<string, unknown>;
  const intro = typeof p.intro === "string" ? p.intro : "";
  const rawTiers = Array.isArray(p.tiers) ? p.tiers : [];
  if (rawTiers.length === 0) return null;

  const tiers: PricingTier[] = rawTiers.map((item: unknown) => {
    const t = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const features = Array.isArray(t.features) ? t.features : [];
    return {
      id: typeof t.id === "string" ? t.id : undefined,
      name: typeof t.name === "string" ? t.name : "Plan",
      primaryPrice: typeof t.primaryPrice === "string" ? t.primaryPrice : "",
      secondaryPrice: typeof t.secondaryPrice === "string" ? t.secondaryPrice : "",
      description: typeof t.description === "string" ? t.description : "",
      searches: parsePricingQuotaFromApi(t.searches),
      candidateUnlocks: parsePricingQuotaFromApi(t.candidateUnlocks),
      verifiedEmails: parsePricingQuotaFromApi(t.verifiedEmails),
      phoneNumbers: parsePricingQuotaFromApi(t.phoneNumbers),
      features: features.map((f) => String(f ?? "").trim()).filter((line) => line !== ""),
      isPopular: Boolean(t.isPopular),
      popularBadge:
        typeof t.popularBadge === "string" && t.popularBadge.trim()
          ? t.popularBadge.trim()
          : "⭐ Most Popular",
    };
  });

  return { intro, tiers };
}

export async function fetchPublicPricingPlans(): Promise<PricingPlansPayload | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  try {
    const res = await fetch(`${apiBase}/api/pricing-plans`, {
      next: { revalidate: 60 },
    });
    const data = (await res.json()) as {
      success?: boolean;
      plans?: unknown;
    };
    if (!res.ok || !data.success || !data.plans) return null;
    return parsePricingPlansFromApi(data.plans);
  } catch {
    return null;
  }
}

export function planCtaLabel(tier: PricingTier): string {
  if (tier.id === "enterprise" || /custom/i.test(tier.primaryPrice)) {
    return "Contact us";
  }
  if (tier.isPopular) return "Get started";
  return "Start deploying";
}
