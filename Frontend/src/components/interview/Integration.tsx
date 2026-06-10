"use client";

import { Fragment } from "react";
import { motion } from "motion/react";
import { ArrowRight } from 'lucide-react';

export function Integration() {
  const flow = ["Source", "Screen", "Assess", "Interview", "Hire"];

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto text-center">
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
          Everything Leads To Better Hiring Decisions
        </h2>
        <p className="text-lg text-slate-500 leading-relaxed">
          Candidates move seamlessly from sourcing, screening, and assessments into structured interview workflows.
        </p>
      </div>

      <div className="relative max-w-4xl mx-auto py-12">
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-slate-100 via-blue-100 to-emerald-100 -translate-y-1/2" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {flow.map((step, i) => {
            const isInterview = step === "Interview";
            return (
              <Fragment key={step}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`
                    w-full md:w-auto px-8 py-4 rounded-full font-semibold text-sm transition-all
                    ${isInterview 
                      ? 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.3)] scale-110 z-20' 
                      : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:border-blue-300'}
                  `}
                >
                  {step}
                </motion.div>
                {i < flow.length - 1 && (
                  <div className="md:hidden text-slate-300 py-2">
                    <ArrowRight className="w-5 h-5 rotate-90" />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
