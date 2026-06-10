import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import OrderListPage from "./components/OrderListPage";
import OrderDetailPage from "./components/OrderDetailPage";
import MapPage from "./components/MapPage";
import ProfilePage from "./components/ProfilePage";
import Sidebar from "./components/Sidebar";
import { acceptDeliveryOrder, completeDeliveryOrder, fetchDeliveryOrders } from "./components/deliveryApi";
import type { Order } from "./components/types";
import { t } from "./components/theme";

export type PageType =
  | "dashboard"
  | "orders"
  | "orderDetail"
  | "map"
  | "profile";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    void loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setError("");
      setOrders(await fetchDeliveryOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc don giao hang.");
    } finally {
      setLoading(false);
    }
  }

  const navigate = (page: PageType, params?: { orderId?: string }) => {
    if (params?.orderId) setSelectedOrderId(params.orderId);
    setCurrentPage(page);
  };

  const replaceOrder = (next: Order) => {
    setOrders((prev) => prev.map((order) => (order.id === next.id ? next : order)));
  };

  const acceptOrder = async (id: string) => {
    replaceOrder(await acceptDeliveryOrder(id));
  };

  const completeOrder = async (id: string) => {
    replaceOrder(await completeDeliveryOrder(id));
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: t.bg,
        color: t.text,
        fontFamily: "Inter, 'DM Sans', system-ui, sans-serif",
      }}
    >
      <Sidebar currentPage={currentPage} navigate={navigate} orders={orders} />
      <main className="flex-1 overflow-y-auto" style={{ background: t.bg }}>
        {error && (
          <div className="mx-10 mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="p-10 text-sm" style={{ color: t.textMuted }}>
            Dang tai don giao hang...
          </div>
        ) : (
          <>
            {currentPage === "dashboard" && (
              <Dashboard navigate={navigate} orders={orders} acceptOrder={acceptOrder} />
            )}
            {currentPage === "orders" && (
              <OrderListPage navigate={navigate} orders={orders} acceptOrder={acceptOrder} />
            )}
            {currentPage === "orderDetail" && (
              <OrderDetailPage
                orderId={selectedOrderId}
                navigate={navigate}
                orders={orders}
                acceptOrder={acceptOrder}
                completeOrder={completeOrder}
              />
            )}
            {currentPage === "map" && <MapPage navigate={navigate} orders={orders} />}
            {currentPage === "profile" && <ProfilePage orders={orders} />}
          </>
        )}
      </main>
    </div>
  );
}
