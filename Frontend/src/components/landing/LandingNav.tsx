"use client";

import Link from "next/link";
import { useState } from "react";
import { LandingLogo } from "./LandingLogo";
import { MaterialIcon } from "./MaterialIcon";

const NAV_LINKS = [
  { href: "#solutions", label: "Solutions" },
  { href: "#product", label: "Product" },
  { href: "#company", label: "Company" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="landing-glass-panel sticky top-0 z-[100] w-full border-b border-[#c3c6d6]/30 transition-all duration-300">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-16">
        <Link href="/" className="flex shrink-0 items-center">
          <LandingLogo priority />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#434654] transition-colors hover:text-[#0050cb]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[#141b2b] transition-colors hover:text-[#0050cb]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#0050cb] px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#0050cb]/10 transition-all duration-200 hover:bg-[#003fa4]"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="p-2 text-[#141b2b] md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <MaterialIcon name={mobileOpen ? "close" : "menu"} />
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[#c3c6d6]/30 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#434654]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link href="/login" className="text-sm font-medium text-[#141b2b]">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#0050cb] px-6 py-2.5 text-center text-sm font-medium text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
