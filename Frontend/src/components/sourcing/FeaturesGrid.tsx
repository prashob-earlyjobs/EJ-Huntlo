"use client";

import { motion } from "motion/react";
import { Search, Sparkles, UserCircle, Users, Database, History } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Natural Language Search",
    description: "Describe candidates in plain English."
  },
  {
    icon: Sparkles,
    title: "AI Match Scoring",
    description: "Prioritize the most relevant candidates instantly."
  },
  {
    icon: UserCircle,
    title: "Candidate Enrichment",
    description: "Access experience, skills, and contact details."
  },
  {
    icon: Users,
    title: "People Scout",
    description: "Find specific candidates quickly."
  },
  {
    icon: Database,
    title: "Candidate Pools",
    description: "Organize talent across hiring campaigns."
  },
  {
    icon: History,
    title: "Search History",
    description: "Never lose sourcing sessions."
  }
];

export function FeaturesGrid() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Everything you need to source talent faster
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
