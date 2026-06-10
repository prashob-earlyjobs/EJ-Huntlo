import React from 'react';

export function Logos() {
  return (
    <section className="py-12 border-y border-slate-100 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest">
          Trusted by modern recruiting teams
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Abstract geometric logos representing companies */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-2 font-bold text-xl text-slate-400">
              <div className={`w-6 h-6 rounded-sm bg-slate-300 ${i % 2 === 0 ? 'rounded-full' : ''}`} />
              Company {i}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
