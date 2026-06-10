"use client";

import { Calendar, Mail, MessageCircle, Workflow } from "lucide-react";
import { motion } from "motion/react";

const benefits = [
  {
    icon: Mail,
    title: "Unified outreach",
    description: "Email and messaging channels connected to your campaigns.",
  },
  {
    icon: Calendar,
    title: "Faster scheduling",
    description: "Interview booking links flow directly into candidate conversations.",
  },
  {
    icon: MessageCircle,
    title: "Multi-channel engagement",
    description: "Reach candidates where they respond — inbox or WhatsApp.",
  },
  {
    icon: Workflow,
    title: "One workspace",
    description: "No switching between tools to run your hiring pipeline.",
  },
];

export function ValueSection() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          Less Tool Switching. More Hiring Momentum.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center p-6"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <b.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{b.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
