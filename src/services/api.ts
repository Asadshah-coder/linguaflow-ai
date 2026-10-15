/**
 * Backend API client. In dev, Vite proxies /api to the FastAPI backend
 * (see vite.config.ts). In production the backend serves the frontend,
 * so relative /api works there too.
 */

const TOKEN_KEY = 'linguaflow:token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface ApiUser {
  id: number;
  email: string;
  created_at: string;
}

export interface ServerHistoryEntry {
  id: number;
  source_text: string;
  translated_text: string;
  source: string;
  target: string;
  detected_source: string | null;
  provider: string;
  created_at: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the backend running?');
  }
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const detail =
      (body as { detail?: unknown } | null)?.detail ??
      (Array.isArray((body as { detail?: unknown } | null)?.detail)
        ? ((body as { detail: Array<{ msg?: string }> }).detail.map((d) => d.msg).join('; '))
        : null);
    const message =
      typeof detail === 'string' ? detail : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<ApiUser>('/api/auth/me'),

  listHistory: (limit = 50, offset = 0) =>
    request<ServerHistoryEntry[]>(`/api/history?limit=${limit}&offset=${offset}`),
  saveHistory: (entry: {
    source_text: string;
    translated_text: string;
    source: string;
    target: string;
    detected_source?: string;
    provider: string;
  }) =>
    request<ServerHistoryEntry>('/api/history', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  deleteHistory: (id: number) =>
    request<void>(`/api/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => request<void>('/api/history', { method: 'DELETE' }),

  health: () => request<{ status: string }>('/api/health'),
};
