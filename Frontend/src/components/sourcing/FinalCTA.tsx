"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

export function FinalCTA() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-blue-600">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white opacity-10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8">
            Find Talent Before Everyone Else Does.
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium">
            Discover qualified candidates, enrich profiles, and build hiring momentum.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-white text-blue-600 font-bold rounded-full transition-all hover:bg-slate-50 shadow-xl shadow-black/10 hover:-translate-y-0.5 text-center"
            >
              Start Sourcing
            </Link>
            <BookDemoLink className="w-full sm:w-auto px-8 py-4 bg-blue-700/50 hover:bg-blue-700 text-white font-bold rounded-full transition-all border border-blue-500 hover:border-blue-400 text-center">
              Book Demo
            </BookDemoLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
