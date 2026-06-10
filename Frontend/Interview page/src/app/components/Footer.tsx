import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-sm" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">Huntlo</span>
        </div>
        
        <div className="flex flex-wrap gap-6 justify-center">
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Cookie Policy</a>
        </div>
        
        <p>© {new Date().getFullYear()} Huntlo Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
