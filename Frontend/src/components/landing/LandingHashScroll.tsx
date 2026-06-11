"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { scrollToHomeSection } from "@/components/landing/HomeSectionLink";

/** Scroll to `/#section` after navigating to the homepage from another route. */
export function LandingHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const run = () => {
      scrollToHomeSection(hash, "auto");
    };

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });

    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
