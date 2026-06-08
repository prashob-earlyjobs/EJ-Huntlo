import type { Metadata } from "next";

import { AuthMarketingShell } from "@/components/landing/AuthMarketingShell";
import { buildPageMetadata, OG_IMAGES } from "@/lib/siteMetadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign up | Huntlo",
  description:
    "Create your Huntlo account and start sourcing candidates with AI-powered recruiting workflows.",
  ogImage: OG_IMAGES.bookDemo,
  path: "/signup",
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <AuthMarketingShell>{children}</AuthMarketingShell>;
}
