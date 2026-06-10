import { useMemo, useState } from "react";
import { Search, MapPin, Phone } from "lucide-react";
import { t, statusMeta, fmt } from "./theme";
import type { Order, OrderStatus } from "./types";
import type { PageType } from "../App";

interface Props {
  navigate: (page: PageType, params?: { orderId?: string }) => void;
  orders: Order[];
  acceptOrder: (id: string) => void;
}

const tabs: { key: "all" | OrderStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "new", label: "Đơn mới" },
  { key: "picked", label: "Đã nhận" },
  { key: "delivering", label: "Đang giao" },
  { key: "done", label: "Thành công" },
  { key: "cancelled", label: "Đã hủy" },
];

export default function OrderListPage({ navigate, orders, acceptOrder }: Props) {
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchTab = tab === "all" || o.status === tab;
      const matchQ =
        !q ||
        o.id.toLowerCase().includes(q.toLowerCase()) ||
        o.customerName.toLowerCase().includes(q.toLowerCase()) ||
        o.address.toLowerCase().includes(q.toLowerCase());
      return matchTab && matchQ;
    });
  }, [orders, tab, q]);

  return (
    <div className="px-10 py-8 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1
          style={{
            color: t.text,
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Đơn hàng
        </h1>
        <div style={{ color: t.textMuted, fontSize: 14, marginTop: 4 }}>
          Quản lý toàn bộ đơn giao hàng của bạn
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex-1 flex items-center gap-2 rounded-lg"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            padding: "0 14px",
            height: 40,
          }}
        >
          <Search size={16} style={{ color: t.textDim }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách, địa chỉ…"
            className="flex-1 bg-transparent outline-none"
            style={{ color: t.text, fontSize: 14 }}
          />
        </div>
      </div>

      <div
        className="flex items-center gap-1 mb-5 p-1 rounded-lg"
        style={{ background: t.surface, border: `1px solid ${t.border}`, width: "fit-content" }}
      >
        {tabs.map((tb) => {
          const active = tab === tb.key;
          const count =
            tb.key === "all"
              ? orders.length
              : orders.filter((o) => o.status === tb.key).length;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="rounded-md transition-colors"
              style={{
                padding: "6px 12px",
                fontSize: 13,
                color: active ? t.text : t.textMuted,
                background: active ? t.surface3 : "transparent",
                fontWeight: active ? 500 : 400,
              }}
            >
              {tb.label}
              <span style={{ color: t.textDim, marginLeft: 6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <Row
            key={o.id}
            order={o}
            onClick={() => navigate("orderDetail", { orderId: o.id })}
            onAccept={() => acceptOrder(o.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div
            className="rounded-xl text-center"
            style={{
              background: t.surface,
              border: `1px dashed ${t.borderStrong}`,
              padding: "48px 16px",
              color: t.textDim,
              fontSize: 14,
            }}
          >
            Không tìm thấy đơn phù hợp
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  order,
  onClick,
  onAccept,
}: {
  order: Order;
  onClick: () => void;
  onAccept: () => void;
}) {
  const meta = statusMeta[order.status];
  return (
    <div
      className="rounded-xl p-5 flex items-center gap-5"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <span
        className="rounded-md shrink-0"
        style={{
          background: meta.soft,
          color: meta.color,
          fontSize: 11,
          fontWeight: 500,
          padding: "4px 10px",
          border: `1px solid ${meta.border}`,
        }}
      >
        {meta.label}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>
            {order.customerName}
          </span>
          <span style={{ color: t.textDim, fontSize: 12 }}>#{order.id}</span>
        </div>
        <div
          className="flex items-center gap-4 mt-1"
          style={{ color: t.textMuted, fontSize: 13 }}
        >
          <span className="flex items-center gap-1.5 truncate max-w-[360px]">
            <MapPin size={12} />
            {order.address}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone size={12} />
            {order.phone}
          </span>
        </div>
      </div>

      <div className="text-right">
        <div style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>
          {fmt(order.total)}
        </div>
        <div style={{ color: t.textDim, fontSize: 12, marginTop: 2 }}>
          {order.time} · {order.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {order.status === "new" && (
          <button
            onClick={onAccept}
            className="rounded-lg"
            style={{
              background: t.accent,
              color: "#0A0A0B",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Nhận đơn
          </button>
        )}
        <button
          onClick={onClick}
          className="rounded-lg"
          style={{
            background: t.surface2,
            color: t.text,
            border: `1px solid ${t.border}`,
            padding: "8px 14px",
            fontSize: 13,
          }}
        >
          Chi tiết
        </button>
      </div>
    </div>
  );
}
