import type { Metadata } from "next";

import { LegalPageShell } from "@/components/landing/LegalPageShell";
import { legalPageHref, requireLegalPage } from "@/lib/legalPages";
import { buildPageMetadata } from "@/lib/siteMetadata";

const page = requireLegalPage("security");

export const metadata: Metadata = buildPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: legalPageHref("security"),
});

export default function SecurityPage() {
  return <LegalPageShell page={page} />;
}
