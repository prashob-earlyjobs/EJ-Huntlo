import Link from "next/link";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  planCtaLabel,
  tierFeatureLines,
  type PricingPlansPayload,
} from "@/lib/pricingPlans";

type Props = {
  pricingPlans: PricingPlansPayload | null;
};

export function LandingPricingSection({ pricingPlans }: Props) {
  const tiers = pricingPlans?.tiers ?? [];

  return (
    <section className="bg-white px-4 py-20 md:px-8 lg:px-12" id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Simple, Performance-Based Pricing
          </h2>
          {pricingPlans?.intro ? (
            <p className="mx-auto mt-3 max-w-2xl text-[#434654]">{pricingPlans.intro}</p>
          ) : (
            <p className="mx-auto mt-3 max-w-2xl text-[#434654]">
              Choose the plan that fits your hiring volume. Upgrade anytime.
            </p>
          )}
        </div>

        {tiers.length === 0 ? (
          <p className="text-center text-sm text-[#434654]">
            Pricing is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {tiers.slice(0, 3).map((tier) => {
              const featured = Boolean(tier.isPopular);
              const lines = tierFeatureLines(tier).slice(0, 6);
              const key = tier.id || tier.name;

              return (
                <div
                  key={key}
                  className={
                    featured
                      ? "relative flex flex-col rounded-2xl bg-[#141b2b] p-8 text-white shadow-xl ring-2 ring-[#0050cb]"
                      : "flex flex-col rounded-2xl border border-[#c3c6d6]/30 bg-white p-8"
                  }
                >
                  {featured ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0050cb] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {tier.popularBadge || "Most Popular"}
                    </div>
                  ) : null}
                  <h3
                    className={`text-lg font-bold ${featured ? "text-white" : "text-[#141b2b]"}`}
                  >
                    {tier.name}
                  </h3>
                  <div className="mt-2">
                    <span
                      className={`text-3xl font-bold md:text-4xl ${
                        featured ? "text-white" : "text-[#141b2b]"
                      }`}
                    >
                      {tier.primaryPrice}
                    </span>
                    {tier.secondaryPrice ? (
                      <p
                        className={`mt-1 text-sm ${
                          featured ? "text-white/75" : "text-[#434654]"
                        }`}
                      >
                        {tier.secondaryPrice}
                      </p>
                    ) : null}
                  </div>
                  {tier.description ? (
                    <p
                      className={`mt-4 text-sm leading-relaxed ${
                        featured ? "text-white/80" : "text-[#434654]"
                      }`}
                    >
                      {tier.description}
                    </p>
                  ) : null}
                  <ul className="mt-6 flex-grow space-y-3">
                    {lines.map((feature) => (
                      <li
                        key={`${key}-${feature}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <MaterialIcon
                          name="check"
                          className={`shrink-0 text-base ${
                            featured ? "text-[#dae1ff]" : "text-[#0050cb]"
                          }`}
                        />
                        <span className={featured ? "text-white/90" : "text-[#434654]"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={
                      featured
                        ? "mt-8 w-full rounded-full bg-[#0050cb] py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-[#003fa4]"
                        : "mt-8 w-full rounded-full border border-[#c3c6d6]/40 bg-[#f1f3ff] py-3.5 text-center text-sm font-bold text-[#141b2b] transition-colors hover:bg-[#e1e8fe]"
                    }
                  >
                    {planCtaLabel(tier)}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
