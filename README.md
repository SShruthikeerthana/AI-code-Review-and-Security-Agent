# Development of Smart Code Inspection Platform with Vulnerability Detection System Group 2

An intelligent multi-agent platform that automatically analyzes Python and Java source code for quality issues, OWASP Top 10 security vulnerabilities, and best-practice violations — featuring a RAG-powered Conversational Code Assistant and exportable review reports.

---

## 🌟 Key Features (Milestones 1 - 4 Complete)

- **Code Submission Module** — Direct code paste and drag-and-drop file upload for Python (`.py`) and Java (`.java`) with automated language detection and AST syntax validation.
- **Secure Coding Knowledge Base & RAG Pipeline** — Indexed OWASP Top 10 guidelines, CWE definitions, and secure coding standards using LangChain, ChromaDB vector store, and `bge-small-en-v1.5` embeddings.
- **Multi-Agent Analysis Pipeline (LangGraph)**:
  - 🔍 **Code Analysis Agent**: Detects code smells, design anti-patterns, cyclomatic complexity issues, arrow nesting, and poor practices.
  - 🛡️ **Security Vulnerability Agent**: Scans for OWASP Top 10 security vulnerabilities (SQL Injection, Cross-Site Scripting, Command Injection, Hardcoded Secrets, Insecure Hashing, Path Traversal, Broken Access Control).
  - 🛠️ **Remediation Agent**: Generates specific fix recommendations, executable corrected code snippets, and grounded best-practice explanations per finding.
  - 📝 **PR Summary Agent**: Synthesizes agent outputs into an executive-grade Pull Request Review Summary with severity breakdown matrix, OWASP mapping, and prioritized fix roadmap.
  - 💬 **Conversational Code Assistant**: RAG-powered Q&A interface allowing developers to ask follow-up queries about flagged vulnerabilities and secure coding practices.
- **Developer Review Portal & Report Generation**:
  - Interactive source code explorer with line-by-line severity annotations.
  - Code Health Score (0 - 100) with dynamic severity scoring.
  - Multi-format report export: **PDF**, **Markdown**, and **JSON**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Portal** | Next.js 14, React 18, Tailwind CSS, Lucide Icons, Dark/Light Mode |
| **Backend API** | FastAPI, Uvicorn, Python 3.11 |
| **Agent Framework** | LangGraph, LangChain, Google Gemini API |
| **RAG Vector Database** | ChromaDB, HuggingFace Embeddings (`BAAI/bge-small-en-v1.5`) |
| **PDF Generation** | ReportLab |
| **Database & ORM** | PostgreSQL / SQLite, SQLAlchemy |
| **AST Parser** | `javalang`, Python `ast` |

---

## 📁 Repository Architecture

```
AI-Code-Review-Agent/
├── backend/
│   ├── app/
│   │   ├── agents/            # LangGraph multi-agent pipeline
│   │   │   ├── code_analysis.py
│   │   │   ├── security_vulnerability.py
│   │   │   ├── remediation.py
│   │   │   ├── pr_summary.py
│   │   │   ├── conversational_assistant.py
│   │   │   └── orchestrator.py
│   │   ├── api/               # FastAPI REST endpoints
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── rag/               # Vector store & indexer
│   │   ├── schemas/           # Pydantic data schemas
│   │   └── services/          # Report generator & validators
│   ├── data/
│   │   ├── samples/           # Code samples of varying complexity
│   │   │   ├── vulnerable_python.py
│   │   │   ├── vulnerable_java.java
│   │   │   └── complex_banking_service.py
│   │   └── chroma/            # ChromaDB persistent store
│   ├── knowledge_base/        # OWASP & Secure Coding Markdown guides
│   └── tests/                 # Automated Pytest suite
├── frontend/                  # Next.js developer portal UI
├── docs/                      # Technical documentation & project reports
│   ├── SYSTEM_ARCHITECTURE.md
│   └── PROJECT_REPORT.md
├── PROJECT_REPORT.md
└── docker-compose.yml
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Activate venv (Windows)
.venv\Scripts\activate
# Activate venv (Linux/macOS)
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI Server
uvicorn app.main:app --reload --port 8000
```

Index knowledge base documents into ChromaDB (first run):
```bash
curl -X POST http://localhost:8000/api/v1/knowledge-base/index
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run full automated test suite covering all 4 project milestones:

```bash
cd backend
.venv\Scripts\python.exe -m pytest -v tests
```

---

## 📄 Exportable Review Reports

The platform produces full reports in 3 formats:
1. **PDF Report**: Downloadable formatted PDF document built with ReportLab including Executive Overview, Health Score, OWASP Matrix, Prioritized Fix List, Detailed Findings, and Production-Ready Refactored Code.
2. **Markdown Report**: GFM markdown format ideal for attaching to GitHub PR reviews.
3. **JSON Report**: Machine-readable JSON output for CI/CD integrations.

---

## 📜 Documentation

- [Project Completion Report](./PROJECT_REPORT.md)
- [System Architecture Document](./docs/SYSTEM_ARCHITECTURE.md)
