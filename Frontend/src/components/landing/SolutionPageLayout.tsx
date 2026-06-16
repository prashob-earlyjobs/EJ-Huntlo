import Link from "next/link";

import { BookDemoLink } from "@/components/landing/BookDemoLink";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { SolutionHeroSection } from "@/components/landing/SolutionHeroSection";
import { SolutionsIndexHero } from "@/components/landing/SolutionsIndexHero";
import type { SolutionPageData } from "@/lib/solutionPages";

type SolutionPageLayoutProps = {
  page?: SolutionPageData;
  breadcrumbItems?: { label: string; href?: string }[];
  children: React.ReactNode;
};

export function SolutionPageLayout({
  page,
  breadcrumbItems,
  children,
}: SolutionPageLayoutProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      <main>
        {page ? (
          <SolutionHeroSection page={page} breadcrumbItems={breadcrumbItems} />
        ) : (
          <SolutionsIndexHero breadcrumbItems={breadcrumbItems} />
        )}

        {children}

        <section className="relative overflow-x-clip bg-[#141b2b] px-4 py-20 text-center text-white md:px-8 md:py-24 lg:px-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
            <div className="absolute left-1/2 top-0 h-[360px] w-[min(560px,100vw)] max-w-full -translate-x-1/2 rounded-full bg-[#0050cb] blur-[120px]" />
          </div>
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
              Ready to modernize your recruiting workflow?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/75 md:text-lg">
              Join teams using Huntlo to source, engage, and hire faster with AI-powered workflows.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#0050cb] shadow-xl transition-all hover:bg-[#f1f3ff] sm:w-auto"
              >
                Start Free Trial
              </Link>
              <BookDemoLink className="w-full rounded-full border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto">
                Book a Demo
              </BookDemoLink>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
