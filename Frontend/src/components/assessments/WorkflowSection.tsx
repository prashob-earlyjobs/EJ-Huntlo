"use client";

import { motion } from "motion/react";

const steps = [
  { number: "01", title: "Assign", description: "Send role-based assessments to candidates." },
  { number: "02", title: "Complete", description: "Candidates finish tests on their schedule." },
  { number: "03", title: "Score", description: "Get automated skill scores and breakdowns." },
  { number: "04", title: "Advance", description: "Move top performers into interviews." },
];

export function WorkflowSection() {
  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <div className="mb-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          From Assessment To Interview-Ready Candidates
        </h2>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center mb-6 shadow-sm group hover:border-blue-600 transition-colors duration-300">
                <span className="text-xl font-bold text-slate-300 group-hover:text-blue-600 transition-colors">
                  {step.number}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-slate-500">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
