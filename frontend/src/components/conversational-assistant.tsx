"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { sendAssistantQuery, RetrievedChunk } from "@/lib/api";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: RetrievedChunk[];
  timestamp: string;
}

interface ConversationalAssistantProps {
  submissionId?: string;
  initialFindingQuery?: string;
}

function renderFormattedText(text: string) {
  // Split message by code blocks or lines
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <pre key={`code-${index}`} className="my-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800">
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`sp-${index}`} className="h-1.5" />);
      return;
    }

    // Process Headings (### or ####)
    if (trimmed.startsWith("#### ") || trimmed.startsWith("### ") || trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      const headingText = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <h4 key={`h-${index}`} className="font-bold text-sm text-blue-700 dark:text-blue-400 mt-2 mb-1 flex items-center gap-1.5">
          {headingText}
        </h4>
      );
      return;
    }

    // Process Bullet Items or Numbered lists
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const isNumbered = /^\d+\.\s/.test(trimmed);
    const cleanLine = isBullet ? trimmed.replace(/^[-*]\s*/, "") : trimmed;

    // Process inline bold (**bold**)
    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
    const inlineNodes = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    elements.push(
      <p key={`p-${index}`} className={`text-xs sm:text-sm ${isBullet || isNumbered ? "pl-3 border-l-2 border-blue-500/40 my-1" : "my-0.5"}`}>
        {inlineNodes}
      </p>
    );
  });

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="code-end" className="my-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800">
        <code>{codeBuffer.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}

export function ConversationalAssistant({ submissionId, initialFindingQuery }: ConversationalAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "Hello! I am your Conversational Secure Coding & Architecture Assistant. Ask me any question about code, OWASP Top 10 standards, SQL injection, syntax errors, code quality refactoring, or your code submission findings.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialFindingQuery) {
      handleSend(initialFindingQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFindingQuery]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputMessage("");
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => m.id !== "welcome-msg")
        .map((m) => ({ role: m.sender, content: m.text }));

      const res = await sendAssistantQuery(textToSend, submissionId, chatHistory);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: res.reply,
        sources: res.rag_sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: `Sorry, I encountered an error answering your question (${err instanceof Error ? err.message : "Network error"}). Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionChips = [
    "Explain SQL Injection & parameterized query fix",
    "What are OWASP Top 10 A01-A10 security categories?",
    "How do guard clauses fix the Arrow Anti-Pattern?",
    "How to securely store API keys & secrets?",
    "How to heal syntax & delimiter errors in code?",
    "Explain issues in my submitted code scan",
  ];

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xl rounded-2xl overflow-hidden flex flex-col h-[650px]">
      {/* Header */}
      <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-950 dark:to-slate-900 flex-shrink-0 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Conversational Code Assistant
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900 text-[10px] px-2 py-0.5">
                <Sparkles className="h-3 w-3 mr-1" /> RAG Grounded
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Ask follow-up questions regarding flagged findings or secure coding guidelines.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "assistant" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white flex-shrink-0 mt-1 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div className={`max-w-[82%] space-y-2`}>
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none"
                }`}
              >
                {msg.sender === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  renderFormattedText(msg.text)
                )}
              </div>

              <span className={`block text-[10px] text-slate-400 font-mono ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === "user" && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white flex-shrink-0 mt-1 shadow-sm">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white flex-shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              Searching Secure Coding Knowledge Base &amp; Synthesizing Advice...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider flex-shrink-0">Suggestions:</span>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(chip)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all font-medium cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 flex items-center gap-2 flex-shrink-0">
        <Input
          placeholder="Ask a question about OWASP guidelines, CWEs, or code fixes..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-xs sm:text-sm"
        />
        <Button
          type="button"
          onClick={() => handleSend()}
          disabled={!inputMessage.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex-shrink-0 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
