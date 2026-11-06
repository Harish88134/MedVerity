// ── API Client ──
// Centralized fetch wrapper for calling the FastAPI backend.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function api<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new ApiError(error.detail || 'An error occurred', response.status);
  }

  return response.json();
}

// Convenience methods
export const apiClient = {
  get: <T>(endpoint: string, token?: string) => api<T>(endpoint, { token }),
  post: <T>(endpoint: string, body: unknown, token?: string) => api<T>(endpoint, { method: 'POST', body, token }),
  put: <T>(endpoint: string, body: unknown, token?: string) => api<T>(endpoint, { method: 'PUT', body, token }),
  delete: <T>(endpoint: string, token?: string) => api<T>(endpoint, { method: 'DELETE', token }),
};
