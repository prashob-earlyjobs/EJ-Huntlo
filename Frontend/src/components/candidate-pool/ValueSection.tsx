"use client";

import { motion } from "motion/react";

export function ValueSection() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="text-sm font-semibold text-blue-600 tracking-wider uppercase">
          WHY CANDIDATE POOL
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
          Your Talent Library, Always Ready
        </h2>
        <p className="text-lg text-slate-500 leading-relaxed">
          Stop losing great candidates between searches. Save profiles, tag by role, and pull from
          your pool whenever a new opening appears.
        </p>
      </div>
    </section>
  );
}
