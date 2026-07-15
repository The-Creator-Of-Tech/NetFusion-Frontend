import { ApiClient, RequestOptions } from './client';

export const platformClient = new ApiClient({
  baseURL: '', // Relative to current origin
  timeout: 15000,
});

// In server-side environments, NEXT_PUBLIC_AGENT_URL might not be parsed on window, so we handle it cleanly
export const agentClient = new ApiClient({
  baseURL: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_AGENT_URL || '') : (process.env.NEXT_PUBLIC_AGENT_URL || ''),
  timeout: 30000, // Agent queries (e.g. analysis, LLM) can take longer
});

export const request = {
  get: <T>(url: string, options?: RequestOptions) =>
    platformClient.request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: any, options?: RequestOptions) =>
    platformClient.request<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    }),
  put: <T>(url: string, body?: any, options?: RequestOptions) =>
    platformClient.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    }),
  patch: <T>(url: string, body?: any, options?: RequestOptions) =>
    platformClient.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    }),
  delete: <T>(url: string, options?: RequestOptions) =>
    platformClient.request<T>(url, { ...options, method: 'DELETE' }),
};

export const agentRequest = {
  get: <T>(url: string, options?: RequestOptions) =>
    agentClient.request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: any, options?: RequestOptions) =>
    agentClient.request<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    }),
  put: <T>(url: string, body?: any, options?: RequestOptions) =>
    agentClient.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    }),
  delete: <T>(url: string, options?: RequestOptions) =>
    agentClient.request<T>(url, { ...options, method: 'DELETE' }),
};
