"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Search, Sparkles, Star } from "lucide-react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 lg:pt-40 lg:pb-32">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[600px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-blue-400 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-[55%_45%] gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold tracking-wide mb-6">
              <Sparkles className="w-4 h-4" />
              HUNTLO SOURCE
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
              Agentic AI Candidate Sourcing —<br />
              <span className="text-blue-600">Describe the Role, Get Matched Talent Instantly</span>
            </h1>
            
            <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-xl">
              Huntlo&apos;s agentic AI searches across 50+ professional platforms using natural
              language — no Boolean filters required. Candidates are matched, scored, and enriched
              automatically.
            </p>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
              <Link
                href="/signup"
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 text-center"
              >
                Start Sourcing
              </Link>
              <BookDemoLink className="px-6 py-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-full transition-all hover:bg-slate-50 text-center">
                Book Demo
              </BookDemoLink>
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative overflow-hidden"
          >
            {/* Decorative background circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(500px,100vw)] h-[min(500px,100vw)] border border-slate-200/50 rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(350px,80vw)] h-[min(350px,80vw)] border border-blue-200/30 rounded-full border-dashed animate-[spin_40s_linear_infinite_reverse]" />

            <div className="relative bg-white rounded-3xl border border-slate-200 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.1)] p-6 z-10">
              {/* Fake Search Bar */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6">
                <Search className="w-5 h-5 text-slate-400" />
                <div className="flex-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeOut", delay: 1 }}
                    className="whitespace-nowrap overflow-hidden text-sm text-slate-600 font-medium"
                  >
                    Find senior backend engineers in Bangalore with startup and fintech experience
                  </motion.div>
                </div>
              </div>

              {/* Candidate Cards */}
              <div className="space-y-4">
                {[
                  { name: "Rahul Sharma", role: "Senior Backend Engineer", match: "96%" },
                  { name: "Aisha Khan", role: "Staff Software Engineer", match: "93%" },
                  { name: "Arjun Patel", role: "Lead Platform Engineer", match: "91%" }
                ].map((candidate, i) => (
                  <motion.div
                    key={candidate.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 1.5 + i * 0.1 }}
                    className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-100 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {candidate.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{candidate.name}</div>
                        <div className="text-xs text-slate-500">{candidate.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {candidate.match}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Floating Signals */}
              <motion.div 
                className="absolute -right-12 top-20 hidden md:flex bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-100 text-xs font-bold text-slate-700 items-center gap-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Fintech
              </motion.div>
              <motion.div 
                className="absolute -left-8 bottom-32 hidden md:flex bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-100 text-xs font-bold text-slate-700 items-center gap-2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" /> System Design
              </motion.div>
              <motion.div 
                className="absolute -right-6 bottom-12 hidden md:flex bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-100 text-xs font-bold text-slate-700 items-center gap-2"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Startup
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
