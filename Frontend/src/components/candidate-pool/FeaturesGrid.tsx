"use client";

import { Bookmark, Filter, FolderKanban, History, Send, Tags } from "lucide-react";
import { motion } from "motion/react";

const features = [
  { title: "Saved Candidates", description: "Keep promising profiles from every search session.", icon: Bookmark },
  { title: "Pool Management", description: "Organize talent across roles and hiring priorities.", icon: FolderKanban },
  { title: "Tags & Filters", description: "Find the right people quickly with structured labels.", icon: Tags },
  { title: "Smart Filtering", description: "Slice your pool by skills, location, and status.", icon: Filter },
  { title: "Search History", description: "Revisit past sourcing sessions without starting over.", icon: History },
  { title: "Campaign Ready", description: "Add pooled candidates to outreach in one click.", icon: Send },
];

export function FeaturesGrid() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Everything You Need To Manage Talent Pipelines
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
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
