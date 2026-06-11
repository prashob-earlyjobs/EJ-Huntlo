"use client";

import { motion } from "motion/react";
import { Search, Filter, SlidersHorizontal, ChevronDown, CheckCircle2 } from "lucide-react";

export function ProductShowcase() {
  return (
    <section className="py-24 lg:py-32 bg-slate-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Built Around How Recruiters Actually Search
          </h2>
          <p className="text-xl text-slate-400">
            A workspace designed for operational intelligence and speed.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-5xl rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl overflow-hidden"
        >
          {/* Top Bar */}
          <div className="h-12 border-b border-slate-700 bg-slate-800/50 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
            </div>
            <div className="mx-auto hidden px-32 md:block">
              <div className="h-6 w-[300px] bg-slate-700 rounded-md" />
            </div>
          </div>

          <div className="flex h-[420px] sm:h-[500px] md:h-[600px]">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-700 bg-slate-800/30 p-4 hidden md:block">
              <div className="flex items-center gap-2 text-slate-300 font-medium mb-6 px-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </div>
              <div className="space-y-6">
                {[
                  { title: "Role", items: ["Engineering", "Product", "Design"] },
                  { title: "Location", items: ["San Francisco", "Remote", "London"] },
                  { title: "Skills", items: ["React", "Node.js", "Python"] }
                ].map((group) => (
                  <div key={group.title}>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex justify-between items-center">
                      {group.title}
                      <ChevronDown className="w-3 h-3" />
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <div key={item} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-md cursor-pointer">
                          <div className="w-3 h-3 rounded-[3px] border border-slate-500" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 bg-slate-900 p-6 overflow-hidden flex flex-col">
              {/* Search Query */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  readOnly 
                  value="Product Designers in NY with FinTech background" 
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl pl-12 pr-24 sm:pr-28 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors">
                  Search
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4 text-sm">
                <div className="text-slate-400">Showing 142 matches</div>
                <div className="flex items-center gap-2 text-slate-400">
                  Sort by: <span className="text-white font-medium flex items-center gap-1">Relevance <ChevronDown className="w-4 h-4"/></span>
                </div>
              </div>

              {/* Candidate Results */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { name: "Sarah Jenkins", role: "Senior Product Designer", match: 98, company: "Stripe", exp: "8 yrs", loc: "New York, NY" },
                  { name: "Michael Chen", role: "Lead Designer", match: 94, company: "Plaid", exp: "10 yrs", loc: "Brooklyn, NY" },
                  { name: "Elena Rodriguez", role: "Product Designer", match: 91, company: "Square", exp: "5 yrs", loc: "New York, NY" },
                ].map((candidate, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer flex flex-col sm:flex-row gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold shrink-0">
                      {candidate.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                        <div className="font-bold text-white text-base sm:text-lg">{candidate.name}</div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                          Match {candidate.match}%
                        </div>
                      </div>
                      <div className="text-slate-400 text-sm mb-3">{candidate.role} at {candidate.company}</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-300">{candidate.exp}</span>
                        <span className="px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-300">{candidate.loc}</span>
                        <span className="px-2 py-1 rounded bg-blue-500/10 text-xs text-blue-400 font-medium">FinTech</span>
                        <span className="px-2 py-1 rounded bg-purple-500/10 text-xs text-purple-400 font-medium">SaaS</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
