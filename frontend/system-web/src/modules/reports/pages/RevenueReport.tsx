import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { api } from "../../../lib/api";
import type { LookupOptionDto } from "../../../lib/types";
import { queryForPeriod, reportPeriodLabels, type ReportPeriod } from "../../../shared/utils/reportPeriods";

type RevenueReportData = {
  kpis: typeof kpis;
  dailyRevenue: Array<{ date: string; revenue: number; prev: number }>;
  branchRevenue: Array<{ branch: string; revenue: number }>;
  channelData: Array<{ name: string; value: number; color: string }>;
  hourRevenue: Array<{ hour: string; revenue: number }>;
  topProducts: Array<{ name: string; revenue: number; qty: number }>;
};

const dailyRevenue: Array<{ date: string; revenue: number; prev: number }> = [];

const branchRevenue: Array<{ branch: string; revenue: number }> = [];

const channelData: Array<{ name: string; value: number; color: string }> = [];

const hourRevenue: Array<{ hour: string; revenue: number }> = [];

const topProducts: Array<{ name: string; revenue: number; qty: number }> = [];

const kpis = [
  { label: "Tổng doanh thu", value: "0 đ", change: "0%", positive: true },
  { label: "DT trung bình/ngày", value: "0 đ", change: "0%", positive: true },
  { label: "Số đơn hàng", value: "0", change: "0%", positive: true },
  { label: "Giá trị đơn TB", value: "0 đ", change: "0%", positive: true },
];

const emptyRevenueReport: RevenueReportData = {
  kpis,
  dailyRevenue,
  branchRevenue,
  channelData,
  hourRevenue,
  topProducts,
};

export function RevenueReport() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [branchFilter, setBranchFilter] = useState("all");
  const [branchOptions, setBranchOptions] = useState<LookupOptionDto[]>([]);
  const [report, setReport] = useState<RevenueReportData>(emptyRevenueReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get<LookupOptionDto[]>("/lookups/branches")
      .then(data => {
        if (!cancelled) setBranchOptions(data || []);
      })
      .catch(() => {
        if (!cancelled) setBranchOptions([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const branchQuery = branchFilter === "all" ? "" : `&branchId=${branchFilter}`;
    setLoading(true);
    setError("");
    api.get<RevenueReportData>(`/admin/reports/revenue?${queryForPeriod(period)}${branchQuery}`)
      .then(data => {
        if (!cancelled) {
          setReport({
            kpis: data.kpis?.length ? data.kpis : kpis,
            dailyRevenue: data.dailyRevenue || [],
            branchRevenue: data.branchRevenue || [],
            channelData: data.channelData || [],
            hourRevenue: data.hourRevenue || [],
            topProducts: data.topProducts || [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setReport(emptyRevenueReport);
          setError(err instanceof Error ? err.message : "Khong tai duoc bao cao doanh thu tu CSDL.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [branchFilter, period]);

  const displayKpis = report.kpis;
  const { dailyRevenue, branchRevenue, channelData, hourRevenue, topProducts } = report;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Báo cáo doanh thu</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Tổng quan doanh thu theo kỳ</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {(["today", "week", "month", "quarter"] as ReportPeriod[]).map(item => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`px-3 py-2 rounded-lg text-xs ${period === item ? "bg-[#0F4761] text-white" : "border border-gray-200 text-gray-500"}`}
                type="button"
              >
                {reportPeriodLabels[item]}
              </button>
            ))}
          </div>
          <select value={branchFilter} onChange={event => setBranchFilter(event.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: '13px'}}>
            <option value="all">Tất cả chi nhánh</option>
            {branchOptions.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{fontSize: '13px'}}>
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500">Đang tải báo cáo doanh thu từ CSDL...</div>}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {displayKpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p style={{fontSize: '12.5px', color: '#6B7280'}}>{k.label}</p>
            <p style={{fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px'}}>{k.value}</p>
            <div className={`flex items-center gap-1 mt-1.5 ${k.positive ? "text-green-600" : "text-red-500"}`} style={{fontSize: '12px'}}>
              {k.positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {k.change} so với kỳ trước
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Doanh thu theo ngày — So sánh kỳ trước</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dailyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" style={{fontSize: '11px'}} />
            <YAxis style={{fontSize: '11px'}} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
            <Tooltip formatter={(v: any) => `${(v/1000000).toFixed(1)}M đ`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Kỳ này" stroke="#0F4761" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="prev" name="Kỳ trước" stroke="#D1D5DB" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Branch bar chart */}
        <div className="col-span-3 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Doanh thu theo chi nhánh</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={branchRevenue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" style={{fontSize: '11px'}} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
              <YAxis type="category" dataKey="branch" style={{fontSize: '11px'}} width={80} />
              <Tooltip formatter={(v: any) => `${(v/1000000).toFixed(0)}M đ`} />
              <Bar dataKey="revenue" fill="#0F4761" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel pie */}
        <div className="col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Kênh bán hàng</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                {channelData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-2">
            {channelData.map(c => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{background: c.color}} />
                <span style={{fontSize: '12px', color: '#374151'}}>{c.name}: <strong>{c.value}%</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hour chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Doanh thu theo khung giờ</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="hour" style={{fontSize: '11px'}} />
            <YAxis style={{fontSize: '11px'}} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
            <Tooltip formatter={(v: any) => `${(v/1000000).toFixed(1)}M đ`} />
            <Bar dataKey="revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Top sản phẩm doanh thu cao nhất</h3>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Hạng</th>
              <th className="px-3 py-2 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Sản phẩm</th>
              <th className="px-3 py-2 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Doanh thu</th>
              <th className="px-3 py-2 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Số lượng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {topProducts.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"}`}>
                    {i + 1}
                  </div>
                </td>
                <td className="px-3 py-2.5" style={{fontSize: '13.5px', color: '#1F2937', fontWeight: 500}}>{p.name}</td>
                <td className="px-3 py-2.5 text-right" style={{fontSize: '13px', fontWeight: 700, color: '#0F4761'}}>{(p.revenue / 1000000).toFixed(0)}M đ</td>
                <td className="px-3 py-2.5 text-right" style={{fontSize: '13px', color: '#6B7280'}}>{p.qty.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
