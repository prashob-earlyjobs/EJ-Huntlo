"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

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
            Huntlo Assessments
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-[56px] lg:text-[72px] leading-[1.1] font-black text-slate-900 tracking-tight"
          >
            Assess Skills.
            <br />
            <span className="text-blue-600">Hire With Confidence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl"
          >
            Run role-based assessments, score candidates consistently, and advance qualified talent
            into interviews with clear skill signals.
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
              Start Assessing
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
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Senior Backend Engineer</h3>
                    <p className="text-sm text-slate-500">Technical Assessment</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-slate-900">86</span>
                  <span className="text-sm text-slate-500 mb-1">/ 100</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
              >
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Skill Breakdown
                </h4>
                <div className="space-y-3">
                  {[
                    { label: "System design", score: 90 },
                    { label: "API development", score: 88 },
                    { label: "Problem solving", score: 82 },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{c.label}</span>
                        <span className="font-medium text-slate-900">{c.score}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="bg-slate-900 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-3 mt-auto"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Assessment Result</p>
                    <p className="text-sm font-medium text-white">Strong technical fit</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Advance
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
