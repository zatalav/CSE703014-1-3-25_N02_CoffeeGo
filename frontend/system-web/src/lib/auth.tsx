import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  AUTH_SESSION_CHANGED_EVENT,
  clearAuthSessionStorage,
  persistAuthSessionStorage,
  readAuthSessionStorage,
} from "./api";

export type AppRole = "admin" | "warehouse_manager" | "warehouse_staff" | "branch_manager" | "branch_staff" | "delivery_staff";

export interface UserInfo {
  id: number;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  roleName: string;
  branchId?: number | null;
  status?: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  role: string;
  userInfo: UserInfo;
}

interface LoginPayload {
  identifier: string;
  password: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const SYSTEM_WEB_URL = ((import.meta.env.VITE_SYSTEM_WEB_URL as string | undefined) || "http://localhost:5180").replace(/\/+$/, "");
export const CUSTOMER_WEB_URL = ((import.meta.env.VITE_CUSTOMER_WEB_URL as string | undefined) || "http://localhost:5181").replace(/\/+$/, "");

function decodeTransferredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const match = hash.match(/(?:^#|&)auth=([^&]+)/);
  if (!match) return null;

  try {
    const json = decodeURIComponent(atob(decodeURIComponent(match[1])));
    const session = JSON.parse(json) as AuthSession;
    if (session.accessToken && session.refreshToken && session.role) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      persistSession(session);
      return session;
    }
  } catch {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return null;
}

export function encodeTransferredSession(session: AuthSession) {
  return encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(session))));
}

function readInitialSession(): AuthSession | null {
  const transferred = decodeTransferredSession();
  if (transferred) return transferred;

  const session = readAuthSessionStorage() as AuthSession | null;
  if (!session) return null;

  const roleName = session.userInfo?.roleName || session.role;
  if (!session.accessToken || !session.refreshToken || (!isSystemRole(roleName) && !isCustomerRole(roleName))) {
    persistSession(null);
    return null;
  }

  return session;
}

function persistSession(session: AuthSession | null) {
  if (!session) {
    clearAuthSessionStorage();
    return;
  }
  persistAuthSessionStorage(session);
}

export function normalizeRole(roleName?: string | null): string {
  return (roleName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function hasAppRole(roleName: string | undefined | null, role: AppRole) {
  const normalized = normalizeRole(roleName);
  const words = normalized.replace(/_/g, " ");

  if (role === "admin") return normalized === "admin" || normalized.endsWith("_admin") || words.includes("quan tri");
  if (role === "warehouse_manager") {
    return normalized === "warehouse_manager"
      || normalized.endsWith("_warehouse_manager")
      || words.includes("warehouse manager")
      || words.includes("quan ly kho")
      || words.includes("ql kho");
  }
  if (role === "warehouse_staff") {
    return normalized === "warehouse_staff"
      || normalized.endsWith("_warehouse_staff")
      || words.includes("warehouse staff")
      || words.includes("nhan vien kho");
  }
  if (role === "branch_manager") {
    return normalized === "branch_manager"
      || normalized.endsWith("_branch_manager")
      || words.includes("branch manager")
      || words.includes("sale manager")
      || words.includes("sales manager")
      || words.includes("quan ly chi nhanh")
      || words.includes("quan ly ban hang")
      || words.includes("ql chi nhanh");
  }
  if (role === "delivery_staff") {
    return normalized === "delivery_staff"
      || normalized === "shipper"
      || normalized.endsWith("_delivery_staff")
      || words.includes("delivery staff")
      || words.includes("shipper")
      || words.includes("nhan vien van chuyen")
      || words.includes("nhan vien giao hang");
  }
  if (
    hasAppRole(roleName, "delivery_staff")
    || hasAppRole(roleName, "warehouse_staff")
    || hasAppRole(roleName, "warehouse_manager")
    || hasAppRole(roleName, "branch_manager")
  ) {
    return false;
  }
  return normalized === "branch_staff"
    || normalized === "sales_staff"
    || normalized === "sale_staff"
    || normalized === "staff"
    || normalized === "employee"
    || normalized.endsWith("_branch_staff")
    || normalized.endsWith("_sales_staff")
    || normalized.endsWith("_sale_staff")
    || normalized.endsWith("_employee")
    || words.includes("branch staff")
    || words.includes("sales staff")
    || words.includes("sale staff")
    || words.includes("cashier")
    || words.includes("thu ngan")
    || words.includes("nhan vien ban hang")
    || words.includes("nhan vien pha che")
    || (words.includes("nhan vien") && !words.includes("quan ly"));
}

export function isCustomerRole(roleName?: string | null) {
  const normalized = normalizeRole(roleName);
  return normalized === "customer" || normalized === "khach_hang";
}

export function isSystemRole(roleName?: string | null) {
  return hasAppRole(roleName, "admin")
    || hasAppRole(roleName, "branch_manager")
    || hasAppRole(roleName, "warehouse_manager")
    || hasAppRole(roleName, "branch_staff")
    || hasAppRole(roleName, "warehouse_staff")
    || hasAppRole(roleName, "delivery_staff");
}

export function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function roleHomePath(roleName?: string | null) {
  if (hasAppRole(roleName, "admin")) return "/dashboard";
  if (hasAppRole(roleName, "branch_manager")) return "/branches";
  if (hasAppRole(roleName, "warehouse_manager") || hasAppRole(roleName, "warehouse_staff")) return "/inventory";
  if (hasAppRole(roleName, "branch_staff")) return "/staff";
  if (hasAppRole(roleName, "delivery_staff")) return "/delivery";
  if (isCustomerRole(roleName)) return CUSTOMER_WEB_URL;
  return "/unauthorized";
}

export function canAccessPath(roleName: string | undefined | null, pathname?: string | null) {
  if (!pathname || pathname === "/" || pathname === "/login") return false;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/orders") || pathname.startsWith("/products") || pathname.startsWith("/reports") || pathname.startsWith("/settings") || pathname.startsWith("/api-docs")) {
    return hasAppRole(roleName, "admin");
  }
  if (pathname.startsWith("/branches") || pathname.startsWith("/branch-manager")) return hasAppRole(roleName, "branch_manager");
  if (pathname.startsWith("/inventory") || pathname.startsWith("/warehouse-manager")) {
    return hasAppRole(roleName, "warehouse_manager") || hasAppRole(roleName, "warehouse_staff");
  }
  if (pathname.startsWith("/staff") || pathname.startsWith("/sales-staff")) return hasAppRole(roleName, "branch_staff");
  if (pathname.startsWith("/delivery") || pathname.startsWith("/delivery-staff")) return hasAppRole(roleName, "delivery_staff");
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readInitialSession());

  useEffect(() => {
    const handleSessionChanged = (event: Event) => {
      setSession((event as CustomEvent<AuthSession | null>).detail ?? null);
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    login: async (payload) => {
      const identifier = payload.identifier.trim();
      const response = await api.post<AuthSession>("/auth/login", {
        identifier,
        password: payload.password,
      });
      setSession(response);
      persistSession(response);
      return response;
    },
    logout: async () => {
      const current = session;
      try {
        if (current?.refreshToken) {
          await api.post<void>("/auth/logout", { refreshToken: current.refreshToken });
        }
      } finally {
        setSession(null);
        persistSession(null);
      }
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
