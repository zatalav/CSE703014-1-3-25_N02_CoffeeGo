import {
  ArrowUpRight,
  Package,
  CheckCircle2,
  Clock,
  TrendingUp,
  MapPin,
  Phone,
} from "lucide-react";
import { t, statusMeta, fmt } from "./theme";
import type { Order } from "./types";
import type { PageType } from "../App";

interface Props {
  navigate: (page: PageType, params?: { orderId?: string }) => void;
  orders: Order[];
  acceptOrder: (id: string) => void;
}

export default function Dashboard({ navigate, orders, acceptOrder }: Props) {
  const newOrders = orders.filter((o) => o.status === "new");
  const activeOrders = orders.filter(
    (o) => o.status === "picked" || o.status === "delivering"
  );
  const doneToday = orders.filter((o) => o.status === "done");
  const earnings = doneToday.reduce((s, o) => s + o.total, 0);

  const stats = [
    {
      label: "Đơn mới",
      value: newOrders.length,
      sub: "Đang chờ nhận",
      icon: Package,
      color: t.accent,
    },
    {
      label: "Đang giao",
      value: activeOrders.length,
      sub: "Trong tiến trình",
      icon: Clock,
      color: t.info,
    },
    {
      label: "Hoàn thành",
      value: doneToday.length,
      sub: "Hôm nay",
      icon: CheckCircle2,
      color: t.success,
    },
    {
      label: "Thu nhập",
      value: fmt(earnings),
      sub: "+12% so với hôm qua",
      icon: TrendingUp,
      color: t.text,
    },
  ];

  return (
    <div className="px-10 py-8 max-w-[1280px] mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div style={{ color: t.textDim, fontSize: 13, marginBottom: 6 }}>
            Thứ Sáu, 29 tháng 5 · 2026
          </div>
          <h1
            style={{
              color: t.text,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Chào buổi chiều, Minh Trí
          </h1>
          <div style={{ color: t.textMuted, fontSize: 14, marginTop: 6 }}>
            Bạn có{" "}
            <span style={{ color: t.accent, fontWeight: 500 }}>
              {newOrders.length} đơn mới
            </span>{" "}
            đang chờ nhận.
          </div>
        </div>
        <button
          onClick={() => navigate("orders")}
          className="flex items-center gap-2 rounded-lg transition-colors"
          style={{
            background: t.accent,
            color: "#0A0A0B",
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Xem tất cả đơn
          <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl p-5"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span style={{ color: t.textMuted, fontSize: 13 }}>{s.label}</span>
                <Icon size={16} style={{ color: s.color }} />
              </div>
              <div
                style={{
                  color: t.text,
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div style={{ color: t.textDim, fontSize: 12, marginTop: 8 }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <SectionHeader
            title="Đơn mới"
            count={newOrders.length}
            onAll={() => navigate("orders")}
          />
          <div className="space-y-3">
            {newOrders.slice(0, 3).map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onClick={() => navigate("orderDetail", { orderId: o.id })}
                onAccept={() => acceptOrder(o.id)}
              />
            ))}
            {newOrders.length === 0 && (
              <Empty text="Chưa có đơn mới nào" />
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Đang giao" count={activeOrders.length} />
          <div className="space-y-3">
            {activeOrders.slice(0, 3).map((o) => (
              <ActiveCard
                key={o.id}
                order={o}
                onClick={() => navigate("orderDetail", { orderId: o.id })}
              />
            ))}
            {activeOrders.length === 0 && <Empty text="Không có đơn đang giao" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  onAll,
}: {
  title: string;
  count: number;
  onAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 style={{ color: t.text, fontSize: 16, fontWeight: 600 }}>{title}</h2>
        <span
          className="rounded-md"
          style={{
            background: t.surface2,
            color: t.textMuted,
            fontSize: 12,
            padding: "2px 8px",
            border: `1px solid ${t.border}`,
          }}
        >
          {count}
        </span>
      </div>
      {onAll && (
        <button
          onClick={onAll}
          style={{ color: t.textMuted, fontSize: 13 }}
          className="hover:opacity-80"
        >
          Xem tất cả →
        </button>
      )}
    </div>
  );
}

function OrderCard({
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
      className="rounded-xl p-5 transition-all"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="rounded-md"
              style={{
                background: meta.soft,
                color: meta.color,
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 8px",
                border: `1px solid ${meta.border}`,
              }}
            >
              {meta.label}
            </span>
            <span style={{ color: t.textDim, fontSize: 12 }}>#{order.id}</span>
          </div>
          <div style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>
            {order.customerName}
          </div>
          <div
            className="flex items-center gap-1.5 mt-1"
            style={{ color: t.textMuted, fontSize: 13 }}
          >
            <MapPin size={13} />
            <span className="truncate">{order.address}</span>
          </div>
        </div>
        <div className="text-right ml-4">
          <div style={{ color: t.text, fontSize: 16, fontWeight: 600 }}>
            {fmt(order.total)}
          </div>
          <div style={{ color: t.textDim, fontSize: 12, marginTop: 2 }}>
            {order.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg transition-colors"
          style={{
            background: t.accent,
            color: "#0A0A0B",
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Nhận đơn
        </button>
        <button
          onClick={onClick}
          className="rounded-lg"
          style={{
            background: t.surface2,
            color: t.text,
            border: `1px solid ${t.border}`,
            padding: "10px 14px",
            fontSize: 14,
          }}
        >
          Chi tiết
        </button>
      </div>
    </div>
  );
}

function ActiveCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const meta = statusMeta[order.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition-colors"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="rounded-md"
          style={{
            background: meta.soft,
            color: meta.color,
            fontSize: 11,
            fontWeight: 500,
            padding: "2px 8px",
            border: `1px solid ${meta.border}`,
          }}
        >
          {meta.label}
        </span>
        <span style={{ color: t.textDim, fontSize: 12 }}>#{order.id}</span>
      </div>
      <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>
        {order.customerName}
      </div>
      <div
        className="flex items-center gap-1.5 mt-1"
        style={{ color: t.textMuted, fontSize: 12 }}
      >
        <Phone size={11} />
        {order.phone}
      </div>
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: `1px solid ${t.border}` }}
      >
        <span style={{ color: t.textDim, fontSize: 12 }}>{order.district}</span>
        <span style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>
          {fmt(order.total)}
        </span>
      </div>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      className="rounded-xl text-center"
      style={{
        background: t.surface,
        border: `1px dashed ${t.borderStrong}`,
        padding: "32px 16px",
        color: t.textDim,
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}
