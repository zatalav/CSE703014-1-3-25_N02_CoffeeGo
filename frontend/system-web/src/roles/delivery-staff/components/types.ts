export type OrderStatus = "new" | "picked" | "delivering" | "done" | "cancelled";

export interface Order {
  id: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  total: number;
  paymentMethod: "cash" | "transfer";
  time: string;
  date: string;
  note?: string;
  items: Array<{ name: string; qty: number; price: number }>;
  timeline: Array<{ status: string; time: string; done: boolean; current?: boolean }>;
}
