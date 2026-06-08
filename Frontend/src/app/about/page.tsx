import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.about;

export const metadata = marketingPageMetadata("about");

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    />
  );
}
