import { ContactPageContent } from "@/components/landing/ContactPageContent";
import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.contact;

export const metadata = marketingPageMetadata("contact");

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <ContactPageContent />
    </MarketingPageShell>
  );
}
