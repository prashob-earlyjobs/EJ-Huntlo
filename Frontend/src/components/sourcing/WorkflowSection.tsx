"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const steps = [
  { number: "01", title: "Describe", description: "Explain your ideal candidate." },
  { number: "02", title: "Discover", description: "AI identifies matching talent." },
  { number: "03", title: "Enrich", description: "Profiles gain deeper signals." },
  { number: "04", title: "Engage", description: "Move directly into outreach." }
];

export function WorkflowSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            From Intent to Talent in Minutes
          </h2>
        </div>

        <div className="relative">
          {/* Connector Line */}
          <div className="hidden lg:block absolute top-[45px] left-[10%] right-[10%] h-[2px] bg-slate-100">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>

          <div className="grid lg:grid-cols-4 gap-12 lg:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 bg-white border-[6px] border-slate-50 rounded-full flex items-center justify-center text-2xl font-black text-slate-300 group-hover:text-blue-600 group-hover:border-blue-50 transition-colors z-10 mb-6 shadow-sm">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
                
                {i < steps.length - 1 && (
                  <div className="lg:hidden mt-8 text-slate-300">
                    <ArrowRight className="w-6 h-6 rotate-90" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
