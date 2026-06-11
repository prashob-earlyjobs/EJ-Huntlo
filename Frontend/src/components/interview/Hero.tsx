"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Calendar, CheckCircle2, MessageSquare, Star, Users } from "lucide-react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

export function Hero() {
  return (
    <section className="px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 md:pt-32 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        {/* Left Content (55%) */}
        <div className="w-full lg:w-[55%] space-y-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold tracking-wide uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            Huntlo Interview
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-[56px] lg:text-[72px] leading-[1.1] font-black text-slate-900 tracking-tight"
          >
            Run Better Interviews.<br />
            <span className="text-blue-600">Make Better Hires.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl"
          >
            Coordinate interviews, capture structured feedback, evaluate candidates consistently, and move hiring decisions forward faster.
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
              Start Interviewing
              <ArrowRight className="w-4 h-4" />
            </Link>
            <BookDemoLink className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-full text-base font-medium transition-colors">
              Book Demo
            </BookDemoLink>
          </motion.div>
        </div>

        {/* Right Visual (45%) */}
        <div className="w-full lg:w-[45%] relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative w-full aspect-[4/5] md:aspect-square bg-slate-50 rounded-[32px] border border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col p-6"
          >
            {/* Abstract connected graph background */}
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <svg className="w-full h-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 100 Q 150 50 200 200 T 350 100" fill="none" stroke="#2563EB" strokeWidth="1" strokeDasharray="4 4" />
                <path d="M 100 300 Q 250 350 200 200 T 300 350" fill="none" stroke="#2563EB" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="200" cy="200" r="4" fill="#2563EB" />
                <circle cx="50" cy="100" r="3" fill="#94A3B8" />
                <circle cx="350" cy="100" r="3" fill="#94A3B8" />
                <circle cx="100" cy="300" r="3" fill="#94A3B8" />
                <circle cx="300" cy="350" r="3" fill="#94A3B8" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col gap-4 h-full justify-center">
              
              {/* Candidate Card */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-lg">
                  RS
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Rahul Sharma</h3>
                  <p className="text-sm text-slate-500">Senior Backend Engineer</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                      <Calendar className="w-3 h-3" /> Interview Scheduled
                    </span>
                    <span className="text-xs text-slate-400">• Technical Round</span>
                  </div>
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
              >
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Interview Pipeline</h4>
                <div className="space-y-4">
                  {[
                    { step: 'Screening Complete', active: true, icon: CheckCircle2, color: 'text-emerald-500' },
                    { step: 'Assessment Complete', active: true, icon: CheckCircle2, color: 'text-emerald-500' },
                    { step: 'Technical Interview', active: true, icon: Users, color: 'text-blue-600', current: true },
                    { step: 'Hiring Manager Review', active: false, icon: MessageSquare, color: 'text-slate-300' }
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`relative flex items-center justify-center w-6 h-6 rounded-full ${s.current ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-transparent'}`}>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                        {i !== 3 && <div className={`absolute top-6 left-1/2 -ml-[1px] w-[2px] h-3 ${s.active && !s.current ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
                      </div>
                      <span className={`text-sm ${s.current ? 'text-slate-900 font-medium' : s.active ? 'text-slate-600' : 'text-slate-400'}`}>{s.step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Feedback Panel */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-slate-900 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-3 mt-auto"
              >
                <div>
                  <p className="text-xs text-slate-400 mb-1">Overall Score</p>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-white leading-none">9.1</span>
                    <span className="text-sm text-slate-500 mb-0.5">/10</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Strong Hire
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
