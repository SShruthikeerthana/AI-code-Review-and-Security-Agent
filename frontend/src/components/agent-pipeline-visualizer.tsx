"use client";

import React from "react";
import { 
  Code, 
  ShieldAlert, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Zap,
  Activity
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AgentStep {
  id: string;
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "pending" | "running" | "completed" | "failed";
  findingsCount?: number;
  description: string;
}

interface AgentPipelineVisualizerProps {
  status: "pending" | "analyzing" | "completed" | "failed";
  findingsCount?: {
    codeAnalysis: number;
    security: number;
    total: number;
  };
}

export function AgentPipelineVisualizer({ status, findingsCount }: AgentPipelineVisualizerProps) {
  const steps: AgentStep[] = [
    {
      id: "code_analysis",
      name: "Code Analysis Agent",
      role: "Syntax, Smells & Anti-patterns",
      icon: Code,
      status: status === "analyzing" ? "running" : status === "completed" ? "completed" : status === "failed" ? "failed" : "pending",
      findingsCount: findingsCount?.codeAnalysis,
      description: "Detects cyclomatic complexity, code smells, and design anti-patterns.",
    },
    {
      id: "security_vulnerability",
      name: "Security Vulnerability Agent",
      role: "OWASP Top 10 & Secrets Scanner",
      icon: ShieldAlert,
      status: status === "analyzing" ? "running" : status === "completed" ? "completed" : status === "failed" ? "failed" : "pending",
      findingsCount: findingsCount?.security,
      description: "Scans for SQL injection, XSS, hardcoded secrets, and broken access controls.",
    },
    {
      id: "remediation",
      name: "Remediation Agent",
      role: "AST Code Refactoring Engine",
      icon: Sparkles,
      status: status === "completed" ? "completed" : status === "analyzing" ? "running" : status === "failed" ? "failed" : "pending",
      description: "Generates corrected code snippets grounded in secure coding standards.",
    },
    {
      id: "pr_summary",
      name: "PR Summary Agent",
      role: "Pull Request Review Synthesizer",
      icon: FileText,
      status: status === "completed" ? "completed" : status === "analyzing" ? "running" : status === "failed" ? "failed" : "pending",
      description: "Compiles all findings into a structured, human-readable pull request review.",
    },
  ];

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xl rounded-2xl overflow-hidden backdrop-blur-md p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              LangGraph Multi-Agent Orchestration Flow
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono text-[10px]">
                <Zap className="h-3 w-3 mr-1 text-amber-500 fill-amber-500" /> Parallel Execution
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated multi-agent pipeline processing code AST, OWASP rules, and RAG knowledge.
            </p>
          </div>
        </div>

        {/* Telemetry Status Indicator */}
        <div className="flex items-center gap-2">
          {status === "analyzing" && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-bold animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> Pipeline Active...
            </span>
          )}
          {status === "completed" && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Analysis Complete
            </span>
          )}
        </div>
      </div>

      {/* Nodes Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isRunning = step.status === "running";
          const isCompleted = step.status === "completed";
          const isFailed = step.status === "failed";

          return (
            <div key={step.id} className="relative flex flex-col justify-between p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all shadow-sm ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-emerald-500/20"
                      : isRunning
                      ? "bg-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse"
                      : isFailed
                      ? "bg-red-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                </div>

                <span className="font-mono text-[10px] font-bold text-slate-400">Step 0{idx + 1}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between gap-1">
                  <span>{step.name}</span>
                  {step.findingsCount !== undefined && (
                    <Badge variant="secondary" className="text-[9px] font-bold">
                      {step.findingsCount} issues
                    </Badge>
                  )}
                </h4>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">{step.role}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{step.description}</p>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
