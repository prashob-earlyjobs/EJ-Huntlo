import React from 'react';
import { motion } from 'motion/react';

const stats = [
  { value: "70%", label: "Faster Coordination" },
  { value: "3X", label: "Faster Hiring Decisions" },
  { value: "90%", label: "Evaluation Consistency" },
  { value: "100%", label: "Structured Feedback" }
];

export function Stats() {
  return (
    <section className="py-24 bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Built For Interview Efficiency
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-blue-500/50">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`flex flex-col items-center text-center ${i === 0 ? '' : 'pl-8 md:pl-12'}`}
            >
              <div className="text-4xl md:text-5xl font-black mb-3 tracking-tighter">
                {stat.value}
              </div>
              <div className="text-sm md:text-base font-medium text-blue-100 max-w-[120px]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
