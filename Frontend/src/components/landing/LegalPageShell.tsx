import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { LegalPageView } from "@/components/landing/LegalPageView";
import type { LegalPageData } from "@/lib/legalPages";

type LegalPageShellProps = {
  page: LegalPageData;
};

export function LegalPageShell({ page }: LegalPageShellProps) {
  return (
    <div className="landing-page selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />

      <main className="px-4 py-8 md:px-8 md:py-12 lg:px-12">
        <LegalPageView page={page} />
      </main>

      <LandingFooter />
    </div>
  );
}
