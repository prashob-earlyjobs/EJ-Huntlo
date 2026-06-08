import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

type AuthMarketingShellProps = {
  children: React.ReactNode;
};

export function AuthMarketingShell({ children }: AuthMarketingShellProps) {
  return (
    <div className="landing-page flex min-h-full flex-col selection:bg-[#0050cb] selection:text-[#c1cfff]">
      <LandingNav />
      {children}
      <LandingFooter />
    </div>
  );
}
