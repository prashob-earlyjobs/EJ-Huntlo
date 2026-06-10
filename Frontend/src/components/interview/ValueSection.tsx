"use client";

import { motion } from 'motion/react';

export function ValueSection() {
  const nodes = [
    "Skills",
    "Communication",
    "Culture",
    "Problem Solving",
    "Leadership",
    "Experience"
  ];

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Content */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="text-sm font-semibold text-blue-600 tracking-wider uppercase">
            WHY HUNTLO INTERVIEW
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Structured Interviews.<br />Better Decisions.
          </h2>
          <div className="pt-2">
            <h3 className="text-xl font-semibold text-slate-800 mb-3">
              Stop relying on interview notes.
            </h3>
            <p className="text-lg text-slate-500 leading-relaxed max-w-md">
              Centralize interview scheduling, interviewer feedback, candidate evaluations, and hiring recommendations in one structured workflow.
            </p>
          </div>
        </div>

        {/* Right Visual: Orbit */}
        <div className="w-full lg:w-1/2 flex justify-center items-center py-12">
          <div className="relative w-[340px] h-[340px] md:w-[400px] md:h-[400px]">
            {/* Orbits */}
            <div className="absolute inset-0 rounded-full border border-slate-200" />
            <div className="absolute inset-8 rounded-full border border-slate-100" />
            
            {/* Center Node */}
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-600 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.3)] flex items-center justify-center text-center z-10"
              animate={{ boxShadow: ['0 0 20px rgba(37,99,235,0.2)', '0 0 60px rgba(37,99,235,0.4)', '0 0 20px rgba(37,99,235,0.2)'] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <span className="text-white font-bold text-sm leading-tight px-4">
                Hiring Decision
              </span>
            </motion.div>

            {/* Orbiting Nodes */}
            {nodes.map((node, i) => {
              const angle = (i * (360 / nodes.length)) * (Math.PI / 180);
              const radius = 170; // outer radius
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.div
                  key={node}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: "spring" }}
                  className="absolute w-24 h-24 flex items-center justify-center z-20"
                  style={{
                    top: `calc(50% + ${y}px - 48px)`,
                    left: `calc(50% + ${x}px - 48px)`,
                  }}
                >
                  <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 text-center whitespace-nowrap">
                    {node}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
