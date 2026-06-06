import type { Metadata } from "next";

import { LegalPageShell } from "@/components/landing/LegalPageShell";
import { requireLegalPage } from "@/lib/legalPages";

const page = requireLegalPage("cookies");

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default function CookiesPage() {
  return <LegalPageShell page={page} />;
}
