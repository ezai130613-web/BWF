import { API_URL, SITE_URL } from '@/lib/config';

/**
 * Thin fetch wrapper for /api/mobile/v1. The session layer registers the
 * current token and an "unauthorised" callback, so any 401 anywhere signs
 * the app out cleanly instead of leaving a broken screen.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

let currentToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onActivationRequired: (() => void) | null = null;

export function configureApi(options: {
  token: string | null;
  onUnauthorized: () => void;
  onActivationRequired: () => void;
}) {
  currentToken = options.token;
  onUnauthorized = options.onUnauthorized;
  onActivationRequired = options.onActivationRequired;
}

const NETWORK_ERROR = "Can't reach BWF right now. Check your internet connection and try again.";

async function request<T>(method: string, url: string, body?: unknown, token = currentToken): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', NETWORK_ERROR);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (data && typeof data.code === 'string' && data.code) || 'SERVER_ERROR';
    const message = (data && typeof data.error === 'string' && data.error) || 'Something went wrong. Please try again.';
    if (res.status === 401 && token) onUnauthorized?.();
    if (code === 'ACTIVATION_REQUIRED') onActivationRequired?.();
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', API_URL + path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', API_URL + path, body),
  /** For calls made before/without the stored token (sign-in) or with an explicit one. */
  postWithToken: <T>(path: string, body: unknown, token: string | null) => request<T>('POST', API_URL + path, body, token),
  /** The website's existing member password-reset endpoints. */
  postSite: <T>(path: string, body: unknown) => request<T>('POST', SITE_URL + path, body, null),
};

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
