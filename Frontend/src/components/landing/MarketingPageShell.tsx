import Link from "next/link";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

type MarketingPageShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
}: MarketingPageShellProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      <main className="px-4 py-12 md:px-8 md:py-16 lg:px-12">
        <div className="mx-auto max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-widest text-[#0050cb]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#434654] md:text-lg">
            {description}
          </p>
          {children}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-[#0050cb] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/20 transition-colors hover:bg-[#003fa4]"
            >
              Start free trial
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[#c3c6d6]/50 px-6 py-3 text-sm font-semibold text-[#141b2b] transition-colors hover:border-[#0050cb]/30 hover:text-[#0050cb]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
