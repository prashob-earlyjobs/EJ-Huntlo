import type { Metadata } from "next";

import { AuthMarketingShell } from "@/components/landing/AuthMarketingShell";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Login | Huntlo",
  description: "Sign in to your Huntlo account to source candidates and run outreach campaigns.",
  ogImage: OG_IMAGES.login,
  path: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthMarketingShell>{children}</AuthMarketingShell>;
}
