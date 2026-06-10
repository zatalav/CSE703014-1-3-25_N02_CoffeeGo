import {
  ArrowLeft,
  Phone,
  MapPin,
  MessageSquare,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { t, statusMeta, fmt } from "./theme";
import type { Order } from "./types";
import type { PageType } from "../App";

interface Props {
  orderId: string | null;
  navigate: (page: PageType, params?: { orderId?: string }) => void;
  orders: Order[];
  acceptOrder: (id: string) => void;
  completeOrder: (id: string) => void;
}

export default function OrderDetailPage({ orderId, navigate, orders, acceptOrder, completeOrder }: Props) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return (
      <div className="p-10" style={{ color: t.textMuted }}>
        Không tìm thấy đơn hàng.
      </div>
    );
  }
  const meta = statusMeta[order.status];

  return (
    <div className="px-10 py-8 max-w-[1100px] mx-auto">
      <button
        onClick={() => navigate("orders")}
        className="flex items-center gap-2 mb-6"
        style={{ color: t.textMuted, fontSize: 13 }}
      >
        <ArrowLeft size={14} />
        Quay lại đơn hàng
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="rounded-md"
              style={{
                background: meta.soft,
                color: meta.color,
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 10px",
                border: `1px solid ${meta.border}`,
              }}
            >
              {meta.label}
            </span>
            <span style={{ color: t.textDim, fontSize: 13 }}>#{order.id}</span>
          </div>
          <h1
            style={{
              color: t.text,
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {order.customerName}
          </h1>
          <div style={{ color: t.textMuted, fontSize: 14, marginTop: 4 }}>
            {order.date} · {order.time}
          </div>
        </div>

        {order.status === "new" && (
          <button
            onClick={() => acceptOrder(order.id)}
            className="rounded-lg"
            style={{
              background: t.accent,
              color: "#0A0A0B",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Nhận đơn này
          </button>
        )}
        {order.status === "delivering" && (
          <button
            onClick={() => completeOrder(order.id)}
            className="rounded-lg"
            style={{
              background: t.success,
              color: "#0A0A0B",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Xac nhan da giao
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <Card title="Thông tin khách hàng">
            <div className="grid grid-cols-2 gap-5">
              <Info icon={Phone} label="Số điện thoại" value={order.phone} />
              <Info
                icon={MapPin}
                label="Khu vực"
                value={order.district}
              />
              <div className="col-span-2">
                <Info icon={MapPin} label="Địa chỉ giao" value={order.address} />
              </div>
              {order.note && (
                <div className="col-span-2">
                  <Info icon={MessageSquare} label="Ghi chú" value={order.note} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                className="rounded-lg flex items-center gap-2"
                style={{
                  background: t.surface2,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  padding: "8px 14px",
                  fontSize: 13,
                }}
              >
                <Phone size={13} /> Gọi khách
              </button>
              <button
                className="rounded-lg flex items-center gap-2"
                style={{
                  background: t.surface2,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                  padding: "8px 14px",
                  fontSize: 13,
                }}
              >
                <Navigation size={13} /> Mở bản đồ
              </button>
            </div>
          </Card>

          <Card title="Sản phẩm">
            <div className="space-y-3">
              {order.items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    paddingBottom: 12,
                    borderBottom: i < order.items.length - 1 ? `1px solid ${t.border}` : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-md flex items-center justify-center"
                      style={{
                        width: 28,
                        height: 28,
                        background: t.surface3,
                        color: t.textMuted,
                        fontSize: 12,
                        fontWeight: 500,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      {it.qty}
                    </span>
                    <span style={{ color: t.text, fontSize: 14 }}>{it.name}</span>
                  </div>
                  <span style={{ color: t.textMuted, fontSize: 14 }}>
                    {fmt(it.price * it.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="flex items-center justify-between mt-5 pt-4"
              style={{ borderTop: `1px solid ${t.border}` }}
            >
              <span style={{ color: t.textMuted, fontSize: 14 }}>Tổng cộng</span>
              <span style={{ color: t.text, fontSize: 20, fontWeight: 600 }}>
                {fmt(order.total)}
              </span>
            </div>
            <div style={{ color: t.textDim, fontSize: 12, marginTop: 4, textAlign: "right" }}>
              {order.paymentMethod === "cash" ? "Thanh toán tiền mặt" : "Đã chuyển khoản"}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Tiến trình">
            <div className="space-y-4">
              {order.timeline.map((step, i) => {
                const isLast = i === order.timeline.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: 24,
                          height: 24,
                          background: step.done ? t.accent : t.surface2,
                          border: `1px solid ${step.done ? t.accent : t.border}`,
                        }}
                      >
                        {step.done && (
                          <CheckCircle2 size={14} style={{ color: "#0A0A0B" }} />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            width: 1,
                            flex: 1,
                            minHeight: 24,
                            background: t.border,
                            marginTop: 4,
                          }}
                        />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div
                        style={{
                          color: step.done ? t.text : t.textMuted,
                          fontSize: 14,
                          fontWeight: step.current ? 600 : 400,
                        }}
                      >
                        {step.status}
                      </div>
                      <div style={{ color: t.textDim, fontSize: 12, marginTop: 2 }}>
                        {step.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <div
        style={{
          color: t.textMuted,
          fontSize: 12,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-2"
        style={{ color: t.textDim, fontSize: 12, marginBottom: 4 }}
      >
        <Icon size={12} />
        {label}
      </div>
      <div style={{ color: t.text, fontSize: 14 }}>{value}</div>
    </div>
  );
}
