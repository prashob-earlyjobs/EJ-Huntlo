import Link from "next/link";

import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { tierDbDisplayPriceLines } from "@/lib/planPayment";
import {
  isEnterpriseTier,
  landingDisplayTiers,
  landingPlanCtaLabel,
  landingTierFeatureLines,
  type PricingPlansPayload,
  type PricingTier,
} from "@/lib/pricingPlans";

type Props = {
  pricingPlans: PricingPlansPayload | null;
};

function PricingCheckIcon({ featured }: { featured: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        featured ? "bg-[#0050cb]/25 text-[#b3c5ff]" : "bg-[#0050cb]/10 text-[#0050cb]"
      }`}
    >
      <MaterialIcon name="check" className="text-[14px] font-bold" />
    </span>
  );
}

function PricingPrice({ tier, featured }: { tier: PricingTier; featured: boolean }) {
  const priceLines = tierDbDisplayPriceLines(tier, { seatSuffix: false });
  const enterprise = isEnterpriseTier(tier);

  return (
    <div className="mt-4">
      <p className="flex flex-wrap items-baseline gap-1">
        <span
          className={`landing-pricing-price-amount ${
            featured ? "text-white" : "text-[#141b2b]"
          }`}
        >
          {priceLines.amount}
        </span>
        {priceLines.period ? (
          <span
            className={`landing-pricing-price-period ${
              featured ? "text-white/70" : "text-[#434654]"
            }`}
          >
            {priceLines.period}
          </span>
        ) : null}
      </p>
      {priceLines.secondary && enterprise ? (
        <p className={`mt-1.5 text-sm ${featured ? "text-white/65" : "text-[#434654]/80"}`}>
          {priceLines.secondary}
        </p>
      ) : null}
    </div>
  );
}

function PricingCta({ tier, featured }: { tier: PricingTier; featured: boolean }) {
  const label = landingPlanCtaLabel(tier);
  const enterprise = isEnterpriseTier(tier);

  if (enterprise) {
    return (
      <BookDemoLink
        className="landing-pricing-cta landing-pricing-cta--sales w-full"
        disabledClassName="landing-pricing-cta landing-pricing-cta--sales w-full cursor-not-allowed opacity-60"
      >
        {label}
      </BookDemoLink>
    );
  }

  if (featured) {
    return (
      <Link
        href="/signup"
        className="landing-pricing-cta landing-pricing-cta--primary w-full"
      >
        {label}
      </Link>
    );
  }

  return (
    <Link href="/signup" className="landing-pricing-cta landing-pricing-cta--outline w-full">
      {label}
    </Link>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  const featured = Boolean(tier.isPopular);
  const lines = landingTierFeatureLines(tier);
  const key = tier.id || tier.name;
  const badgeText = (tier.popularBadge || "Most Popular").replace(/^⭐\s*/, "").toUpperCase();

  return (
    <article
      className={
        featured
          ? "landing-pricing-card landing-pricing-card--featured relative flex flex-col px-8 pb-8 pt-10 md:px-9 md:pb-9"
          : "landing-pricing-card flex flex-col px-8 pb-8 pt-8 md:px-9 md:pb-9"
      }
    >
      {featured ? (
        <div className="landing-pricing-badge absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          {badgeText}
        </div>
      ) : null}

      <h3
        className={`text-xl font-bold tracking-tight ${
          featured ? "text-white" : "text-[#141b2b]"
        }`}
      >
        {tier.name}
      </h3>

      <PricingPrice tier={tier} featured={featured} />

      <ul className="mt-8 flex flex-col gap-4">
        {lines.map((feature) => (
          <li key={`${key}-${feature}`} className="flex items-start gap-3">
            <PricingCheckIcon featured={featured} />
            <span
              className={`text-sm leading-snug ${
                featured ? "text-white/90" : "text-[#434654]"
              }`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <PricingCta tier={tier} featured={featured} />
      </div>
    </article>
  );
}

export function LandingPricingSection({ pricingPlans }: Props) {
  const allTiers = pricingPlans?.tiers ?? [];
  const tiers = landingDisplayTiers(allTiers);

  return (
    <section
      className="landing-pricing-section scroll-mt-24 px-4 py-20 md:px-8 md:py-24 lg:px-12"
      id="pricing"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Transparent, Performance-Based Pricing for Every Team Size
          </h2>
          {pricingPlans?.intro ? (
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#434654]">
              {pricingPlans.intro}
            </p>
          ) : (
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#434654]">
              Choose the plan that fits your hiring volume. Upgrade anytime.
            </p>
          )}
        </div>

        {tiers.length === 0 ? (
          <p className="text-center text-sm text-[#434654]">
            Pricing is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <div className="landing-pricing-grid mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 md:items-start md:gap-5 lg:gap-6">
            {tiers.map((tier) => (
              <PricingCard key={tier.id || tier.name} tier={tier} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
