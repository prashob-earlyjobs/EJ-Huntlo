import { SolutionPageLayout } from "@/components/landing/SolutionPageLayout";
import { SolutionsIndexContent } from "@/components/landing/SolutionsIndexContent";
import { marketingPageMetadata } from "@/lib/marketingPages";

export const metadata = marketingPageMetadata("solutions");

export default function SolutionsPage() {
  return (
    <SolutionPageLayout
      breadcrumbItems={[
        { label: "Home", href: "/" },
        { label: "Solutions" },
      ]}
    >
      <SolutionsIndexContent />
    </SolutionPageLayout>
  );
}
