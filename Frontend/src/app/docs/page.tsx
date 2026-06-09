import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.documentation;

export const metadata = marketingPageMetadata("documentation");

export default function DocsPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    />
  );
}
