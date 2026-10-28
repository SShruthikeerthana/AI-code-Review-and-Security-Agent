"use client";

import { useState } from "react";

interface SeverityScores {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

interface SeverityPieChartProps {
  scores: SeverityScores;
}

export function SeverityPieChart({ scores }: SeverityPieChartProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { key: "critical", label: "Critical", count: scores.critical || 0, color: "#ef4444", bgClass: "bg-red-500", textClass: "text-red-500" },
    { key: "high", label: "High", count: scores.high || 0, color: "#f97316", bgClass: "bg-orange-500", textClass: "text-orange-500" },
    { key: "medium", label: "Medium", count: scores.medium || 0, color: "#eab308", bgClass: "bg-amber-500", textClass: "text-amber-500" },
    { key: "low", label: "Low", count: scores.low || 0, color: "#3b82f6", bgClass: "bg-blue-500", textClass: "text-blue-500" },
    { key: "info", label: "Info", count: scores.info || 0, color: "#64748b", bgClass: "bg-slate-500", textClass: "text-slate-500" },
  ];

  const total = categories.reduce((sum, cat) => sum + cat.count, 0);

  // Calculate SVG arc parameters for donut chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = categories
    .filter((cat) => cat.count > 0)
    .map((cat) => {
      const percent = total > 0 ? cat.count / total : 0;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedPercent * circumference;
      accumulatedPercent += percent;
      return {
        ...cat,
        percent: Math.round(percent * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* SVG Donut Chart */}
      <div className="relative flex items-center justify-center w-36 h-36 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background Ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="14"
            fill="transparent"
          />
          {total === 0 ? (
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-emerald-500"
              strokeWidth="14"
              fill="transparent"
            />
          ) : (
            slices.map((slice) => (
              <circle
                key={slice.key}
                cx="50"
                cy="50"
                r={radius}
                stroke={slice.color}
                strokeWidth={activeCategory === slice.key ? "18" : "14"}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="butt"
                fill="transparent"
                onMouseEnter={() => setActiveCategory(slice.key)}
                onMouseLeave={() => setActiveCategory(null)}
                className="transition-all duration-200 cursor-pointer hover:opacity-90"
              />
            ))
          )}
        </svg>

        {/* Donut Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {total}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {total === 1 ? "Issue" : "Findings"}
          </span>
        </div>
      </div>

      {/* Interactive Legend Grid */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        {categories.map((cat) => {
          const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
          const isSelected = activeCategory === cat.key;

          return (
            <div
              key={cat.key}
              onMouseEnter={() => setActiveCategory(cat.key)}
              onMouseLeave={() => setActiveCategory(null)}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.02]"
                  : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${cat.bgClass} flex-shrink-0`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {cat.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs font-extrabold ${cat.textClass}`}>
                  {cat.count}
                </span>
                {total > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({pct}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
