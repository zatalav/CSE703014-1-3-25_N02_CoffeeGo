import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import { Order, OrderStatus } from "../types";
import { formatTime, formatVnd, elapsed } from "../../../shared/lib/format";
import { printOrderInvoice } from "../utils/invoicePdf";

interface OrderQueueScreenProps {
  orders: Order[];
  isRefreshing?: boolean;
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void> | void;
}

const PENDING_STYLE = {
  label: "Chờ xác nhận",
  color: "#B45309",
  bg: "#FFFBEB",
  border: "#F59E0B",
};

const NOTE_METADATA_PREFIXES = [
  "khach hang",
  "so dien thoai",
  "email",
  "giao den",
  "nhan dia chi",
  "phuong xa",
  "quan huyen",
  "tinh thanh",
  "cua hang",
  "thanh toan",
  "phi giao hang",
  "khoang cach giao hang",
  "ty le shipper",
  "thu nhap shipper",
];

function normalizeNoteLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compactNoteLines(note?: string) {
  if (!note?.trim()) return [];
  const normalized = note
    .replace(/\s+(?=(Khach hang|So dien thoai|Email|Giao den|Nhan dia chi|Phuong xa|Quan huyen|Tinh thanh|Cua hang|Thanh toan|Phi giao hang|Khoang cach giao hang|Ty le shipper|Thu nhap shipper):)/gi, "\n")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  return normalized.filter(line => {
    const label = normalizeNoteLabel(line.split(":")[0] || "");
    return !NOTE_METADATA_PREFIXES.includes(label);
  });
}

function paymentText(order: Order) {
  const method =
    order.paymentMethod === "e_wallet"
      ? "Ví điện tử"
      : order.paymentMethod === "cash"
        ? "Tiền mặt"
        : order.paymentMethod || "-";
  const provider = order.paymentProvider ? ` · ${order.paymentProvider}` : "";
  const status = order.paymentStatus ? ` · ${order.paymentStatus}` : "";
  return `${method}${provider}${status}`;
}

export function OrderQueueScreen({ orders, isRefreshing = false, onRefresh, onUpdateStatus }: OrderQueueScreenProps) {
  const [busyId, setBusyId] = useState("");
  const onlineOrders = orders.filter((order) => order.status === "pending" || order.orderType === "delivery");
  const visible = onlineOrders.filter((order) => order.status === "pending");
  const transferredCount = onlineOrders.filter((order) => ["confirmed", "delivering"].includes(order.status)).length;
  const completedCount = onlineOrders.filter((order) => order.status === "completed").length;

  const confirmOrder = async (order: Order) => {
    setBusyId(order.id);
    printOrderInvoice(order, "Hoa don don online");
    try {
      await onUpdateStatus(order.id, "confirmed");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: "#F6F8FB" }}>
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { label: "Chờ xác nhận", count: visible.length, color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", icon: <Clock size={15} /> },
            { label: "Đã chuyển giao", count: transferredCount, color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE", icon: <Truck size={15} /> },
            { label: "Đã hoàn thành", count: completedCount, color: "#047857", bg: "#ECFDF5", border: "#A7F3D0", icon: <CheckCircle2 size={15} /> },
            { label: "Đơn online", count: onlineOrders.length, color: "#334155", bg: "#F8FAFC", border: "#E2E8F0", icon: <ChefHat size={15} /> },
          ].map((summary) => (
            <div
              key={summary.label}
              className="flex min-w-[142px] items-center gap-2.5 rounded-lg border px-3 py-2"
              style={{ background: summary.bg, borderColor: summary.border }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white" style={{ color: summary.color }}>
                {summary.icon}
              </span>
              <div className="min-w-0">
                <p style={{ color: summary.color, fontWeight: 800, fontSize: "1rem", lineHeight: 1 }}>{summary.count}</p>
                <p className="truncate" style={{ color: summary.color, fontSize: "0.72rem", opacity: 0.82 }}>{summary.label}</p>
              </div>
            </div>
          ))}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            style={{ cursor: isRefreshing ? "wait" : "pointer", opacity: isRefreshing ? 0.65 : 1 }}
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {visible.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Truck size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">Không có đơn online chờ xác nhận</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((order) => {
              const isUrgent = Date.now() - order.createdAt.getTime() > 3 * 60 * 1000;
              const noteLines = compactNoteLines(order.note);
              const amount = Math.max(0, order.total - order.discount);

              return (
                <div
                  key={order.id}
                  className="group flex min-h-[420px] flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    borderColor: isUrgent ? "#FDA4AF" : "#E2E8F0",
                    boxShadow: isUrgent ? "0 0 0 3px rgba(244,63,94,0.08)" : undefined,
                  }}
                >
                  <div className="h-1.5" style={{ background: isUrgent ? "#F43F5E" : PENDING_STYLE.border }} />

                  <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-black tracking-tight text-slate-900">#{order.orderNumber}</span>
                        {isUrgent && (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600" title="Đơn đang chờ lâu">
                            <AlertCircle size={14} />
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{formatTime(order.createdAt)}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className={isUrgent ? "font-bold text-rose-600" : "font-semibold text-slate-600"}>{elapsed(order.createdAt)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold" style={{ background: PENDING_STYLE.bg, color: PENDING_STYLE.color }}>
                      {PENDING_STYLE.label}
                    </span>
                  </div>

                  <div className="border-y border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          <UserRound size={15} className="shrink-0 text-slate-400" />
                          <span className="truncate">{order.customerName || "Khách online"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order.customerPhone && (
                            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                              <Phone size={12} className="shrink-0" />
                              <span className="truncate">{order.customerPhone}</span>
                            </span>
                          )}
                          {order.customerEmail && (
                            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{order.customerEmail}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-semibold uppercase text-slate-400">Tổng tiền</p>
                        <p className="text-lg font-black text-slate-900">{formatVnd(amount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 px-4 py-3">
                    {(order.deliveryAddress || order.paymentMethod || order.paymentStatus) && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                        {order.deliveryAddress && (
                          <div className="flex gap-2 text-xs leading-5 text-slate-600">
                            <MapPin size={14} className="mt-0.5 shrink-0 text-blue-500" />
                            <span>{order.deliveryAddress}</span>
                          </div>
                        )}
                        <div className="flex gap-2 text-xs leading-5 text-slate-600">
                          <CreditCard size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                          <span>{paymentText(order)}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {item.name} {item.size && <span className="font-black text-amber-600">[{item.size}]</span>}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-xs font-black text-slate-700 ring-1 ring-slate-200">x{item.qty}</span>
                          </div>
                          {item.toppings.length > 0 && <p className="mt-1 text-xs text-slate-500">+ {item.toppings.join(", ")}</p>}
                          {item.note && (
                            <p
                              className="mt-1 text-xs leading-5 text-amber-700"
                              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {noteLines.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                          <ReceiptText size={13} />
                          Ghi chú
                        </div>
                        <p
                          className="text-xs leading-5 text-amber-800"
                          style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {noteLines.join(" · ")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 bg-white px-4 py-3">
                    <button
                      onClick={() => confirmOrder(order)}
                      disabled={busyId === order.id}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F4761] px-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0B3A50] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                    >
                      <CheckCircle2 size={16} />
                      Xác nhận & tạo hóa đơn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
