import { AuthMarketingShell } from "@/components/landing/AuthMarketingShell";

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <AuthMarketingShell>{children}</AuthMarketingShell>;
}
