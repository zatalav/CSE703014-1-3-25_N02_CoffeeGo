import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle, ChevronRight, Clock, Coffee, Loader, ShoppingCart, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { EmployeeLookupDto, PageResponse, WorkScheduleDto } from "../../../lib/types";
import { loadInventoryData, pageItems, type InventoryData } from "../../inventory-data";

interface BMDashboardPageProps {
  onNavigate: (page: string) => void;
}

interface OrderDto {
  orderId: number;
  branchId?: number | null;
  customerId?: number | null;
  employeeId?: number | null;
  orderType?: string | null;
  status?: string | null;
  note?: string | null;
  createdAt?: string | null;
}

const statusStyle: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Chờ xác nhận", bg: "#FEF9C3", color: "#854D0E", icon: <Clock size={11} /> },
  confirmed: { label: "Đã xác nhận", bg: "#DBEAFE", color: "#1E40AF", icon: <Loader size={11} /> },
  preparing: { label: "Đang xử lý", bg: "#DBEAFE", color: "#1E40AF", icon: <Loader size={11} /> },
  completed: { label: "Hoàn thành", bg: "#D1FAE5", color: "#065F46", icon: <CheckCircle size={11} /> },
  cancelled: { label: "Đã hủy", bg: "#FEE2E2", color: "#991B1B", icon: <AlertTriangle size={11} /> },
};

export function BMDashboardPage({ onNavigate }: BMDashboardPageProps) {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookupDto[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const branchQuery = branchId ? `&branchId=${branchId}` : "";
        const [inventoryData, orderData, employeeData, scheduleData] = await Promise.all([
          loadInventoryData(branchId),
          api.get<PageResponse<OrderDto> | OrderDto[]>(`/orders?size=100${branchQuery}`).catch(() => []),
          api.get<EmployeeLookupDto[]>(`/lookups/employees?scope=employee${branchQuery}`).catch(() => []),
          api.get<PageResponse<WorkScheduleDto> | WorkScheduleDto[]>(`/work-schedules?size=200&sort=workDate,desc${branchQuery}`).catch(() => []),
        ]);
        setInventory(inventoryData);
        setOrders(pageItems(orderData).filter(order => !branchId || order.branchId === branchId));
        setEmployees(employeeData.filter(employee => !branchId || employee.branchId === branchId));
        setSchedules(pageItems(scheduleData).filter(item => !branchId || item.branchId === branchId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được dashboard chi nhánh.");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [branchId]);

  const ingredients = inventory?.ingredients || [];
  const lowStockItems = ingredients.filter(item => item.minLevel > 0 && item.current <= item.minLevel);
  const recentOrders = orders.slice(0, 5);
  const completedOrders = orders.filter(order => order.status === "completed");

  const hourlyData = useMemo(() => {
    const byHour = new Map<string, number>();
    orders.forEach(order => {
      if (!order.createdAt) return;
      const date = new Date(order.createdAt);
      const hour = `${date.getHours()}h`;
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    });
    return Array.from(byHour.entries()).map(([hour, orders]) => ({ hour, orders }));
  }, [orders]);

  const shiftToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return schedules.filter(item => item.workDate === today).slice(0, 6);
  }, [schedules]);

  const kpiData = [
    { label: "Đơn hàng hôm nay", value: `${orders.length} đơn`, sub: `Hoàn thành: ${completedOrders.length}`, icon: ShoppingCart, color: "#10B981", bg: "#D1FAE5" },
    { label: "Nhân viên chi nhánh", value: `${employees.length} người`, sub: "Theo database user-service", icon: Users, color: "#8B5CF6", bg: "#EDE9FE" },
    { label: "Ca làm hôm nay", value: `${shiftToday.length} ca`, sub: "Theo work-schedules", icon: Clock, color: "#1a5276", bg: "#EBF2F7" },
    { label: "Nguyên liệu sắp hết", value: `${lowStockItems.length} mặt hàng`, sub: "Theo tồn kho chi nhánh", icon: AlertTriangle, color: "#F59E0B", bg: "#FEF3C7" },
  ];

  return (
    <div className="p-5 space-y-5">
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1a5276, #0F4761)" }}>
        <div>
          <p className="text-white font-semibold text-base">Dashboard chi nhánh</p>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
            Dữ liệu đơn hàng, nhân viên, lịch làm và tồn kho được lấy từ database
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-400">Đang tải dữ liệu...</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiData.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: k.bg }}><Icon size={20} style={{ color: k.color }} /></div>
              <p className="text-xs text-gray-500 leading-tight">{k.label}</p>
              <p className="font-bold mt-1 text-gray-900" style={{ fontSize: 20 }}>{k.value}</p>
              <p className="text-xs mt-1 leading-tight text-gray-400">{k.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "#111827" }}>Đơn hàng theo giờ</h3>
          </div>
          <ResponsiveContainer key="dashboard-hourly" width="100%" height={190}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" name="Đơn hàng" stroke="#1a5276" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "#111827" }}>Tồn kho theo danh mục</h3>
            <Coffee size={16} className="text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={Object.entries(ingredients.reduce<Record<string, number>>((acc, item) => {
              acc[item.category] = (acc[item.category] || 0) + item.current;
              return acc;
            }, {})).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" hide />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 style={{ color: "#111827" }}>Đơn hàng gần nhất</h3>
            <button onClick={() => onNavigate("bm-orders")} className="flex items-center gap-1 text-xs font-medium" style={{ color: "#1a5276" }}>Xem tất cả <ChevronRight size={13} /></button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map(order => {
              const style = statusStyle[order.status || "pending"] || statusStyle.pending;
              return (
                <div key={order.orderId} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">#{order.orderId}</span>
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: style.bg, color: style.color }}>{style.icon}<span className="ml-0.5">{style.label}</span></span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Khách #{order.customerId || "-"} · {order.note || "Không ghi chú"}</p>
                  </div>
                  <p className="text-xs text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </div>
              );
            })}
            {!loading && recentOrders.length === 0 && <div className="py-10 text-center text-sm text-gray-400">Chưa có đơn hàng</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ color: "#111827", fontSize: "0.9rem" }}>Ca làm hôm nay</h3>
              <button onClick={() => onNavigate("bm-staff")} className="text-xs font-medium" style={{ color: "#1a5276" }}>Quản lý</button>
            </div>
            <div className="space-y-2.5">
              {shiftToday.map(item => (
                <div key={item.scheduleId} className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 leading-tight">{item.shift} · NV #{item.employeeId}</p>
                    <p className="text-xs text-gray-400">{item.startTime} - {item.endTime}</p>
                  </div>
                </div>
              ))}
              {!loading && shiftToday.length === 0 && <p className="py-4 text-center text-xs text-gray-400">Chưa có lịch hôm nay</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-1.5" style={{ color: "#111827", fontSize: "0.9rem" }}><AlertTriangle size={14} style={{ color: "#F59E0B" }} /> Cảnh báo tồn kho</h3>
              <button onClick={() => onNavigate("bm-inventory")} className="text-xs font-medium" style={{ color: "#1a5276" }}>Xem kho</button>
            </div>
            <div className="space-y-2.5">
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.current <= item.minLevel * 0.5 ? "#EF4444" : "#F59E0B" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min((item.current / (item.minLevel || 1)) * 100, 100)}%`, backgroundColor: "#F59E0B" }} /></div>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0 text-amber-600">{item.current} {item.unit}</span>
                </div>
              ))}
              {!loading && lowStockItems.length === 0 && <p className="py-4 text-center text-xs text-gray-400">Không có cảnh báo</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <h3 className="flex items-center gap-2 mb-4" style={{ color: "#111827" }}><Bell size={16} className="text-gray-400" /> Thông báo hôm nay</h3>
        <div className="space-y-2.5">
          {lowStockItems.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-500" />
              <p className="text-xs flex-1 text-gray-700">{item.name} còn {item.current} {item.unit}, dưới mức tối thiểu {item.minLevel} {item.unit}</p>
            </div>
          ))}
          {!loading && lowStockItems.length === 0 && <p className="py-4 text-center text-sm text-gray-400">Không có thông báo tồn kho</p>}
        </div>
      </div>
    </div>
  );
}
