import * as React from "react";
import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, ChevronDown, ChevronUp, Clock, CreditCard, Filter, Search, X } from "lucide-react";
import { Order, OrderStatus } from "../types";
import { formatDate, formatTime, formatVnd } from "../../../shared/lib/format";

interface OrderHistoryScreenProps {
  orders: Order[];
  onCancel: (orderId: string, reason: string) => void;
}

const CANCEL_REASONS = [
  "Khách đổi ý",
  "Khách chờ quá lâu",
  "Khách gọi nhầm món",
  "Hết nguyên liệu",
  "Lỗi hệ thống",
  "Lý do khác",
];

const STATUS_LABEL: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Chờ xử lý", color: "#92400E", bg: "#FEF3C7" },
  confirmed: { label: "Đã xác nhận", color: "#7B4A2D", bg: "#F5EDE3" },
  preparing: { label: "Đang xử lý", color: "#1D4ED8", bg: "#EFF6FF" },
  ready: { label: "Sẵn sàng", color: "#065F46", bg: "#D1FAE5" },
  completed: { label: "Hoàn thành", color: "#374151", bg: "#F3F4F6" },
  cancelled: { label: "Đã hủy", color: "#DC2626", bg: "#FEF2F2" },
};

const PAYMENT_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  cash: { icon: <Banknote size={13} />, label: "Tiền mặt" },
  qr: { icon: <CreditCard size={13} />, label: "QR Code" },
  e_wallet: { icon: <CreditCard size={13} />, label: "Ví điện tử" },
  points: { icon: <CreditCard size={13} />, label: "Điểm tích lũy" },
};

export function OrderHistoryScreen({ orders, onCancel }: OrderHistoryScreenProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const filtered = useMemo(() => orders.filter((order) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      order.orderNumber.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.includes(q) ||
      order.items.some((item) => item.name.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || order.status === statusFilter;
    return matchSearch && matchStatus;
  }), [orders, search, statusFilter]);

  const canCancel = (order: Order) =>
    order.orderType !== "delivery" && order.status !== "completed" && order.status !== "cancelled";

  const confirmCancel = () => {
    if (!cancelTarget) return;
    const reason = cancelReason === "Lý do khác" ? customReason.trim() : cancelReason;
    if (!reason) return;
    onCancel(cancelTarget.id, reason);
    setCancelSuccess(true);
    window.setTimeout(() => {
      setCancelTarget(null);
      setCancelReason("");
      setCustomReason("");
      setCancelSuccess(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#F5EDE3" }}>
      <div className="px-4 py-3 shrink-0 flex flex-col sm:flex-row gap-2" style={{ background: "#FDF5EC", borderBottom: "1px solid #E8D5C0" }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A0856A" }} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Mã đơn, tên khách, tên món..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border outline-none"
            style={{ background: "#F5EDE3", border: "1.5px solid #E8D5C0", color: "#2C1A0E", fontSize: "0.85rem" }}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          <Filter size={14} style={{ color: "#A0856A", margin: "auto 0" }} />
          {([
            { key: "all", label: "Tất cả" },
            { key: "pending", label: "Chờ" },
            { key: "confirmed", label: "Đã xác nhận" },
            { key: "completed", label: "Hoàn thành" },
            { key: "cancelled", label: "Đã hủy" },
          ] as const).map((status) => (
            <button
              key={status.key}
              onClick={() => setStatusFilter(status.key as OrderStatus | "all")}
              className="shrink-0 px-3 py-1.5 rounded-xl transition-all"
              style={{
                background: statusFilter === status.key ? "linear-gradient(135deg, #7B4A2D, #C4813A)" : "#F5EDE3",
                color: statusFilter === status.key ? "#FEFAF6" : "#7B4A2D",
                border: "none",
                cursor: "pointer",
                fontWeight: statusFilter === status.key ? 600 : 400,
                fontSize: "0.8rem",
              }}
            >
              {status.label}
            </button>
          ))}
        </div>

        <span style={{ color: "#A0856A", fontSize: "0.78rem", margin: "auto 0 auto auto", whiteSpace: "nowrap" }}>
          {filtered.length} đơn
        </span>
      </div>

      <div className="hidden md:grid px-4 py-2 shrink-0" style={{ gridTemplateColumns: "90px 1fr 1fr 110px 130px 100px 120px", gap: 8, background: "#FDF5EC", borderBottom: "1px solid #E8D5C0" }}>
        {["Mã đơn", "Thời gian", "Khách hàng", "Tổng tiền", "Thanh toán", "Trạng thái", ""].map((header) => (
          <span key={header} style={{ color: "#7B4A2D", fontSize: "0.75rem", fontWeight: 700 }}>{header}</span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Search size={32} style={{ color: "#E8D5C0" }} />
            <p style={{ color: "#C4A882", fontSize: "0.88rem" }}>Không tìm thấy đơn hàng</p>
          </div>
        ) : (
          filtered.map((order) => {
            const status = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
            const payment = PAYMENT_ICONS[order.paymentMethod] || PAYMENT_ICONS.cash;
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} style={{ borderBottom: "1px solid #F5EDE3" }}>
                <div
                  className="px-4 py-3 flex flex-col md:grid cursor-pointer hover:bg-amber-50 transition-colors"
                  style={{ gridTemplateColumns: "90px 1fr 1fr 110px 130px 100px 120px", gap: 8, alignItems: "center" }}
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <span style={{ color: "#2C1A0E", fontWeight: 800, fontSize: "0.88rem" }}>#{order.orderNumber}</span>

                  <div className="flex items-center gap-1.5">
                    <Clock size={12} style={{ color: "#A0856A" }} />
                    <div>
                      <p style={{ color: "#2C1A0E", fontSize: "0.82rem" }}>{formatTime(order.createdAt)}</p>
                      <p style={{ color: "#A0856A", fontSize: "0.7rem" }}>{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p style={{ color: order.customerName ? "#2C1A0E" : "#A0856A", fontSize: "0.82rem", fontWeight: order.customerName ? 500 : 400 }}>
                      {order.customerName || "Khách vãng lai"}
                    </p>
                    {order.customerPhone && <p style={{ color: "#A0856A", fontSize: "0.7rem" }}>{order.customerPhone}</p>}
                  </div>

                  <span style={{ color: "#C4813A", fontWeight: 700, fontSize: "0.88rem" }}>
                    {formatVnd(order.total - order.discount)}
                  </span>

                  <div>
                    <div className="flex items-center gap-1" style={{ color: "#7B4A2D" }}>
                      {payment.icon}
                      <span style={{ fontSize: "0.78rem" }}>{payment.label}</span>
                    </div>
                    <p style={{ color: "#A0856A", fontSize: "0.68rem" }}>
                      {order.orderType === "delivery" ? "Online giao hàng" : "Tại quán"}
                    </p>
                  </div>

                  <span className="px-2 py-1 rounded-full inline-block" style={{ background: status.bg, color: status.color, fontSize: "0.7rem", fontWeight: 600, width: "fit-content" }}>
                    {status.label}
                  </span>

                  <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    {canCancel(order) && (
                      <button
                        onClick={() => {
                          setCancelTarget(order);
                          setCancelReason("");
                          setCustomReason("");
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all"
                        style={{ background: "#FEE2E2", color: "#DC2626", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                      >
                        <X size={12} /> Hủy đơn
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : order.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0856A" }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4" style={{ background: "#FDFAF6" }}>
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#E8D5C0" }}>
                      <div className="p-4" style={{ background: "#FDF5EC" }}>
                        <p style={{ color: "#7B4A2D", fontWeight: 700, fontSize: "0.8rem", marginBottom: 8 }}>Chi tiết sản phẩm</p>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="flex justify-between gap-2">
                              <div>
                                <p style={{ color: "#2C1A0E", fontSize: "0.82rem", fontWeight: 500 }}>
                                  {item.name}
                                  {item.size && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded" style={{ background: "#D4A054", color: "#FFF", fontSize: "0.62rem", fontWeight: 700 }}>{item.size}</span>
                                  )}
                                </p>
                                {item.toppings.length > 0 && <p style={{ color: "#A0856A", fontSize: "0.7rem" }}>+ {item.toppings.join(", ")}</p>}
                                {item.note && <p style={{ color: "#C4813A", fontSize: "0.7rem" }}>{item.note}</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <p style={{ color: "#6B5344", fontSize: "0.78rem" }}>x{item.qty}</p>
                                <p style={{ color: "#C4813A", fontWeight: 600, fontSize: "0.8rem" }}>{formatVnd(item.price * item.qty)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="px-4 py-3 border-t flex flex-wrap gap-4 justify-between" style={{ borderColor: "#E8D5C0" }}>
                        <div className="space-y-1">
                          <div className="flex gap-3">
                            <span style={{ color: "#6B5344", fontSize: "0.8rem" }}>Tạm tính:</span>
                            <span style={{ color: "#2C1A0E", fontSize: "0.8rem" }}>{formatVnd(order.total)}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex gap-3">
                              <span style={{ color: "#6B5344", fontSize: "0.8rem" }}>Giảm giá:</span>
                              <span style={{ color: "#059669", fontSize: "0.8rem", fontWeight: 600 }}>-{formatVnd(order.discount)}</span>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <span style={{ color: "#2C1A0E", fontSize: "0.85rem", fontWeight: 700 }}>Thực thu:</span>
                            <span style={{ color: "#C4813A", fontSize: "0.9rem", fontWeight: 800 }}>{formatVnd(order.total - order.discount)}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p style={{ color: "#6B5344", fontSize: "0.75rem" }}>Nhân viên: <strong style={{ color: "#2C1A0E" }}>{order.staffName}</strong></p>
                          {order.cancelReason && <p style={{ color: "#DC2626", fontSize: "0.75rem" }}>Lý do hủy: {order.cancelReason}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(44,26,14,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl" style={{ background: "#FEFAF6" }}>
            {cancelSuccess ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}>
                  <X size={32} style={{ color: "#059669" }} />
                </div>
                <p style={{ color: "#065F46", fontWeight: 700, fontSize: "1rem" }}>Đơn #{cancelTarget.orderNumber} đã được hủy</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-5" style={{ background: "#FEF2F2", borderBottom: "1px solid #FCA5A5" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
                    <AlertTriangle size={20} style={{ color: "#DC2626" }} />
                  </div>
                  <div>
                    <h3 style={{ color: "#991B1B", fontWeight: 700, fontSize: "1rem" }}>Xác nhận hủy đơn #{cancelTarget.orderNumber}</h3>
                    <p style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: 2 }}>
                      Chỉ áp dụng cho đơn tại quán. Hành động này không thể hoàn tác.
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3 border-b" style={{ borderColor: "#E8D5C0" }}>
                  <p style={{ color: "#6B5344", fontSize: "0.78rem", marginBottom: 4 }}>Sản phẩm trong đơn:</p>
                  {cancelTarget.items.map((item, index) => (
                    <p key={`${item.name}-${index}`} style={{ color: "#2C1A0E", fontSize: "0.82rem" }}>- {item.name}{item.size ? ` [${item.size}]` : ""} x{item.qty}</p>
                  ))}
                  <p className="mt-2" style={{ color: "#C4813A", fontWeight: 700, fontSize: "0.9rem" }}>
                    Tổng: {formatVnd(cancelTarget.total - cancelTarget.discount)}
                  </p>
                </div>

                <div className="p-5 space-y-3">
                  <label style={{ color: "#4A2C17", fontSize: "0.85rem", fontWeight: 700, display: "block" }}>
                    Lý do hủy đơn <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CANCEL_REASONS.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setCancelReason(reason)}
                        className="px-3 py-2 rounded-xl text-left transition-all"
                        style={{
                          background: cancelReason === reason ? "#FEE2E2" : "#F5EDE3",
                          border: `1.5px solid ${cancelReason === reason ? "#FCA5A5" : "#E8D5C0"}`,
                          color: cancelReason === reason ? "#DC2626" : "#4A2C17",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          fontWeight: cancelReason === reason ? 600 : 400,
                        }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  {cancelReason === "Lý do khác" && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(event) => setCustomReason(event.target.value)}
                      placeholder="Nhập lý do cụ thể..."
                      autoFocus
                      className="w-full px-3 py-2.5 rounded-xl border outline-none"
                      style={{ background: "#F5EDE3", border: "1.5px solid #E8D5C0", color: "#2C1A0E", fontSize: "0.85rem" }}
                    />
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setCancelTarget(null);
                        setCancelReason("");
                        setCustomReason("");
                      }}
                      className="flex-1 py-2.5 rounded-xl"
                      style={{ background: "#F5EDE3", color: "#7B4A2D", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem" }}
                    >
                      Quay lại
                    </button>
                    <button
                      onClick={confirmCancel}
                      disabled={!cancelReason || (cancelReason === "Lý do khác" && !customReason.trim())}
                      className="flex-1 py-2.5 rounded-xl transition-all active:scale-[0.97]"
                      style={{
                        background: (cancelReason && !(cancelReason === "Lý do khác" && !customReason.trim())) ? "#DC2626" : "#D1D5DB",
                        color: "#FFF",
                        border: "none",
                        cursor: (cancelReason && !(cancelReason === "Lý do khác" && !customReason.trim())) ? "pointer" : "not-allowed",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      Xác nhận hủy
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
