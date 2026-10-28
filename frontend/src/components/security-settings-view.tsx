"use client";

import React, { useState } from "react";
import { 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  Save, 
  SlidersHorizontal
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SecuritySettingsView() {
  const [activeRules, setActiveRules] = useState({
    sqli: true,
    secrets: true,
    xss: true,
    astComplexity: true,
    owaspStrictness: true,
    pciDssCompliance: false
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [complexityThreshold, setComplexityThreshold] = useState(10);
  const [minConfidenceScore, setMinConfidenceScore] = useState(80);

  // Load saved settings from localStorage on mount
  React.useEffect(() => {
    try {
      const savedConfig = localStorage.getItem("spotlight_security_policy");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.activeRules) setActiveRules(parsed.activeRules);
        if (parsed.complexityThreshold) setComplexityThreshold(parsed.complexityThreshold);
        if (parsed.minConfidenceScore) setMinConfidenceScore(parsed.minConfidenceScore);
      }
    } catch (e) {
      console.error("Failed to load security policy settings:", e);
    }
  }, []);

  const handleToggle = (key: keyof typeof activeRules) => {
    setActiveRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem("spotlight_security_policy", JSON.stringify({
        activeRules,
        complexityThreshold,
        minConfidenceScore
      }));
    } catch (e) {
      console.error("Failed to save security policy:", e);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
                Policy Management
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                Multi-Agent Pipeline Controls
              </Badge>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Security Policy &amp; Scanner Rule Configuration
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Configure active rule engines, severity risk thresholds, and compliance strictness for the multi-agent review pipeline.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Policy Storage Location</span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                localStorage (&apos;spotlight_security_policy&apos;)
              </span>
            </div>

            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 py-2.5 text-xs shadow-lg shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
            >
              {savedSuccess ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
              {savedSuccess ? "Policy Saved & Applied!" : "Save Policy Config"}
            </Button>
          </div>
        </div>

        {/* Active Policy Status Banner */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>
              <strong>Active Storage:</strong> Policy rules are persisted in your browser storage and automatically enforced on all security scans.
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] flex-shrink-0">
            <Badge variant="outline" className="bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
              Max Complexity: {complexityThreshold}
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300">
              Confidence Cutoff: {minConfidenceScore}%
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Scanner Rule Toggles */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl p-6 space-y-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Active Vulnerability Scanner Modules
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Toggle specific agent rule checks on or off during automated source code scans.
            </CardDescription>
          </CardHeader>

          <div className="space-y-4">
            {/* Rule item 1 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  SQL &amp; Command Injection Detector (CWE-89, CWE-78)
                </span>
                <p className="text-xs text-slate-500">Flag string concatenation in SQL queries, DB-API calls, and subprocess execution.</p>
              </div>
              <Button
                variant={activeRules.sqli ? "default" : "outline"}
                size="xs"
                onClick={() => handleToggle("sqli")}
                className={`rounded-xl px-4 text-xs font-bold ${activeRules.sqli ? "bg-emerald-600 text-white" : ""}`}
              >
                {activeRules.sqli ? "ACTIVE" : "DISABLED"}
              </Button>
            </div>

            {/* Rule item 2 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Hardcoded Secret &amp; Credentials Scanner (CWE-798)
                </span>
                <p className="text-xs text-slate-500">Detect embedded JWT secrets, AWS tokens, API keys, and database passwords.</p>
              </div>
              <Button
                variant={activeRules.secrets ? "default" : "outline"}
                size="xs"
                onClick={() => handleToggle("secrets")}
                className={`rounded-xl px-4 text-xs font-bold ${activeRules.secrets ? "bg-emerald-600 text-white" : ""}`}
              >
                {activeRules.secrets ? "ACTIVE" : "DISABLED"}
              </Button>
            </div>

            {/* Rule item 3 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  AST Code Complexity &amp; Cyclomatic Smells
                </span>
                <p className="text-xs text-slate-500">Analyze abstract syntax tree for deeply nested loops, high cyclomatic index, and long methods.</p>
              </div>
              <Button
                variant={activeRules.astComplexity ? "default" : "outline"}
                size="xs"
                onClick={() => handleToggle("astComplexity")}
                className={`rounded-xl px-4 text-xs font-bold ${activeRules.astComplexity ? "bg-emerald-600 text-white" : ""}`}
              >
                {activeRules.astComplexity ? "ACTIVE" : "DISABLED"}
              </Button>
            </div>

            {/* Rule item 4 */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  OWASP Top 10 2021 Strict Compliance Classifier
                </span>
                <p className="text-xs text-slate-500">Automatically classify every finding against OWASP Top 10 categories A01-A10.</p>
              </div>
              <Button
                variant={activeRules.owaspStrictness ? "default" : "outline"}
                size="xs"
                onClick={() => handleToggle("owaspStrictness")}
                className={`rounded-xl px-4 text-xs font-bold ${activeRules.owaspStrictness ? "bg-emerald-600 text-white" : ""}`}
              >
                {activeRules.owaspStrictness ? "ACTIVE" : "DISABLED"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Column: Thresholds & Standards Settings */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl p-6 space-y-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Threshold Controls
            </CardTitle>
          </CardHeader>

          <div className="space-y-5">
            {/* Threshold 1 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Max Cyclomatic Complexity:</span>
                <span className="font-mono font-bold text-blue-600">{complexityThreshold}</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                value={complexityThreshold}
                onChange={(e) => setComplexityThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[10px] text-slate-400">Functions exceeding this complexity index will trigger a Refactoring Finding.</p>
            </div>

            {/* Threshold 2 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Agent Confidence Cutoff:</span>
                <span className="font-mono font-bold text-purple-600">{minConfidenceScore}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={minConfidenceScore}
                onChange={(e) => setMinConfidenceScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <p className="text-[10px] text-slate-400">Only report security findings with AI agent confidence equal to or greater than cutoff.</p>
            </div>

            {/* Standards Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Compliance Enforcements</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">OWASP Top 10 (2021)</span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">ENFORCED</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">CWE Top 25 Most Dangerous</span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">ENFORCED</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">PCI-DSS v4.0 Secure Code</span>
                  <Badge variant="outline" className="text-[10px] text-slate-400">OPTIONAL</Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
