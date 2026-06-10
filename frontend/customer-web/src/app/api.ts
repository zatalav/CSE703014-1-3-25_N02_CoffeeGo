export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

export type PageResponse<T> = {
  content?: T[];
  data?: T[];
  items?: T[];
};

function resolveApiBaseUrl(value?: string) {
  const fallback = "/api";
  const configured = (value || fallback).trim().replace(/\/+$/, "");
  if (!configured) return fallback;

  try {
    const url = new URL(configured);
    const isLocalGateway = ["localhost", "127.0.0.1", "::1"].includes(url.hostname) && url.port === "8080";
    if (isLocalGateway) return fallback;
    if (url.pathname === "" || url.pathname === "/") return `${configured}/api`;
  } catch {
    return configured;
  }

  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl((import.meta as any).env?.VITE_API_BASE_URL as string | undefined);
export const CUSTOMER_AUTH_CHANGED_EVENT = "coffeego.auth-changed";

export function clearCustomerAuthStorage() {
  localStorage.removeItem("coffeego_user");
  localStorage.removeItem("customerAccessToken");
  localStorage.removeItem("customerRefreshToken");
  localStorage.removeItem("coffee.auth.session");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("token");
  window.dispatchEvent(new CustomEvent(CUSTOMER_AUTH_CHANGED_EVENT));
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as ApiEnvelope<unknown> & { errors?: Array<{ message?: string }> };
  if (data.errors?.length && data.errors[0]?.message) return data.errors[0].message;
  return data.message || fallback;
}

function isInvalidTokenMessage(message: string) {
  return message.trim().toLowerCase() === "invalid or expired token";
}

function isAuthFailure(response: Response, message: string) {
  return response.status === 401 || response.status === 403 || isInvalidTokenMessage(message);
}

function sessionExpiredError() {
  return new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/api/") ? path.slice(4) : path;
  return `${API_BASE_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

export function pageItems<T>(payload: PageResponse<T> | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...init, headers });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Không thể kết nối API tại ${API_BASE_URL}. Hãy kiểm tra api-gateway và service liên quan đang chạy.`);
    }
    throw error;
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) as ApiEnvelope<T> | T : undefined;

  if (!response.ok) {
    const message = extractErrorMessage(payload, "Không thể kết nối máy chủ.");
    if (token && isAuthFailure(response, message)) {
      clearCustomerAuthStorage();
      throw sessionExpiredError();
    }
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      const message = extractErrorMessage(envelope, "Yeu cau that bai.");
      if (token && isInvalidTokenMessage(message)) {
        clearCustomerAuthStorage();
        throw sessionExpiredError();
      }
      throw new Error(message);
    }
    return envelope.data as T;
  }

  return payload as T;
}
