import { type ReactNode, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ShoppingBag, Users, AlertTriangle, DollarSign } from "lucide-react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { api } from "../../../lib/api";
import { periodTitle, rollingReportPeriods, type ReportPeriod } from "../../../shared/utils/reportPeriods";

type DashboardKpi = { title: string; value: string; change: string; positive: boolean };
type DashboardData = {
  kpis: DashboardKpi[];
  revenueData: Array<{ day: string; revenue: number; orders: number }>;
  branchData: Array<{ name: string; value: number; color: string }>;
  topProducts: Array<{ name: string; qty: number; revenue: string }>;
  recentOrders: Array<{ id: string; customer: string; amount: string; status: string; branch: string }>;
  warnings: Array<{ type: string; msg: string; time: string }>;
  recentActivity: Array<{ icon: string; action: string; user: string; time: string }>;
};

const fallbackDashboard: DashboardData = {
  kpis: [
    { title: "Doanh thu hôm nay", value: "18.6M đ", change: "+12%", positive: true },
    { title: "Tổng đơn hàng", value: "148", change: "+9%", positive: true },
    { title: "Khách hàng mới/tuần", value: "36", change: "+7%", positive: true },
    { title: "Nguyên liệu sắp hết", value: "5", change: "+2", positive: false },
  ],
  revenueData: [
    { day: "26/5", revenue: 12200000, orders: 96 },
    { day: "27/5", revenue: 14100000, orders: 112 },
    { day: "28/5", revenue: 13600000, orders: 105 },
    { day: "29/5", revenue: 15800000, orders: 126 },
    { day: "30/5", revenue: 17600000, orders: 139 },
    { day: "31/5", revenue: 20100000, orders: 162 },
    { day: "1/6", revenue: 18600000, orders: 148 },
  ],
  branchData: [
    { name: "Quận 1", value: 34, color: "#0F4761" },
    { name: "Quận 3", value: 22, color: "#10B981" },
    { name: "Bình Thạnh", value: 18, color: "#F59E0B" },
    { name: "Thủ Đức", value: 15, color: "#6366F1" },
    { name: "Tân Bình", value: 11, color: "#EC4899" },
  ],
  topProducts: [
    { name: "Cold Brew Cam Sả", qty: 42, revenue: "2.3M đ" },
    { name: "Latte Đá", qty: 38, revenue: "1.9M đ" },
    { name: "Trà Đào Cam Sả", qty: 35, revenue: "1.7M đ" },
    { name: "Bạc Xỉu", qty: 31, revenue: "1.4M đ" },
    { name: "Matcha Latte", qty: 27, revenue: "1.3M đ" },
  ],
  recentOrders: [
    { id: "#10241", customer: "Minh Anh", amount: "186K đ", status: "Hoàn thành", branch: "Quận 1" },
    { id: "#10240", customer: "Khách vãng lai", amount: "92K đ", status: "Đang pha chế", branch: "Quận 3" },
    { id: "#10239", customer: "Hoàng Nam", amount: "214K đ", status: "Chờ xác nhận", branch: "Bình Thạnh" },
    { id: "#10238", customer: "Thu Hà", amount: "68K đ", status: "Hoàn thành", branch: "Thủ Đức" },
  ],
  warnings: [
    { type: "danger", msg: "Sữa tươi tại kho trung tâm dưới mức tối thiểu", time: "10 phút trước" },
    { type: "warning", msg: "Đơn hủy tăng nhẹ tại chi nhánh Quận 3", time: "35 phút trước" },
    { type: "warning", msg: "Cần nhập thêm ly giấy size M trong 2 ngày tới", time: "1 giờ trước" },
  ],
  recentActivity: [
    { icon: "✓", action: "Cập nhật trạng thái đơn #10241", user: "Thu ngân Q1", time: "5 phút trước" },
    { icon: "+", action: "Nhập kho 120 lít sữa tươi", user: "Quản lý kho", time: "24 phút trước" },
    { icon: "↗", action: "Tạo voucher thành viên bạc", user: "Admin", time: "1 giờ trước" },
  ],
};

const statusColors: Record<string, string> = {
  "Hoàn thành": "bg-green-100 text-green-700",
  "Đang pha chế": "bg-blue-100 text-blue-700",
  "Chờ xác nhận": "bg-yellow-100 text-yellow-700",
  "Đã xác nhận": "bg-indigo-100 text-indigo-700",
  "Sẵn sàng": "bg-emerald-100 text-emerald-700",
  "Đang giao": "bg-orange-100 text-orange-700",
  "Đã hủy": "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  "Cho xac nhan": "Chờ xác nhận",
  "Da xac nhan": "Đã xác nhận",
  "Dang pha che": "Đang pha chế",
  "San sang": "Sẵn sàng",
  "Dang giao": "Đang giao",
  "Hoan thanh": "Hoàn thành",
  "Da huy": "Đã hủy",
};

function arrayOrFallback<T>(value: T[] | undefined, fallback: T[], requireItems = false) {
  return Array.isArray(value) && (!requireItems || value.length > 0) ? value : fallback;
}

function normalizeCurrency(value: string) {
  return value.replace(/\s+d(?=\s|$)/gi, " đ");
}

function normalizeDisplayText(value: string) {
  return Object.entries(statusLabels).reduce(
    (text, [raw, normalized]) => text.split(raw).join(normalized),
    normalizeCurrency(value),
  );
}

const kpiDecor = [
  { icon: <DollarSign size={20} className="text-blue-600" />, color: "bg-blue-50" },
  { icon: <ShoppingBag size={20} className="text-green-600" />, color: "bg-green-50" },
  { icon: <Users size={20} className="text-orange-600" />, color: "bg-orange-50" },
  { icon: <AlertTriangle size={20} className="text-red-500" />, color: "bg-red-50" },
];

function mergeDashboard(data?: Partial<DashboardData>): DashboardData {
  const kpis = arrayOrFallback(data?.kpis, fallbackDashboard.kpis, true).map(kpi => ({
    ...kpi,
    title: normalizeDisplayText(kpi.title),
    value: normalizeDisplayText(kpi.value),
  }));
  const recentOrders = arrayOrFallback(data?.recentOrders, fallbackDashboard.recentOrders).map(order => ({
    ...order,
    customer: normalizeDisplayText(order.customer),
    amount: normalizeDisplayText(order.amount),
    status: normalizeDisplayText(order.status),
    branch: normalizeDisplayText(order.branch),
  }));
  const topProducts = arrayOrFallback(data?.topProducts, fallbackDashboard.topProducts).map(product => ({
    ...product,
    name: normalizeDisplayText(product.name),
    revenue: normalizeDisplayText(product.revenue),
  }));
  const warnings = arrayOrFallback(data?.warnings, fallbackDashboard.warnings).map(warning => ({
    ...warning,
    msg: normalizeDisplayText(warning.msg),
    time: normalizeDisplayText(warning.time),
  }));
  const recentActivity = arrayOrFallback(data?.recentActivity, fallbackDashboard.recentActivity).map(activity => ({
    ...activity,
    action: normalizeDisplayText(activity.action),
    user: normalizeDisplayText(activity.user),
    time: normalizeDisplayText(activity.time),
  }));

  return {
    kpis,
    revenueData: arrayOrFallback(data?.revenueData, fallbackDashboard.revenueData, true),
    branchData: arrayOrFallback(data?.branchData, fallbackDashboard.branchData),
    topProducts,
    recentOrders,
    warnings,
    recentActivity,
  };
}

function EmptyState({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex min-h-[112px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center ${className}`}
      style={{ fontSize: "12.5px", color: "#6B7280" }}
    >
      {children}
    </div>
  );
}

function KPICard({ title, value, change, positive, icon, color }: {
  title: string; value: string; change: string; positive: boolean; icon: ReactNode; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p style={{fontSize: '13px', color: '#6B7280'}}>{title}</p>
          <p style={{fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px'}}>{value}</p>
          <div className={`flex items-center gap-1 mt-1.5 ${positive ? "text-green-600" : "text-red-500"}`} style={{fontSize: '12px'}}>
            {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            <span>{change} so với kỳ trước</span>
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(fallbackDashboard);
  const [revenuePeriod, setRevenuePeriod] = useState<ReportPeriod>("week");

  useEffect(() => {
    let cancelled = false;
    const days = revenuePeriod === "today" ? 1 : revenuePeriod === "month" ? 30 : 7;
    api.get<DashboardData>(`/admin/reports/dashboard?days=${days}`)
      .then(data => {
        if (!cancelled) setDashboard(mergeDashboard(data));
      })
      .catch(() => {
        if (!cancelled) setDashboard(fallbackDashboard);
      });
    return () => { cancelled = true; };
  }, [revenuePeriod]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.kpis.map((kpi, index) => {
          const decor = kpiDecor[index] || kpiDecor[0];
          return <KPICard key={kpi.title} {...kpi} icon={decor.icon} color={decor.color} />;
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827'}}>Doanh thu {periodTitle(revenuePeriod)}</h3>
            <div className="flex gap-1.5">
              {rollingReportPeriods.map(period => (
                <button
                  key={period.id}
                  onClick={() => setRevenuePeriod(period.id)}
                  className={`px-3 py-1 rounded-lg text-xs ${period.id === revenuePeriod ? "bg-[#0F4761] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  type="button"
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dashboard.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" style={{fontSize: '12px'}} />
              <YAxis style={{fontSize: '12px'}} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(v: any, name: string) => name === "orders" ? `${v} đơn` : `${(v / 1000000).toFixed(1)}M đ`} />
              <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#0F4761" strokeWidth={2.5} dot={{ fill: "#0F4761", r: 4 }} />
              <Line type="monotone" dataKey="orders" name="Đơn hàng" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 xl:col-span-2">
          <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Doanh thu theo chi nhánh</h3>
          {dashboard.branchData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={dashboard.branchData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {dashboard.branchData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {dashboard.branchData.map(b => (
                  <div key={b.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{background: b.color}} />
                      <span style={{fontSize: '12px', color: '#374151'}}>{b.name}</span>
                    </div>
                    <span style={{fontSize: '12px', fontWeight: 600, color: '#111827'}}>{b.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState className="min-h-[182px]">Chưa có doanh thu theo chi nhánh trong kỳ này.</EmptyState>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Top 5 bán chạy {periodTitle(revenuePeriod)}</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Sản phẩm</th>
                <th className="text-right pb-2" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>SL</th>
                <th className="text-right pb-2" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>DT</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.topProducts.length > 0 ? (
                dashboard.topProducts.map((p, i) => (
                  <tr key={p.name} className="border-b border-gray-50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#0F4761]/10 text-[#0F4761] flex items-center justify-center" style={{fontSize: '11px', fontWeight: 700}}>{i + 1}</span>
                        <span style={{fontSize: '12.5px', color: '#374151'}}>{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right" style={{fontSize: '12.5px', color: '#374151'}}>{p.qty}</td>
                    <td className="py-2 text-right" style={{fontSize: '11.5px', color: '#6B7280'}}>{p.revenue}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="pt-4">
                    <EmptyState className="min-h-[128px]">Chưa có sản phẩm bán chạy trong kỳ này.</EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Đơn hàng mới nhất</h3>
          <div className="space-y-2.5">
            {dashboard.recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <div style={{fontSize: '13px', fontWeight: 600, color: '#1F2937'}}>{order.id}</div>
                  <div style={{fontSize: '12px', color: '#6B7280'}}>{order.customer} · {order.branch}</div>
                </div>
                <div className="text-right">
                  <div style={{fontSize: '13px', fontWeight: 600, color: '#0F4761'}}>{order.amount}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Cảnh báo hệ thống</h3>
          <div className="space-y-3">
            {dashboard.warnings.map((warning, index) => (
              <div key={`${warning.msg}-${index}`} className={`flex items-start gap-3 p-3 rounded-lg ${warning.type === "danger" ? "bg-red-50" : "bg-yellow-50"}`}>
                <AlertTriangle size={15} className={warning.type === "danger" ? "text-red-500 mt-0.5 shrink-0" : "text-yellow-500 mt-0.5 shrink-0"} />
                <div>
                  <p style={{fontSize: '12.5px', color: '#374151'}}>{warning.msg}</p>
                  <p style={{fontSize: '11px', color: '#9CA3AF', marginTop: '2px'}}>{warning.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 style={{fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Hoạt động gần đây</h3>
        <div className="divide-y divide-gray-50">
          {dashboard.recentActivity.map((activity, index) => (
            <div key={`${activity.action}-${index}`} className="flex items-center gap-4 py-3">
              <span style={{fontSize: '20px'}}>{activity.icon}</span>
              <div className="flex-1">
                <span style={{fontSize: '13.5px', color: '#1F2937'}}>{activity.action}</span>
                <span style={{fontSize: '12px', color: '#9CA3AF'}}> · bởi {activity.user}</span>
              </div>
              <span style={{fontSize: '12px', color: '#9CA3AF'}}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
