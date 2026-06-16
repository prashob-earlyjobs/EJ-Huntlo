import type { Metadata } from "next";
import Link from "next/link";

import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { MaterialIcon } from "@/components/landing/MaterialIcon";

export const metadata: Metadata = {
  title: "Page not found | Huntlo",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="landing-page flex min-h-screen flex-col selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      <main className="flex min-h-[calc(100vh-12rem)] flex-1 items-center px-4 py-20 md:px-8 md:py-28 lg:px-12 lg:py-36">
        <div className="mx-auto w-full max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c3c6d6]/40 bg-white shadow-sm">
            <MaterialIcon name="travel_explore" className="text-[28px] text-[#0050cb]" />
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[#0050cb]">
            404 error
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#434654] md:text-lg">
            The page you are looking for does not exist or may have been moved. Head back to the
            homepage or contact us if you need help.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-[#0050cb] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0050cb]/20 transition-colors hover:bg-[#003fa4]"
            >
              Back to home
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-[#c3c6d6]/50 px-6 py-3 text-sm font-semibold text-[#141b2b] transition-colors hover:border-[#0050cb]/30 hover:text-[#0050cb]"
            >
              Contact support
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
