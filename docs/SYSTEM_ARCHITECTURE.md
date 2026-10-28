# Development of Smart Code Inspection Platform with Vulnerability Detection System Group 2 - System Architecture

## Overview
This document describes the system architecture for the AI Code Review & Security Analysis Agent, a multi-agent system designed to perform comprehensive code security analysis using RAG (Retrieval-Augmented Generation) and OWASP vulnerability detection.

## System Goals
1. **Automated Security Analysis**: Detect OWASP Top 10 vulnerabilities in Python and Java code
2. **Code Quality Assessment**: Identify code smells and anti-patterns
3. **Grounded Recommendations**: Use RAG to provide context-aware security guidance
4. **Multi-Agent Orchestration**: Coordinate specialized agents for different analysis tasks

## Architecture Components

### 1. Frontend Layer
- **Next.js Application**: User interface for code submission and results display
- **Theme System**: Dark/light mode support
- **Real-time Updates**: WebSocket connections for live analysis progress

### 2. API Layer (FastAPI)
- **REST Endpoints**: Code submission, status checking, result retrieval
- **Authentication**: API key-based authentication (future)
- **Rate Limiting**: Prevent abuse and ensure fair usage
- **CORS Configuration**: Secure cross-origin requests

### 3. Multi-Agent Orchestration Layer (LangGraph)

#### Agent 1: Syntax Validator Agent
- **Responsibility**: Validate code syntax for Python and Java
- **Tools**: 
  - Python AST parser
  - Java javalang parser
- **Output**: Syntax validation results with error locations

#### Agent 2: Vulnerability Scanner Agent
- **Responsibility**: Detect OWASP Top 10 vulnerabilities
- **Tools**:
  - Static analysis rules
  - Pattern matching for known vulnerability patterns
  - CWE mapping
- **Output**: List of detected vulnerabilities with severity levels

#### Agent 3: Code Smell Detector Agent
- **Responsibility**: Identify code quality issues and anti-patterns
- **Tools**:
  - Code complexity analysis
  - Duplicate code detection
  - Naming convention violations
- **Output**: Code smell reports with improvement suggestions

#### Agent 4: RAG Knowledge Agent
- **Responsibility**: Retrieve relevant security guidelines and best practices
- **Tools**:
  - ChromaDB vector store
  - BGE embedding model
  - Semantic search
- **Output**: Contextual security recommendations

#### Agent 5: Report Generator Agent
- **Responsibility**: Synthesize findings into comprehensive reports
- **Tools**:
  - LLM (Gemini 2.0 Flash)
  - Template-based report generation
  - Severity scoring
- **Output**: Structured security analysis report

### 4. Data Layer

#### Vector Store (ChromaDB)
- **Purpose**: Store embeddings of security guidelines
- **Embedding Model**: BAAI/bge-small-en-v1.5
- **Collections**:
  - OWASP guidelines
  - Secure coding standards
  - Best practices documentation

#### Relational Database (PostgreSQL)
- **Purpose**: Store submissions, analysis results, and user data
- **Schema**:
  - `submissions`: Code submissions with metadata
  - `analysis_results`: Agent outputs and findings
  - `vulnerabilities`: Detected vulnerabilities with CWE mappings
  - `code_smells`: Code quality issues
  - `recommendations`: RAG-based suggestions

#### Knowledge Base
- **Sources**:
  - OWASP Top 10 documentation
  - OpenSSF Secure Coding Guides
  - Language-specific security guidelines
  - Industry best practices

## Orchestration Flow

### Phase 1: Code Submission
1. User submits code via frontend (paste or file upload)
2. Frontend validates file type and size
3. Code sent to backend API
4. Submission stored in database with unique ID

### Phase 2: Syntax Validation
1. Syntax Validator Agent receives submission
2. Parses code using language-specific parser
3. Returns syntax errors or validation success
4. If syntax errors found, process stops with error report

### Phase 3: Parallel Analysis
If syntax is valid, multiple agents work in parallel:

**Vulnerability Scanner Agent**:
- Scans code for OWASP Top 10 patterns
- Maps findings to CWE identifiers
- Assigns severity levels (Critical, High, Medium, Low)

**Code Smell Detector Agent**:
- Analyzes code complexity metrics
- Identifies anti-patterns
- Suggests refactoring opportunities

**RAG Knowledge Agent**:
- Extracts key code patterns and functions
- Queries vector store for relevant guidelines
- Retrieves contextual security recommendations

### Phase 4: Report Generation
1. Report Generator Agent collects all agent outputs
2. Synthesizes findings using LLM
3. Generates structured report with:
   - Executive summary
   - Detailed vulnerability findings
   - Code quality assessment
   - Security recommendations
   - Remediation guidance

### Phase 5: Result Delivery
1. Report stored in database
2. Frontend notified of completion
3. User can view/download results

## Data Models

### Submission Model
```typescript
{
  id: string;
  language: "python" | "java";
  source_code: string;
  filename?: string;
  submission_type: "paste" | "upload";
  created_at: timestamp;
  status: "pending" | "processing" | "completed" | "failed";
}
```

### Vulnerability Model
```typescript
{
  id: string;
  submission_id: string;
  cwe_id: string;
  owasp_category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  location: { line: number; column: number };
  code_snippet: string;
  remediation: string;
}
```

### Code Smell Model
```typescript
{
  id: string;
  submission_id: string;
  type: string;
  severity: "major" | "minor";
  description: string;
  location: { line: number; column: number };
  suggestion: string;
}
```

### Recommendation Model
```typescript
{
  id: string;
  submission_id: string;
  source: string;
  category: string;
  content: string;
  relevance_score: number;
  applicable_vulnerabilities: string[];
}
```

## Technology Stack

### Backend
- **Framework**: FastAPI 0.115.6
- **Orchestration**: LangGraph 0.2.60
- **Database**: PostgreSQL 16 + SQLAlchemy 2.0.36
- **Vector Store**: ChromaDB 0.5.23
- **Embeddings**: sentence-transformers 3.3.1 (BAAI/bge-small-en-v1.5)
- **LLM**: Google Gemini 2.0 Flash
- **Code Parsing**: javalang 0.13.0, Python AST

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Theme**: next-themes
- **Icons**: lucide-react

## Security Considerations

### Input Validation
- File type restrictions (.py, .java only)
- File size limits (max 500KB)
- Code sanitization before processing

### Output Sanitization
- Escape user-generated content in reports
- Validate LLM outputs
- Prevent XSS in frontend

### API Security
- Rate limiting per user
- API key authentication (future)
- HTTPS only in production
- CORS configuration

### Data Privacy
- No code storage beyond analysis period
- Optional data retention policies
- Secure database connections

## Performance Optimization

### Caching
- Cache frequently accessed knowledge base queries
- Cache embedding computations
- Cache analysis results for identical code

### Parallel Processing
- Agents run in parallel where possible
- Async I/O for database operations
- Background job processing for long analyses

### Scalability
- Horizontal scaling of API servers
- Database connection pooling
- Vector store sharding for large knowledge bases

## Monitoring & Logging

### Metrics
- Submission success/failure rates
- Agent execution times
- API response times
- Error rates by type

### Logging
- Structured JSON logging
- Agent decision trails
- Error stack traces
- Performance metrics

### Alerts
- High error rate thresholds
- Slow response time alerts
- Database connection issues
- Vector store availability

## Future Enhancements

### Phase 2 (Planned)
- Support for additional languages (JavaScript, Go, C++)
- Advanced code smell detection with ML
- Integration with CI/CD pipelines
- Historical analysis and trend tracking

### Phase 3 (Future)
- Real-time code analysis in IDEs
- Custom rule configuration
- Team collaboration features
- Advanced reporting and analytics
