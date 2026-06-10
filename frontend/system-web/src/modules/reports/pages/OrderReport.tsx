import { useEffect, useState } from "react";
import { Download, ShoppingCart, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { api } from "../../../lib/api";
import { orderFallback } from "../reportFallbacks";
import { queryForPeriod, type ReportPeriod } from "../../../shared/utils/reportPeriods";

type OrderReportData = {
  kpis: Array<{ label: string; value: string; change: string; positive?: boolean }>;
  dailyOrders: Array<{ day: string; orders: number; revenue: number }>;
  channelData: Array<{ name: string; value: number; color: string }>;
  statusData: Array<{ name: string; value: number; color: string }>;
  hourlyData: Array<{ hour: string; orders: number }>;
  topItems: Array<{ name: string; orders: number; revenue: string; growth: string }>;
  branchData: Array<{ branch: string; orders: number; aov: number }>;
};

const dailyOrders: Array<{ day: string; orders: number; revenue: number }> = [];

const channelData: Array<{ name: string; value: number; color: string }> = [];

const statusData: Array<{ name: string; value: number; color: string }> = [];

const hourlyData: Array<{ hour: string; orders: number }> = [];

const topItems: Array<{ name: string; orders: number; revenue: string; growth: string }> = [];

const branchData: Array<{ branch: string; orders: number; aov: number }> = [];

const kpis = [
  { label: "Tổng đơn hàng", value: "0", change: "0%", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Đơn hoàn thành", value: "0", change: "0%", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Đơn hủy", value: "0", change: "0%", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  { label: "Giá trị TB / đơn", value: "0đ", change: "0%", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
];

export function OrderReport() {
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [report, setReport] = useState<OrderReportData>({
    kpis: orderFallback.kpis,
    dailyOrders: orderFallback.dailyOrders,
    channelData: orderFallback.channelData,
    statusData: orderFallback.statusData,
    hourlyData: orderFallback.hourlyData,
    topItems: orderFallback.topItems,
    branchData: orderFallback.branchData,
  });

  useEffect(() => {
    let cancelled = false;
    api.get<OrderReportData>(`/admin/reports/orders?${queryForPeriod(period)}`)
      .then(data => {
        if (!cancelled) {
          setReport({
            kpis: data.kpis?.length ? data.kpis : orderFallback.kpis,
            dailyOrders: data.dailyOrders?.length ? data.dailyOrders : orderFallback.dailyOrders,
            channelData: data.channelData?.length ? data.channelData : orderFallback.channelData,
            statusData: data.statusData?.length ? data.statusData : orderFallback.statusData,
            hourlyData: data.hourlyData?.length ? data.hourlyData : orderFallback.hourlyData,
            topItems: data.topItems?.length ? data.topItems : orderFallback.topItems,
            branchData: data.branchData?.length ? data.branchData : orderFallback.branchData,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setReport(orderFallback);
      });
    return () => { cancelled = true; };
  }, [period]);

  const { dailyOrders, channelData, statusData, hourlyData, topItems, branchData } = report;
  const displayKpis = (report.kpis.length ? report.kpis : kpis).map((item, index) => ({
    ...kpis[index],
    ...item,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Báo cáo đơn hàng</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Phân tích chi tiết về đơn hàng theo kênh, trạng thái và thời gian</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
            style={{fontSize: '13px'}}
          >
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày</option>
            <option value="month">30 ngày</option>
            <option value="quarter">Quý</option>
          </select>
          <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: '13px'}}>
            <option>Tất cả chi nhánh</option>
            {branchData.map(b => <option key={b.branch}>{b.branch}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{fontSize: '13px'}}>
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {displayKpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span style={{fontSize: '12.5px', color: '#6B7280'}}>{k.label}</span>
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <Icon size={15} className={k.color} />
                </div>
              </div>
              <p style={{fontSize: '24px', fontWeight: 700, color: '#111827'}}>{k.value}</p>
              <p style={{fontSize: '12px', color: k.change.startsWith('+') ? '#10B981' : '#EF4444', marginTop: '4px'}}>
                {k.change} so với kỳ trước
              </p>
            </div>
          );
        })}
      </div>

      {/* Daily orders + revenue */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Đơn hàng & doanh thu theo ngày</h3>
          <div className="flex items-center gap-4" style={{fontSize: '12px'}}>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#0F4761]" /> <span style={{color: '#6B7280'}}>Đơn hàng</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-[#10B981]" /> <span style={{color: '#6B7280'}}>Doanh thu (triệu)</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={dailyOrders}>
            <defs>
              <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F4761" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0F4761" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="day" style={{fontSize: '11px'}} />
            <YAxis yAxisId="l" style={{fontSize: '11px'}} />
            <YAxis yAxisId="r" orientation="right" style={{fontSize: '11px'}} />
            <Tooltip />
            <Area yAxisId="l" type="monotone" dataKey="orders" stroke="#0F4761" strokeWidth={2.5} fill="url(#orderGrad)" />
            <Line yAxisId="r" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={{r: 4}} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Channel */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Đơn theo kênh đặt hàng</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {channelData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {channelData.map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background: c.color}} />
                  <span style={{fontSize: '12px', color: '#374151'}}>{c.name}</span>
                </div>
                <span style={{fontSize: '12px', fontWeight: 600, color: '#111827'}}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Trạng thái đơn hàng</h3>
          <div className="space-y-3 mt-4">
            {statusData.map(s => {
              const total = statusData.reduce((sum, x) => sum + x.value, 0);
              const pct = (s.value / total) * 100;
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{fontSize: '12.5px', color: '#374151'}}>{s.name}</span>
                    <span style={{fontSize: '12.5px', fontWeight: 600, color: '#111827'}}>{s.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width: `${pct}%`, background: s.color}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>
            <Clock size={13} className="inline mr-1" /> Đơn theo khung giờ
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="hour" style={{fontSize: '10px'}} />
              <YAxis style={{fontSize: '10px'}} />
              <Tooltip />
              <Bar dataKey="orders" fill="#0F4761" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch comparison */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Đơn hàng theo chi nhánh</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={branchData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis type="number" style={{fontSize: '11px'}} />
            <YAxis type="category" dataKey="branch" style={{fontSize: '12px'}} width={80} />
            <Tooltip />
            <Legend wrapperStyle={{fontSize: '12px'}} />
            <Bar dataKey="orders" name="Số đơn" fill="#0F4761" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Top sản phẩm bán chạy</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["#", "Sản phẩm", "Số đơn", "Doanh thu", "Tăng trưởng"].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {topItems.map((it, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${i < 3 ? 'bg-[#0F4761]' : 'bg-gray-300'}`} style={{fontSize: '12px', fontWeight: 700}}>{i + 1}</div>
                </td>
                <td className="px-4 py-3" style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{it.name}</td>
                <td className="px-4 py-3" style={{fontSize: '13px', color: '#374151'}}>{it.orders}</td>
                <td className="px-4 py-3" style={{fontSize: '13px', fontWeight: 700, color: '#0F4761'}}>{it.revenue}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${it.growth.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {it.growth}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
