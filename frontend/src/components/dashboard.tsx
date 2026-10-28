"use client";

import React, { useEffect, useState } from "react";
import { getMySubmissions, Submission } from "@/lib/api";
import { 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight,
  ShieldCheck,
  Code,
  FileDown,
  Search,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardProps {
  onSelectSubmission: (submission: Submission) => void;
  refreshTrigger: number;
}

function RadialGauge({ value }: { value: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
        <circle
          cx="45"
          cy="45"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100 dark:text-slate-800/80 fill-none"
        />
        <circle
          cx="45"
          cy="45"
          r={radius}
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="fill-none transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</span>
        <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
      </div>
    </div>
  );
}

export function Dashboard({ onSelectSubmission, refreshTrigger }: DashboardProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [langFilter, setLangFilter] = useState<"all" | "python" | "java">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "analyzing" | "failed">("all");

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMySubmissions(0, 100);
      setSubmissions(data.items);
      setTotalSubmissions(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const securityIssuesCount = submissions.reduce((acc, curr) => {
    return acc + (curr.findings?.filter(f => f.agent_source === "security_vulnerability").length || 0);
  }, 0);

  const codeSmellsCount = submissions.reduce((acc, curr) => {
    return acc + (curr.findings?.filter(f => f.agent_source === "code_analysis").length || 0);
  }, 0);

  const severeCount = submissions.reduce((acc, curr) => {
    return acc + (curr.findings?.filter(f => (f.severity || "").toLowerCase() === "critical" || (f.severity || "").toLowerCase() === "high").length || 0);
  }, 0);

  const completedSubmissions = submissions.filter(s => s.status === "completed");
  const avgHealthScore = completedSubmissions.length > 0
    ? Math.round(
        completedSubmissions.reduce((acc, s) => {
          const scores = s.severity_scores || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
          const score = s.health_score ?? Math.max(0, Math.min(100, 100 - (Number(scores.critical) * 30) - (Number(scores.high) * 15) - (Number(scores.medium) * 8) - (Number(scores.low) * 3)));
          return acc + score;
        }, 0) / completedSubmissions.length
      )
    : 100;

  // Filtered submissions based on search and filters
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = 
      (sub.filename || "pasted_snippet").toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.source_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLang = langFilter === "all" || sub.language === langFilter;
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;

    return matchesSearch && matchesLang && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Banner & Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Developer Code Health Portal
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900 text-[10px]">
              <Sparkles className="h-3 w-3 mr-1 text-blue-500" /> Multi-Agent AI
            </Badge>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Real-time code health summary, compliance telemetry, and historical code reviews.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading} className="rounded-xl font-semibold border-slate-200 dark:border-slate-800">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Telemetry
        </Button>
      </div>

      {/* Metrics Row + Health Gauge Card */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        
        {/* Code Health Gauge Card */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm lg:col-span-1 p-6 flex flex-col items-center justify-center text-center gap-2">
          <RadialGauge value={avgHealthScore} />
          <div className="mt-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Average Code Health</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">Across {completedSubmissions.length} scans</span>
          </div>
        </Card>

        {/* Total Submissions */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Analyzed</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalSubmissions}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Terminal className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Security Vulnerabilities */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Vulnerabilities</p>
              <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-400">{securityIssuesCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Code Smells */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Code Quality Smells</p>
              <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-500">{codeSmellsCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-500 flex items-center justify-center">
              <Code className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Severe Findings */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical / High Issues</p>
              <h3 className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{severeCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

 
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Review History Explorer</CardTitle>
              <CardDescription className="text-sm mt-0.5 text-slate-500">Search and filter historical code quality and security scan reports.</CardDescription>
            </div>
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-3 py-1 self-start sm:self-auto">
              {filteredSubmissions.length} of {submissions.length} Runs
            </Badge>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search filename or scan ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs h-9"
              />
            </div>

            {/* Language filter */}
            <div className="flex items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Lang:</span>
              <Button
                type="button"
                variant={langFilter === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setLangFilter("all")}
                className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              >
                All
              </Button>
              <Button
                type="button"
                variant={langFilter === "python" ? "default" : "outline"}
                size="xs"
                onClick={() => setLangFilter("python")}
                className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              >
                🐍 Python
              </Button>
              <Button
                type="button"
                variant={langFilter === "java" ? "default" : "outline"}
                size="xs"
                onClick={() => setLangFilter("java")}
                className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              >
                ☕ Java
              </Button>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
              <Button
                type="button"
                variant={statusFilter === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setStatusFilter("all")}
                className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              >
                All
              </Button>
              <Button
                type="button"
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="xs"
                onClick={() => setStatusFilter("completed")}
                className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              >
                Completed
              </Button>
              <Button
                type="button"
                variant={statusFilter === "failed" ? "destructive" : "outline"}
                size="xs"
                onClick={() => setStatusFilter("failed")}
                className="rounded-lg text-xs font-bold h-8 cursor-pointer"
              >
                Failed
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm font-semibold text-red-500">{error}</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <ShieldCheck className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="font-semibold text-base">No matching scan history</p>
              <p className="text-sm mt-1">Try resetting search filters or submit a new code snippet above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                    <th className="py-4 px-6">Scan ID</th>
                    <th className="py-4 px-6">Language</th>
                    <th className="py-4 px-6">Filename</th>
                    <th className="py-4 px-6">Submission Type</th>
                    <th className="py-4 px-6">Status &amp; Findings</th>
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredSubmissions.map((sub) => {
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors text-sm">
                        <td className="py-4 px-6 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {sub.id.substring(0, 8)}...
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="font-bold border-slate-200 dark:border-slate-800">
                            {sub.language === "python" ? "🐍 Python" : "☕ Java"}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                          {sub.filename || "pasted_snippet"}
                        </td>
                        <td className="py-4 px-6 capitalize text-slate-500 dark:text-slate-400">
                          {sub.submission_type}
                        </td>
                        <td className="py-4 px-6">
                          {sub.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Pending
                            </span>
                          )}
                          {sub.status === "analyzing" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Analyzing...
                            </span>
                          )}
                          {sub.status === "failed" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                          )}
                          {sub.status === "completed" && (
                            <div className="flex flex-col gap-0.5">
                              {sub.findings && sub.findings.length > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {sub.findings.length} findings
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Secure (0 issues)
                                </span>
                              )}
                              {sub.severity_scores && (
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                  Crit:{sub.severity_scores.critical || 0} Hi:{sub.severity_scores.high || 0} Med:{sub.severity_scores.medium || 0} Lo:{sub.severity_scores.low || 0}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(sub.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                              window.open(`${API_URL}/api/v1/submissions/${sub.id}/pdf`, "_blank");
                            }}
                            className="font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs cursor-pointer"
                            title="Export PDF Report"
                          >
                            <FileDown className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            PDF Report
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onSelectSubmission(sub)}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl cursor-pointer"
                          >
                            View Result
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
