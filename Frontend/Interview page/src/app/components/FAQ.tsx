import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Can Huntlo manage interview workflows?",
    answer: "Yes. Schedule, evaluate, and manage interviews from one system."
  },
  {
    question: "Can interview feedback be standardized?",
    answer: "Yes. Structured scorecards ensure consistency across interviewers."
  },
  {
    question: "Can hiring teams collaborate?",
    answer: "Yes. Interviewers can share feedback and recommendations."
  },
  {
    question: "Does this integrate with assessments and screening?",
    answer: "Yes. Interview workflows connect directly with previous hiring stages."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 px-6 max-w-3xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div 
            key={i} 
            className={`border rounded-2xl transition-colors duration-300 overflow-hidden ${openIndex === i ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
            >
              <span className="font-semibold text-slate-900">{faq.question}</span>
              <ChevronDown 
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${openIndex === i ? 'rotate-180 text-blue-600' : ''}`} 
              />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
