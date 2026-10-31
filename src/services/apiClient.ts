import type { Circuit, CustomICDefinition, User } from '../types/circuit';

const API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'circuitflow_jwt_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// AUTHENTICATION API
// ---------------------------------------------------------------------------

export async function apiRegister(
  username: string,
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: User; token: string }> {
  const res = await request<{ user: User; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, displayName }),
  });
  setAuthToken(res.token);
  return res;
}

export async function apiLogin(
  identifier: string,
  password: string
): Promise<{ user: User; token: string }> {
  const res = await request<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setAuthToken(res.token);
  return res;
}

export async function apiGetMe(): Promise<User | null> {
  try {
    const token = getAuthToken();
    if (!token) return null;
    const res = await request<{ user: User }>('/auth/me');
    return res.user;
  } catch {
    setAuthToken(null);
    return null;
  }
}

export function apiLogout(): void {
  setAuthToken(null);
}

// ---------------------------------------------------------------------------
// SAVED CIRCUITS API (Database Persistent)
// ---------------------------------------------------------------------------

export interface ApiSavedCircuit {
  id: string;
  name: string;
  circuit: Circuit;
  createdAt: number;
  updatedAt: number;
}

export async function apiGetCircuits(): Promise<ApiSavedCircuit[]> {
  const res = await request<{ circuits: ApiSavedCircuit[] }>('/circuits');
  return res.circuits;
}

export async function apiSaveCircuit(
  name: string,
  circuit: Circuit,
  id?: string
): Promise<{ id: string; name: string }> {
  const res = await request<{ id: string; name: string }>('/circuits', {
    method: 'POST',
    body: JSON.stringify({ id, name, circuit }),
  });
  return res;
}

export async function apiDeleteCircuit(id: string): Promise<void> {
  await request(`/circuits/${id}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// CUSTOM IC API (Database Persistent)
// ---------------------------------------------------------------------------

export async function apiGetCustomICs(): Promise<CustomICDefinition[]> {
  const res = await request<{ customICs: CustomICDefinition[] }>('/custom-ics');
  return res.customICs;
}

export async function apiSaveCustomIC(ic: CustomICDefinition): Promise<void> {
  await request('/custom-ics', {
    method: 'POST',
    body: JSON.stringify(ic),
  });
}

export async function apiDeleteCustomIC(id: string): Promise<void> {
  await request(`/custom-ics/${id}`, {
    method: 'DELETE',
  });
}
