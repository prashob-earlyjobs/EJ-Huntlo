"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Mail, Search, Sparkles, User } from "lucide-react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

export function HeroSection() {
  return (
    <section className="px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 md:pt-32 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        <div className="w-full lg:w-[55%] space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold tracking-wide uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
            Huntlo People Scout
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-[56px] lg:text-[72px] leading-[1.1] font-black text-slate-900 tracking-tight"
          >
            Find Any Candidate.
            <br />
            <span className="text-blue-600">Enrich Instantly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl"
          >
            Look up individual profiles, reveal contact details, and move targeted candidates
            straight into outreach workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 pt-4"
          >
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-base font-medium transition-all shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.3)] flex items-center gap-2"
            >
              Try People Scout
              <ArrowRight className="w-4 h-4" />
            </Link>
            <BookDemoLink className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-full text-base font-medium transition-colors">
              Book Demo
            </BookDemoLink>
          </motion.div>
        </div>

        <div className="w-full lg:w-[45%] relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative w-full aspect-[4/5] md:aspect-square bg-slate-50 rounded-[32px] border border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col p-6"
          >
            <div className="relative z-10 flex flex-col gap-4 h-full justify-center">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-sm text-slate-500 truncate">
                  linkedin.com/in/alex-martinez
                </span>
              </div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">Alex Martinez</h3>
                  <p className="text-sm text-slate-500">Staff Engineer · Stripe</p>
                  <p className="text-xs text-slate-400 mt-1">San Francisco · 8 yrs exp</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                  <Mail className="w-4 h-4 shrink-0 text-blue-600" />
                  <span className="min-w-0 truncate">alex.martinez@email.com</span>
                  <span className="text-xs text-emerald-600 font-medium sm:ml-auto">Verified</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Python", "Distributed Systems", "Kubernetes"].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>

              <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between mt-auto">
                <span className="text-sm text-slate-300">Profile enriched</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  Ready for outreach
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
