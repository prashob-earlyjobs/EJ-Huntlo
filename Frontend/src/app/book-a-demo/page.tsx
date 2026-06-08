import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.bookDemo;

export const metadata = marketingPageMetadata("bookDemo");

export default function BookDemoPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <div className="mt-6">
        <BookDemoLink className="inline-flex rounded-full bg-[#0050cb] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/20 transition-colors hover:bg-[#003fa4]">
          Schedule your demo
        </BookDemoLink>
      </div>
    </MarketingPageShell>
  );
}
