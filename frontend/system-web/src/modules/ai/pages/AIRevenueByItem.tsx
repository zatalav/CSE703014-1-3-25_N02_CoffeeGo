import { useEffect, useState } from "react";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../../../lib/api";
import { queryForPeriod, reportPeriodLabels, type ReportPeriod } from "../../../shared/utils/reportPeriods";
import { AiDataBanner } from "../components/AiDataBanner";

type RevenueByItemData = {
  products: Array<{ rank: number; name: string; qty: number; revenue: number; cost: number; profit: number; margin: number }>;
  catData: Array<{ name: string; value: number; color: string }>;
  branchData: Array<Record<string, string | number>>;
  branchKeys: string[];
  channelData: Array<{ name: string; value: number }>;
};

const barColors = ["#0F4761", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#EF4444"];

const emptyRevenueByItem: RevenueByItemData = {
  products: [],
  catData: [],
  branchData: [],
  branchKeys: [],
  channelData: [],
};

export function AIRevenueByItem() {
  const [activeTab, setActiveTab] = useState<"revenue" | "profit">("revenue");
  const [sortField, setSortField] = useState("revenue");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [payload, setPayload] = useState<RevenueByItemData>(emptyRevenueByItem);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get<RevenueByItemData>(`/admin/ai/product-revenue-analysis?${queryForPeriod(period)}`)
      .then(data => {
        if (!cancelled) {
          setPayload({
            products: data.products || [],
            catData: data.catData || [],
            branchData: data.branchData || [],
            branchKeys: data.branchKeys || [],
            channelData: data.channelData || [],
          });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khong tai duoc du lieu AI.");
          setPayload(emptyRevenueByItem);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period]);

  const { products, catData, branchData, branchKeys } = payload;

  const sorted = [...products].sort((a, b) => {
    if (sortField === "revenue") return b.revenue - a.revenue;
    if (sortField === "profit") return b.profit - a.profit;
    if (sortField === "margin") return b.margin - a.margin;
    return b.qty - a.qty;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>AI Phân tích doanh thu theo món</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full" style={{fontSize: '12px', fontWeight: 600}}>AI Powered</span>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as ReportPeriod)}
            className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
            style={{fontSize: '13px'}}
          >
            {(["today", "week", "month", "quarter"] as ReportPeriod[]).map(item => (
              <option key={item} value={item}>{reportPeriodLabels[item]}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{fontSize: '13px'}}>
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      <AiDataBanner loading={loading} error={error} />

      {/* Product ranking table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
            <button onClick={() => setActiveTab("revenue")} className={`px-3 py-1.5 rounded-md ${activeTab === "revenue" ? "bg-[#0F4761] text-white" : "text-gray-500"}`} style={{fontSize: '12.5px'}}>Theo doanh thu</button>
            <button onClick={() => setActiveTab("profit")} className={`px-3 py-1.5 rounded-md ${activeTab === "profit" ? "bg-[#0F4761] text-white" : "text-gray-500"}`} style={{fontSize: '12.5px'}}>Theo lợi nhuận</button>
          </div>
          <div className="ml-auto flex items-center gap-2" style={{fontSize: '12.5px', color: '#6B7280'}}>
            Sắp xếp theo:
            <select value={sortField} onChange={e => setSortField(e.target.value)} className="px-2 py-1 border border-gray-200 rounded-lg outline-none" style={{fontSize: '12px'}}>
              <option value="revenue">Doanh thu</option>
              <option value="profit">Lợi nhuận</option>
              <option value="margin">Tỷ suất</option>
              <option value="qty">Số lượng</option>
            </select>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500, width: '48px'}}>Hạng</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Sản phẩm</th>
              <th className="px-4 py-3 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>SL bán</th>
              <th className="px-4 py-3 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Doanh thu</th>
              <th className="px-4 py-3 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Giá vốn</th>
              <th className="px-4 py-3 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Lợi nhuận</th>
              <th className="px-4 py-3 text-right" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Tỷ suất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((p, i) => (
              <tr key={p.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"}`}>
                    {i + 1}
                  </div>
                </td>
                <td className="px-4 py-3" style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{p.name}</td>
                <td className="px-4 py-3 text-right" style={{fontSize: '13px', color: '#374151'}}>{p.qty.toLocaleString()}</td>
                <td className="px-4 py-3 text-right" style={{fontSize: '13px', fontWeight: 700, color: '#0F4761'}}>{(p.revenue/1000000).toFixed(1)}M</td>
                <td className="px-4 py-3 text-right" style={{fontSize: '13px', color: '#EF4444'}}>{(p.cost/1000000).toFixed(1)}M</td>
                <td className="px-4 py-3 text-right" style={{fontSize: '13px', fontWeight: 700, color: '#10B981'}}>{(p.profit/1000000).toFixed(1)}M</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full" style={{fontSize: '12px', fontWeight: 600}}>{p.margin}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Pie chart */}
        <div className="col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Tỷ trọng theo danh mục</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {catData.map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background: c.color}} />
                  <span style={{fontSize: '12px', color: '#374151'}}>{c.name}</span>
                </div>
                <span style={{fontSize: '12px', fontWeight: 600}}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch comparison */}
        <div className="col-span-3 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Doanh thu theo chi nhánh</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={branchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="product" style={{fontSize: '11px'}} />
              <YAxis style={{fontSize: '11px'}} />
              <Tooltip />
              <Legend style={{fontSize: '11px'}} />
              {branchKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={barColors[index % barColors.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
