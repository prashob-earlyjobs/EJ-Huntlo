"use client";

import Image from "next/image";
import { motion } from "motion/react";

const integrations = [
  {
    name: "Gmail",
    provider: "Google",
    logo: "/integrations/gmail.svg",
    description: "Send and track candidate outreach from your inbox.",
    status: "Available",
  },
  {
    name: "WhatsApp",
    provider: "Meta",
    logo: "/integrations/whatsapp.svg",
    description: "Message candidates on WhatsApp from your workspace.",
    status: "Available",
  },
  {
    name: "Calendly",
    provider: "Calendly",
    logo: "/integrations/calendly.svg",
    description: "Share scheduling links and book meetings with candidates.",
    status: "Available",
  },
  {
    name: "LinkedIn",
    provider: "LinkedIn",
    logo: "/integrations/linkedin.svg",
    description: "Sync your LinkedIn account for outreach and profile enrichment.",
    status: "Coming soon",
  },
];

export function IntegrationsGrid() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Integrations Built For Recruiting Workflows
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {integrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Image src={item.logo} alt={item.name} width={32} height={32} className="h-8 w-auto" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        item.status === "Available"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{item.provider}</p>
                  <p className="text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
