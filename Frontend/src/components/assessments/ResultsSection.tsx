"use client";

import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

const modules = [
  "Sourcing Signals",
  "Screening Outcomes",
  "Assessment Scores",
  "Skill Breakdown",
  "Advance to Interview",
];

export function ResultsSection() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto border-t border-slate-100">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        <div className="w-full lg:w-1/2 space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Measure Skills Before Every Interview
          </h2>
          <div className="pt-2">
            <h3 className="text-xl font-semibold text-slate-800 mb-3">
              Assessment intelligence in one place.
            </h3>
            <p className="text-lg text-slate-500 leading-relaxed max-w-md">
              Combine sourcing context, screening results, assessment scores, and recruiter review
              into one candidate profile.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 p-8 md:p-12 rounded-[32px] border border-slate-200"
          >
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {modules.map((mod) => (
                <div
                  key={mod}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 text-blue-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-100 group-odd:mr-auto group-even:ml-auto">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800">{mod}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
