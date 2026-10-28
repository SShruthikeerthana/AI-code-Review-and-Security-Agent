"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  ChevronRight,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SecurityRule {
  id: string;
  title: string;
  category: "Injection" | "Cryptography" | "Secrets" | "Authentication" | "Configuration";
  language: "Python" | "Java" | "Universal";
  cwe: string;
  owasp: string;
  summary: string;
  vulnerableSnippet: string;
  secureSnippet: string;
  explanation: string;
}

const SECURITY_RULES_CATALOG: SecurityRule[] = [
  {
    id: "SEC-PY-001",
    title: "Parameterized SQL Queries (Python DB-API / SQLAlchemy)",
    category: "Injection",
    language: "Python",
    cwe: "CWE-89",
    owasp: "A03:2021-Injection",
    summary: "Prevent SQL Injection by never concatenating user input directly into SQL strings.",
    vulnerableSnippet: `# UNSAFE: String formatting allows SQL Injection
query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
cursor.execute(query)`,
    secureSnippet: `# SAFE: Parameterized query using placeholders
query = "SELECT * FROM users WHERE username = %s AND password = %s"
cursor.execute(query, (username, password))`,
    explanation: "Parameterized queries separate the query structure from the data parameters. The database engine pre-compiles the statement structure, treating input strictly as literal data."
  },
  {
    id: "SEC-PY-002",
    title: "Secure Password Hashing with BCrypt / Argon2",
    category: "Cryptography",
    language: "Python",
    cwe: "CWE-327",
    owasp: "A02:2021-Cryptographic Failures",
    summary: "Replace legacy fast hashes (MD5/SHA1) with salt-backed slow password hashing algorithms.",
    vulnerableSnippet: `# UNSAFE: MD5 is vulnerable to collision and rapid offline dictionary attacks
import hashlib
hashed_pwd = hashlib.md5(password.encode()).hexdigest()`,
    secureSnippet: `# SAFE: Use bcrypt with automatically managed salt and cost factor
import bcrypt
salt = bcrypt.gensalt(rounds=12)
hashed_pwd = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')`,
    explanation: "BCrypt introduces adaptive work factors and salt generation, defending stored credentials against rainbow table lookups and GPU hash cracking."
  },
  {
    id: "SEC-JV-001",
    title: "PreparedStatement Injection Prevention (Java JDBC)",
    category: "Injection",
    language: "Java",
    cwe: "CWE-89",
    owasp: "A03:2021-Injection",
    summary: "Use PreparedStatement placeholders rather than String concatenation in Java database calls.",
    vulnerableSnippet: `// UNSAFE: Direct concatenation
String sql = "SELECT * FROM users WHERE user_id = '" + userId + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(sql);`,
    secureSnippet: `// SAFE: PreparedStatement with bind variables
String sql = "SELECT * FROM users WHERE user_id = ?";
PreparedStatement pstmt = connection.prepareStatement(sql);
pstmt.setString(1, userId);
ResultSet rs = pstmt.executeQuery();`,
    explanation: "PreparedStatement enforces strict type binding and escapes dynamic parameters before query execution."
  },
  {
    id: "SEC-UNI-001",
    title: "Secret Key Management & Environment Variables",
    category: "Secrets",
    language: "Universal",
    cwe: "CWE-798",
    owasp: "A07:2021-Identification & Authentication Failures",
    summary: "Never hardcode secret keys, passwords, or OAuth tokens directly in source files.",
    vulnerableSnippet: `# UNSAFE: Hardcoded production secret
SECRET_KEY = "super_secret_jwt_key_12345"
DATABASE_URI = "postgres://admin:Password123@db.prod.internal:5432/app"`,
    secureSnippet: `# SAFE: Loaded dynamically from environment or vault
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    secret_key: str = os.getenv("SECRET_KEY")
    database_uri: str = os.getenv("DATABASE_URI")`,
    explanation: "Storing secrets in environment variables or key vaults prevents secret leakage into git commit histories and unauthorized source code inspection."
  }
];

export function KnowledgeBaseView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLanguage] = useState<string>("all");
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>("SEC-PY-001");

  const filteredRules = SECURITY_RULES_CATALOG.filter((rule) => {
    const matchesSearch = 
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.cwe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.owasp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || rule.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesLanguage = selectedLanguage === "all" || rule.language.toLowerCase() === selectedLanguage.toLowerCase();

    return matchesSearch && matchesCategory && matchesLanguage;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs">
                RAG Knowledge Base
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                ChromaDB Vector Store
              </Badge>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              Security Standards &amp; RAG Knowledge Base Directory
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Explore grounded secure coding guidelines, OWASP Top 10 mappings, and indexed RAG rules used by our multi-agent scanning pipeline.
            </p>
          </div>

          {/* RAG Telemetry Badges */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-purple-500 block">Indexed Guidelines</span>
              <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">124 Rules</span>
            </div>
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-blue-500 block">Vector Embeddings</span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">sentence-transformers</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter and Search Toolbar */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl p-4">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by rule title, CWE, or OWASP code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Filter:</span>
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedCategory("all")}
              className="rounded-xl text-xs font-semibold"
            >
              All Categories
            </Button>
            <Button
              variant={selectedCategory === "injection" ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedCategory("injection")}
              className="rounded-xl text-xs font-semibold"
            >
              Injection
            </Button>
            <Button
              variant={selectedCategory === "cryptography" ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedCategory("cryptography")}
              className="rounded-xl text-xs font-semibold"
            >
              Cryptography
            </Button>
            <Button
              variant={selectedCategory === "secrets" ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedCategory("secrets")}
              className="rounded-xl text-xs font-semibold"
            >
              Secrets
            </Button>
          </div>
        </div>
      </Card>

      {/* Security Rules Catalog List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => {
          const isExpanded = expandedRuleId === rule.id;
          return (
            <Card
              key={rule.id}
              className={`border transition-all rounded-2xl overflow-hidden ${
                isExpanded 
                  ? "border-blue-500/60 shadow-xl bg-white dark:bg-slate-900/80" 
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <CardHeader 
                className="p-6 cursor-pointer select-none"
                onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono text-[10px] font-bold">
                        {rule.id}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400">
                        {rule.cwe}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400">
                        {rule.owasp}
                      </Badge>
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        {rule.language}
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {rule.title}
                    </h3>
                    <p className="text-xs text-slate-500">{rule.summary}</p>
                  </div>

                  <Button 
                    type="button"
                    size="xs" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedRuleId(isExpanded ? null : rule.id);
                    }}
                    className="rounded-xl flex-shrink-0 cursor-pointer"
                  >
                    <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800/60 space-y-4 animate-in fade-in duration-200">
                  {/* Detailed Explanation */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block uppercase text-[10px] tracking-wider">
                      Technical Rationale:
                    </span>
                    <p>{rule.explanation}</p>
                  </div>

                  {/* Code Examples Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Vulnerable Example */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        Vulnerable Implementation Pattern
                      </span>
                      <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 font-mono text-xs text-red-300 overflow-x-auto">
                        <pre>{rule.vulnerableSnippet}</pre>
                      </div>
                    </div>

                    {/* Secure Example */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Secure Remediated Pattern
                      </span>
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 font-mono text-xs text-emerald-300 overflow-x-auto">
                        <pre>{rule.secureSnippet}</pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
