import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { api } from "../../../lib/api";
import { customerFallback } from "../reportFallbacks";
import { queryForPeriod, type ReportPeriod } from "../../../shared/utils/reportPeriods";

type CustomerReportData = {
  kpis: typeof kpis;
  growthData: Array<{ month: string; customers: number }>;
  tierData: Array<{ name: string; value: number; color: string }>;
  frequencyData: Array<{ group: string; freq: number; value: number; fill: string }>;
  vipCustomers: Array<{ name: string; tier: string; points: number; spend: string; orders: number }>;
  pointStats: Array<{ label: string; value: string; color: string }>;
};

const growthData: Array<{ month: string; customers: number }> = [];

const tierData: Array<{ name: string; value: number; color: string }> = [];

const frequencyData: Array<{ group: string; freq: number; value: number; fill: string }> = [];

const vipCustomers: Array<{ name: string; tier: string; points: number; spend: string; orders: number }> = [];

const kpis = [
  { label: "Tổng khách hàng", value: "0", change: "0%" },
  { label: "Khách mới trong kỳ", value: "0", change: "0%" },
  { label: "Khách quay lại", value: "0", change: "0%" },
  { label: "Tỷ lệ giữ chân", value: "0%", change: "0%" },
];

export function CustomerReport() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [report, setReport] = useState<CustomerReportData>({
    kpis: customerFallback.kpis,
    growthData: customerFallback.growthData,
    tierData: customerFallback.tierData,
    frequencyData: customerFallback.frequencyData,
    vipCustomers: customerFallback.vipCustomers,
    pointStats: customerFallback.pointStats,
  });

  useEffect(() => {
    let cancelled = false;
    api.get<CustomerReportData>(`/admin/reports/customers?${queryForPeriod(period)}`)
      .then(data => {
        if (!cancelled) {
          setReport({
            kpis: data.kpis?.length ? data.kpis : customerFallback.kpis,
            growthData: data.growthData?.length ? data.growthData : customerFallback.growthData,
            tierData: data.tierData?.length ? data.tierData : customerFallback.tierData,
            frequencyData: data.frequencyData?.length ? data.frequencyData : customerFallback.frequencyData,
            vipCustomers: data.vipCustomers?.length ? data.vipCustomers : customerFallback.vipCustomers,
            pointStats: data.pointStats?.length ? data.pointStats : customerFallback.pointStats,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setReport(customerFallback);
      });
    return () => { cancelled = true; };
  }, [period]);

  const { growthData, tierData, frequencyData, vipCustomers } = report;
  const displayKpis = report.kpis;
  const pointStats = report.pointStats.length ? report.pointStats : customerFallback.pointStats;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Báo cáo khách hàng & Thành viên</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Phân tích tăng trưởng và hành vi khách hàng</p>
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
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{fontSize: '13px'}}>
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {displayKpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p style={{fontSize: '12.5px', color: '#6B7280'}}>{k.label}</p>
            <p style={{fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px'}}>{k.value}</p>
            <p style={{fontSize: '12px', color: '#10B981', marginTop: '4px'}}>{k.change} so với kỳ trước</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Growth chart */}
        <div className="col-span-3 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Tăng trưởng khách hàng theo tháng</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" style={{fontSize: '11px'}} />
              <YAxis style={{fontSize: '11px'}} />
              <Tooltip />
              <Line type="monotone" dataKey="customers" stroke="#0F4761" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tier pie */}
        <div className="col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Phân bổ hạng thành viên</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={tierData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                {tierData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {tierData.map(t => (
              <div key={t.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background: t.color}} />
                  <span style={{fontSize: '12px', color: '#374151'}}>{t.name}</span>
                </div>
                <span style={{fontSize: '12px', fontWeight: 600, color: '#111827'}}>{t.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Frequency bar chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Tần suất mua hàng theo nhóm khách (lần/tháng)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={frequencyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="group" style={{fontSize: '12px'}} />
            <YAxis style={{fontSize: '11px'}} />
            <Tooltip />
            <Bar dataKey="freq" name="Tần suất (lần/tháng)" radius={[6, 6, 0, 0]}>
              {frequencyData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* VIP table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Top khách hàng VIP</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Khách hàng", "Hạng", "Điểm tích lũy", "Tổng chi tiêu", "Số đơn"].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vipCustomers.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F4761] text-white flex items-center justify-center" style={{fontSize: '12px', fontWeight: 700}}>{c.name.charAt(0)}</div>
                    <span style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.tier === "Kim cương" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {c.tier === "Kim cương" ? "💎" : "🥇"} {c.tier}
                  </span>
                </td>
                <td className="px-4 py-3" style={{fontSize: '13px', fontWeight: 600, color: '#F59E0B'}}>{c.points.toLocaleString()}</td>
                <td className="px-4 py-3" style={{fontSize: '13px', fontWeight: 700, color: '#0F4761'}}>{c.spend}</td>
                <td className="px-4 py-3" style={{fontSize: '13px', color: '#374151'}}>{c.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Points stats */}
      <div className="grid grid-cols-3 gap-4">
        {pointStats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <div style={{fontSize: '12px', color: '#9CA3AF', marginBottom: '8px'}}>{s.label}</div>
            <div style={{fontSize: '20px', fontWeight: 700}} className={s.color}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
