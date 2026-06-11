"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, Plug } from "lucide-react";

import { BookDemoLink } from "@/components/landing/BookDemoLink";

const INTEGRATION_LOGOS = [
  { name: "Gmail", src: "/integrations/gmail.svg" },
  { name: "WhatsApp", src: "/integrations/whatsapp.svg" },
  { name: "Calendly", src: "/integrations/calendly.svg" },
  { name: "LinkedIn", src: "/integrations/linkedin.svg" },
];

export function HeroSection() {
  return (
    <section className="px-4 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20 md:pt-32 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row items-center gap-16">
        <div className="w-full lg:w-[55%] space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold tracking-wide uppercase"
          >
            <Plug className="w-3.5 h-3.5" />
            Huntlo Integrations
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-[56px] lg:text-[72px] leading-[1.1] font-black text-slate-900 tracking-tight"
          >
            Connect Your
            <br />
            <span className="text-blue-600">Hiring Stack.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl"
          >
            Plug Huntlo into the tools your team already uses — email, messaging, scheduling, and
            more — so outreach runs from one workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 pt-4"
          >
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-base font-medium transition-all shadow-[0_8px_16px_rgba(37,99,235,0.2)] flex items-center gap-2"
            >
              Connect Integrations
              <ArrowRight className="w-4 h-4" />
            </Link>
            <BookDemoLink className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-8 py-4 rounded-full text-base font-medium transition-colors">
              Book Demo
            </BookDemoLink>
          </motion.div>
        </div>

        <div className="w-full lg:w-[45%]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-slate-50 rounded-[32px] border border-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-8"
          >
            <div className="grid grid-cols-2 gap-4">
              {INTEGRATION_LOGOS.map((logo, i) => (
                <motion.div
                  key={logo.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col items-center justify-center gap-3 min-h-[120px]"
                >
                  <Image src={logo.src} alt={logo.name} width={40} height={40} className="h-10 w-auto" />
                  <span className="text-sm font-semibold text-slate-700">{logo.name}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 mt-6">
              Connect from your Huntlo dashboard in minutes.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
