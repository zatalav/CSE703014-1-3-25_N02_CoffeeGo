const DEFAULT_BASE_URL = "/api";
const FALLBACK_BASE_URL = "http://localhost:8080/api";
const AUTH_SESSION_KEY = "coffee.auth.session";
const AUTH_SESSION_CHANGED_EVENT = "coffee.auth.session-changed";

type RequestOptions = Omit<RequestInit, "body" | "method">;

export interface StoredAuthSession {
  accessToken?: string;
  refreshToken?: string;
  role?: string;
  userInfo?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    roleName?: string | null;
    branchId?: number | null;
    status?: string | null;
  };
}

export interface PageResponse<T> {
  items?: T[];
  content?: T[];
  data?: T[];
  totalElements?: number;
  totalItems?: number;
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");
const API_BASE_URL = normalizeBaseUrl((import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_BASE_URL);

function buildUrl(path: string, baseUrl = API_BASE_URL) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export function readStoredSession(): StoredAuthSession | null {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as StoredAuthSession;
    } catch {
      return null;
    }
  }
  const accessToken = localStorage.getItem("accessToken") || localStorage.getItem("token") || undefined;
  const refreshToken = localStorage.getItem("refreshToken") || undefined;
  return accessToken || refreshToken ? { accessToken, refreshToken } : null;
}

function persistSession(session: StoredAuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  if (session.accessToken) localStorage.setItem("accessToken", session.accessToken);
  if (session.refreshToken) localStorage.setItem("refreshToken", session.refreshToken);
  localStorage.removeItem("token");
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, { detail: session }));
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("token");
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, { detail: null }));
}

function authHeaders() {
  const token = readStoredSession()?.accessToken || localStorage.getItem("accessToken") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const AUTH_WITHOUT_BEARER_PATHS = [
  "/auth/login",
  "/auth/refresh-token",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
];

function normalizedPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function isAuthPath(path: string) {
  const normalized = normalizedPath(path);
  return [...AUTH_WITHOUT_BEARER_PATHS, "/auth/logout"].some(authPath => normalized.startsWith(authPath));
}

function shouldAttachAuth(path: string) {
  const normalized = normalizedPath(path);
  return !AUTH_WITHOUT_BEARER_PATHS.some(authPath => normalized.startsWith(authPath));
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { message?: string; errors?: Array<{ message?: string }> };
  if (data.errors?.length && data.errors[0]?.message) return data.errors[0].message;
  return data.message || fallback;
}

function isInvalidTokenMessage(message: string) {
  return message.trim().toLowerCase() === "invalid or expired token";
}

function isAuthFailure(response: Response, message: string) {
  return response.status === 401 || isInvalidTokenMessage(message);
}

function sessionExpiredError() {
  return new Error("Phien dang nhap da het han. Vui long dang nhap lai.");
}

let refreshPromise: Promise<StoredAuthSession | null> | null = null;

async function refreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = readStoredSession()?.refreshToken;
    if (!refreshToken) return null;
    const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
    try {
      const response = await fetchWithFallback("/auth/refresh-token", {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken }),
      });
      const payload = await readPayload(response);
      const session = payload && typeof payload === "object" && "success" in payload
        ? (payload as { data?: StoredAuthSession }).data
        : payload as StoredAuthSession;
      if (!response.ok || !session?.accessToken || !session.refreshToken) {
        clearSession();
        return null;
      }
      persistSession(session);
      return session;
    } catch {
      clearSession();
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function fetchWithFallback(path: string, init: RequestInit) {
  try {
    return await fetch(buildUrl(path), init);
  } catch {
    return fetch(buildUrl(path, normalizeBaseUrl(FALLBACK_BASE_URL)), init);
  }
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function request<T>(method: string, path: string, body?: unknown, options: RequestOptions = {}, allowRefresh = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (shouldAttachAuth(path)) {
    Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  }

  const init: RequestInit = { ...options, method, headers };
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  const response = await fetchWithFallback(path, init);
  const payload = await readPayload(response);
  if (!response.ok) {
    const message = extractErrorMessage(payload, `Request failed with status ${response.status}`);

    if (isAuthFailure(response, message) && allowRefresh && !isAuthPath(path) && readStoredSession()?.refreshToken) {
      const refreshed = await refreshSession();
      if (refreshed) return request<T>(method, path, body, options, false);
    }

    if (!isAuthPath(path) && isAuthFailure(response, message)) {
      clearSession();
      throw sessionExpiredError();
    }

    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as { success?: boolean; data: T };
    if (envelope.success === false) {
      const message = extractErrorMessage(payload, "Request failed");
      if (!isAuthPath(path) && isInvalidTokenMessage(message)) {
        clearSession();
        throw sessionExpiredError();
      }
      throw new Error(message);
    }
    return envelope.data;
  }
  return payload as T;
}

export function pageItems<T>(value: PageResponse<T> | T[] | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.items || value.content || value.data || [];
}

export const employeeApi = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, body, options),
};
