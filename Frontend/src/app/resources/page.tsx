import Link from "next/link";

import { MarketingPageShell } from "@/components/landing/MarketingPageShell";
import { MARKETING_PAGES, marketingPageMetadata } from "@/lib/marketingPages";

const page = MARKETING_PAGES.resources;

export const metadata = marketingPageMetadata("resources");

export default function ResourcesPage() {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
    >
      <p className="mt-6 text-sm text-[#434654]">
        Read the{" "}
        <Link href="/blog" className="font-medium text-[#0050cb] hover:underline">
          Huntlo blog
        </Link>{" "}
        for playbooks on AI sourcing and outbound recruiting.
      </p>
    </MarketingPageShell>
  );
}
