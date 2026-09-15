import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Award,
  Layers,
  BarChart3,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bookmark
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LandingPageProps {
  onStartLearning: () => void;
  onExploreDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartLearning, onExploreDemo }) => {
  const { exploreAsDemo } = useAuth();

  const handleDemoClick = async () => {
    await exploreAsDemo();
    onExploreDemo();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-white selection:text-black font-sans relative overflow-hidden text-left">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border border-white bg-black flex items-center justify-center text-white">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-sans font-bold text-xl tracking-tight text-white">
            EduRAG
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-800 px-2 py-0.5 ml-2 hidden sm:inline-block">
            ACADEMIC EDITION
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleDemoClick}
            className="text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-none"
          >
            Direct Demo
          </button>
          <button
            onClick={onStartLearning}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-none"
          >
            Enter Workspace
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 pt-12 pb-24 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 border border-zinc-700 text-zinc-300 text-[10px] font-mono uppercase tracking-widest bg-black">
              <span>Section 00 // Grounded Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-bold tracking-tight leading-[1.1] text-white">
              Transform Complex Treatises Into Verifiable Knowledge.
            </h1>

            <p className="font-sans italic text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
              Upload academic treatises, extract mathematical schemas and scanned folios via native OCR, and interrogate vector-indexed citations without hallucination.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onStartLearning}
                className="px-6 py-3.5 bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-none"
              >
                <span>Initialize Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDemoClick}
                className="px-6 py-3.5 bg-black hover:bg-zinc-900 text-white border border-zinc-700 font-mono font-bold text-xs uppercase tracking-wider transition-none"
              >
                Examine Seed Treatises
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-6 text-[11px] font-mono uppercase tracking-wider text-zinc-400 border-t border-zinc-900">
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Deterministic Grounding</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Bookmark className="w-4 h-4 text-white" />
                <span>Folio-Level Citations</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-white" />
                <span>Zero Hallucinations</span>
              </div>
            </div>
          </div>

          {/* Hero Right Composition: Stark Integrated Document Workspace */}
          <div className="lg:col-span-6">
            <div className="relative bg-black border border-white p-4 shadow-none">
              {/* Workspace Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3 text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-white inline-block"></span>
                  <span className="text-zinc-300 uppercase">Operating_Systems_Unit4.pdf</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-950 text-white border border-zinc-700 uppercase">
                  GROUNDING: 100%
                </span>
              </div>

              {/* Split view: Document snippet + AI conversation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {/* Left: Document text with highlighted passage */}
                <div className="bg-zinc-950 border border-zinc-800 p-3.5 text-xs font-sans text-zinc-400 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 font-mono text-[10px] border-b border-zinc-800 pb-1 uppercase">
                    <span>Folio 24</span>
                    <span className="text-white">Section 4.2 Deadlocks</span>
                  </div>
                  <p className="text-zinc-500 text-[11px]">
                    ...in multiprogramming architectures, processes compete for finite resources.
                  </p>
                  <p className="bg-white text-black p-2 font-sans text-xs font-medium border border-white">
                    Four conditions must hold simultaneously for a deadlock to arise: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.
                  </p>
                  <p className="text-zinc-500 text-[11px]">
                    If any one of these conditions is systematically prevented, deadlock cannot occur...
                  </p>
                </div>

                {/* Right: AI Tutor Conversation */}
                <div className="bg-zinc-950 border border-zinc-800 p-3.5 text-xs flex flex-col justify-between space-y-3 font-sans">
                  <div className="space-y-3">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="px-3 py-2 bg-black border border-zinc-700 text-white text-xs max-w-[90%] font-sans">
                        What conditions are required for a deadlock?
                      </div>
                    </div>

                    {/* AI message with citation */}
                    <div className="flex justify-start">
                      <div className="px-3 py-2.5 bg-black border border-white text-zinc-200 text-xs space-y-2">
                        <p className="leading-relaxed">
                          According to your archived notes, four conditions must hold simultaneously:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-zinc-300 font-mono text-[11px]">
                          <li>Mutual Exclusion</li>
                          <li>Hold and Wait</li>
                          <li>No Preemption</li>
                          <li>Circular Wait</li>
                        </ul>

                        {/* Citation Pill */}
                        <div className="pt-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white text-black text-[10px] font-mono font-bold uppercase">
                            <FileText className="w-3 h-3" />
                            <span>Operating Systems // Folio 24</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input pill */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800">
                    <input
                      readOnly
                      value="Compare deadlock prevention vs avoidance..."
                      className="w-full bg-black border border-zinc-800 px-2.5 py-1.5 text-[10px] font-mono text-zinc-500"
                    />
                    <button className="w-7 h-7 bg-white flex items-center justify-center text-black">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-28">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              System Capabilities // Module Overview
            </div>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-white">
              Rigorous Architectural Design
            </h2>
            <p className="font-sans italic text-zinc-400 text-sm">
              Beyond conversational heuristics: a multi-modal RAG architecture formulated for research institutions and scholars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 text-left">
            <div className="p-6 bg-black border border-zinc-800 hover:border-white transition-none group">
              <div className="w-8 h-8 border border-white bg-black text-white flex items-center justify-center mb-4">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-bold text-lg text-white mb-2">Verifiable Citations</h3>
              <p className="font-sans italic text-zinc-400 text-xs leading-relaxed">
                Direct navigation from synthesized statements to corresponding source folios and exact bounding paragraphs.
              </p>
            </div>

            <div className="p-6 bg-black border border-zinc-800 hover:border-white transition-none group">
              <div className="w-8 h-8 border border-white bg-black text-white flex items-center justify-center mb-4">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-bold text-lg text-white mb-2">Grounded Assessments</h3>
              <p className="font-sans italic text-zinc-400 text-xs leading-relaxed">
                Automated multi-choice examinations strictly grounded in uploaded chapters with conceptual diagnostic tracking.
              </p>
            </div>

            <div className="p-6 bg-black border border-zinc-800 hover:border-white transition-none group">
              <div className="w-8 h-8 border border-white bg-black text-white flex items-center justify-center mb-4">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-bold text-lg text-white mb-2">Recall Apparatus</h3>
              <p className="font-sans italic text-zinc-400 text-xs leading-relaxed">
                Conversion of treatise passages into tactile flip decks with active spaced review intervals.
              </p>
            </div>

            <div className="p-6 bg-black border border-zinc-800 hover:border-white transition-none group">
              <div className="w-8 h-8 border border-white bg-black text-white flex items-center justify-center mb-4">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-bold text-lg text-white mb-2">Empirical Analytics</h3>
              <p className="font-sans italic text-zinc-400 text-xs leading-relaxed">
                Objective retention metrics, weekly review cadences, and granular breakdown of disciplinary competencies.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs font-mono uppercase text-zinc-500">
        EduRAG // Retrieval-Augmented Generation for Academic Excellence // All Systems Grounded
      </footer>
    </div>
  );
};
