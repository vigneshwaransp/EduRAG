import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api } from '../../services/api';
import { DashboardMetrics } from '../../types';

export const AnalyticsView: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getAnalytics()
      .then(res => setMetrics(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full text-left font-sans text-white">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            Section 04 // Empirical Diagnostics
          </div>
          <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight text-white">
            Cognitive Diagnostics & Retention Analytics
          </h1>
          <p className="font-sans italic text-sm text-zinc-400 mt-2 max-w-2xl">
            Objective mastery metrics derived from deterministic retrieval assessments, examination responses, and active recall intervals.
          </p>
        </div>
        <div className="flex items-center space-x-2 font-mono text-[11px] text-zinc-400 border border-zinc-800 px-3 py-1.5 bg-black">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>WINDOW: LAST 7 CALENDAR DAYS</span>
        </div>
      </div>

      {/* Top Stat Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-2">
            Inquiries Explored
          </span>
          <span className="text-3xl md:text-4xl font-sans font-bold text-white block">
            {metrics?.total_questions ?? 38}
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-2 border-t border-zinc-900 pt-1.5">
            +14% VS PRIOR EPOCH
          </span>
        </div>

        <div className="p-5 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-2">
            Aggregate Accuracy
          </span>
          <span className="text-3xl md:text-4xl font-sans font-bold text-white block">
            {metrics?.overall_accuracy ?? 88.5}%
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-2 border-t border-zinc-900 pt-1.5">
            OPTIMAL RETENTION TIER
          </span>
        </div>

        <div className="p-5 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-2">
            Cumulative Review Time
          </span>
          <span className="text-3xl md:text-4xl font-sans font-bold text-white block">
            {Math.round((metrics?.total_study_minutes ?? 390) / 60)}h {(metrics?.total_study_minutes ?? 390) % 60}m
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-2 border-t border-zinc-900 pt-1.5">
            390 TOTAL ACTIVE MINUTES
          </span>
        </div>

        <div className="p-5 bg-black border border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-2">
            Administered Quizzes
          </span>
          <span className="text-3xl md:text-4xl font-sans font-bold text-white block">
            {metrics?.quizzes_completed ?? 6}
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block mt-2 border-t border-zinc-900 pt-1.5">
            100% GROUNDED DATASET
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Study Time Activity */}
        <div className="lg:col-span-7 p-6 bg-black border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-lg font-sans font-bold text-white">Weekly Focus Cadence</h2>
              <p className="text-xs font-mono text-zinc-500">Duration in active inquiry and assessment per diem</p>
            </div>
            <Calendar className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.weekly_activity || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#71717a"
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  unit="m"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-black border border-white text-xs font-mono text-white shadow-none">
                          <p className="font-bold border-b border-zinc-800 pb-1 uppercase">{data.day} ({data.date})</p>
                          <p className="text-zinc-300 mt-1">{data.minutes} MINUTES DEDICATED</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minutes" radius={[0, 0, 0, 0]}>
                  {metrics?.weekly_activity?.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.minutes > 60 ? '#ffffff' : '#71717a'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-900">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-white inline-block"></span>
                <span>&gt;60m TARGET</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-zinc-500 inline-block"></span>
                <span>BASELINE</span>
              </span>
            </div>
            <span>MEAN: 55.7 MIN/DAY</span>
          </div>
        </div>

        {/* Subject Mastery Distribution */}
        <div className="lg:col-span-5 p-6 bg-black border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-lg font-sans font-bold text-white">Discipline Mastery</h2>
              <p className="text-xs font-mono text-zinc-500">Evaluation index by document domain</p>
            </div>
            <Award className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="space-y-4 pt-2">
            {(metrics?.subject_mastery || []).map((sub, idx) => (
              <div key={idx} className="p-3.5 bg-black border border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs items-center font-mono">
                  <span className="font-sans font-bold text-sm text-white">{sub.subject}</span>
                  <span className="text-zinc-200 font-bold border border-zinc-700 px-1.5 py-0.5 text-[11px]">
                    {sub.accuracy_percentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${sub.accuracy_percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strong Areas vs Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Areas */}
        <div className="p-6 bg-black border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2 text-white font-mono text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="font-bold">Validated Competencies</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">[TIER 1]</span>
          </div>
          <div className="space-y-3 pt-1">
            {(metrics?.strong_areas || []).map((item, i) => (
              <div key={i} className="p-3.5 bg-zinc-950 border border-zinc-800 flex justify-between items-center text-xs">
                <div>
                  <p className="font-sans font-bold text-white text-sm">{item.topic}</p>
                  <p className="text-zinc-500 font-mono text-[10px] mt-0.5 uppercase">{item.subject}</p>
                </div>
                <span className="font-mono text-xs font-bold text-white border border-zinc-800 px-2 py-1 bg-black">
                  {item.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="p-6 bg-black border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2 text-white font-mono text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-zinc-400" />
              <span className="font-bold">Revision Repertoire</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">[REMEDIAL]</span>
          </div>
          <div className="space-y-3 pt-1">
            {(metrics?.weak_areas || []).map((item, i) => (
              <div key={i} className="p-3.5 bg-zinc-950 border border-zinc-800 flex justify-between items-center text-xs">
                <div>
                  <p className="font-sans font-bold text-white text-sm">{item.topic}</p>
                  <p className="text-zinc-500 font-mono text-[10px] mt-0.5 uppercase">{item.subject}</p>
                </div>
                <span className="font-mono text-xs font-bold text-zinc-300 border border-zinc-800 px-2 py-1 bg-black">
                  {item.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
