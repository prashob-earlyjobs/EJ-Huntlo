"use client";

import { motion } from "motion/react";
import { ArrowRight, Search, Target, Sparkles, FolderPlus, Send } from "lucide-react";

const flow = [
  { icon: Search, label: "Search" },
  { icon: Target, label: "Discover" },
  { icon: Sparkles, label: "Enrich" },
  { icon: FolderPlus, label: "Save" },
  { icon: Send, label: "Engage", highlight: true }
];

export function IntegrationSection() {
  return (
    <section className="py-24 lg:py-32 bg-slate-50 border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
            Source Today. Engage Tomorrow.
          </h2>
          <p className="text-xl text-slate-600">
            Every candidate discovered can move directly into Huntlo Engage workflows.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            {flow.map((item, i) => (
              <div key={item.label} className="relative flex items-center w-full md:w-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className={`flex flex-col items-center justify-center w-32 h-32 rounded-2xl border-2 z-10 bg-white relative ${
                    item.highlight 
                      ? "border-blue-600 shadow-xl shadow-blue-600/20" 
                      : "border-slate-200 shadow-sm"
                  }`}
                >
                  <item.icon className={`w-8 h-8 mb-3 ${item.highlight ? "text-blue-600" : "text-slate-500"}`} />
                  <span className={`text-sm font-bold ${item.highlight ? "text-blue-600" : "text-slate-700"}`}>
                    {item.label}
                  </span>
                </motion.div>
                
                {i < flow.length - 1 && (
                  <div className="hidden md:flex flex-1 items-center justify-center min-w-[40px] px-2">
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.15 + 0.2 }}
                    >
                      <ArrowRight className="w-6 h-6 text-slate-300" />
                    </motion.div>
                  </div>
                )}
                {i < flow.length - 1 && (
                  <div className="md:hidden flex justify-center py-4 w-full text-slate-300">
                    <ArrowRight className="w-6 h-6 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
