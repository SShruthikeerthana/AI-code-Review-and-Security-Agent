"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, Lock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Finding } from "@/lib/api";

import { SecurityRadarChart } from "@/components/security-radar-chart";

interface SecurityMatrixProps {
  findings: Finding[];
  onSelectOwaspCategory?: (categoryCode: string) => void;
}

interface OwaspItem {
  code: string;
  name: string;
  description: string;
  cweRefs: string[];
}

const OWASP_TOP_10_2021: OwaspItem[] = [
  {
    code: "A01:2021",
    name: "Broken Access Control",
    description: "Restrictions on authenticated users are not properly enforced.",
    cweRefs: ["CWE-200", "CWE-284", "CWE-285", "CWE-639"],
  },
  {
    code: "A02:2021",
    name: "Cryptographic Failures",
    description: "Failures related to cryptography leading to sensitive data exposure.",
    cweRefs: ["CWE-259", "CWE-326", "CWE-327", "CWE-330", "CWE-798"],
  },
  {
    code: "A03:2021",
    name: "Injection",
    description: "SQL, NoSQL, OS Command, or ORM injection via untrusted user input.",
    cweRefs: ["CWE-79", "CWE-89", "CWE-94", "CWE-77"],
  },
  {
    code: "A04:2021",
    name: "Insecure Design",
    description: "Missing or ineffective security control designs and threat modeling.",
    cweRefs: ["CWE-209", "CWE-502", "CWE-601"],
  },
  {
    code: "A05:2021",
    name: "Security Misconfiguration",
    description: "Insecure default settings, open cloud storage, or verbose error headers.",
    cweRefs: ["CWE-16", "CWE-611"],
  },
  {
    code: "A06:2021",
    name: "Vulnerable Components",
    description: "Use of outdated, deprecated, or vulnerable libraries and software.",
    cweRefs: ["CWE-1104"],
  },
  {
    code: "A07:2021",
    name: "Identification & Authentication Failures",
    description: "Weak passwords, missing brute-force protection, or session hijacking.",
    cweRefs: ["CWE-287", "CWE-384"],
  },
  {
    code: "A08:2021",
    name: "Software & Data Integrity Failures",
    description: "Code and plugins from untrusted sources, auto-updates without verification.",
    cweRefs: ["CWE-494", "CWE-829"],
  },
  {
    code: "A09:2021",
    name: "Security Logging & Monitoring Failures",
    description: "Insufficient logging and detection of active security incidents.",
    cweRefs: ["CWE-778", "CWE-[117]"],
  },
  {
    code: "A10:2021",
    name: "Server-Side Request Forgery (SSRF)",
    description: "Web application fetching remote resources without validating user URLs.",
    cweRefs: ["CWE-918"],
  },
];

export function SecurityMatrix({ findings, onSelectOwaspCategory }: SecurityMatrixProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Group findings by OWASP category code (or map from finding attributes)
  const owaspMap: Record<string, Finding[]> = {};

  OWASP_TOP_10_2021.forEach((item) => {
    owaspMap[item.code] = [];
  });

  findings.forEach((finding) => {
    const rawCat = (finding.owasp_category || "").toUpperCase();
    const cwe = (finding.cwe_id || "").toUpperCase();

    let matchedCode: string | null = null;

    // Check direct code match
    const foundDirect = OWASP_TOP_10_2021.find(
      (item) => rawCat.includes(item.code) || item.name.toUpperCase().includes(rawCat)
    );
    if (foundDirect) {
      matchedCode = foundDirect.code;
    } else if (rawCat.includes("SQL INJECTION") || rawCat.includes("XSS") || finding.category === "sql_injection") {
      matchedCode = "A03:2021";
    } else if (rawCat.includes("HARDCODED") || rawCat.includes("SECRET") || finding.category === "hardcoded_secret") {
      matchedCode = "A02:2021";
    } else if (cwe) {
      const matchCwe = OWASP_TOP_10_2021.find((item) => item.cweRefs.some((ref) => cwe.includes(ref)));
      if (matchCwe) matchedCode = matchCwe.code;
    }

    if (matchedCode) {
      if (!owaspMap[matchedCode]) owaspMap[matchedCode] = [];
      owaspMap[matchedCode].push(finding);
    }
  });

  // Calculate OWASP Compliance Grade
  const criticalCount = findings.filter((f) => (f.severity || "").toLowerCase() === "critical").length;
  const highCount = findings.filter((f) => (f.severity || "").toLowerCase() === "high").length;
  const mediumCount = findings.filter((f) => (f.severity || "").toLowerCase() === "medium").length;
  const lowCount = findings.filter((f) => (f.severity || "").toLowerCase() === "low").length;

  let grade = "A+";
  let gradeColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900";
  let gradeText = "Exceptional Compliance";

  if (criticalCount > 0 || highCount >= 2) {
    grade = "F";
    gradeColor = "text-red-500 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900";
    gradeText = "Severe OWASP Vulnerabilities Detected";
  } else if (highCount === 1) {
    grade = "C";
    gradeColor = "text-orange-500 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900";
    gradeText = "High Risk Findings Present";
  } else if (mediumCount > 2) {
    grade = "B";
    gradeColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900";
    gradeText = "Moderate Security Smells";
  } else if (mediumCount > 0 || lowCount > 0) {
    grade = "A";
    gradeColor = "text-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900";
    gradeText = "Good Posture with Minor Issues";
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              OWASP Top 10 Security &amp; Compliance Matrix
            </CardTitle>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px]">
              2021 Standard
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Real-time compliance mapping against international OWASP web security standards.
          </CardDescription>
        </div>

        {/* Grade Badge */}
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${gradeColor}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 font-extrabold text-xl shadow-sm">
            {grade}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Security Grade</span>
            <span className="text-xs font-bold">{gradeText}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">


        {/* Heatmap Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {OWASP_TOP_10_2021.map((item) => {
            const catFindings = owaspMap[item.code] || [];
            const hasIssues = catFindings.length > 0;
            const hasCritical = catFindings.some((f) => f.severity.toLowerCase() === "critical" || f.severity.toLowerCase() === "high");

            return (
              <div
                key={item.code}
                onClick={() => {
                  setSelectedCode(selectedCode === item.code ? null : item.code);
                  if (onSelectOwaspCategory) onSelectOwaspCategory(item.code);
                }}
                className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-36 ${
                  hasCritical
                    ? "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 hover:border-red-400"
                    : hasIssues
                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:border-amber-400"
                    : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400"
                } ${selectedCode === item.code ? "ring-2 ring-blue-500 shadow-md" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {item.code}
                    </span>
                    {hasCritical ? (
                      <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0 font-bold">VULNERABLE</Badge>
                    ) : hasIssues ? (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 font-bold">WARNING</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[9px] px-1.5 py-0 font-bold">
                        PASS
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{item.name}</h4>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {catFindings.length} {catFindings.length === 1 ? "finding" : "findings"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Category Details Box */}
        {selectedCode && (
          <div className="p-5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 animate-in fade-in duration-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {selectedCode}: {OWASP_TOP_10_2021.find((i) => i.code === selectedCode)?.name}
              </h4>
              <Button size="xs" variant="ghost" onClick={() => setSelectedCode(null)} className="text-xs">
                Close
              </Button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {OWASP_TOP_10_2021.find((i) => i.code === selectedCode)?.description}
            </p>

            {owaspMap[selectedCode] && owaspMap[selectedCode].length > 0 ? (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Flagged Issues:</span>
                {owaspMap[selectedCode].map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-white">{f.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">{f.severity}</Badge>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                No vulnerabilities flagged under this OWASP category in the current scan.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
