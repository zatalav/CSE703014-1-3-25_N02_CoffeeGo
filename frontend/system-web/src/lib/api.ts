const DEFAULT_BASE_URL = "/api";
const FALLBACK_BASE_URL = "http://localhost:8080/api";
export const AUTH_SESSION_KEY = "coffee.auth.session";
export const AUTH_SESSION_CHANGED_EVENT = "coffee.auth.session-changed";

type RequestOptions = Omit<RequestInit, "body" | "method">;
type ApiError = { message?: string };

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  role?: string;
  userInfo?: unknown;
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const API_BASE_URL = normalizeBaseUrl(
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_BASE_URL,
);

function buildUrl(path: string, baseUrl = API_BASE_URL) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function authHeaders() {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function notifyAuthSessionChanged(session: StoredAuthSession | null) {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, { detail: session }));
}

export function readAuthSessionStorage(): StoredAuthSession | null {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (raw) {
    try {
      const session = JSON.parse(raw) as StoredAuthSession;
      if (session.accessToken && session.refreshToken) return session;
    } catch {
      // Storage can contain an old or partial value from previous app versions.
    }
  }

  const accessToken = localStorage.getItem("accessToken") || localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export function persistAuthSessionStorage(session: StoredAuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem("accessToken", session.accessToken);
  localStorage.setItem("refreshToken", session.refreshToken);
  localStorage.removeItem("token");
  notifyAuthSessionChanged(session);
}

export function clearAuthSessionStorage() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("token");
  notifyAuthSessionChanged(null);
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

function canRefreshFor(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return !isAuthPath(normalized) && Boolean(readAuthSessionStorage()?.refreshToken);
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  return Boolean(
    value
      && typeof value === "object"
      && typeof (value as StoredAuthSession).accessToken === "string"
      && typeof (value as StoredAuthSession).refreshToken === "string",
  );
}

async function fetchWithFallback(path: string, init: RequestInit) {
  try {
    return await fetch(buildUrl(path), init);
  } catch {
    try {
      return await fetch(buildUrl(path, normalizeBaseUrl(FALLBACK_BASE_URL)), init);
    } catch {
      throw new Error("Khong ket noi duoc may chu. Hay kiem tra API gateway va auth-service da chay chua.");
    }
  }
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text } satisfies ApiError;
  }
}

let refreshPromise: Promise<StoredAuthSession | null> | null = null;

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readAuthSessionStorage()?.refreshToken;
    if (!refreshToken) {
      clearAuthSessionStorage();
      return null;
    }

    try {
      const headers = new Headers();
      headers.set("Accept", "application/json");
      headers.set("Content-Type", "application/json");

      const response = await fetchWithFallback("/auth/refresh-token", {
        method: "POST",
        headers,
        body: JSON.stringify({ refreshToken }),
      });
      const payload = await readPayload(response);
      const session = payload && typeof payload === "object" && "success" in payload
        ? (payload as { success?: boolean; data?: unknown }).data
        : payload;

      if (!response.ok || !isStoredAuthSession(session)) {
        clearAuthSessionStorage();
        return null;
      }

      persistAuthSessionStorage(session);
      return session;
    } catch {
      clearAuthSessionStorage();
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
  allowRefresh = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (shouldAttachAuth(path)) {
    Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  }

  const init: RequestInit = {
    ...options,
    method,
    headers,
  };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  const response = await fetchWithFallback(path, init);
  const payload = await readPayload(response);

  if (!response.ok) {
    const message = extractErrorMessage(payload, `Request failed with status ${response.status}`);

    if (allowRefresh && isAuthFailure(response, message) && canRefreshFor(path)) {
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        return request<T>(method, path, body, options, false);
      }
      throw sessionExpiredError();
    }

    if (!isAuthPath(path) && isAuthFailure(response, message)) {
      clearAuthSessionStorage();
      throw sessionExpiredError();
    }

    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false) {
      const message = extractErrorMessage(payload, "Request failed");
      if (!isAuthPath(path) && isInvalidTokenMessage(message)) {
        clearAuthSessionStorage();
        throw sessionExpiredError();
      }
      throw new Error(message);
    }
    return payload.data as T;
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, body, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, options),
  upload: <T>(path: string, file: File, fieldName = "file", options?: RequestOptions) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    return request<T>("POST", path, formData, options);
  },
};

export { API_BASE_URL };
