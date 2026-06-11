"use client";

import { motion } from "motion/react";
import { Target } from "lucide-react";

export function ValueSection() {
  return (
    <section className="py-24 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-4">
              Why Huntlo Source
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
              Candidate Discovery,<br /> Reimagined
            </h2>
            <div className="space-y-6 text-lg text-slate-600">
              <p className="font-medium text-slate-900">
                Stop searching. Start discovering.
              </p>
              <p>
                Traditional sourcing requires recruiters to switch between platforms, filters, spreadsheets, and manual research. Huntlo transforms hiring intent into qualified talent instantly.
              </p>
            </div>
          </motion.div>

          {/* Right Visual - Orbit */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[280px] sm:h-[360px] md:h-[500px] flex items-center justify-center overflow-hidden md:overflow-visible scale-[0.72] sm:scale-90 md:scale-100 origin-center"
          >
            {/* Orbits */}
            <div className="absolute w-[300px] h-[300px] border border-slate-100 rounded-full" />
            <div className="absolute w-[400px] h-[400px] border border-slate-100 rounded-full" />
            
            {/* Center Node */}
            <div className="relative z-10 w-24 h-24 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white shadow-xl shadow-blue-600/30">
              <Target className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-50 text-center leading-tight">Ideal<br/>Match</span>
            </div>

            {/* Orbiting Nodes */}
            {[
              { label: "Skills", angle: 0, radius: 150, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Experience", angle: 60, radius: 200, color: "bg-purple-50 text-purple-700 border-purple-200" },
              { label: "Location", angle: 120, radius: 150, color: "bg-orange-50 text-orange-700 border-orange-200" },
              { label: "Industry", angle: 180, radius: 200, color: "bg-pink-50 text-pink-700 border-pink-200" },
              { label: "Companies", angle: 240, radius: 150, color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
              { label: "Signals", angle: 300, radius: 200, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
            ].map((node, i) => {
              const rad = (node.angle * Math.PI) / 180;
              const x = Math.cos(rad) * node.radius;
              const y = Math.sin(rad) * node.radius;
              
              return (
                <motion.div
                  key={node.label}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full border text-sm font-bold shadow-sm whitespace-nowrap ${node.color}`}
                  animate={{ 
                    x: [x, x + (Math.random() * 10 - 5), x],
                    y: [y, y + (Math.random() * 10 - 5), y]
                  }}
                  transition={{ 
                    duration: 4 + Math.random() * 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                >
                  {node.label}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
