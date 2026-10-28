"use client";

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Shield, Info, CheckCircle, AlertTriangle, BookOpen, Lightbulb, Target } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface Finding {
  category?: string;
  severity?: string;
  title?: string;
  owasp_category?: string | null;
  cwe_id?: string | null;
  agent_source?: string;
}

interface SecurityRadarChartProps {
  findings?: Finding[];
  healthScore?: number;
}

export function SecurityRadarChart({ findings = [], healthScore = 100 }: SecurityRadarChartProps) {
  // Compute High/Med/Low tallies based on total findings
  const highRisk = findings.filter(f => f.severity === 'critical' || f.severity === 'high').length;
  const medRisk = findings.filter(f => f.severity === 'medium').length;
  const lowRisk = findings.filter(f => f.severity === 'low' || f.severity === 'info').length;

  const { actualScores, benchmarkScores, strongest, weakest } = useMemo(() => {
    const counts: Record<string, { critical: number; high: number; medium: number; low: number }> = {
      sql_injection: { critical: 0, high: 0, medium: 0, low: 0 },
      auth_crypto: { critical: 0, high: 0, medium: 0, low: 0 },
      data_xss: { critical: 0, high: 0, medium: 0, low: 0 },
      code_quality: { critical: 0, high: 0, medium: 0, low: 0 },
      complexity: { critical: 0, high: 0, medium: 0, low: 0 },
      error_handling: { critical: 0, high: 0, medium: 0, low: 0 },
      performance: { critical: 0, high: 0, medium: 0, low: 0 },
      maintenance: { critical: 0, high: 0, medium: 0, low: 0 },
    };

    findings.forEach((f) => {
      const cat = (f.category || f.title || f.owasp_category || "").toLowerCase();
      const sev = (f.severity || "medium").toLowerCase() as "critical" | "high" | "medium" | "low";

      if (cat.includes("sql") || cat.includes("inject")) {
        counts.sql_injection[sev] = (counts.sql_injection[sev] || 0) + 1;
      } else if (cat.includes("auth") || cat.includes("secret") || cat.includes("crypto") || cat.includes("key") || cat.includes("pass")) {
        counts.auth_crypto[sev] = (counts.auth_crypto[sev] || 0) + 1;
      } else if (cat.includes("data") || cat.includes("xss") || cat.includes("validat") || cat.includes("sanitiz")) {
        counts.data_xss[sev] = (counts.data_xss[sev] || 0) + 1;
      } else if (cat.includes("complex") || cat.includes("nest") || cat.includes("loop") || cat.includes("depth") || cat.includes("arrow")) {
        counts.complexity[sev] = (counts.complexity[sev] || 0) + 1;
      } else if (cat.includes("error") || cat.includes("except") || cat.includes("null") || cat.includes("reliab")) {
        counts.error_handling[sev] = (counts.error_handling[sev] || 0) + 1;
      } else if (cat.includes("perform") || cat.includes("slow") || cat.includes("memory")) {
        counts.performance[sev] = (counts.performance[sev] || 0) + 1;
      } else if (cat.includes("maintain") || cat.includes("format") || cat.includes("dry") || cat.includes("duplicat")) {
        counts.maintenance[sev] = (counts.maintenance[sev] || 0) + 1;
      } else {
        counts.code_quality[sev] = (counts.code_quality[sev] || 0) + 1;
      }
    });

    const calculateScore = (item: { critical: number; high: number; medium: number; low: number }) => {
      const penalty = item.critical * 40 + item.high * 25 + item.medium * 10 + item.low * 5;
      return Math.max(0, 100 - penalty);
    };

    const scores = {
      'SQL Injection': calculateScore(counts.sql_injection),
      'Auth & Cryptography': calculateScore(counts.auth_crypto),
      'Data Protection': calculateScore(counts.data_xss),
      'Code Quality': calculateScore(counts.code_quality),
      'Logic Complexity': calculateScore(counts.complexity),
      'Error Handling': calculateScore(counts.error_handling),
      'Performance': calculateScore(counts.performance),
      'Maintenance': calculateScore(counts.maintenance),
    };

    // Derived Insights logic
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top2 = sorted.slice(0, 2);
    // Find worst areas that are actually imperfect, otherwise none
    const validWeaknesses = Object.entries(scores).filter(s => s[1] < 100).sort((a, b) => a[1] - b[1]);
    const bottom2 = validWeaknesses.slice(0, 2);

    return { 
      actualScores: Object.values(scores), 
      benchmarkScores: [85, 90, 80, 75, 80, 70, 95, 80],
      strongest: top2,
      weakest: bottom2
    };
  }, [findings]);

  // Generate dynamic recommendation based on weakest links
  let recommendationStr = "Your code profile is near perfect! Maintain current secure coding practices moving forward.";
  if (weakest.length > 0) {
    recommendationStr = `Prioritize fixing ${weakest[0][0]} vulnerabilities and improving ${weakest.length > 1 ? weakest[1][0] : 'overall design'} mechanisms to strengthen your overall security posture.`;
  }

  const multiLineLabels = [
    ["🛡️ SQL Injection", `${actualScores[0]} /100`],
    ["🔒 Auth & Cryptography", `${actualScores[1]} /100`],
    ["🗄️ Data Protection", `${actualScores[2]} /100`],
    ["</> Code Quality", `${actualScores[3]} /100`],
    ["🔀 Logic Complexity", `${actualScores[4]} /100`],
    ["⚠️ Error Handling", `${actualScores[5]} /100`],
    ["⏱️ Performance", `${actualScores[6]} /100`],
    ["🔧 Maintenance", `${actualScores[7]} /100`]
  ];

  const data = {
    labels: multiLineLabels,
    datasets: [
      {
        label: 'Your Code Profile',
        data: actualScores,
        backgroundColor: 'rgba(220, 38, 38, 0.25)', // Deep translucent red
        borderColor: 'rgb(239, 68, 68)',
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Target / Optimal Baseline',
        data: benchmarkScores,
        backgroundColor: 'transparent',
        borderColor: 'rgb(234, 179, 8)', // Yellow
        pointBackgroundColor: 'rgb(234, 179, 8)', 
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(234, 179, 8)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2500,
      easing: 'easeOutElastic' as const,
      delay: (context: any) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = context.dataIndex * 150 + context.datasetIndex * 100;
        }
        return delay;
      },
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(148, 163, 184, 0.15)' },
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        pointLabels: {
          color: (ctx: any) => {
            // Give the score line (index 1 of the multi-line string array) a distinct color if needed,
            // or just render all as highly legible light slate
            return 'rgba(203, 213, 225, 0.95)';
          },
          font: { size: 12, weight: 'bold' as const },
          padding: 20
        },
        ticks: {
          display: true,
          color: 'rgba(148, 163, 184, 0.6)',
          backdropColor: 'transparent',
          min: 0,
          max: 100,
          stepSize: 25,
          font: { size: 10 }
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (context: any) => {
            // Grab only the category name from the multi-line label array
            const labelStr = Array.isArray(context[0].label) ? context[0].label[0] : context[0].label.split(',')[0];
            return labelStr.replace(/🛡️|🔒|🗄️|<\/>|🔀|⚠️|⏱️|🔧/g, '').trim();
          }
        }
      }
    }
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ", " + today.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="w-full bg-[#0B1120] text-slate-200 border border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8 animate-in fade-in duration-700">
      
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Security Posture Radar Profile</h2>
          <p className="text-slate-400 text-sm max-w-xl">Comprehensive view of your code security and quality posture across 8 key dimensions.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold block mb-1">Overall Security Posture</span>
            <div className="text-5xl font-bold text-yellow-500">
              {healthScore} <span className="text-2xl text-slate-500">/100</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="bg-red-950/40 border border-red-900/50 text-red-500 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> {highRisk} High Risk
            </div>
            <div className="bg-yellow-950/40 border border-yellow-900/50 text-yellow-500 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" /> {medRisk} Medium Risk
            </div>
            <div className="bg-blue-950/40 border border-blue-900/50 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4" /> {lowRisk} Low Risk
            </div>
          </div>
        </div>
      </div>

      {/* Main Radar Layout */}
      <div className="relative w-full flex justify-center items-center h-[550px] mb-8">
        {/* Absolute Legend */}
        <div className="absolute top-0 left-0 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl z-10 hidden lg:block">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-red-500 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border-2 border-white"></div></div>
              <span className="text-sm font-medium text-slate-300">Your Code Profile</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-yellow-500 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)] border-2 border-white"></div></div>
              <span className="text-sm font-medium text-slate-300">Target / Optimal Baseline</span>
            </div>
            <div className="w-full border-t border-slate-800 my-1"></div>
            <p className="text-xs text-slate-500 font-medium">Higher score = <br/>Better Security Posture</p>
          </div>
        </div>

        {/* The Graphic */}
        <div className="w-full max-w-4xl h-full">
          <Radar data={data} options={options} />
        </div>
      </div>

      {/* Middle Grid Row: Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-[300ms] fill-mode-both hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-200">How to read this chart</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            This radar chart compares your code security posture (red) against the optimal baseline (yellow) across 8 critical dimensions. Closer to the outer edge (100) indicates stronger security and quality posture.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-[500ms] fill-mode-both hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-500/10 transition-all">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-slate-200">Key Insights</h3>
          </div>
          
          <div className="mb-3">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1 block">Strongest Areas</span>
            <ul className="text-sm text-slate-300 pl-4 list-disc marker:text-emerald-500 space-y-1">
              {strongest.map(([st, val]) => <li key={st}>{st} ({val}/100)</li>)}
            </ul>
          </div>
          
          <div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 block">Areas Needing Attention</span>
            {weakest.length > 0 ? (
              <ul className="text-sm text-slate-300 pl-4 list-disc marker:text-red-500 space-y-1">
                {weakest.map(([wk, val]) => <li key={wk}>{wk} ({val}/100)</li>)}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">None detected!</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-[700ms] fill-mode-both hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-200">Recommendations</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {recommendationStr}
          </p>
        </div>
        
      </div>

      {/* Bottom Footer Row: Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 animate-in zoom-in-95 fade-in duration-500 delay-[900ms] fill-mode-both hover:-translate-y-1 hover:border-slate-600 transition-all cursor-default">
          <div className="bg-slate-800 p-2 rounded-lg text-slate-400"><Shield className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Total Findings</p>
            <div className="text-xl font-bold text-white">{findings.length} <span className="text-xs text-slate-500 font-normal">Across 8 categories</span></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 border-l-2 border-l-red-500 animate-in zoom-in-95 fade-in duration-500 delay-[1000ms] fill-mode-both hover:-translate-y-1 hover:border-slate-600 transition-all cursor-default relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-red-950/30 p-2 rounded-lg text-red-500"><AlertTriangle className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">High Risk</p>
            <div className="text-xl font-bold text-white">{highRisk}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Immediate attention</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 border-l-2 border-l-yellow-500 animate-in zoom-in-95 fade-in duration-500 delay-[1100ms] fill-mode-both hover:-translate-y-1 hover:border-slate-600 transition-all cursor-default relative overflow-hidden group">
          <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-yellow-950/30 p-2 rounded-lg text-yellow-500"><Target className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Medium Risk</p>
            <div className="text-xl font-bold text-white">{medRisk}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Should be addressed</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 border-l-2 border-l-blue-500 animate-in zoom-in-95 fade-in duration-500 delay-[1200ms] fill-mode-both hover:-translate-y-1 hover:border-slate-600 transition-all cursor-default relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-blue-950/30 p-2 rounded-lg text-blue-400"><Info className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Low Risk</p>
            <div className="text-xl font-bold text-white">{lowRisk}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Informational</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 animate-in zoom-in-95 fade-in duration-500 delay-[1300ms] fill-mode-both hover:-translate-y-1 hover:border-slate-600 transition-all cursor-default">
          <div className="bg-emerald-950/30 p-2 rounded-lg text-emerald-500"><CheckCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-xs text-slate-400">Last Scan</p>
            <div className="text-sm font-bold text-white whitespace-nowrap">{formatDate().split(', ')[0]}</div>
            <p className="text-[10px] text-slate-500 mt-0.5">{formatDate().split(', ')[1]}</p>
          </div>
        </div>

      </div>

    </div>
  );
}
