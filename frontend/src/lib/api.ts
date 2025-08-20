import { getToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Json = unknown;

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function hasError(x: unknown): x is { error: unknown } {
  return isRecord(x) && 'error' in x;
}

/**
 * apiFetch<T>
 * - `T` is the expected response JSON shape
 * - `auth=true` attaches Authorization: Bearer <token>
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  auth: boolean = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' });
  } catch (e) {
    throw new Error(`Network error: ${errorMessage(e)}`);
  }

  let data: Json = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-JSON
  }

  if (!res.ok) {
    const msg = hasError(data) ? JSON.stringify(data.error) : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data as T;
}
