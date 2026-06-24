import { DemoPageContent } from "@/components/landing/DemoPageContent";
import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.demo;

export const metadata = marketingPageMetadata("demo");

export default function DemoPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <DemoPageContent />
    </MarketingPageShell>
  );
}
