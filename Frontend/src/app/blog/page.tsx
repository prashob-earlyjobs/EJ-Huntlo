import type { Metadata } from "next";
import { Suspense } from "react";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

import { BlogIndexContent } from "./BlogIndexContent";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog | Huntlo — AI Recruiting & Outbound Hiring",
  description:
    "Guides on AI candidate sourcing, outbound recruiting, People Scout, campaigns, and modern hiring workflows from the Huntlo team.",
  ogImage: OG_IMAGES.blog,
  path: "/blog",
});

function BlogIndexFallback() {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      <main className="px-4 py-10 md:px-8 md:py-14 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="landing-blog-header">
            <p className="landing-blog-eyebrow">Resources</p>
            <h1 className="landing-blog-title">Huntlo blog</h1>
            <p className="landing-blog-subtitle">
              Playbooks for AI sourcing, outbound recruiting, and building a modern hiring OS.
            </p>
          </div>
          <div className="py-16 text-center">
            <MaterialIcon name="hourglass_empty" className="mx-auto text-3xl text-[#0050cb]" />
            <p className="mt-3 text-sm text-[#434654]">Loading articles…</p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

export default function BlogIndexPage() {
  return (
    <Suspense fallback={<BlogIndexFallback />}>
      <BlogIndexContent />
    </Suspense>
  );
}
