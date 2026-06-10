import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, CreditCard, Eye, Filter, Loader, Search, ShoppingCart, User, X, XCircle } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { PageResponse } from "../../../lib/types";
import { pageItems } from "../../inventory-data";

interface OrderDto {
  orderId: number;
  customerId?: number | null;
  employeeId?: number | null;
  branchId?: number | null;
  couponId?: number | null;
  orderType?: string | null;
  status?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const normalizeStatus = (status?: string | null) => {
  const value = (status || "pending").toLowerCase();
  if (value === "confirmed") return "making";
  if (value === "preparing" || value === "delivering") return "making";
  if (value === "completed") return "done";
  if (value === "cancelled") return "cancelled";
  return "pending";
};

const statusConfig = {
  pending: { label: "Chờ xác nhận", bg: "#FEF9C3", color: "#854D0E", icon: Clock, next: "confirmed" },
  making: { label: "Đang xử lý", bg: "#DBEAFE", color: "#1E40AF", icon: Loader, next: "completed" },
  done: { label: "Hoàn thành", bg: "#D1FAE5", color: "#065F46", icon: CheckCircle, next: "" },
  cancelled: { label: "Đã hủy", bg: "#FEE2E2", color: "#991B1B", icon: XCircle, next: "" },
};

const tabItems = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "making", label: "Đang xử lý" },
  { key: "done", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
] as const;

export function BMOrdersPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [activeTab, setActiveTab] = useState<(typeof tabItems)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const branchQuery = branchId ? `&branchId=${branchId}` : "";
      const data = await api.get<PageResponse<OrderDto> | OrderDto[]>(`/orders?size=200${branchQuery}`);
      setOrders(pageItems(data).filter(order => !branchId || order.branchId === branchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được đơn hàng.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [branchId]);

  const filtered = useMemo(() => orders.filter(order => {
    const status = normalizeStatus(order.status);
    const keyword = search.trim().toLowerCase();
    const matchTab = activeTab === "all" || status === activeTab;
    const matchSearch = !keyword
      || String(order.orderId).includes(keyword)
      || String(order.customerId || "").includes(keyword)
      || (order.note || "").toLowerCase().includes(keyword);
    return matchTab && matchSearch;
  }), [orders, activeTab, search]);

  const counts = {
    all: orders.length,
    pending: orders.filter(order => normalizeStatus(order.status) === "pending").length,
    making: orders.filter(order => normalizeStatus(order.status) === "making").length,
    done: orders.filter(order => normalizeStatus(order.status) === "done").length,
    cancelled: orders.filter(order => normalizeStatus(order.status) === "cancelled").length,
  };

  const updateStatus = async (order: OrderDto, nextStatus: string) => {
    if (!nextStatus) return;
    try {
      await api.patch(`/orders/${order.orderId}/status`, { status: nextStatus });
      await loadData();
      if (selectedOrder?.orderId === order.orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được trạng thái đơn hàng.");
    }
  };

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ color: "#111827" }}>Quản lý đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dữ liệu đơn hàng được tải từ order-service</p>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: "Chờ", count: counts.pending, color: "#854D0E", bg: "#FEF9C3" },
            { label: "Đang xử lý", count: counts.making, color: "#1E40AF", bg: "#DBEAFE" },
          ].filter(item => item.count > 0).map(item => (
            <div key={item.label} className="px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: item.bg, color: item.color }}>
              {item.count} {item.label}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 w-fit" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {tabItems.map(tab => {
          const active = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: active ? "#1a5276" : "transparent", color: active ? "#fff" : "#6B7280" }}>
              {tab.label}
              {count > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: active ? "rgba(255,255,255,0.2)" : "#F3F4F6", color: active ? "#fff" : "#374151" }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng, ghi chú..." className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-600"><Filter size={14} /> Lọc</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex-1" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["Mã đơn", "Khách hàng", "Chi nhánh", "Kênh", "Ghi chú", "Trạng thái", "Thao tác"].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Đang tải dữ liệu...</td></tr>}
              {!loading && filtered.map(order => {
                const status = normalizeStatus(order.status);
                const config = statusConfig[status];
                const StatusIcon = config.icon;
                return (
                  <tr key={order.orderId} className="transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: "#1a5276" }}>#{order.orderId}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: "#1a5276" }}><User size={13} /></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Khách #{order.customerId || "-"}</p>
                          <p className="text-xs text-gray-400">NV #{order.employeeId || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">#{order.branchId || "-"}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: "#1a527615", color: "#1a5276" }}>{order.orderType || "counter"}</span></td>
                    <td className="px-4 py-3"><p className="text-sm text-gray-700 max-w-[220px] truncate">{order.note || "Không có ghi chú"}</p></td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 w-fit px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color }}>
                        <StatusIcon size={11} /> {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={event => event.stopPropagation()}>
                        {config.next && <button onClick={() => void updateStatus(order, config.next)} className="px-2.5 py-1 text-xs font-medium text-white rounded-lg" style={{ backgroundColor: "#1a5276" }}>Cập nhật</button>}
                        <button onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Eye size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <ShoppingCart size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Không có đơn hàng trong database</p>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">Hiển thị <span className="font-medium text-gray-700">{filtered.length}</span> / {orders.length} đơn hàng</p>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ backgroundColor: "#1a5276" }}>
              <div>
                <p className="text-white font-bold">#{selectedOrder.orderId}</p>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString("vi-VN") : ""}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}><X size={16} className="text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: "#1a5276" }}><User size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">Khách #{selectedOrder.customerId || "-"}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><CreditCard size={12} /> Coupon #{selectedOrder.couponId || "-"}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ghi chú</p>
                <p className="text-sm text-gray-700">{selectedOrder.note || "Không có ghi chú"}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="font-semibold text-gray-700">Trạng thái</span>
                <span className="text-sm font-bold" style={{ color: "#1a5276" }}>{statusConfig[normalizeStatus(selectedOrder.status)].label}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
