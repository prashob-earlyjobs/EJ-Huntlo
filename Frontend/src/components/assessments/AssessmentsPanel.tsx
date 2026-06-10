"use client";

import { BarChart3, ClipboardList, FileCheck, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

const cards = [
  {
    title: "Assessment Queue",
    description: "Track tests assigned and in progress.",
    icon: ClipboardList,
  },
  {
    title: "Skill Scores",
    description: "Compare candidates on role-specific criteria.",
    icon: BarChart3,
  },
  {
    title: "Test Results",
    description: "Review detailed performance breakdowns.",
    icon: FileCheck,
  },
  {
    title: "Advancement Status",
    description: "Move qualified candidates forward confidently.",
    icon: ShieldCheck,
  },
];

export function AssessmentsPanel() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight max-w-2xl">
          Everything Connected In One Assessment Workflow
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group p-8 rounded-3xl bg-white border border-slate-200 hover:border-blue-200 shadow-sm hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 text-slate-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors duration-300">
              <card.icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{card.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{card.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
