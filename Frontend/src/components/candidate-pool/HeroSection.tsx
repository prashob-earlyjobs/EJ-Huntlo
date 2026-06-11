"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, FolderOpen, Star, Tag, Users } from "lucide-react";

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
            Huntlo Candidate Pool
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-[56px] lg:text-[72px] leading-[1.1] font-black text-slate-900 tracking-tight"
          >
            Organize Talent.
            <br />
            <span className="text-blue-600">Build Pipelines.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl"
          >
            Save candidates from search sessions, organize talent across roles, and keep every
            pipeline ready for outreach and campaigns.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 pt-4"
          >
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-base font-medium transition-all shadow-[0_8px_16px_rgba(37,99,235,0.2)] flex items-center gap-2"
            >
              Build Your Pool
              <ArrowRight className="w-4 h-4" />
            </Link>
            <BookDemoLink className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-full text-base font-medium transition-colors">
              Book Demo
            </BookDemoLink>
          </motion.div>
        </div>

        <div className="w-full lg:w-[45%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-slate-50 rounded-[32px] border border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 space-y-3"
          >
            {[
              { name: "Priya Nair", role: "Senior Backend Engineer", tag: "Shortlisted", starred: true },
              { name: "James Liu", role: "Product Manager", tag: "Contacted", starred: false },
              { name: "Sofia Martinez", role: "UX Designer", tag: "Saved", starred: true },
            ].map((c) => (
              <div
                key={c.name}
                className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">{c.name}</h3>
                    {c.starred && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{c.role}</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                  {c.tag}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 px-2 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" /> 128 saved candidates
              </span>
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <Tag className="w-4 h-4" />
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
