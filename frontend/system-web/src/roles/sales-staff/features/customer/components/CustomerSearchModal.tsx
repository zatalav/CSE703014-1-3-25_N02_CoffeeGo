import { useState } from "react";
import { X, Search, Phone, Star, Clock, UserPlus } from "lucide-react";
import { Customer } from "../types";
import { searchCustomers } from "../api/customerApi";

interface CustomerSearchModalProps {
  onSelect: (customer: Customer | null) => void;
  onClose: () => void;
}

const rankColors: Record<string, { bg: string; text: string; icon: string }> = {
  Gold: { bg: "#FEF3C7", text: "#92400E", icon: "*" },
  Platinum: { bg: "#EEF2FF", text: "#4338CA", icon: "*" },
  Black: { bg: "#111827", text: "#FFFFFF", icon: "*" },
};
const DEFAULT_RANK = { bg: "#E6F4F8", text: "#0F4761", icon: "★" };

export function CustomerSearchModal({ onSelect, onClose }: CustomerSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      setResults(await searchCustomers(query));
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Không thể tìm khách hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.62)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md mx-4 rounded-3xl shadow-2xl overflow-hidden" style={{ background: "#FFFFFF" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "linear-gradient(135deg, #0F4761, #0E7490)" }}>
          <div>
            <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.05rem" }}>Tra cứu khách hàng</h3>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem" }}>Tìm theo tên, SĐT hoặc email</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer" }}>
            <X size={16} color="#FFF" />
          </button>
        </div>

        <div className="p-4 border-b" style={{ borderColor: "#E2E8F0" }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="0901234567 · Nguyễn Thị Lan..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border outline-none"
                style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "0.88rem" }}
                onFocus={(e) => { e.target.style.borderColor = "#0F4761"; }}
                onBlur={(e) => { e.target.style.borderColor = "#CBD5E1"; }}
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              style={{ background: "linear-gradient(135deg, #0F4761, #0E7490)", color: "#FFFFFF", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
            >
              <Search size={14} />
              Tìm
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!searched && (
            <div className="p-6 text-center">
              <Phone size={32} style={{ color: "#CBD5E1", margin: "0 auto 8px" }} />
              <p style={{ color: "#64748B", fontSize: "0.85rem" }}>Nhập số điện thoại hoặc tên để tìm kiếm</p>
            </div>
          )}

          {loading && (
            <div className="p-6 text-center">
              <p style={{ color: "#64748B", fontSize: "0.85rem" }}>Đang tìm khách hàng...</p>
            </div>
          )}

          {searched && error && !loading && (
            <div className="p-6 text-center">
              <p style={{ color: "#DC2626", fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>{error}</p>
            </div>
          )}

          {searched && !error && !loading && results.length === 0 && (
            <div className="p-6 text-center">
              <p style={{ color: "#334155", fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>Không tìm thấy khách hàng</p>
              <p style={{ color: "#64748B", fontSize: "0.82rem" }}>"{query}" chưa có tài khoản thành viên.</p>
            </div>
          )}

          {results.map((customer) => {
            const rank = rankColors[customer.rank] || DEFAULT_RANK;
            return (
              <button
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="w-full flex items-start gap-3 p-4 text-left transition-all hover:bg-slate-50 border-b"
                style={{ borderColor: "#E2E8F0", background: "none", cursor: "pointer" }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0F4761, #0E7490)" }}>
                  <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1rem" }}>{customer.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p style={{ color: "#111827", fontWeight: 700, fontSize: "0.9rem" }}>{customer.name}</p>
                    <span className="px-2 py-0.5 rounded-full" style={{ background: rank.bg, color: rank.text, fontSize: "0.7rem", fontWeight: 600 }}>
                      {rank.icon} {customer.rank}
                    </span>
                  </div>
                  <p style={{ color: "#0F4761", fontSize: "0.8rem" }}>
                    <Phone size={11} className="inline mr-1" />{customer.phone}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span style={{ color: "#D97706", fontSize: "0.78rem" }}>
                      <Star size={11} className="inline mr-0.5" />{customer.points.toLocaleString()} điểm
                    </span>
                    <span style={{ color: "#64748B", fontSize: "0.75rem" }}>
                      <Clock size={11} className="inline mr-0.5" />{customer.lastOrder}
                    </span>
                    <span style={{ color: "#64748B", fontSize: "0.75rem" }}>{customer.totalOrders} đơn</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 flex gap-2 border-t" style={{ borderColor: "#E2E8F0" }}>
          <button
            onClick={() => onSelect(null)}
            className="flex-1 py-2.5 rounded-xl"
            style={{ background: "#F8FAFC", color: "#0F4761", border: "1px solid #E2E8F0", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem" }}
          >
            Bỏ qua (Khách vãng lai)
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl"
            style={{ background: "#E6F4F8", color: "#0F4761", border: "1px solid #BEE3F0", cursor: "pointer", fontWeight: 500, fontSize: "0.85rem" }}
          >
            <UserPlus size={14} /> Tạo mới
          </button>
        </div>
      </div>
    </div>
  );
}
