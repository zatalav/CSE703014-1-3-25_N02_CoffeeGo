import { PaymentMethod } from "../payment/types";
import { SizeKey } from "../menu/types";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivering" | "completed" | "cancelled";

export interface DrinkCustomizations {
  sugar: number;
  milk: number;
  ice: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productNumericId?: number;
  name: string;
  price: number;
  qty: number;
  size: SizeKey;
  sizeId?: string;
  toppings: string[];
  customizations?: DrinkCustomizations;
  note: string;
}

export interface OrderItem {
  name: string;
  productId?: string;
  qty: number;
  size: string;
  sizeId?: string;
  toppings: string[];
  note: string;
  price: number;
}

export interface Order {
  id: string;
  customerId?: number;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  paymentProvider?: string;
  paymentStatus?: string;
  orderType: "dine-in" | "delivery" | string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  note: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  staffName: string;
  cancelReason?: string;
}
