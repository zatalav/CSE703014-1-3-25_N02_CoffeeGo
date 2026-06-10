import type { CartItem } from "./store";

export const PENDING_VNPAY_ORDER_KEY = "coffeego.pendingVnpayOrder";

export type PendingVnpayOrder = {
  transactionRef: string;
  amount: number;
  orderPayload: Record<string, unknown>;
  cart: CartItem[];
  createdAt: string;
};

export function savePendingVnpayOrder(order: PendingVnpayOrder) {
  localStorage.setItem(PENDING_VNPAY_ORDER_KEY, JSON.stringify(order));
}

export function readPendingVnpayOrder() {
  const raw = localStorage.getItem(PENDING_VNPAY_ORDER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingVnpayOrder;
    return parsed.transactionRef && parsed.orderPayload ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingVnpayOrder() {
  localStorage.removeItem(PENDING_VNPAY_ORDER_KEY);
}
