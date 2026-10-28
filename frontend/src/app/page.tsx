"use client";

import { useState, useEffect } from "react";
import { Shield, Sparkles, Terminal, LayoutDashboard, LogIn, LogOut } from "lucide-react";

import { CodeSubmissionForm, SubmissionResult } from "@/components/code-submission-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Submission } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const { user, logout, loading } = useAuth();
  const [latestSubmission, setLatestSubmission] = useState<Submission | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"console" | "dashboard">("console");
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [pendingViewAfterAuth, setPendingViewAfterAuth] = useState<"console" | "dashboard" | null>(null);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    async function handleOAuthCode() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      
      if (code) {
        setIsProcessingOAuth(true);
        // Clean up the URL IMMEDIATELY to prevent React Strict Mode from double-firing the network request
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const callbackRes = await fetch(`${API_URL}/api/v1/github/callback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code, username: "asrithaa07" }),
          });
          
          const data = await callbackRes.json();
          if (callbackRes.ok && data.access_token) {
            sessionStorage.setItem("spotlight_token", data.access_token);
            if (data.github_access_token) {
              sessionStorage.setItem("github_token", data.github_access_token);
            }
            window.location.reload();
          } else {
            console.error("OAuth login failed", data);
            setIsProcessingOAuth(false);
          }
        } catch (e) {
          console.error("OAuth callback failed", e);
          setOauthError("Network error during OAuth");
          setIsProcessingOAuth(false);
        }
      } else if (!loading && !user) {
        setIsAuthModalOpen(true);
      }
    }

    // Only run if we aren't already processing
    if (!isProcessingOAuth) {
      handleOAuthCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const handleDashboardClick = () => {
    if (user) {
      setCurrentView("dashboard");
    } else {
      setPendingViewAfterAuth("dashboard");
      setIsAuthModalOpen(true);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmissionComplete = (submission: Submission) => {
    setLatestSubmission(submission);
    setDashboardRefresh((prev) => prev + 1); // increment refresh key
    setTimeout(() => {
      scrollToSection("results-section");
    }, 150);
  };

  const handleSelectHistorySubmission = (submission: Submission) => {
    setLatestSubmission(submission);
    setCurrentView("console");
    setTimeout(() => {
      scrollToSection("results-section");
    }, 150);
  };

  if (!loading && !user && !isProcessingOAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="mb-8 flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Smart Code Inspection Platform</h1>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-bold tracking-wide">Vulnerability Detection System</p>
          </div>
        </div>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800/50">
          <AuthModal 
            isOpen={true} 
            onClose={() => {}} // Cannot close when forced
            onSuccess={() => {
              if (pendingViewAfterAuth) {
                setCurrentView(pendingViewAfterAuth);
                setPendingViewAfterAuth(null);
              } else {
                window.location.reload();
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/85 dark:bg-slate-950/80 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Smart Code Inspection Platform</h1>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold tracking-wide">Vulnerability Detection System</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2 bg-slate-100/70 dark:bg-slate-900/70 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => { setCurrentView("console"); setTimeout(() => scrollToSection("analysis-portal"), 50); }}
              className={`text-xs font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === "console" 
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <Terminal className="h-4 w-4" />
              Security Scanner
            </button>

            <button
              type="button"
              onClick={handleDashboardClick}
              className={`text-xs font-bold flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                currentView === "dashboard" 
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              User Dashboard
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs text-slate-400">Welcome,</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.username}</span>
                </div>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  onClick={logout}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <LogOut className="mr-1.5 h-4 w-4 text-red-500" />
                  Logout
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation Sub-Bar */}
        <div className="flex md:hidden items-center justify-around py-2.5 px-4 bg-slate-100/80 dark:bg-slate-900/80 border-t border-slate-200/60 dark:border-slate-800/60 text-xs font-semibold overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => { setCurrentView("console"); setTimeout(() => scrollToSection("analysis-portal"), 50); }}
            className={`py-1.5 px-4 rounded-lg cursor-pointer whitespace-nowrap font-bold ${currentView === "console" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
          >
            Scanner
          </button>

          <button
            type="button"
            onClick={handleDashboardClick}
            className={`py-1.5 px-4 rounded-lg cursor-pointer whitespace-nowrap font-bold ${currentView === "dashboard" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Hero Section - Compact when submission results are present */}
      {!latestSubmission ? (
        <section className="relative overflow-hidden py-10 lg:py-14 bg-gradient-to-b from-slate-100 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-900 border-b border-slate-200/50 dark:border-slate-800/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none"></div>
          <div className="mx-auto max-w-7xl px-6 relative z-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold bg-blue-100/80 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Smart Code Inspection Platform
            </div>
            <h2 className="mx-auto max-w-4xl text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Automated Code Quality &amp;{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Security Intelligence
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Validate Python and Java source code against secure coding guidelines, OWASP Top 10 vulnerabilities, and standard code smell patterns with interactive remediation.
            </p>
          </div>
        </section>
      ) : null}

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
        
        {currentView === "console" && (
          <section id="analysis-portal" className="space-y-6 scroll-mt-20">
            {!latestSubmission && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Analysis Console</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Submit source code snippets or upload files for multi-agent security analysis</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {!latestSubmission && (
                <CodeSubmissionForm onSubmissionComplete={handleSubmissionComplete} />
              )}

              {latestSubmission && (
                <div id="results-section" className="scroll-mt-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLatestSubmission(null)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 p-0 h-auto"
                    >
                      &larr; Submit New Code / Edit Submission
                    </Button>
                  </div>
                  <SubmissionResult submission={latestSubmission} />
                </div>
              )}
            </div>
          </section>
        )}

        {currentView === "dashboard" && (
          <Dashboard 
            onSelectSubmission={handleSelectHistorySubmission} 
            refreshTrigger={dashboardRefresh} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white dark:border-slate-900 dark:bg-slate-950 py-12 text-center">
        <div className="mx-auto max-w-7xl px-6 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-slate-900 dark:text-white">Smart Code Inspection Platform</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            High-performance multi-agent code scanner with secure-coding remediation engine.
          </p>
          <div className="pt-4 text-xs text-slate-400 dark:text-slate-600 font-medium">
            &copy; {new Date().getFullYear()} Smart Code Inspection Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
