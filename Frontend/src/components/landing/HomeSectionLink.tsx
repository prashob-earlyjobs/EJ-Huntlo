"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { homeSectionHref } from "@/lib/landingNavSections";

type Props = {
  sectionId: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
};

export function scrollToHomeSection(sectionId: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(sectionId);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: "start" });
  const href = homeSectionHref(sectionId);
  window.history.pushState(null, "", href);
  return true;
}

export function HomeSectionLink({ sectionId, className, children, onNavigate }: Props) {
  const pathname = usePathname();
  const href = homeSectionHref(sectionId);

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        onNavigate?.();
        if (pathname === "/") {
          e.preventDefault();
          scrollToHomeSection(sectionId);
        }
      }}
    >
      {children}
    </Link>
  );
}
