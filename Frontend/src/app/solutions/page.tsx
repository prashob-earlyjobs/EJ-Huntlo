import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { SolutionsIndexContent } from "@/components/landing/SolutionsIndexContent";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.solutions;

export const metadata = marketingPageMetadata("solutions");

export default function SolutionsPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <SolutionsIndexContent />
    </MarketingPageShell>
  );
}
