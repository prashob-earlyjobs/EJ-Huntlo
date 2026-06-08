import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.careers;

export const metadata = marketingPageMetadata("careers");

export default function CareersPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    />
  );
}
