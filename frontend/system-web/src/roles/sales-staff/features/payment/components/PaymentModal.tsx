import { useState } from "react";
import { X, Banknote, Star, CheckCircle2 } from "lucide-react";
import { PaymentMethod } from "../types";
import { formatVnd } from "../../../shared/lib/format";

interface PaymentCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  size: string;
  toppings: string[];
  note?: string;
}

interface PaymentModalProps {
  total: number;
  discount: number;
  cartItems: PaymentCartItem[];
  customerPoints: number;
  customerName: string;
  onClose: () => void;
  onSuccess: (method: PaymentMethod, pointsUsed?: number) => void | Promise<void>;
}

const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];

export function PaymentModal({ total, discount, cartItems, customerPoints, customerName, onClose, onSuccess }: PaymentModalProps) {
  const [tab, setTab] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [pointsToUse, setPointsToUse] = useState(0);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const finalTotal = Math.max(0, total - discount);
  const cashAmount = Number(cashInput.replace(/[^0-9]/g, "")) || 0;
  const change = Math.max(0, cashAmount - finalTotal);
  const maxPointsDiscount = Math.min(customerPoints * 1000, finalTotal);
  const pointsDiscount = Math.min(pointsToUse * 1000, maxPointsDiscount);
  const pointsPayTotal = Math.max(0, finalTotal - pointsDiscount);

  const appendCash = (v: number) => {
    const current = Number(cashInput.replace(/[^0-9]/g, "")) || 0;
    setCashInput((current + v).toLocaleString("vi-VN"));
  };
  const clearCash = () => setCashInput("");

  const handleConfirm = async () => {
    setProcessing(true);
    setError("");
    try {
      await onSuccess(tab, tab === "points" ? pointsToUse : 0);
      setSuccess(true);
      window.setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể ghi nhận đơn hàng");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}>
        <div className="rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl" style={{ background: "#FFFFFF", minWidth: 320 }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}>
            <CheckCircle2 size={44} style={{ color: "#059669" }} />
          </div>
          <h3 style={{ color: "#111827", fontWeight: 700, fontSize: "1.3rem" }}>Thanh toán thành công!</h3>
          <p style={{ color: "#475569", fontSize: "0.9rem" }}>Đơn hàng đã được ghi nhận.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="w-full sm:w-[820px] max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col" style={{ background: "#FFFFFF" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#E2E8F0" }}>
          <div>
            <h2 style={{ color: "#111827", fontWeight: 700, fontSize: "1.2rem" }}>Thanh toán đơn hàng</h2>
            <p style={{ color: "#64748B", fontSize: "0.82rem" }}>{cartItems.length} sản phẩm · Tổng cộng: <strong style={{ color: "#D97706" }}>{formatVnd(finalTotal)}</strong></p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer" }}>
            <X size={18} style={{ color: "#0F4761" }} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="md:w-56 p-4 border-b md:border-b-0 md:border-r overflow-y-auto" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
            <p style={{ color: "#0F4761", fontSize: "0.8rem", fontWeight: 600, marginBottom: 8 }}>Chi tiết đơn hàng</p>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <div>
                    <p style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 500 }}>{item.name}</p>
                    {(item.size || item.toppings.length > 0) && (
                      <p style={{ color: "#64748B", fontSize: "0.74rem" }}>
                        {[item.size, item.toppings.length > 0 ? item.toppings.join(", ") : ""].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {item.note && (
                      <p style={{ color: "#64748B", fontSize: "0.7rem", marginTop: 2 }}>{item.note}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p style={{ color: "#111827", fontSize: "0.82rem" }}>x{item.qty}</p>
                    <p style={{ color: "#D97706", fontSize: "0.8rem", fontWeight: 600 }}>{formatVnd(item.price * item.qty)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "#E2E8F0" }}>
              {discount > 0 && (
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#475569", fontSize: "0.82rem" }}>Giảm giá</span>
                  <span style={{ color: "#059669", fontSize: "0.82rem", fontWeight: 600 }}>-{formatVnd(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 700 }}>Tổng thanh toán</span>
                <span style={{ color: "#D97706", fontSize: "0.95rem", fontWeight: 700 }}>{formatVnd(finalTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-5">
            <div className="flex gap-2 mb-5">
              {([
                { key: "cash", label: "Tiền mặt", icon: <Banknote size={15} /> },
                { key: "points", label: "Điểm tích lũy", icon: <Star size={15} /> },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all"
                  style={{
                    background: tab === t.key ? "linear-gradient(135deg, #0F4761, #0E7490)" : "#F8FAFC",
                    color: tab === t.key ? "#FFFFFF" : "#334155",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: tab === t.key ? 600 : 400,
                    fontSize: "0.85rem",
                    boxShadow: tab === t.key ? "0 4px 12px rgba(15,71,97,0.25)" : "none",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            {error && (
              <div className="mb-4 rounded-xl px-3 py-2" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "0.82rem" }}>
                {error}
              </div>
            )}

            {tab === "cash" && (
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <label style={{ color: "#334155", fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Số tiền khách đưa
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cashInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        if (raw) setCashInput(Number(raw).toLocaleString("vi-VN"));
                        else setCashInput("");
                      }}
                      placeholder="0"
                      className="flex-1 px-4 py-3 rounded-xl border outline-none text-right"
                      style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "1.2rem", fontWeight: 700 }}
                    />
                    <span style={{ color: "#0F4761", fontWeight: 600 }}>đ</span>
                    <button onClick={clearCash} className="px-3 py-2 rounded-xl" style={{ background: "#FECACA", color: "#DC2626", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Xóa</button>
                  </div>
                </div>

                <div>
                  <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: 6 }}>Chọn nhanh mệnh giá</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DENOMINATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => appendCash(d)}
                        className="py-2 rounded-xl transition-all active:scale-[0.96]"
                        style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#334155", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}
                      >
                        +{(d / 1000).toLocaleString()}k
                      </button>
                    ))}
                    <button
                      onClick={() => setCashInput(finalTotal.toLocaleString("vi-VN"))}
                      className="py-2 rounded-xl col-span-3"
                      style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Đúng tiền ({formatVnd(finalTotal)})
                    </button>
                  </div>
                </div>

                {cashAmount > 0 && (
                  <div className="rounded-xl p-3" style={{ background: cashAmount >= finalTotal ? "#D1FAE5" : "#FEF3C7", border: `1px solid ${cashAmount >= finalTotal ? "#6EE7B7" : "#FCD34D"}` }}>
                    {cashAmount >= finalTotal ? (
                      <div className="flex justify-between">
                        <span style={{ color: "#065F46", fontWeight: 600, fontSize: "0.9rem" }}>Tiền thừa trả khách:</span>
                        <span style={{ color: "#059669", fontWeight: 700, fontSize: "1rem" }}>{formatVnd(change)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span style={{ color: "#92400E", fontWeight: 600, fontSize: "0.9rem" }}>Còn thiếu:</span>
                        <span style={{ color: "#D97706", fontWeight: 700, fontSize: "1rem" }}>{formatVnd(finalTotal - cashAmount)}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={cashAmount < finalTotal || processing}
                  className="mt-auto w-full py-3.5 rounded-xl transition-all active:scale-[0.98]"
                  style={{
                    background: cashAmount >= finalTotal ? "linear-gradient(135deg, #059669, #10B981)" : "#D1D5DB",
                    color: cashAmount >= finalTotal ? "#FFFFFF" : "#9CA3AF",
                    border: "none",
                    cursor: cashAmount >= finalTotal ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    fontSize: "1rem",
                    boxShadow: cashAmount >= finalTotal ? "0 4px 15px rgba(5,150,105,0.3)" : "none",
                  }}
                >
                  {processing ? "Đang xử lý..." : `Xác nhận thu ${formatVnd(finalTotal)}`}
                </button>
              </div>
            )}

            {tab === "points" && (
              <div className="flex-1 flex flex-col gap-4">
                {customerName ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#F59E0B" }}>
                        <span style={{ color: "#FFF", fontWeight: 700, fontSize: "0.9rem" }}>{customerName[0]}</span>
                      </div>
                      <div>
                        <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.9rem" }}>{customerName}</p>
                        <p style={{ color: "#92400E", fontSize: "0.8rem" }}>{customerPoints.toLocaleString()} điểm · Hạng Gold</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <label style={{ color: "#334155", fontSize: "0.85rem", fontWeight: 600 }}>Số điểm sử dụng</label>
                        <span style={{ color: "#D97706", fontSize: "0.85rem", fontWeight: 700 }}>{pointsToUse} điểm = -{formatVnd(pointsToUse * 1000)}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={Math.min(customerPoints, Math.floor(finalTotal / 1000))}
                        value={pointsToUse}
                        onChange={(e) => {
                          const max = Math.min(customerPoints, Math.floor(finalTotal / 1000));
                          const next = Math.max(0, Math.min(max, Number(e.target.value) || 0));
                          setPointsToUse(next);
                        }}
                        className="w-full px-4 py-3 rounded-xl border outline-none text-right"
                        style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "1rem", fontWeight: 700 }}
                      />
                      <div className="flex justify-between mt-1">
                        <span style={{ color: "#64748B", fontSize: "0.75rem" }}>0 điểm</span>
                        <span style={{ color: "#64748B", fontSize: "0.75rem" }}>{Math.min(customerPoints, Math.floor(finalTotal / 1000))} điểm tối đa</span>
                      </div>
                    </div>

                    <div className="rounded-xl p-4 space-y-2" style={{ background: "#F8FAFC" }}>
                      <div className="flex justify-between">
                        <span style={{ color: "#475569", fontSize: "0.85rem" }}>Tổng đơn hàng</span>
                        <span style={{ color: "#111827", fontSize: "0.85rem" }}>{formatVnd(finalTotal)}</span>
                      </div>
                      {pointsToUse > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: "#475569", fontSize: "0.85rem" }}>Điểm giảm ({pointsToUse} điểm)</span>
                          <span style={{ color: "#059669", fontSize: "0.85rem", fontWeight: 600 }}>-{formatVnd(pointsDiscount)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t flex justify-between" style={{ borderColor: "#E2E8F0" }}>
                        <span style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem" }}>Còn lại cần thanh toán</span>
                        <span style={{ color: "#D97706", fontWeight: 700, fontSize: "1rem" }}>{formatVnd(pointsPayTotal)}</span>
                      </div>
                      <p style={{ color: "#64748B", fontSize: "0.78rem" }}>
                        Điểm còn lại sau GD: {(customerPoints - pointsToUse).toLocaleString()} điểm
                      </p>
                    </div>

                    <button
                      onClick={handleConfirm}
                      disabled={processing}
                      className="mt-auto w-full py-3.5 rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, #0F4761, #0E7490)",
                        color: "#FFFFFF",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "1rem",
                        boxShadow: "0 4px 15px rgba(15,71,97,0.25)",
                      }}
                    >
                      {processing ? "Đang xử lý..." : pointsPayTotal > 0 ? `Thanh toán thêm ${formatVnd(pointsPayTotal)}` : "Xác nhận thanh toán bằng điểm"}
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#F8FAFC" }}>
                      <Star size={32} style={{ color: "#D97706" }} />
                    </div>
                    <p style={{ color: "#334155", fontWeight: 600, fontSize: "0.95rem" }}>Chưa có khách hàng</p>
                    <p style={{ color: "#64748B", fontSize: "0.83rem", textAlign: "center" }}>
                      Vui lòng tra cứu khách hàng thành viên để sử dụng điểm tích lũy.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
