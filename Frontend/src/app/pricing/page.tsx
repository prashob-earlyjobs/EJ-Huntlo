import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingPricingSection } from "@/components/landing/LandingPricingSection";
import { marketingPageMetadata } from "@/lib/marketingPages";
import { fetchPublicPricingPlans } from "@/lib/pricingPlans";

export const metadata = marketingPageMetadata("pricing");

export default async function PricingPage() {
  const pricingPlans = await fetchPublicPricingPlans();

  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      <main>
        <LandingPricingSection pricingPlans={pricingPlans} />
      </main>
      <LandingFooter />
    </div>
  );
}
