"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Database, Loader2, RefreshCw, Search, Sparkles, AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getKnowledgeBaseStatus,
  indexKnowledgeBase,
  KnowledgeBaseStatus,
  queryKnowledgeBase,
  RetrievedChunk,
} from "@/lib/api";

export function KnowledgeBasePanel() {
  const [status, setStatus] = useState<KnowledgeBaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getKnowledgeBaseStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load knowledge base status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleIndex = async () => {
    setIsIndexing(true);
    setError(null);
    try {
      await indexKnowledgeBase();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Indexing failed");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const data = await queryKnowledgeBase(query);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCardClick = async (docTitle: string) => {
    setQuery(docTitle);
    setIsSearching(true);
    setError(null);
    try {
      const data = await queryKnowledgeBase(docTitle);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
            <Database className="h-5 w-5" />
            <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-yellow-400 animate-pulse-slow" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Secure Coding Knowledge Base</CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-0.5">
              RAG pipeline grounded with OWASP standards and secure design practices.
            </CardDescription>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleIndex}
          disabled={isIndexing}
          className="self-start sm:self-center border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-xl font-semibold px-4 py-2"
        >
          {isIndexing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Indexing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {status?.is_indexed ? "Re-index Docs" : "Index Docs"}
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-8">

        {/* Status Indicators */}
        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-slate-500 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            Checking knowledge base status...
          </div>
        ) : status ? (
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/40 rounded-xl p-4">
            <Badge className={status.is_indexed ? "bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-2.5 py-1" : "bg-slate-500 text-white rounded-lg"}>
              {status.is_indexed ? "Vector DB Active" : "Not Indexed"}
            </Badge>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">&#183;</span>
            <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">{status.total_documents} source documents</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">&#183;</span>
            <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">{status.total_chunks} embeddings indexed</span>
          </div>
        ) : null}

        {/* Documents Grid */}
        {status?.documents && status.documents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Grounded Standards &amp; Materials</h4>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Click any card to auto-search</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {status.documents.map((doc) => (
                <button
                  key={doc.source_file}
                  type="button"
                  onClick={() => handleCardClick(doc.title)}
                  disabled={isSearching || !status?.is_indexed}
                  className="w-full text-left flex items-center gap-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{doc.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {doc.category.toUpperCase()} &middot; {doc.chunk_count} chunks
                    </p>
                  </div>
                  <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RAG Query Terminal */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">RAG Guideline Search</h4>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. How to prevent SQL injection in Java?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="rounded-xl border-slate-200 dark:border-slate-800 bg-transparent py-6 focus-visible:ring-blue-500"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !status?.is_indexed}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/10 rounded-xl px-5 py-6 transition-all"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Retrieved Context &amp; Guidance</h4>
            <div className="space-y-4">
              {results.map((chunk, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/20 p-5 space-y-3 transition-all hover:border-blue-200 dark:hover:border-blue-900/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-400 rounded-lg px-2 py-0.5">
                        {chunk.source}
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 rounded-lg px-2 py-0.5">
                        {chunk.category.toUpperCase()}
                      </Badge>
                    </div>
                    {chunk.score != null && (
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Relevance Score: {chunk.score.toFixed(3)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-normal">{chunk.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="rounded-xl border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-400 font-bold">Search/Index Fail</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
