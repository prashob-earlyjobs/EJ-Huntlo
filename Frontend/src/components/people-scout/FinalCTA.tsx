"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

export function FinalCTA() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative rounded-[40px] overflow-hidden bg-slate-900 px-6 py-24 md:py-32 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            Scout The Right
            <br />
            <span className="text-blue-400">People Faster.</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">
            Look up profiles, enrich contact data, and start outreach without leaving Huntlo.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full text-base font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
            >
              Try People Scout
              <ArrowRight className="w-4 h-4" />
            </Link>
            <BookDemoLink className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/10 px-8 py-4 rounded-full text-base font-medium transition-colors">
              Book Demo
            </BookDemoLink>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
