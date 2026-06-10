import { api } from "../../../lib/api";
import type { Order, OrderStatus } from "./types";

type DeliveryOrderDto = {
  id?: string;
  orderId?: number;
  orderNumber?: string;
  status?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  note?: string;
  paymentMethod?: string;
  total?: number;
  createdAt?: string;
  items?: Array<{ name?: string; quantity?: number; unitPrice?: number }>;
};

const statusMap: Record<string, OrderStatus> = {
  confirmed: "new",
  ready: "new",
  picked: "picked",
  delivering: "delivering",
  completed: "done",
  cancelled: "cancelled",
};

export async function fetchDeliveryOrders() {
  const rows = await api.get<DeliveryOrderDto[]>("/orders/delivery");
  return rows.map(toOrder);
}

export async function acceptDeliveryOrder(orderId: string) {
  return toOrder(await api.patch<DeliveryOrderDto>(`/orders/delivery/${orderId}/accept`));
}

export async function completeDeliveryOrder(orderId: string) {
  return toOrder(await api.patch<DeliveryOrderDto>(`/orders/delivery/${orderId}/complete`));
}

function toOrder(row: DeliveryOrderDto): Order {
  const status = statusMap[(row.status || "").toLowerCase()] || "new";
  const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
  const address = row.address || extractAddress(row.note) || "Chưa có địa chỉ giao hàng";
  return {
    id: String(row.orderId ?? row.id ?? row.orderNumber ?? ""),
    status,
    customerName: row.customerName || "Khách hàng",
    phone: row.customerPhone || "",
    address,
    district: districtFromAddress(address),
    total: Number(row.total ?? 0),
    paymentMethod: (row.paymentMethod || "").toLowerCase() === "cash" ? "cash" : "transfer",
    time: createdAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    date: createdAt.toLocaleDateString("vi-VN"),
    note: row.note,
    items: (row.items || []).map((item) => ({
      name: item.name || "Sản phẩm",
      qty: Number(item.quantity ?? 0),
      price: Number(item.unitPrice ?? 0),
    })),
    timeline: buildTimeline(status, createdAt),
  };
}

function buildTimeline(status: OrderStatus, createdAt: Date): Order["timeline"] {
  const time = createdAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return [
    { status: "Đơn được tạo", time, done: true },
    { status: "Chi nhánh đã xác nhận", time, done: true },
    { status: "Nhân viên đã nhận đơn", time: status === "new" ? "--:--" : time, done: status !== "new", current: status === "picked" || status === "delivering" },
    { status: "Giao thành công", time: status === "done" ? time : "--:--", done: status === "done" },
  ];
}

function extractAddress(note?: string) {
  if (!note) return "";
  const normalized = removeMarks(note).toLowerCase();
  const marker = "giao den:";
  const index = normalized.indexOf(marker);
  return index >= 0 ? note.slice(index + marker.length).trim() : "";
}

function districtFromAddress(address: string) {
  return address.split(",").map((part) => part.trim()).filter(Boolean).slice(-3, -1)[0] || "";
}

function removeMarks(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replaceAll("đ", "d").replaceAll("Đ", "D");
}
