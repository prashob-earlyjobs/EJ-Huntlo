import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingProductSourcingSection } from "@/components/landing/LandingProductSourcingSection";
import { marketingPageMetadata } from "@/lib/marketingPages";

export const metadata = marketingPageMetadata("platform");

export default function PlatformPage() {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      <main>
        <LandingProductSourcingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
