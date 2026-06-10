import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Coffee, Download, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { EmployeeLookupDto, PageResponse } from "../../../lib/types";
import { loadInventoryData, pageItems } from "../../inventory-data";
import { formatDateParam, isDateInRange, parseReportDate, rangeForPeriod, rollingReportPeriods } from "../../../shared/utils/reportPeriods";

type Period = "today" | "week" | "month";

interface OrderDto {
  orderId: number;
  branchId?: number | null;
  customerId?: number | null;
  employeeId?: number | null;
  orderType?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export function BMReportsPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [period, setPeriod] = useState<Period>("week");
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeLookupDto[]>([]);
  const [lowStock, setLowStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const branchQuery = branchId ? `&branchId=${branchId}` : "";
        const [orderData, employeeData, inventoryData] = await Promise.all([
          api.get<PageResponse<OrderDto> | OrderDto[]>(`/orders?size=500${branchQuery}`).catch(() => []),
          api.get<EmployeeLookupDto[]>(`/lookups/employees?scope=employee${branchQuery}`).catch(() => []),
          loadInventoryData(branchId),
        ]);
        setOrders(pageItems(orderData).filter(order => !branchId || order.branchId === branchId));
        setEmployees(employeeData.filter(employee => !branchId || employee.branchId === branchId));
        setLowStock(inventoryData.ingredients.filter(item => item.minLevel > 0 && item.current <= item.minLevel).length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được báo cáo chi nhánh.");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [branchId]);

  const selectedRange = useMemo(() => rangeForPeriod(period), [period]);
  const periodOrders = useMemo(
    () => orders.filter(order => isDateInRange(order.createdAt, selectedRange)),
    [orders, selectedRange]
  );

  const chartData = useMemo(() => {
    const byDay = new Map<string, { day: string; orders: number }>();
    periodOrders.forEach(order => {
      const date = parseReportDate(order.createdAt);
      const key = date ? formatDateParam(date) : "unknown";
      const label = date ? date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "Khác";
      const row = byDay.get(key) || { day: label, orders: 0 };
      row.orders += 1;
      byDay.set(key, row);
    });
    return Array.from(byDay.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value);
  }, [periodOrders]);

  const channelData = useMemo(() => {
    const counter = periodOrders.filter(order => (order.orderType || "").toLowerCase() !== "online").length;
    const online = periodOrders.length - counter;
    return [
      { name: "Tại quầy", value: counter, color: "#1a5276" },
      { name: "Online", value: online, color: "#8B5CF6" },
    ];
  }, [periodOrders]);

  const staffPerf = useMemo(() => employees.map(employee => ({
    name: employee.name || `NV-${employee.id}`,
    orders: periodOrders.filter(order => order.employeeId === employee.id).length,
    role: employee.roleName || "Nhân viên",
  })).sort((a, b) => b.orders - a.orders).slice(0, 5), [employees, periodOrders]);

  const kpis = [
    { label: "Tổng đơn hàng", value: `${periodOrders.length} đơn`, icon: ShoppingCart },
    { label: "Đơn hoàn thành", value: `${periodOrders.filter(order => order.status === "completed").length} đơn`, icon: TrendingUp },
    { label: "Nhân viên", value: `${employees.length} NV`, icon: Users },
    { label: "Tồn kho cần chú ý", value: `${lowStock} mặt hàng`, icon: Coffee },
  ];

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ color: "#111827" }}>Báo cáo chi nhánh</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tổng hợp từ order-service, user-service và inventory-service</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            {rollingReportPeriods.map(item => (
              <button key={item.id} onClick={() => setPeriod(item.id as Period)} className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: period === item.id ? "#1a5276" : "transparent", color: period === item.id ? "#fff" : "#6B7280" }}>
                {item.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-600"><Download size={14} /> Xuất báo cáo</button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-400">Đang tải dữ liệu...</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{kpi.label}</p>
                <Icon size={16} className="text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold mt-2 px-2 py-0.5 rounded-full bg-green-100 text-green-800"><ArrowUpRight size={11} /> DB</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "#111827" }}>Đơn hàng theo ngày</h3>
            <TrendingUp size={16} className="text-gray-400" />
          </div>
          <ResponsiveContainer key={`branch-report-${period}`} width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" name="Đơn hàng" stroke="#1a5276" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 className="mb-4" style={{ color: "#111827" }}>Kênh bán hàng</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" strokeWidth={2}>
                {channelData.map(entry => <Cell key={entry.name} fill={entry.color} stroke="#fff" />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} đơn`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {channelData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm text-gray-600">{item.name}</span></div>
                <span className="text-sm font-semibold text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 className="mb-4" style={{ color: "#111827" }}>Nhân viên xử lý đơn</h3>
          <div className="space-y-3">
            {staffPerf.map((staff, i) => (
              <div key={staff.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: i === 0 ? "#F59E0B" : "#1a5276" }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{staff.name}</p>
                  <p className="text-xs text-gray-500">{staff.role}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: "#1a5276" }}>{staff.orders} đơn</span>
              </div>
            ))}
            {!loading && staffPerf.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu nhân viên</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 className="mb-4" style={{ color: "#111827" }}>Trạng thái đơn hàng</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={Object.entries(periodOrders.reduce<Record<string, number>>((acc, order) => {
              const key = order.status || "pending";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {})).map(([status, count]) => ({ status, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a5276" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
