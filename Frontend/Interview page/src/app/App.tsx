import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Logos } from './components/Logos';
import { ValueSection } from './components/ValueSection';
import { FeaturesGrid } from './components/FeaturesGrid';
import { Workflow } from './components/Workflow';
import { ProductShowcase } from './components/ProductShowcase';
import { InterviewPanel } from './components/InterviewPanel';
import { Stats } from './components/Stats';
import { Integration } from './components/Integration';
import { DecisionSection } from './components/DecisionSection';
import { FAQ } from './components/FAQ';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main className="overflow-hidden">
        <Hero />
        <Logos />
        <ValueSection />
        <FeaturesGrid />
        <Workflow />
        <ProductShowcase />
        <InterviewPanel />
        <Stats />
        <Integration />
        <DecisionSection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
