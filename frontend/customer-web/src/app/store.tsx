import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CUSTOMER_AUTH_CHANGED_EVENT, clearCustomerAuthStorage } from "./api";

export type CartItem = {
  id: string;
  productId?: number;
  comboId?: number;
  name: string;
  price: number;
  qty: number;
  size?: string;
  sizeId?: number;
  note?: string;
  image?: string;
};

export type User = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  dripPoints: number;
  tier: "Gold" | "Platinum" | "Black";
  accessToken?: string;
  refreshToken?: string;
  authProvider?: "password" | "google";
  role?: string;
};

type TransferredSession = {
  accessToken: string;
  refreshToken: string;
  role: string;
  userInfo?: {
    id?: number | string;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    roleName?: string | null;
    expPoints?: number | string;
    dripPoints?: number | string;
    tier?: string | null;
  };
};

type AppContextValue = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const CART_STORAGE_KEY = "coffeego_cart";

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toOptionalNumber(value: number | string | undefined | null) {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeTier(value?: string | null): User["tier"] {
  const normalized = (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("black")) return "Black";
  if (normalized.includes("platinum")) return "Platinum";
  return "Gold";
}

function userFromTransferredSession(session: TransferredSession): User {
  const info = session.userInfo || {};
  return {
    id: toOptionalNumber(info.id),
    name: info.name || info.email || info.phoneNumber || "Khách CoffeeGo",
    phone: info.phoneNumber || "",
    email: info.email || "",
    dripPoints: toOptionalNumber(info.dripPoints) ?? 0,
    tier: normalizeTier(info.tier),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    authProvider: "password",
    role: info.roleName || session.role,
  };
}

function readTransferredSession(): TransferredSession | null {
  if (typeof window === "undefined") return null;
  const match = (window.location.hash || "").match(/(?:^#|&)auth=([^&]+)/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(atob(decodeURIComponent(match[1])));
    const session = JSON.parse(json) as TransferredSession;
    if (session.accessToken && session.refreshToken) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return session;
    }
  } catch {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const transferred = readTransferredSession();
    if (transferred) {
      login(userFromTransferredSession(transferred));
      return;
    }
    const stored = localStorage.getItem("coffeego_user");
    if (stored) {
      const parsed = JSON.parse(stored) as User;
      setUser({ ...parsed, tier: normalizeTier(parsed.tier) });
    }
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => setUser(null);
    window.addEventListener(CUSTOMER_AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => window.removeEventListener(CUSTOMER_AUTH_CHANGED_EVENT, handleAuthChanged);
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart((c) => {
      const found = c.find((x) => x.id === item.id && x.size === item.size);
      if (found) {
        return c.map((x) =>
          x === found ? { ...x, qty: x.qty + item.qty } : x
        );
      }
      return [...c, item];
    });
  };

  const removeFromCart = (id: string) =>
    setCart((c) => c.filter((x) => x.id !== id));

  const updateQty = (id: string, qty: number) =>
    setCart((c) =>
      c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x))
    );

  const clearCart = () => setCart([]);

  const login = (u: User) => {
    const normalizedUser = { ...u, tier: normalizeTier(u.tier) };
    setUser(normalizedUser);
    localStorage.setItem("coffeego_user", JSON.stringify(normalizedUser));
    if (normalizedUser.accessToken) localStorage.setItem("customerAccessToken", normalizedUser.accessToken);
    if (normalizedUser.refreshToken) localStorage.setItem("customerRefreshToken", normalizedUser.refreshToken);
    if (normalizedUser.accessToken && normalizedUser.refreshToken) {
      localStorage.setItem("coffee.auth.session", JSON.stringify({
        accessToken: normalizedUser.accessToken,
        refreshToken: normalizedUser.refreshToken,
        role: normalizedUser.role || "Customer",
        userInfo: {
          id: normalizedUser.id,
          name: normalizedUser.name,
          email: normalizedUser.email,
          phoneNumber: normalizedUser.phone,
          roleName: normalizedUser.role || "Customer",
          tier: normalizedUser.tier,
          dripPoints: normalizedUser.dripPoints,
        },
      }));
    }
  };
  const logout = () => {
    setUser(null);
    clearCustomerAuthStorage();
  };

  return (
    <AppContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartOpen,
        setCartOpen,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const formatVND = (n: number) =>
  n.toLocaleString("vi-VN") + "đ";
