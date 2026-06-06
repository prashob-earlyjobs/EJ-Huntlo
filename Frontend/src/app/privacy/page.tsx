import type { Metadata } from "next";

import { LegalPageShell } from "@/components/landing/LegalPageShell";
import { requireLegalPage } from "@/lib/legalPages";

const page = requireLegalPage("privacy");

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default function PrivacyPage() {
  return <LegalPageShell page={page} />;
}
