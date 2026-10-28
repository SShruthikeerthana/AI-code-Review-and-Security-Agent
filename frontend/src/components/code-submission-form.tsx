"use client";

import { useRef, useState, useEffect } from "react";
import { 
  AlertCircle,
  AlertTriangle,
  CheckCircle2, 
  Loader2, 
  Upload, 
  Sparkles, 
  FileCode, 
  FileDown, 
  ShieldAlert, 
  ShieldCheck,
  Check,
  Copy,
  MessageSquare,
  FileText,
  Activity,
  GitCompare
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Language, Submission, Finding, submitPaste, submitUpload, getSubmissionDetails } from "@/lib/api";
import { ConversationalAssistant } from "@/components/conversational-assistant";
import { SeverityPieChart } from "@/components/severity-pie-chart";
import { CodeDiffViewer } from "@/components/code-diff-viewer";
import { SecurityMatrix } from "@/components/security-matrix";
import { AgentPipelineVisualizer } from "@/components/agent-pipeline-visualizer";
import { SecurityRadarChart } from "@/components/security-radar-chart";
interface CodeSubmissionFormProps {
  onSubmissionComplete: (submission: Submission) => void;
}




export function CodeSubmissionForm({ onSubmissionComplete }: CodeSubmissionFormProps) {
  const [sourceCode, setSourceCode] = useState("");
  const [filename, setFilename] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub Repo State
  const [repoUrl, setRepoUrl] = useState("https://github.com/security-lab/sample-vulnerable-repo");
  const [repoBranch, setRepoBranch] = useState("main");
  const [repoFilePath, setRepoFilePath] = useState("");
  const [repoFiles, setRepoFiles] = useState<Array<{ name: string; path: string; size?: number }>>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [userRepos, setUserRepos] = useState<Array<{ id: number; name: string; full_name: string; html_url: string; default_branch: string }>>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  useEffect(() => {
    const fetchUserRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const token = typeof window !== "undefined" ? sessionStorage.getItem("spotlight_token") : null;
        const ghToken = typeof window !== "undefined" ? sessionStorage.getItem("github_token") : null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const queryParams = ghToken ? `?github_token=${ghToken}` : '';
        const res = await fetch(`${API_URL}/api/v1/github/repos${queryParams}`, { 
          cache: "no-store",
          headers: {
            ...headers,
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setUserRepos(data);
            const firstUrl = data[0].html_url || `https://github.com/${data[0].full_name}`;
            setRepoUrl(firstUrl);
            if (data[0].default_branch) setRepoBranch(data[0].default_branch);
            handleFetchRepoContentsForUrl(firstUrl);
          }
        }
      } catch (err) {
        console.error("Error fetching user repos:", err);
      } finally {
        setIsLoadingRepos(false);
      }
    };
    fetchUserRepos();
  }, []);

  const handleFetchRepoContentsForUrl = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setIsFetchingFiles(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = typeof window !== "undefined" ? sessionStorage.getItem("spotlight_token") : null;
      const ghToken = typeof window !== "undefined" ? sessionStorage.getItem("github_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/v1/github/repo-contents`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          repo_url: targetUrl,
          branch: repoBranch || "main",
          github_token: ghToken
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch repository files");
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setRepoFiles(data.files);
        setRepoFilePath(data.files[0].path);
      } else {
        setRepoFiles([]);
        setRepoFilePath("");
        setError("No Java (.java) or Python (.py) code present to analyse in this repository.");
      }
    } catch (e) {
      setError("Unable to list repository files. You can enter the target file path directly.");
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleFetchRepoContents = async () => {
    await handleFetchRepoContentsForUrl(repoUrl);
  };

  const handleGitHubRepoSubmit = async () => {
    if (!repoUrl.trim()) {
      setError("Please provide a valid GitHub Repository URL or owner/repo.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = typeof window !== "undefined" ? sessionStorage.getItem("spotlight_token") : null;
      const ghToken = typeof window !== "undefined" ? sessionStorage.getItem("github_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/v1/github/analyze-repo`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          repo_url: repoUrl,
          branch: repoBranch || "main",
          file_path: repoFilePath || undefined,
          github_token: ghToken
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to analyze GitHub repository");
      }

      const data = await res.json();
      // Fetch full submission details and notify parent
      const submissionDetails = await getSubmissionDetails(data.submission_id);
      onSubmissionComplete(submissionDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub analysis failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side quick auto-detection for visual preview
  const autoDetectedLanguage: Language = (() => {
    if (filename.toLowerCase().endsWith(".py")) return "python";
    if (filename.toLowerCase().endsWith(".java")) return "java";
    const code = sourceCode.toLowerCase();
    const javaScore = (code.match(/public class|private |protected |system\.out|public static void|import java\.|import org\.|import javax\.|import com\.|void |string\[\]|throws |implements |extends |preparedstatement|resultset|drivermanager|messagedigest|;\s*$/gm) || []).length;
    const pyScore = (code.match(/def |from [a-z0-9_]+ import|elif |self\.|print\(|__init__|:\s*$/gm) || []).length;
    return javaScore > pyScore ? "java" : "python";
  })();

  const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif", "heic", "pdf", "doc", "docx", "zip", "rar", "7z", "exe"];

  // Block screenshots/images pasted directly into the code textarea
  const handlePasteAreaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const hasImage = items.some((it) => it.kind === "file" && it.type.startsWith("image/"));
    if (hasImage) {
      e.preventDefault();
      setError("That's a screenshot/image, not code. This agent analyzes Python or Java source text only - paste the actual code, not an image of it.");
    }
  };

  // Intercept files dropped onto the paste textarea: images are rejected with guidance,
  // valid .py/.java files are routed into the upload flow.
  const handleCodeAreaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (IMAGE_EXTENSIONS.includes(ext)) {
      setError(`"${file.name}" is an image/document - screenshots cannot be analyzed. Please upload the .py or .java source file instead.`);
      return;
    }
    handleFileSelect(file);
  };

  const handlePasteSubmit = async () => {
    if (!sourceCode.trim()) {
      setError("Please enter source code before submitting.");
      return;
    }
    const trimmed = sourceCode.trim();
    const looksLikeFilenameOnly = /^[^\n]{0,260}\.(png|jpe?g|gif|bmp|webp|svg|ico|tiff?|heic|pdf|docx?|xlsx?|pptx?|zip|rar|7z|exe)$/i.test(trimmed);
    const dataUri = trimmed.startsWith("data:image/");
    if (looksLikeFilenameOnly || dataUri) {
      setError("This doesn't look like source code (it appears to be an image/file reference). Paste your actual Python or Java code as plain text.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const submission = await submitPaste({
        source_code: sourceCode,
        filename: filename || undefined,
      });
      onSubmissionComplete(submission);
      setSourceCode("");
      setFilename("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const submission = await submitUpload(file);
      onSubmissionComplete(submission);
      setSelectedFile(null); // Reset selected file after submission
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    if (file.size === 0) {
      setError("The selected file is empty and cannot be analyzed.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "py" && ext !== "java") {
      setError("Unsupported file type. Only .py and .java files are allowed.");
      return;
    }
    setSelectedFile(file);
  };

  const handleSelectedFileSubmit = () => {
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="space-y-3 p-6 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Submit Code for Review</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Paste source code or drag &amp; drop a file — the agent auto-detects Python vs Java code structure.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
            <TabsTrigger value="paste" className="rounded-lg font-semibold py-2.5 transition-all">Paste Code</TabsTrigger>
            <TabsTrigger value="upload" className="rounded-lg font-semibold py-2.5 transition-all">Upload File</TabsTrigger>
            <TabsTrigger value="github" className="rounded-lg font-semibold py-2.5 transition-all flex items-center justify-center gap-1.5">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub Repo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 items-center">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Language</Label>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold px-3 py-1 text-xs">
                    {autoDetectedLanguage === "python" ? "🐍 Auto-Detected: Python" : "☕ Auto-Detected: Java"}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Agent auto-understands code</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filename" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Filename (optional)</Label>
                <Input
                  id="filename"
                  placeholder={autoDetectedLanguage === "python" ? "example.py" : "Example.java"}
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5 focus-visible:ring-blue-500"
                />
              </div>
            </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label htmlFor="source-code" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source Code</Label>
                  <span className="text-xs text-slate-400 font-medium">Supports Python (.py) &amp; Java (.java)</span>
                </div>
                <div
                  className="w-full relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1"
                  onDrop={handleCodeAreaDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                <Textarea
                  id="source-code"
                  placeholder="Paste your Python or Java source code here..."
                  className="w-full min-h-[380px] font-mono text-sm bg-transparent border-0 resize-y focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:border-0"
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  onPaste={handlePasteAreaPaste}
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                type="button"
                onClick={handlePasteSubmit} 
                disabled={isSubmitting || !sourceCode.trim()} 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/10 px-8 py-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating &amp; Triggering Multi-Agent Analysis...
                  </span>
                ) : (
                  "Submit Code Analysis"
                )}
              </button>

              {sourceCode.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSourceCode(""); setFilename(""); setError(null); }}
                  className="w-full sm:w-auto border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-6 py-4 h-auto rounded-xl cursor-pointer"
                  disabled={isSubmitting}
                >
                  Clear Code
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-6 space-y-5">
            {selectedFile ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-8 flex flex-col items-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <FileCode className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">{selectedFile.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto mt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedFile(null); setError(null); }}
                    className="flex-1 sm:flex-initial rounded-xl font-semibold border-slate-300 dark:border-slate-800"
                    disabled={isSubmitting}
                  >
                    Change File
                  </Button>
                  <Button
                    onClick={handleSelectedFileSubmit}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/10 rounded-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Submit File for Review"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-600 bg-slate-50/50 hover:bg-blue-50/20 dark:bg-slate-950/30 dark:hover:bg-blue-950/10 p-12 text-center transition-all duration-200"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:scale-110 transition-transform shadow-sm">
                  <Upload className="h-5 w-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-500" />
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Drag &amp; drop your source file here</p>
                <p className="mb-4 text-xs text-slate-500">Supports .py and .java files (max 500KB)</p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".py,.java"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <Button variant="outline" className="rounded-xl font-semibold border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
                  Browse Local Files
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="github" className="mt-6 space-y-6">
            <div className="space-y-4">
              {/* Select GitHub Repository Dropdown & URL Input */}
              <div className="space-y-2">
                <Label htmlFor="select-github-repo" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select GitHub Repository
                </Label>
                <select
                  id="select-github-repo"
                  value={repoUrl}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected) {
                      setRepoUrl(selected);
                      const found = userRepos.find((r) => (r.html_url === selected) || (`https://github.com/${r.full_name}` === selected));
                      if (found && found.default_branch) {
                        setRepoBranch(found.default_branch);
                      }
                      handleFetchRepoContentsForUrl(selected);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">
                    {isLoadingRepos ? "⏳ Fetching your GitHub repositories..." : "-- Select from Your Logged-In Account Repositories --"}
                  </option>
                  {userRepos.map((repo) => {
                    const repoUrlVal = repo.html_url || `https://github.com/${repo.full_name}`;
                    return (
                      <option key={repo.id} value={repoUrlVal}>
                        📦 {repo.full_name} ({repo.default_branch || "main"})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-repo-url" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Or Enter Custom GitHub Repository URL / Name
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="github-repo-url"
                    placeholder="e.g. asrithaa07/my-repo or https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5 focus-visible:ring-blue-500 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchRepoContents}
                    disabled={isFetchingFiles || !repoUrl.trim()}
                    className="rounded-xl font-bold border-slate-200 dark:border-slate-800 px-4 py-5 cursor-pointer"
                  >
                    {isFetchingFiles ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      "Browse Files"
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="github-branch" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Branch (default: main)
                  </Label>
                  <Input
                    id="github-branch"
                    placeholder="main"
                    value={repoBranch}
                    onChange={(e) => setRepoBranch(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-filepath" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target File Path
                  </Label>
                  <Input
                    id="github-filepath"
                    placeholder="e.g. app/main.py or src/App.java"
                    value={repoFilePath}
                    onChange={(e) => setRepoFilePath(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-5"
                  />
                </div>
              </div>

              {/* Repository Files Discovered Picker */}
              {repoFiles.length > 0 && (
                <div className="space-y-2 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 block">
                    📁 Discovered Files in Repository ({repoFiles.length}):
                  </span>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pt-1">
                    {repoFiles.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRepoFilePath(file.path)}
                        className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          repoFilePath === file.path
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                        }`}
                      >
                        📄 {file.path}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleGitHubRepoSubmit}
              disabled={isSubmitting || !repoUrl.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/10 px-8 py-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching &amp; Analyzing GitHub Repo...
                </span>
              ) : (
                "Analyze GitHub Repository"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant={error.includes("No Java") ? "default" : "destructive"} className={`mt-6 rounded-xl border ${error.includes("No Java") ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20" : "border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20"}`}>
            <AlertCircle className={`h-4 w-4 ${error.includes("No Java") ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`} />
            <AlertTitle className={`font-bold ${error.includes("No Java") ? "text-blue-800 dark:text-blue-400" : "text-red-800 dark:text-red-400"}`}>
              {error.includes("No Java") ? "Repository Information" : "Execution Error"}
            </AlertTitle>
            <AlertDescription className={`text-sm mt-1 ${error.includes("No Java") ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function SubmissionResult({ submission: initialSubmission }: { submission: Submission }) {
  const [submission, setSubmission] = useState<Submission>(initialSubmission);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all, security, quality, owasp
  const [activePortalTab, setActivePortalTab] = useState<"findings" | "visualizations" | "diff" | "pr_summary" | "full_code" | "assistant">("findings");
  const [activeVisTab, setActiveVisTab] = useState<"pie" | "radar" | "owasp">("pie");
  const [assistantQuery, setAssistantQuery] = useState<string | undefined>(undefined);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedFullCode, setCopiedFullCode] = useState<boolean>(false);
  const [showDiffInFullCode, setShowDiffInFullCode] = useState<boolean>(true);
  const [rightPanelTab, setRightPanelTab] = useState<"code" | "remediation">("code");

  // Sync state if initialSubmission changes from parent
  useEffect(() => {
    setSubmission(initialSubmission);
    setSelectedFindingId(null);
  }, [initialSubmission]);

  // Polling logic for status pending/analyzing
  useEffect(() => {
    if (submission.status === "pending" || submission.status === "analyzing") {
      const interval = setInterval(async () => {
        try {
          const updated = await getSubmissionDetails(submission.id);
          setSubmission(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Failed to poll submission status:", e);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [submission.id, submission.status]);

  const downloadPdf = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.open(`${API_URL}/api/v1/submissions/${submission.id}/pdf`, "_blank");
  };

  if (submission.status === "pending" || submission.status === "analyzing") {
    return (
      <div className="space-y-6">
        <AgentPipelineVisualizer status="analyzing" />
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-12 flex flex-col items-center justify-center min-h-[300px]">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute h-16 w-16 rounded-full border-4 border-blue-100 dark:border-blue-950 animate-pulse"></div>
            <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin relative" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Analyzing Your Code</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm">
            Running LangGraph Orchestrator pipeline: parallel execution of Code Analysis, Security Vulnerability, Remediation, and PR Summary agents...
          </p>
        </Card>
      </div>
    );
  }

  if (submission.status === "failed") {
    return (
      <Card className="border border-red-200 dark:border-red-950 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden p-6 space-y-4 min-h-[450px] flex flex-col justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 text-center">Analysis Pipeline Failed</h4>
        <div className="rounded-xl bg-red-50/50 dark:bg-red-950/25 p-4 border border-red-100 dark:border-red-900/40 max-h-60 overflow-y-auto">
          <ul className="list-disc pl-5 space-y-2 text-sm text-red-700 dark:text-red-300">
            {submission.validation_errors && submission.validation_errors.length > 0 ? (
              submission.validation_errors.map((err, i) => <li key={i}>{err.message}</li>)
            ) : (
              <li>Unknown orchestration execution failure.</li>
            )}
          </ul>
        </div>
      </Card>
    );
  }

  const findings = submission.findings || [];

  // Filter findings based on user controls
  const filteredFindings = findings.filter((f) => {
    const matchesSeverity = severityFilter === "all" || f.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "syntax" && (f.agent_source === "syntax_validator" || f.category === "syntax_error")) ||
      (typeFilter === "security" && f.agent_source === "security_vulnerability") ||
      (typeFilter === "quality" && f.agent_source === "code_analysis") ||
      (typeFilter === "owasp" && Boolean(f.owasp_category));

    return matchesSeverity && matchesType;
  });

  const selectedFinding = findings.find((f) => f.id === selectedFindingId);

  // Group findings by line number for inline code annotations
  const findingsByLine: Record<number, Finding[]> = {};
  findings.forEach((f) => {
    if (f.line_number != null) {
      if (!findingsByLine[f.line_number]) {
        findingsByLine[f.line_number] = [];
      }
      findingsByLine[f.line_number].push(f);
    }
  });

  const getSeverityBadge = (sev: string) => {
    const s = (sev || "info").toLowerCase();
    switch (s) {
      case "critical":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Low</Badge>;
      default:
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 shadow-sm">Info</Badge>;
    }
  };

  const getCategoryFlag = (f: Finding) => {
    if (f.agent_source === "syntax_validator" || f.category === "syntax_error") {
      return (
        <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 font-semibold text-[10px] bg-red-50 dark:bg-red-950/40">
          🚫 Syntax Error
        </Badge>
      );
    }
    if (f.agent_source === "security_vulnerability") {
      return (
        <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-400 font-semibold text-[10px] bg-purple-50 dark:bg-purple-950/40">
          🛡️ Security ({f.category.replace(/_/g, " ")})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950/40">
        ⚙️ Quality ({f.category.replace(/_/g, " ")})
      </Badge>
    );
  };

  const getLineHighlightClass = (lineNumber: number) => {
    const lineFindings = findingsByLine[lineNumber] || [];
    if (lineFindings.length === 0) return "";

    const isSelectedLine = lineFindings.some((f) => f.id === selectedFindingId);

    let highestSev = "info";
    const order = ["critical", "high", "medium", "low", "info"];
    for (const s of order) {
      if (lineFindings.some((f) => f.severity.toLowerCase() === s)) {
        highestSev = s;
        break;
      }
    }

    let bgClass = "";
    if (highestSev === "critical" || highestSev === "high") bgClass = "bg-red-500/10 dark:bg-red-950/20";
    else if (highestSev === "medium") bgClass = "bg-amber-500/10 dark:bg-amber-950/20";
    else bgClass = "bg-blue-500/10 dark:bg-blue-950/20";

    const borderClass = isSelectedLine
      ? "border-l-4 border-blue-500 bg-blue-500/15 dark:bg-blue-950/30"
      : highestSev === "critical" || highestSev === "high"
      ? "border-l-2 border-red-500"
      : highestSev === "medium"
      ? "border-l-2 border-amber-500"
      : "border-l-2 border-blue-500";

    return `${bgClass} ${borderClass}`;
  };

  const calculatedScores = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  (submission.findings || []).forEach((f) => {
    const sev = (f.severity || "info").toLowerCase();
    if (sev in calculatedScores) {
      calculatedScores[sev as keyof typeof calculatedScores] += 1;
    } else {
      calculatedScores.info += 1;
    }
  });

  const scores = {
    critical: Math.max(calculatedScores.critical, Number(submission.severity_scores?.critical ?? 0)),
    high: Math.max(calculatedScores.high, Number(submission.severity_scores?.high ?? 0)),
    medium: Math.max(calculatedScores.medium, Number(submission.severity_scores?.medium ?? 0)),
    low: Math.max(calculatedScores.low, Number(submission.severity_scores?.low ?? 0)),
    info: Math.max(calculatedScores.info, Number(submission.severity_scores?.info ?? 0)),
  };
  const computedScore = Math.max(0, Math.min(100, 100 - (scores.critical * 30) - (scores.high * 15) - (scores.medium * 8) - (scores.low * 3) - (scores.info * 1)));
  const healthScore = (submission.health_score !== undefined && submission.health_score !== null) ? submission.health_score : computedScore;
  const totalFindings = (submission.findings || []).length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Portal Header */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-white">Developer Review Portal</CardTitle>
                  <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {submission.language.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5 font-mono">
                  Scan ID: {submission.id}
                </CardDescription>
              </div>
            </div>

            {/* Code Health Score Display & Report Download Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <Activity className={`h-5 w-5 ${healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-red-500'}`} />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Health Score</span>
                  <span className={`text-sm font-extrabold ${healthScore > 80 ? 'text-emerald-600 dark:text-emerald-400' : healthScore > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {healthScore} / 100
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={downloadPdf}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 px-4 text-xs shadow-md shadow-blue-500/10 cursor-pointer"
                  title="Export complete review report as PDF"
                >
                  <FileDown className="mr-1.5 h-4 w-4" />
                  PDF Report
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Navigation Tabs Bar */}
        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-2">
          <Button
            variant={activePortalTab === "findings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("findings")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "findings" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <FileCode className="mr-1.5 h-4 w-4" />
            Findings &amp; Remediation ({totalFindings})
          </Button>

          <Button
            variant={activePortalTab === "visualizations" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("visualizations")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "visualizations" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <Activity className="mr-1.5 h-4 w-4 text-indigo-300" />
            Security Visualizations
          </Button>

          <Button
            variant={activePortalTab === "pr_summary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("pr_summary")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "pr_summary" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            PR Review Summary
          </Button>

          <Button
            variant={activePortalTab === "full_code" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("full_code")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "full_code" ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <Sparkles className="mr-1.5 h-4 w-4 text-emerald-300" />
            Full Remediated Code &amp; Diff
          </Button>

          <Button
            variant={activePortalTab === "assistant" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActivePortalTab("assistant")}
            className={`rounded-xl font-bold text-xs ${activePortalTab === "assistant" ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "text-slate-600 dark:text-slate-300"}`}
          >
            <MessageSquare className="mr-1.5 h-4 w-4" />
            Conversational Code Assistant (RAG)
          </Button>
        </div>
      </Card>

      {/* Main Tab Content */}
      {activePortalTab === "visualizations" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <Button
              variant={activeVisTab === "pie" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveVisTab("pie")}
              className={`rounded-xl text-xs font-bold transition-all cursor-pointer ${activeVisTab === "pie" ? "bg-indigo-600 text-white border-transparent" : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"}`}
            >
              Severity Pie Chart
            </Button>
            <Button
              variant={activeVisTab === "radar" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveVisTab("radar")}
              className={`rounded-xl text-xs font-bold transition-all cursor-pointer ${activeVisTab === "radar" ? "bg-indigo-600 text-white border-transparent" : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"}`}
            >
              Security Radar Graph
            </Button>
            <Button
              variant={activeVisTab === "owasp" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveVisTab("owasp")}
              className={`rounded-xl text-xs font-bold transition-all cursor-pointer ${activeVisTab === "owasp" ? "bg-indigo-600 text-white border-transparent" : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"}`}
            >
              OWASP Matrix Heatmap
            </Button>
          </div>

          <div className="pt-2">
            {activeVisTab === "pie" && <SeverityPieChart scores={scores} />}
            {activeVisTab === "radar" && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                <SecurityRadarChart findings={findings} healthScore={healthScore} />
              </div>
            )}
            {activeVisTab === "owasp" && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <SecurityMatrix
                  findings={findings}
                  onSelectOwaspCategory={() => {
                    setActivePortalTab("findings");
                  }}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {activePortalTab === "findings" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Two-Column Explorer Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left column: Findings List */}
            {totalFindings === 0 ? (
              <Card className="lg:col-span-2 border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5 shadow-lg rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[680px] gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 shadow-md">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">No issues detected</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                    Your code passed all syntax, security vulnerability, and code quality checks cleanly.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden h-[680px] flex flex-col">
                <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 space-y-3 flex-shrink-0">
                  {/* Category Filter Chips */}
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg text-[10px] sm:text-[11px] font-semibold flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setTypeFilter("all")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer ${typeFilter === "all" ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
                    >
                      All ({filteredFindings.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("security")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer ${typeFilter === "security" ? "bg-white dark:bg-slate-900 shadow text-purple-600 dark:text-purple-400" : "text-slate-500"}`}
                    >
                      Security ({findings.filter((f) => f.agent_source === "security_vulnerability").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("owasp")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer ${typeFilter === "owasp" ? "bg-white dark:bg-slate-900 shadow text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}
                    >
                      OWASP Top 10 ({findings.filter((f) => Boolean(f.owasp_category)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("quality")}
                      className={`flex-1 py-1 px-2 rounded-md transition-all cursor-pointer ${typeFilter === "quality" ? "bg-white dark:bg-slate-900 shadow text-amber-600 dark:text-amber-500" : "text-slate-500"}`}
                    >
                      Quality ({findings.filter((f) => f.agent_source === "code_analysis").length})
                    </button>
                  </div>

                  {/* Severity filter row */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant={severityFilter === "all" ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("all")}
                      className="text-[10px] font-bold h-6 rounded-md cursor-pointer"
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant={severityFilter === "critical" ? "destructive" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("critical")}
                      className="text-[10px] font-bold h-6 rounded-md cursor-pointer"
                    >
                      Critical ({scores.critical})
                    </Button>
                    <Button
                      type="button"
                      variant={severityFilter === "high" ? "destructive" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("high")}
                      className="text-[10px] font-bold h-6 rounded-md cursor-pointer"
                    >
                      High ({scores.high})
                    </Button>
                    <Button
                      type="button"
                      variant={severityFilter === "medium" ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("medium")}
                      className="text-[10px] font-bold h-6 rounded-md cursor-pointer"
                    >
                      Medium ({scores.medium})
                    </Button>
                    <Button
                      type="button"
                      variant={severityFilter === "low" ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSeverityFilter("low")}
                      className="text-[10px] font-bold h-6 rounded-md cursor-pointer"
                    >
                      Low ({scores.low})
                    </Button>
                  </div>
                </CardHeader>

                {/* Findings List */}
                <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredFindings.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No matching findings discovered.
                    </div>
                  ) : (
                    filteredFindings.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFindingId(f.id);
                          setTimeout(() => {
                            const el = document.getElementById("selected-finding-remediation");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 50);
                        }}
                        className={`w-full text-left p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all flex flex-col gap-2 cursor-pointer ${
                          selectedFindingId === f.id ? "bg-blue-50/30 dark:bg-blue-950/25 border-r-4 border-blue-500" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            {f.line_number != null ? `Line ${f.line_number}` : "Global Issue"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getCategoryFlag(f)}
                            {getSeverityBadge(f.severity)}
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{f.title}</h4>
                        {f.owasp_category && (
                          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                            🛡️ {f.owasp_category}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{f.description}</p>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Right column: Interactive Source Code Explorer OR Selected Finding Detail Pane */}
            <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden h-[680px] flex flex-col">
              <CardHeader className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("code")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      rightPanelTab === "code"
                        ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    Source Explorer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("remediation")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      rightPanelTab === "remediation"
                        ? "bg-white dark:bg-slate-900 shadow text-emerald-600 dark:text-emerald-400"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Remediation Detail {selectedFinding ? `(Line ${selectedFinding.line_number ?? "Global"})` : ""}
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
                  {rightPanelTab === "code" ? "Click highlighted lines to inspect" : "Verified AI Fix"}
                </span>
              </CardHeader>

              {rightPanelTab === "code" ? (
                <CardContent className="p-0 flex-1 overflow-auto bg-slate-950 text-slate-300">
                  <pre className="font-mono text-xs leading-relaxed py-4 select-none">
                    {submission.source_code.split("\n").map((line, idx) => {
                      const lineNum = idx + 1;
                      const highlightClass = getLineHighlightClass(lineNum);
                      const lineFindings = findingsByLine[lineNum] || [];
                      const hasLineFindings = lineFindings.length > 0;
                      const topFinding = lineFindings[0];

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (hasLineFindings) {
                              setSelectedFindingId(lineFindings[0].id);
                              setRightPanelTab("remediation");
                            }
                          }}
                          className={`flex items-center px-4 transition-all duration-150 ${highlightClass} ${
                            hasLineFindings ? "cursor-pointer hover:bg-slate-900/50" : ""
                          }`}
                        >
                          <span className="w-8 text-right pr-3 select-none text-slate-600 font-mono text-[10px] border-r border-slate-900 mr-4">
                            {lineNum}
                          </span>
                          <span className="flex-1 whitespace-pre font-mono text-[11px] select-text">
                            {line || " "}
                          </span>
                          {hasLineFindings && topFinding && (
                            <span className="ml-2 flex items-center gap-1">
                              {getSeverityBadge(topFinding.severity)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </pre>
                </CardContent>
              ) : (
                <CardContent className="p-5 flex-1 overflow-auto space-y-5 bg-white dark:bg-slate-900/60">
                  {selectedFinding ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSeverityBadge(selectedFinding.severity)}
                          {getCategoryFlag(selectedFinding)}
                          {selectedFinding.cwe_id && (
                            <Badge variant="secondary" className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-[10px]">
                              {selectedFinding.cwe_id}
                            </Badge>
                          )}
                          {selectedFinding.owasp_category && (
                            <Badge className="font-semibold bg-purple-600 text-white text-[10px] px-2.5 py-0.5">
                              🛡️ {selectedFinding.owasp_category}
                            </Badge>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setAssistantQuery(`Explain ${selectedFinding.title} (${selectedFinding.cwe_id || selectedFinding.owasp_category || ""}) and how to fix it.`);
                            setActivePortalTab("assistant");
                          }}
                          className="text-[11px] font-semibold border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 rounded-lg"
                        >
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Ask Assistant
                        </Button>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{selectedFinding.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">{selectedFinding.description}</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                            Remediation Guidance &amp; Secure Snippet
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {selectedFinding.remediation_summary || "Apply parameterized queries and modular refactoring according to standard security rules."}
                        </p>

                        {selectedFinding.corrected_code && (
                          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2 shadow-inner">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3" />
                                Remediated Secure Snippet
                              </span>
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => copyToClipboard(selectedFinding.corrected_code || "")}
                                className="text-[10px] text-slate-400 hover:text-white rounded-lg px-2 py-0.5"
                              >
                                {copiedCode ? <Check className="h-3 w-3 text-emerald-400 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                {copiedCode ? "Copied!" : "Copy"}
                              </Button>
                            </div>
                            <pre className="font-mono text-[11px] leading-relaxed text-emerald-300 overflow-x-auto whitespace-pre max-h-[220px]">
                              {selectedFinding.corrected_code}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      Select a finding from the left list to view detailed remediation guidance.
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      )}


      {/* PR Review & Code Diff Summary Tab */}
      {activePortalTab === "pr_summary" && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {submission.pr_summary?.title || `Pull Request Review Summary: ${submission.language.toUpperCase()}`}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Generated by PR Summary Agent synthesizing Code Analysis, Security Vulnerabilities, and Remediation outputs.</p>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Code Health Score</span>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{healthScore} / 100</p>
              </div>
            </div>
          </div>

          {/* Executive Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Executive Overview</h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {submission.pr_summary?.executive_overview || "Automated code review completed cleanly across multi-agent analysis layers."}
            </div>
          </div>

          {/* Severity Matrix */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Severity Breakdown Matrix</h4>
            <div className="grid grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-red-500">Critical</span>
                <p className="text-xl font-extrabold text-red-600 dark:text-red-400">{scores.critical}</p>
              </div>
              <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-orange-500">High</span>
                <p className="text-xl font-extrabold text-orange-500 dark:text-orange-400">{scores.high}</p>
              </div>
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-500">Medium</span>
                <p className="text-xl font-extrabold text-amber-500 dark:text-amber-400">{scores.medium}</p>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-blue-500">Low</span>
                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{scores.low}</p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500">Info</span>
                <p className="text-xl font-extrabold text-slate-600 dark:text-slate-400">{scores.info}</p>
              </div>
            </div>
          </div>

          {/* OWASP Standard Mapping */}
          {submission.pr_summary?.owasp_mapping && submission.pr_summary.owasp_mapping.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">OWASP Top 10 Security Standard Mapping</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-slate-500">
                      <th className="p-3">OWASP Category</th>
                      <th className="p-3">Flagged Finding</th>
                      <th className="p-3">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {submission.pr_summary.owasp_mapping.map((owasp, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">🛡️ {owasp.category}</td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{owasp.finding_title}</td>
                        <td className="p-3">{getSeverityBadge(owasp.risk_level)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prioritized Fix Roadmap */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Prioritized Action &amp; Fix Roadmap</h4>
            {submission.pr_summary?.prioritized_fix_list && submission.pr_summary.prioritized_fix_list.length > 0 ? (
              <div className="space-y-2">
                {submission.pr_summary.prioritized_fix_list.map((fix, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs flex-shrink-0">
                      {fix.priority}
                    </span>
                    <div className="space-y-1">
                      <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">{fix.issue_title}</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{fix.action_item}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No priority fixes required. Code meets secure coding criteria.</p>
            )}
          </div>
        </Card>
      )}

      {/* Full Remediated Code & Diff Tab */}
      {activePortalTab === "full_code" && (() => {
        const metadata = submission.pr_summary?.self_healing_metadata;
        const isRemediationSuccess = metadata?.remediation_status === "success" || metadata?.rescan_passed === true;
        const hasUnresolvedSyntaxError = !isRemediationSuccess && (
          submission.is_valid_syntax === false || 
          (submission.validation_errors && submission.validation_errors.length > 0)
        );

        const status = hasUnresolvedSyntaxError 
          ? "syntax_error" 
          : (metadata?.remediation_status || (metadata?.rescan_passed === false ? "remediation_failed" : "success"));
        const secRequired = metadata?.security_remediation_required ?? true;

        let titleText = "Fully Remediated & Production-Ready Source Code";
        let subtitleText = "Complete refactored source file verified via automated post-remediation re-scan to eliminate all OWASP vulnerabilities.";
        let badgeText = "Automated Re-Scan: 100% Fixed (0 Remaining Vulnerabilities)";
        let badgeColor = "bg-emerald-600/90 text-white";

        if (status === "syntax_error") {
          const errLine = submission.validation_errors?.[0]?.line || submission.findings?.find(f => f.category === "syntax_error")?.line_number;
          titleText = `Remediation Unsuccessful — Syntax Error ${errLine ? `on Line ${errLine}` : "Detected"}`;
          subtitleText = "Source code contains syntax/compiler errors. Code must be syntactically valid before security remediation can run.";
          badgeText = `Automated Re-Scan: Syntax Error (${errLine ? `Line ${errLine}` : "Unresolved"})`;
          badgeColor = "bg-red-600/90 text-white";
        } else if (status === "remediation_failed" || metadata?.rescan_passed === false) {
          titleText = "Remediation Unsuccessful — No Code Changes Generated";
          subtitleText = metadata?.remediation_error || "Re-scan detected unmitigated security vulnerabilities or candidate code was unchanged. Preserved original source for security compliance.";
          badgeText = `Automated Re-Scan: Remediation Failed (${metadata?.rescan_findings_count ?? 1} Remaining Vulnerabilities)`;
          badgeColor = "bg-red-600/90 text-white";
        } else if (status === "no_vulnerabilities" || status === "quality_only" || (!secRequired && (submission.findings?.length || 0) === 0)) {
          titleText = "Source Code Verified (0 Security Vulnerabilities)";
          subtitleText = "Submitted source code complies with OWASP Top 10 security standards. Quality and design recommendations are highlighted in the Findings tab.";
          badgeText = "Automated Re-Scan: 100% Secure (0 Security Vulnerabilities)";
          badgeColor = "bg-emerald-600/90 text-white";
        } else if (status === "partial") {
          titleText = `Partial Remediation — ${metadata?.rescan_findings_count ?? 1} Vulnerabilities Remaining`;
          subtitleText = "Partial fixes applied. Some security findings require manual architectural refactoring.";
          badgeText = `Automated Re-Scan: Partial Fix (${metadata?.rescan_findings_count} Remaining Vulnerabilities)`;
          badgeColor = "bg-amber-600/90 text-white";
        }

        // Honesty guard: never present original code as "fully remediated" while security findings remain
        const SEC_CATEGORIES = ["secrets", "sql_injection", "auth_flaw", "command_injection", "path_traversal", "xss", "insecure_crypto", "vulnerability"];
        const secFindingCount = (submission.findings || []).filter((f) => SEC_CATEGORIES.includes(String(f.category))).length;
        const remCode = String(submission.pr_summary?.full_remediated_code || "");
        if (
          isRemediationSuccess &&
          secFindingCount > 0 &&
          remCode.trim() !== "" &&
          remCode.trim() === String(submission.source_code || "").trim()
        ) {
          titleText = "Remediation Engine Returned Unchanged Code";
          subtitleText = `${secFindingCount} security finding(s) were detected but the remediation engine could not modify the code. Please re-run the analysis - the AI engine may be temporarily unavailable.`;
          badgeText = `Automated Re-Scan: Not Remediated (${secFindingCount} Finding${secFindingCount > 1 ? "s" : ""} Remain)`;
          badgeColor = "bg-red-600/90 text-white";
        }

        if (showDiffInFullCode) {
          titleText = "Side-by-Side Code Remediation Diff";
          subtitleText = "Visual side-by-side AST comparison comparing original vulnerable code with AI-generated secure refactored code.";
        }

        const hasRemediatedCode = Boolean(submission.pr_summary?.full_remediated_code);

        return (
        <Card className="border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm p-6 space-y-6">
          {/* Header with View Switcher and Copy button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  {titleText}
                </h3>
                <Badge className={`${badgeColor} border-0 px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm`}>
                  <ShieldCheck className="h-3.5 w-3.5 text-white" />
                  {badgeText}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {subtitleText}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              {/* Segmented View Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDiffInFullCode(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    !showDiffInFullCode
                      ? "bg-white dark:bg-slate-900 shadow text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  Full Code
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiffInFullCode(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    showDiffInFullCode
                      ? "bg-white dark:bg-slate-900 shadow text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare Side-by-Side Diff
                </button>
              </div>

              {/* Single Primary Copy Button */}
              <Button
                type="button"
                onClick={() => {
                  const codeToCopy = submission.pr_summary?.full_remediated_code || submission.source_code;
                  if (codeToCopy) {
                    navigator.clipboard.writeText(codeToCopy);
                    setCopiedFullCode(true);
                    setTimeout(() => setCopiedFullCode(false), 2000);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                {copiedFullCode ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                {copiedFullCode ? "Copied Remediated Code!" : "Copy Remediated Code"}
              </Button>
            </div>
          </div>

          {/* In-Place Content Switcher */}
          {!showDiffInFullCode ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-emerald-500" />
                  Production-Ready Refactored File
                </h4>
              </div>
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-6 overflow-x-auto shadow-inner">
                <pre className="font-mono text-xs leading-relaxed text-emerald-300 whitespace-pre">
                  {submission.pr_summary?.full_remediated_code || submission.source_code}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-300">
              <CodeDiffViewer
                originalCode={submission.source_code}
                remediatedCode={submission.pr_summary?.full_remediated_code || submission.source_code}
                language={submission.language}
                showCopyButton={false}
              />
            </div>
          )}
        </Card>
        );
      })()}

      {/* Conversational Assistant Tab */}
      {activePortalTab === "assistant" && (
        <ConversationalAssistant
          submissionId={submission.id}
          initialFindingQuery={assistantQuery}
        />
      )}
    </div>
  );
}
