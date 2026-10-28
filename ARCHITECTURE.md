# System Architecture — Development of Smart Code Inspection Platform with Vulnerability Detection System Group 2

## Overview

The platform is a multi-agent code review system that analyzes Python and Java source code for quality issues, security vulnerabilities, and best-practice violations. Developers submit code via paste or file upload; a LangGraph-orchestrated pipeline runs specialized agents and returns scored findings with remediation guidance. A RAG-powered assistant answers follow-up questions grounded in a secure-coding knowledge base.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Developer Portal (Next.js)                       │
│  Code Submission │ Findings Dashboard │ Chat Assistant │ Report Export  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ REST API
┌───────────────────────────────▼─────────────────────────────────────────┐
│                         FastAPI Backend                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ Submission  │  │ LangGraph        │  │ RAG Pipeline               │  │
│  │ Module      │  │ Orchestrator     │  │ (LangChain + ChromaDB)     │  │
│  └──────┬──────┘  └────────┬─────────┘  └─────────────┬──────────────┘  │
│         │                  │                          │                  │
│  ┌──────▼──────┐  ┌────────▼─────────┐  ┌───────────▼──────────────┐  │
│  │ PostgreSQL  │  │ Agent Pipeline   │  │ BGE Embeddings           │  │
│  │ (SQLAlchemy)│  │ (5 Agents)       │  │ + Knowledge Base Docs      │  │
│  └─────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Responsibilities

| Agent | Responsibility | Input | Output |
|-------|---------------|-------|--------|
| **Code Analysis Agent** | Structure review, code smells, design anti-patterns, complexity | Source code + static analyzer results | Quality findings with severity |
| **Security Vulnerability Agent** | OWASP scan: SQLi, XSS, CSRF, secrets, auth flaws | Source code + Bandit/PMD results | Security findings with CWE/OWASP mapping |
| **Remediation Agent** | Fix recommendations with corrected code examples | All findings + RAG context | Remediation steps per finding |
| **PR Summary Agent** | Human-readable review summary | All agent outputs | Structured PR-style summary |
| **Conversational Assistant** | Follow-up Q&A on findings and secure coding | User query + RAG retrieval | Grounded answers with citations |

## Orchestration Flow (LangGraph)

```
                    ┌─────────────────┐
                    │  Code Submitted │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Static Analysis │  (Bandit, Pylint, PMD, SpotBugs)
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌───────▼──────┐       │
     │ Code       │  │ Security     │       │
     │ Analysis   │  │ Vulnerability│       │
     │ Agent      │  │ Agent        │       │
     └────────┬───┘  └───────┬──────┘       │
              │              │              │
              └──────┬───────┘              │
                     │                      │
              ┌──────▼──────┐               │
              │ Remediation │◄── RAG Context│
              │ Agent       │               │
              └──────┬──────┘               │
                     │                      │
              ┌──────▼──────┐               │
              │ PR Summary  │               │
              │ Agent       │               │
              └──────┬──────┘               │
                     │                      │
              ┌──────▼──────┐               │
              │   Report    │               │
              │  Generation │               │
              └─────────────┘               │
                                            │
                              ┌─────────────▼──────────┐
                              │ Conversational         │
                              │ Assistant (on demand)  │
                              └────────────────────────┘
```

## Data Models

### CodeSubmission
- `id` (UUID, PK)
- `language` (enum: python, java)
- `source_code` (text)
- `filename` (optional)
- `submission_type` (enum: paste, upload)
- `is_valid_syntax` (boolean)
- `validation_errors` (JSON)
- `status` (enum: pending, analyzing, completed, failed)
- `created_at`, `updated_at`

### AnalysisRun (future milestone)
- `id`, `submission_id` (FK)
- `status`, `started_at`, `completed_at`
- `agent_outputs` (JSON)

### Finding (future milestone)
- `id`, `analysis_run_id` (FK)
- `agent_source`, `category`, `severity`
- `title`, `description`, `line_number`
- `cwe_id`, `owasp_category`
- `remediation` (JSON)

### KnowledgeBaseDocument
- `id`, `title`, `source_file`, `category`
- `chunk_count`, `indexed_at`

## RAG Pipeline (Milestone 1)

```
Documents (Markdown) → Text Splitter → BGE Embeddings → ChromaDB
                                                              │
User Query → Embed Query → Similarity Search → Top-K Chunks → LLM
```

**Knowledge base sources (Milestone 1):**
- OWASP Top 10 overview
- Secure coding guidelines (Python & Java)
- Common code smell patterns

**Chunking:** RecursiveCharacterTextSplitter (chunk_size=800, overlap=150)

**Embeddings:** `BAAI/bge-small-en-v1.5` via HuggingFace

**Vector store:** ChromaDB (persistent, local `./data/chroma`)

## API Endpoints (Milestone 1)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/submissions/paste` | Submit pasted code |
| POST | `/api/v1/submissions/upload` | Upload source file |
| GET | `/api/v1/submissions/{id}` | Get submission details |
| GET | `/api/v1/submissions` | List submissions |
| POST | `/api/v1/knowledge-base/index` | Index/re-index knowledge base |
| GET | `/api/v1/knowledge-base/status` | Indexing status & stats |
| POST | `/api/v1/knowledge-base/query` | RAG query (test endpoint) |
| GET | `/health` | Health check |

## Tech Stack Mapping

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, python-multipart |
| Orchestration | LangGraph (Milestone 2+) |
| LLM | Gemini 2.5 Flash / GPT |
| RAG | LangChain, ChromaDB, BGE embeddings |
| Database | PostgreSQL, SQLAlchemy |
| Auth | JWT + bcrypt (Milestone 3+) |
| Static Analysis | Bandit, Pylint, PMD (Milestone 2+) |
| Deployment | Vercel, Render, Neon |

## Milestone Roadmap

- **M1 (current):** Architecture, code submission, RAG knowledge base
- **M2:** Multi-agent pipeline, static analyzers, findings display
- **M3:** Remediation agent, PR summary, report export, auth
- **M4:** Conversational assistant UI, deployment, polish
