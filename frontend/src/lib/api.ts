const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-code-review-backend-6ut3.onrender.com";

export type Language = "python" | "java";

export interface ValidationError {
  line: number | null;
  column: number | null;
  message: string;
}

export interface Finding {
  id: string;
  agent_source: "code_analysis" | "security_vulnerability" | "syntax_validator" | string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  line_number: number | null;
  cwe_id: string | null;
  owasp_category: string | null;
  remediation_summary?: string | null;
  corrected_code?: string | null;
  best_practice_explanation?: string | null;
}

export interface PRSummary {
  title: string;
  executive_overview: string;
  health_score: number;
  severity_breakdown: Record<string, number>;
  owasp_mapping: Array<{
    category: string;
    finding_title: string;
    risk_level: string;
  }>;
  prioritized_fix_list: Array<{
    priority: number;
    issue_title: string;
    action_item: string;
  }>;
  full_remediated_code?: string | null;
  self_healing_metadata?: {
    rescan_passed: boolean;
    remediation_status?: string | null;
    remediation_engine_used?: string | null;
    security_remediation_required?: boolean | null;
    remediation_error?: string | null;
    original_findings_count: number;
    rescan_findings_count: number;
    fixed_findings_count: number;
    fixed_findings: string[];
    remaining_findings: Finding[];
    attempts: number;
  } | null;
}

export interface Submission {
  id: string;
  language: Language;
  source_code: string;
  filename: string | null;
  submission_type: "paste" | "upload";
  is_valid_syntax: boolean;
  validation_errors: ValidationError[] | null;
  findings: Finding[] | null;
  severity_scores: Record<string, number> | null;
  health_score: number | null;
  pr_summary: PRSummary | null;
  status: "pending" | "analyzing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface KnowledgeBaseStatus {
  is_indexed: boolean;
  total_documents: number;
  total_chunks: number;
  collection_name: string;
  documents: Array<{
    title: string;
    source_file: string;
    category: string;
    chunk_count: number;
    indexed_at: string | null;
  }>;
}

export interface RetrievedChunk {
  content: string;
  source: string;
  category: string;
  score: number | null;
}

// Utility to construct headers, automatically appending JWT token
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("spotlight_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    const err = new Error(error.detail || `HTTP ${response.status}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function loginUser(data: Record<string, unknown>): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

export async function signupUser(data: Record<string, unknown>): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

export async function getMe(): Promise<User> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: getHeaders(),
  });
  return handleResponse<User>(response);
}

export async function submitPaste(data: {
  source_code: string;
  language?: Language;
  filename?: string;
}): Promise<Submission> {
  const response = await fetch(`${API_URL}/api/v1/submissions/paste`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse<Submission>(response);
}

export async function submitUpload(file: File): Promise<Submission> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_URL}/api/v1/submissions/upload`, {
    method: "POST",
    headers: getHeaders(), // Don't set Content-Type, fetch will set multipart/form-data boundary
    body: formData,
  });
  return handleResponse<Submission>(response);
}

export async function getMySubmissions(skip = 0, limit = 50): Promise<{ items: Submission[]; total: number }> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("spotlight_token") : null;
  const url = token 
    ? `${API_URL}/api/v1/submissions/my-submissions?skip=${skip}&limit=${limit}`
    : `${API_URL}/api/v1/submissions?skip=${skip}&limit=${limit}`;
  
  try {
    const response = await fetch(url, { headers: getHeaders() });
    return await handleResponse<{ items: Submission[]; total: number }>(response);
  } catch (error) {
    if (token) {
      // Retry with public endpoint if authenticated endpoint fails
      const fallbackRes = await fetch(`${API_URL}/api/v1/submissions?skip=${skip}&limit=${limit}`);
      return await handleResponse<{ items: Submission[]; total: number }>(fallbackRes);
    }
    throw error;
  }
}

export async function getKnowledgeBaseStatus(): Promise<KnowledgeBaseStatus> {
  const response = await fetch(`${API_URL}/api/v1/knowledge-base/status`, {
    headers: getHeaders(),
  });
  return handleResponse<KnowledgeBaseStatus>(response);
}

export async function indexKnowledgeBase(): Promise<{ message: string; documents_indexed: number; chunks_created: number }> {
  const response = await fetch(`${API_URL}/api/v1/knowledge-base/index`, {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse(response);
}

export async function queryKnowledgeBase(query: string, topK = 4): Promise<{ query: string; results: RetrievedChunk[] }> {
  const response = await fetch(`${API_URL}/api/v1/knowledge-base/query`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ query, top_k: topK }),
  });
  return handleResponse(response);
}

export async function getSubmissionDetails(submissionId: string): Promise<Submission> {
  const response = await fetch(`${API_URL}/api/v1/submissions/${submissionId}`, {
    headers: getHeaders(),
  });
  return handleResponse<Submission>(response);
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`);
  return handleResponse(response);
}

export async function sendAssistantQuery(
  message: string,
  submissionId?: string,
  chatHistory?: Array<{ role: string; content: string }>
): Promise<{ reply: string; rag_sources?: RetrievedChunk[] }> {
  const response = await fetch(`${API_URL}/api/v1/assistant/chat`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      submission_id: submissionId || undefined,
      chat_history: chatHistory || undefined,
    }),
  });
  return handleResponse<{ reply: string; rag_sources?: RetrievedChunk[] }>(response);
}

