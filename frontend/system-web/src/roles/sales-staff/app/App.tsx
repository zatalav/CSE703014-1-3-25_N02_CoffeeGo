import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ClipboardList, Coffee, History, LogOut, MapPin, ShoppingCart } from "lucide-react";
import { POSScreen } from "../features/pos/components/POSScreen";
import { OrderQueueScreen } from "../features/order/components/OrderQueueScreen";
import { OrderHistoryScreen } from "../features/order/components/OrderHistoryScreen";
import { Order, OrderStatus } from "../features/order/types";
import { fetchStaffOrders, updateStaffOrderStatus } from "../features/order/api/orderApi";
import { AssistantWidget } from "../features/assistant/components/AssistantWidget";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { BranchDto } from "../../../lib/types";

type Tab = "pos" | "queue" | "history";

export default function App() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const staffName = session?.userInfo?.name || "Nhân viên";
  const employeeId = session?.userInfo?.id;
  const branchId = session?.userInfo?.branchId ?? undefined;
  const [branchName, setBranchName] = useState(branchId ? `Chi nhánh #${branchId}` : "Chưa gán chi nhánh");
  const [tab, setTab] = useState<Tab>("pos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!branchId) {
      setBranchName("Chưa gán chi nhánh");
      return;
    }
    setBranchName(`Chi nhánh #${branchId}`);
    api.get<BranchDto>(`/branches/${branchId}`)
      .then(branch => {
        if (!ignore) setBranchName(branch.branchName || `Chi nhánh #${branchId}`);
      })
      .catch(() => {
        if (!ignore) setBranchName(`Chi nhánh #${branchId}`);
      });
    return () => {
      ignore = true;
    };
  }, [branchId]);

  const loadOrders = useCallback(async () => {
    if (!branchId) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const data = await fetchStaffOrders(branchId);
      setOrders(data.map(order => ({ ...order, staffName })));
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [branchId, staffName]);

  useEffect(() => {
    let alive = true;
    void loadOrders();
    const intervalId = window.setInterval(() => {
      if (alive) void loadOrders();
    }, 8000);
    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, [loadOrders]);

  const handleOrderCreated = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    void loadOrders();
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const updated = await updateStaffOrderStatus(orderId, status);
    updated.staffName = staffName;
    setOrders(prev => prev.map(order => order.id === orderId ? updated : order));
    void loadOrders();
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    const updated = await updateStaffOrderStatus(orderId, "cancelled", reason);
    updated.staffName = staffName;
    updated.cancelReason = reason;
    setOrders(prev => prev.map(order => order.id === orderId ? updated : order));
    void loadOrders();
  };

  const pendingCount = orders.filter(order => order.status === "pending").length;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const tabs = [
    { key: "pos" as const, icon: <ShoppingCart size={16} />, label: "Bán hàng", badge: 0 },
    { key: "queue" as const, icon: <ClipboardList size={16} />, label: "Hàng chờ bếp", badge: pendingCount },
    { key: "history" as const, icon: <History size={16} />, label: "Lịch sử đơn", badge: 0 },
  ];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: "#F6F8FB" }}>
      <div
        className="flex items-center shrink-0"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 12px rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-r" style={{ borderColor: "#E2E8F0" }}>
          <Coffee size={20} style={{ color: "#0F4761" }} />
          <span style={{ color: "#0F4761", fontWeight: 800, fontSize: "1rem" }}>CoffeeGo</span>
          <div className="hidden sm:flex items-center gap-1 ml-1" style={{ color: "#64748B" }}>
            <MapPin size={11} />
            <span style={{ fontSize: "0.72rem" }}>{branchName}</span>
          </div>
        </div>

        <div className="flex flex-1 px-2">
          {tabs.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className="relative flex items-center gap-1.5 px-4 py-3 transition-all"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tab === item.key ? "#0F4761" : "#64748B",
                fontWeight: tab === item.key ? 700 : 400,
                fontSize: "0.85rem",
                borderBottom: tab === item.key ? "2px solid #0F4761" : "2px solid transparent",
                backgroundColor: tab === item.key ? "#E6F4F8" : "transparent",
              }}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
              {item.badge > 0 && (
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    background: "#EF4444",
                    color: "#FFF",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-l" style={{ borderColor: "#E2E8F0" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#0F4761" }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "0.8rem" }}>{staffName[0]}</span>
          </div>
          <div className="hidden sm:block">
            <p style={{ color: "#111827", fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.2 }}>{staffName}</p>
            <p style={{ color: "#64748B", fontSize: "0.62rem" }}>Nhân viên chi nhánh</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="ml-1 flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 transition-colors disabled:opacity-50"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
              cursor: loggingOut ? "not-allowed" : "pointer",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "pos" && (
          <POSScreen
            staffName={staffName}
            employeeId={employeeId}
            branchId={branchId}
            onLogout={handleLogout}
            onOrderCreated={handleOrderCreated}
          />
        )}
        {tab === "queue" && (
          <OrderQueueScreen
            orders={orders}
            isRefreshing={ordersLoading}
            onRefresh={loadOrders}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
        {tab === "history" && (
          <OrderHistoryScreen
            orders={orders}
            onCancel={handleCancelOrder}
          />
        )}
      </div>
      <AssistantWidget staffName={staffName} />
    </div>
  );
}
