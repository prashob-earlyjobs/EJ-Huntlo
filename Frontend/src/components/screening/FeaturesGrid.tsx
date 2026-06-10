"use client";

import {
  Bot,
  ClipboardCheck,
  Filter,
  Mic,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    title: "AI Qualification",
    description: "Assess candidates against role requirements automatically.",
    icon: Bot,
  },
  {
    title: "Criteria Matching",
    description: "Score skills, experience, and fit against hiring criteria.",
    icon: Filter,
  },
  {
    title: "Voice Screening",
    description: "Run initial screening conversations with AI voice workflows.",
    icon: Mic,
  },
  {
    title: "Response Analysis",
    description: "Evaluate candidate answers before recruiter review.",
    icon: Sparkles,
  },
  {
    title: "Screening Workflows",
    description: "Standardize every qualification stage in one pipeline.",
    icon: ClipboardCheck,
  },
  {
    title: "Recruiter Review",
    description: "Maintain full visibility into screening outcomes.",
    icon: Users,
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Everything You Need To Screen Candidates Faster
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              whileHover={{ y: -5 }}
              className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-[0_20px_40px_rgba(15,23,42,0.06)] transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
