"use client";

import { Bell, ClipboardCheck, LayoutDashboard, Search, Settings, Users } from "lucide-react";
import { motion } from "motion/react";

export function ProductShowcase() {
  return (
    <section className="py-24 px-6 bg-slate-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Built For High-Volume Qualification
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative max-w-5xl mx-auto bg-slate-800 rounded-t-[32px] rounded-b-xl border border-slate-700 shadow-2xl overflow-hidden"
        >
          <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
            </div>
            <div className="mx-auto bg-slate-700/50 rounded-md h-6 w-64 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 font-medium tracking-wider">
                app.huntlo.com/screening
              </span>
            </div>
          </div>

          <div className="flex h-[500px] md:h-[600px] bg-[#0B1120]">
            <div className="w-16 md:w-64 border-r border-slate-800 flex flex-col p-4">
              <div className="flex items-center gap-3 mb-8 px-2 hidden md:flex">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-sm" />
                </div>
                <span className="font-bold text-sm">Huntlo</span>
              </div>

              <div className="space-y-2 flex-1">
                {[
                  { icon: LayoutDashboard, label: "Dashboard" },
                  { icon: ClipboardCheck, label: "Screening", active: true },
                  { icon: Users, label: "Candidates" },
                  { icon: Settings, label: "Settings" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer ${
                      item.active
                        ? "bg-blue-600/10 text-blue-500"
                        : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium hidden md:block">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6">
                <h2 className="font-semibold hidden sm:block">Screening</h2>
                <div className="flex items-center gap-4 ml-auto">
                  <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      className="bg-slate-800 rounded-full pl-9 pr-4 py-1.5 text-sm border border-slate-700 outline-none focus:border-blue-500"
                      readOnly
                    />
                  </div>
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600" />
                </div>
              </header>

              <div className="flex-1 p-6 overflow-hidden flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-sm font-medium border border-slate-700 text-slate-300">
                      Awaiting Review
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-transparent text-sm font-medium text-slate-500">
                      Qualified
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-transparent text-sm font-medium text-slate-500">
                      Not a Fit
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[
                    {
                      role: "Senior Backend Engineer",
                      candidate: "Priya Nair",
                      match: "94%",
                      status: "Qualified",
                      color: "bg-emerald-500",
                    },
                    {
                      role: "Product Manager",
                      candidate: "James Liu",
                      match: "87%",
                      status: "Review",
                      color: "bg-amber-500",
                    },
                    {
                      role: "UX Designer",
                      candidate: "Sofia Martinez",
                      match: "91%",
                      status: "Voice Done",
                      color: "bg-blue-500",
                    },
                  ].map((row) => (
                    <motion.div
                      key={row.candidate}
                      whileHover={{ scale: 1.02 }}
                      className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">{row.role}</p>
                          <h4 className="font-semibold">{row.candidate}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold text-white px-2 py-1 rounded-full ${row.color}`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Criteria match</span>
                        <span className="font-semibold text-blue-400">{row.match}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
