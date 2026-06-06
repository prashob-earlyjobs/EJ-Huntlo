"use client";

import Link from "next/link";
import { useState } from "react";
import { BookDemoLink } from "./BookDemoLink";
import { LandingLogo } from "./LandingLogo";
import { MaterialIcon } from "./MaterialIcon";

const NAV_BOOK_DEMO_CLASS =
  "rounded-full bg-[#0050cb] px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-[#0050cb]/20 transition-all hover:bg-[#003fa4]";

const NAV_BOOK_DEMO_MOBILE_CLASS =
  "rounded-full bg-[#0050cb] px-6 py-2.5 text-center text-sm font-medium text-white";

const NAV_LINKS = [
  { href: "/#product", label: "Platform" },
  { href: "/#solutions", label: "Solutions" },
  { href: "/#resources", label: "Resources" },
  { href: "/#pricing", label: "Pricing" },
] as const;

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-[#c3c6d6]/25 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center">
          <LandingLogo priority className="h-10 w-auto md:h-11" />
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

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-[#141b2b] transition-colors hover:text-[#0050cb]"
          >
            Login
          </Link>
          <BookDemoLink className={NAV_BOOK_DEMO_CLASS}>Book a Demo</BookDemoLink>
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
        <div className="border-t border-[#c3c6d6]/25 px-4 py-4 md:hidden">
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
              Login
            </Link>
            <BookDemoLink
              className={NAV_BOOK_DEMO_MOBILE_CLASS}
              onClick={() => setMobileOpen(false)}
            >
              Book a Demo
            </BookDemoLink>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
