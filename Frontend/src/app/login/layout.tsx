import { AuthMarketingShell } from "@/components/landing/AuthMarketingShell";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthMarketingShell>{children}</AuthMarketingShell>;
}
