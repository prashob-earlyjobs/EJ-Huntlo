import React from 'react';
import { motion } from 'motion/react';
import { Menu } from 'lucide-react';

export function Navbar() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Huntlo</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          {['Platform', 'Solutions', 'Resources', 'Pricing'].map((link) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase()}`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Log in
          </button>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm">
            Book Demo
          </button>
          <button className="md:hidden p-2 text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
