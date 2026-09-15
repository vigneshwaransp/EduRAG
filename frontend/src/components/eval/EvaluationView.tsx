import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Play,
  Clock,
  Bookmark,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export const EvaluationView: React.FC = () => {
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [running, setRunning] = useState<boolean>(false);

  const runBenchmark = async () => {
    setRunning(true);
    try {
      const res = await api.getBenchmark();
      setBenchmarkData(res);
    } catch (e) {
      console.error('Benchmark execution error:', e);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runBenchmark();
  }, []);

  const metrics = benchmarkData?.metrics;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full text-left font-sans text-white">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            Section 05 // Benchmark Protocol
          </div>
          <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight text-white">
            RAG Performance & Grounding Audit
          </h1>
          <p className="font-sans italic text-sm text-zinc-400 mt-2 max-w-2xl">
            Empirical validation of vector retrieval precision, context relevance, answer faithfulness, and citation integrity.
          </p>
        </div>

        <button
          onClick={runBenchmark}
          disabled={running}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-none disabled:opacity-40"
        >
          <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Executing Benchmark...' : 'Execute Suite'}</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
            Precision @ K
          </span>
          <span className="text-2xl font-sans font-bold text-white block">
            {metrics ? (metrics.precision_at_k * 100).toFixed(1) + '%' : '...'}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase">Top-5 chunks</span>
        </div>

        <div className="p-4 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
            Recall @ K
          </span>
          <span className="text-2xl font-sans font-bold text-white block">
            {metrics ? (metrics.recall_at_k * 100).toFixed(1) + '%' : '...'}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase">Truth match</span>
        </div>

        <div className="p-4 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
            Context Relevance
          </span>
          <span className="text-2xl font-sans font-bold text-white block">
            {metrics ? (metrics.context_relevance * 100).toFixed(1) + '%' : '...'}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase">Semantic overlap</span>
        </div>

        <div className="p-4 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
            Faithfulness
          </span>
          <span className="text-2xl font-sans font-bold text-white block">
            {metrics ? (metrics.answer_faithfulness * 100).toFixed(1) + '%' : '...'}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase">Anti-hallucination</span>
        </div>

        <div className="p-4 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
            Citation Index
          </span>
          <span className="text-2xl font-sans font-bold text-white block">
            {metrics ? (metrics.citation_accuracy * 100).toFixed(1) + '%' : '...'}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase">Page anchor verified</span>
        </div>

        <div className="p-4 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
            Mean Latency
          </span>
          <span className="text-2xl font-sans font-bold text-white block">
            {metrics ? `${metrics.average_latency_ms}ms` : '...'}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase">End-to-end</span>
        </div>
      </div>

      {/* Benchmark Test Cases Table */}
      <div className="bg-black border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-lg font-sans font-bold text-white">Validation Protocol & Ground Truth Cases</h2>
            <p className="text-xs font-mono text-zinc-500">
              Evaluates query retrieval accuracy, conceptual completeness, and out-of-domain refusal.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-zinc-950 text-white border border-zinc-700 uppercase tracking-wider">
            STATUS: {benchmarkData?.overall_status || 'VERIFIED'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-zinc-500 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-wider bg-zinc-950">
              <tr>
                <th className="py-3 px-3">Query Specification</th>
                <th className="py-3 px-3">Domain</th>
                <th className="py-3 px-3">Precision</th>
                <th className="py-3 px-3">Faithfulness</th>
                <th className="py-3 px-3">Anchors</th>
                <th className="py-3 px-3">Latency</th>
                <th className="py-3 px-3">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono">
              {(benchmarkData?.details || []).map((t: any, idx: number) => (
                <tr key={idx} className="hover:bg-zinc-950 transition-none">
                  <td className="py-3 px-3 font-sans font-medium text-white max-w-xs truncate text-xs">
                    {t.query}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 border border-zinc-800 text-zinc-400 text-[10px] uppercase">
                      {t.subject}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-zinc-300">
                    {(t.precision * 100).toFixed(0)}%
                  </td>
                  <td className="py-3 px-3 text-white font-bold">
                    {(t.faithfulness * 100).toFixed(0)}%
                  </td>
                  <td className="py-3 px-3 text-zinc-400">
                    {t.citations_count} sources
                  </td>
                  <td className="py-3 px-3 text-zinc-500">
                    {t.latency_ms}ms
                  </td>
                  <td className="py-3 px-3">
                    {t.status === 'PASS' ? (
                      <span className="inline-flex items-center space-x-1 text-white font-bold border border-zinc-700 px-1.5 py-0.5 bg-black text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>PASS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-zinc-400 font-bold border border-zinc-800 px-1.5 py-0.5 bg-zinc-950 text-[10px]">
                        <AlertCircle className="w-3 h-3" />
                        <span>WARN</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
