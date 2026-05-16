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
    <section className="bg-white px-4 py-32 md:px-16" id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-[#141b2b] md:text-5xl">
            Transparent Infrastructure Pricing
          </h2>
          {pricingPlans?.intro ? (
            <p className="mx-auto mb-8 max-w-2xl text-lg text-[#434654]">{pricingPlans.intro}</p>
          ) : null}
        </div>

        {tiers.length === 0 ? (
          <p className="text-center text-sm text-[#434654]">
            Pricing is temporarily unavailable. Please try again later.
          </p>
        ) : (
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 xl:gap-6">
            {tiers.map((tier) => {
              const featured = Boolean(tier.isPopular);
              const lines = tierFeatureLines(tier);
              const key = tier.id || tier.name;

              return (
                <div
                  key={key}
                  className={
                    featured
                      ? "relative z-10 flex h-full flex-col rounded-[32px] bg-[#0050cb] p-6 text-white shadow-2xl shadow-[#0050cb]/30 ring-2 ring-[#0050cb] transition-transform duration-300 lg:p-7 xl:p-8"
                      : "flex h-full flex-col rounded-[32px] border border-[#c3c6d6]/30 bg-white p-6 transition-transform duration-300 hover:scale-[1.02] lg:p-7 xl:p-8"
                  }
                >
                  {featured ? (
                    <div className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-[32px] bg-white/20 px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                      {tier.popularBadge || "Recommended"}
                    </div>
                  ) : null}
                  <h3 className="mb-2 text-lg font-semibold lg:text-xl">{tier.name}</h3>
                  <div className={`mb-2 ${featured ? "text-white" : ""}`}>
                    <span className="text-2xl font-bold leading-tight lg:text-3xl xl:text-4xl">
                      {tier.primaryPrice}
                    </span>
                  </div>
                  {tier.secondaryPrice ? (
                    <p
                      className={`mb-6 text-sm ${featured ? "text-white/80" : "text-[#434654]"}`}
                    >
                      {tier.secondaryPrice}
                    </p>
                  ) : (
                    <div className="mb-6" />
                  )}
                  {tier.description ? (
                    <p
                      className={`mb-6 text-sm leading-relaxed ${
                        featured ? "text-white/85" : "text-[#434654]"
                      }`}
                    >
                      {tier.description}
                    </p>
                  ) : null}
                  <ul className="mb-8 flex-grow space-y-3">
                    {lines.map((feature) => (
                      <li
                        key={`${key}-${feature}`}
                        className="flex items-start gap-2 text-xs lg:text-sm"
                      >
                        <MaterialIcon
                          name="check"
                          className={`shrink-0 text-base ${
                            featured ? "text-[#dae1ff]" : "text-[#0050cb]"
                          }`}
                        />
                        <span className={featured ? "" : "text-[#434654]"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={
                      featured
                        ? "mt-auto w-full rounded-full bg-white py-3 text-center text-sm font-bold text-[#0050cb] shadow-lg transition-colors hover:bg-[#faf9ff] lg:py-3.5"
                        : "mt-auto w-full rounded-full bg-[#f1f3ff] py-3 text-center text-sm font-bold transition-colors hover:bg-[#e1e8fe] lg:py-3.5"
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
