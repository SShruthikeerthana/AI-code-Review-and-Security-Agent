"use client";

import React, { useState } from "react";
import { Copy, Check, ArrowRightLeft, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CodeDiffViewerProps {
  originalCode: string;
  remediatedCode: string;
  language: string;
  showCopyButton?: boolean;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged" | "modified";
  leftLineNum?: number;
  rightLineNum?: number;
  leftContent?: string;
  rightContent?: string;
}

function computeSimpleDiff(original: string, remediated: string): DiffLine[] {
  const origLines = original.split("\n");
  const remLines = remediated.split("\n");

  const result: DiffLine[] = [];

  let oIdx = 0;
  let rIdx = 0;

  while (oIdx < origLines.length || rIdx < remLines.length) {
    const orig = origLines[oIdx];
    const rem = remLines[rIdx];

    if (orig === rem) {
      result.push({
        type: "unchanged",
        leftLineNum: oIdx + 1,
        rightLineNum: rIdx + 1,
        leftContent: orig,
        rightContent: rem,
      });
      oIdx++;
      rIdx++;
    } else if (orig !== undefined && rem !== undefined) {
      // Check if original line appears later in remediated
      const remNextIdx = remLines.indexOf(orig, rIdx);
      const origNextIdx = origLines.indexOf(rem, oIdx);

      if (remNextIdx !== -1 && (origNextIdx === -1 || remNextIdx - rIdx <= origNextIdx - oIdx)) {
        // Lines were inserted in remediated code
        while (rIdx < remNextIdx) {
          result.push({
            type: "added",
            rightLineNum: rIdx + 1,
            rightContent: remLines[rIdx],
          });
          rIdx++;
        }
      } else if (origNextIdx !== -1) {
        // Lines were removed from original code
        while (oIdx < origNextIdx) {
          result.push({
            type: "removed",
            leftLineNum: oIdx + 1,
            leftContent: origLines[oIdx],
          });
          oIdx++;
        }
      } else {
        // Line was modified
        result.push({
          type: "modified",
          leftLineNum: oIdx + 1,
          rightLineNum: rIdx + 1,
          leftContent: orig,
          rightContent: rem,
        });
        oIdx++;
        rIdx++;
      }
    } else if (orig !== undefined) {
      result.push({
        type: "removed",
        leftLineNum: oIdx + 1,
        leftContent: orig,
      });
      oIdx++;
    } else if (rem !== undefined) {
      result.push({
        type: "added",
        rightLineNum: rIdx + 1,
        rightContent: rem,
      });
      rIdx++;
    }
  }

  return result;
}

export function CodeDiffViewer({ originalCode, remediatedCode, language, showCopyButton = true }: CodeDiffViewerProps) {
  const [copied, setCopied] = useState(false);
  const [diffMode, setDiffMode] = useState<"split" | "unified">("split");

  const diffLines = computeSimpleDiff(originalCode, remediatedCode);

  const additions = diffLines.filter((l) => l.type === "added").length;
  const removals = diffLines.filter((l) => l.type === "removed").length;
  const modifications = diffLines.filter((l) => l.type === "modified").length;

  const handleCopy = () => {
    navigator.clipboard.writeText(remediatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Side-by-Side Remediated Code Comparison
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px] uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900">
              {language}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Compare vulnerable original source code with AI-generated secure refactored code.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Diff Stats Badges */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-bold">
            <span className="text-emerald-600 dark:text-emerald-400">+{additions}</span>
            <span className="text-slate-400">/</span>
            <span className="text-red-600 dark:text-red-400">-{removals}</span>
            <span className="text-slate-400">/</span>
            <span className="text-amber-600 dark:text-amber-400">~{modifications}</span>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDiffMode("split")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                diffMode === "split"
                  ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setDiffMode("unified")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                diffMode === "unified"
                  ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Unified View
            </button>
          </div>

          {showCopyButton && (
            <Button
              type="button"
              onClick={handleCopy}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Secure Code
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto bg-slate-950 text-slate-100 font-mono text-xs">
        {diffMode === "split" ? (
          <div className="grid grid-cols-2 divide-x divide-slate-800 min-w-[768px]">
            {/* Left Header */}
            <div className="px-4 py-2 bg-red-950/30 border-b border-slate-800 text-red-400 font-semibold text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Original Code (Vulnerable)
              </span>
              <span className="text-[10px] text-slate-500">Before</span>
            </div>
            {/* Right Header */}
            <div className="px-4 py-2 bg-emerald-950/30 border-b border-slate-800 text-emerald-400 font-semibold text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Remediated Code (Secure)
              </span>
              <span className="text-[10px] text-slate-500">After</span>
            </div>

            {/* Split Lines Container */}
            <div className="col-span-2 grid grid-cols-2 divide-x divide-slate-800">
              {/* Left Column (Original) */}
              <div className="py-2">
                {diffLines.map((line, idx) => {
                  if (line.type === "added") {
                    return (
                      <div key={idx} className="flex h-6 items-center px-3 bg-slate-900/30 opacity-30 select-none">
                        <span className="w-8 text-right pr-2 text-slate-700 text-[10px]">-</span>
                        <span className="text-slate-700 italic text-[11px]">&lt; inserted in fix &gt;</span>
                      </div>
                    );
                  }
                  const isMod = line.type === "modified";
                  const isRem = line.type === "removed";
                  return (
                    <div
                      key={idx}
                      className={`flex h-6 items-center px-3 ${
                        isRem
                          ? "bg-red-500/20 text-red-300 border-l-2 border-red-500"
                          : isMod
                          ? "bg-amber-500/15 text-amber-200 border-l-2 border-amber-500"
                          : "hover:bg-slate-900/40 text-slate-300"
                      }`}
                    >
                      <span className="w-8 text-right pr-3 select-none text-slate-600 text-[10px] border-r border-slate-800 mr-3">
                        {line.leftLineNum}
                      </span>
                      <span className="whitespace-pre font-mono text-[11px]">{line.leftContent || " "}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right Column (Remediated) */}
              <div className="py-2">
                {diffLines.map((line, idx) => {
                  if (line.type === "removed") {
                    return (
                      <div key={idx} className="flex h-6 items-center px-3 bg-slate-900/30 opacity-30 select-none">
                        <span className="w-8 text-right pr-2 text-slate-700 text-[10px]">-</span>
                        <span className="text-slate-700 italic text-[11px]">&lt; removed in fix &gt;</span>
                      </div>
                    );
                  }
                  const isAdd = line.type === "added";
                  const isMod = line.type === "modified";
                  return (
                    <div
                      key={idx}
                      className={`flex h-6 items-center px-3 ${
                        isAdd
                          ? "bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-500"
                          : isMod
                          ? "bg-emerald-500/15 text-emerald-200 border-l-2 border-emerald-400"
                          : "hover:bg-slate-900/40 text-slate-300"
                      }`}
                    >
                      <span className="w-8 text-right pr-3 select-none text-slate-600 text-[10px] border-r border-slate-800 mr-3">
                        {line.rightLineNum}
                      </span>
                      <span className="whitespace-pre font-mono text-[11px]">{line.rightContent || " "}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Unified View */
          <div className="py-3">
            {diffLines.map((line, idx) => {
              if (line.type === "removed") {
                return (
                  <div key={idx} className="flex items-center px-4 py-1 bg-red-500/20 text-red-300 border-l-4 border-red-500">
                    <span className="w-10 text-right pr-3 select-none text-red-400 font-mono text-[10px] border-r border-slate-800 mr-3">
                      -{line.leftLineNum}
                    </span>
                    <span className="w-6 text-red-400 font-bold select-none">-</span>
                    <span className="whitespace-pre font-mono text-[11px]">{line.leftContent}</span>
                  </div>
                );
              }
              if (line.type === "added") {
                return (
                  <div key={idx} className="flex items-center px-4 py-1 bg-emerald-500/20 text-emerald-300 border-l-4 border-emerald-500">
                    <span className="w-10 text-right pr-3 select-none text-emerald-400 font-mono text-[10px] border-r border-slate-800 mr-3">
                      +{line.rightLineNum}
                    </span>
                    <span className="w-6 text-emerald-400 font-bold select-none">+</span>
                    <span className="whitespace-pre font-mono text-[11px]">{line.rightContent}</span>
                  </div>
                );
              }
              if (line.type === "modified") {
                return (
                  <React.Fragment key={idx}>
                    <div className="flex items-center px-4 py-1 bg-red-500/15 text-red-300 border-l-4 border-red-500">
                      <span className="w-10 text-right pr-3 select-none text-red-400 font-mono text-[10px] border-r border-slate-800 mr-3">
                        -{line.leftLineNum}
                      </span>
                      <span className="w-6 text-red-400 font-bold select-none">-</span>
                      <span className="whitespace-pre font-mono text-[11px]">{line.leftContent}</span>
                    </div>
                    <div className="flex items-center px-4 py-1 bg-emerald-500/15 text-emerald-300 border-l-4 border-emerald-500">
                      <span className="w-10 text-right pr-3 select-none text-emerald-400 font-mono text-[10px] border-r border-slate-800 mr-3">
                        +{line.rightLineNum}
                      </span>
                      <span className="w-6 text-emerald-400 font-bold select-none">+</span>
                      <span className="whitespace-pre font-mono text-[11px]">{line.rightContent}</span>
                    </div>
                  </React.Fragment>
                );
              }
              return (
                <div key={idx} className="flex items-center px-4 py-0.5 hover:bg-slate-900/50 text-slate-300">
                  <span className="w-10 text-right pr-3 select-none text-slate-600 font-mono text-[10px] border-r border-slate-800 mr-3">
                    {line.rightLineNum}
                  </span>
                  <span className="w-6 text-slate-600 select-none">&nbsp;</span>
                  <span className="whitespace-pre font-mono text-[11px]">{line.leftContent}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
