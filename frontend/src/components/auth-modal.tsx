"use client";

import React, { useState } from "react";
import { X, Shield, Loader2, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoChooser, setShowDemoChooser] = useState(false);

  const [showAnotherAccountInput, setShowAnotherAccountInput] = useState(false);
  const [anotherAccountUsername, setAnotherAccountUsername] = useState("");

  if (!isOpen) return null;

  const handleDummyOAuth = async (targetUser: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const callbackRes = await fetch(`${API_URL}/api/v1/github/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "github_demo_user", username: targetUser }),
        });
        const callbackData = await callbackRes.json();
        if (callbackData.access_token) {
          sessionStorage.setItem("spotlight_token", callbackData.access_token);
          if (onSuccess) onSuccess();
          onClose();
          window.location.reload();
        }
    } catch(e) {
        setError("Login failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (showDemoChooser) {
    return (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 p-8 text-center">
        <button onClick={() => { setShowDemoChooser(false); setShowAnotherAccountInput(false); }} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5"/></button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mb-4">
             <svg className="h-8 w-8 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
        </div>
        
        {!showAnotherAccountInput ? (
          <>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Choose an account</h2>
            <p className="text-sm text-slate-500 mb-8 mt-1">to continue to AI Code Review Agent</p>
            
            <div className="space-y-3">
              <button disabled={isSubmitting} onClick={() => handleDummyOAuth("asrithaa07")} className="w-full flex items-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-lg">A</div>
                   <div>
                     <p className="font-bold text-slate-900 dark:text-white">asrithaa07</p>
                     <p className="text-xs text-slate-500">asrithaa07@github.demo</p>
                   </div>
                 </div>
              </button>
              
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button disabled={isSubmitting} onClick={() => setShowAnotherAccountInput(true)} className="w-full flex items-center p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left gap-4">
                   <div className="w-10 h-10 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full flex items-center justify-center">
                     <UserIcon className="w-5 h-5" />
                   </div>
                   <span className="font-bold text-slate-900 dark:text-white">Use another account</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-200 text-left">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">Sign in</h2>
            <p className="text-sm text-slate-500 mb-6 text-center">Use your GitHub Account</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-github" className="text-xs font-bold uppercase tracking-wider text-slate-500">GitHub Handle</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="custom-github"
                    type="text"
                    placeholder="Enter username"
                    value={anotherAccountUsername}
                    onChange={(e) => setAnotherAccountUsername(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                    autoFocus
                  />
                </div>
              </div>
              
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAnotherAccountInput(false)}
                  className="flex-1 rounded-xl py-5"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleDummyOAuth(anotherAccountUsername)}
                  className="flex-1 rounded-xl py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white"
                  disabled={isSubmitting || !anotherAccountUsername.trim()}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
     </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await signup(username, password);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Banner */}
        <div className="p-6 pb-4 text-center border-b border-slate-100 dark:border-slate-800/60">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10 mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {tab === "login" ? "Welcome back!" : "Create your account"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access secure code analysis dashboard, review history, and PDF reports.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/60 p-1.5 bg-slate-50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              tab === "login"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              tab === "signup"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-username" className="text-xs font-bold uppercase tracking-wider text-slate-500">Username</Label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                id="auth-username"
                type="text"
                placeholder="developer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-950 rounded-xl">
              {error}
            </div>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${API_URL}/api/v1/github/auth-url`);
                const data = await res.json();
                if (data.client_id === "dummy_github_client_id" || (data.url && data.url.includes("dummy_github_client_id"))) {
                  // Reveal Google-style Interactive Account Chooser
                  setShowDemoChooser(true);
                  return;
                }
                if (data.url) {
                  window.location.href = data.url;
                }
              } catch (e) {
                setError("GitHub OAuth service unavailable");
              }
            }}
            className="w-full font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl py-5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub (Use Another Account)
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-blue-500/10 transition-all mt-3 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : tab === "login" ? (
              "Log In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
