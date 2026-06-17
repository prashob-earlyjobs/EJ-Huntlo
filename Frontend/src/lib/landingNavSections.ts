/** Homepage section anchors used by landing nav (Platform, Resources, Pricing). */
export const HOME_NAV_LINKS = [
  { label: "Platform", sectionId: "product" },
  { label: "Resources", sectionId: "resources" },
  { label: "Pricing", sectionId: "pricing" },
] as const;

export function homeSectionHref(sectionId: string): string {
  return `/#${sectionId}`;
}
