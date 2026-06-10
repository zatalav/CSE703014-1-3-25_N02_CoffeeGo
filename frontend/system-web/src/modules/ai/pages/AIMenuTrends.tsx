import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { api } from "../../../lib/api";
import { AiDataBanner } from "../components/AiDataBanner";

type MenuTrendsData = {
  trendData: Array<Record<string, string | number>>;
  trendKeys: string[];
  rising: Array<{ name: string; change: string }>;
  falling: Array<{ name: string; change: string }>;
  heatmapData: Array<{ day: number; hour: number; value: number }>;
  branchData: Array<Record<string, string | number>>;
  branchKeys: string[];
};

const hours = ["6-8h","8-10h","10-12h","12-14h","14-16h","16-18h","18-20h","20-22h"];
const weekdays = ["T2","T3","T4","T5","T6","T7","CN"];
const chartColors = ["#0F4761", "#10B981", "#F59E0B", "#6366F1", "#EC4899", "#EF4444"];

const emptyMenuTrends: MenuTrendsData = {
  trendData: [],
  trendKeys: [],
  rising: [],
  falling: [],
  heatmapData: [],
  branchData: [],
  branchKeys: [],
};

export function AIMenuTrends() {
  const [payload, setPayload] = useState<MenuTrendsData>(emptyMenuTrends);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get<MenuTrendsData>("/admin/ai/menu-trends")
      .then(data => {
        if (!cancelled) {
          setPayload({
            trendData: data.trendData || [],
            trendKeys: data.trendKeys || [],
            rising: data.rising || [],
            falling: data.falling || [],
            heatmapData: data.heatmapData || [],
            branchData: data.branchData || [],
            branchKeys: data.branchKeys || [],
          });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khong tai duoc du lieu AI.");
          setPayload(emptyMenuTrends);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const { trendData, trendKeys, rising, falling, heatmapData, branchData, branchKeys } = payload;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>AI Xu hướng Menu</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full" style={{fontSize: '12px', fontWeight: 600}}>AI Powered</span>
          </div>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Phân tích xu hướng đặt hàng theo sản phẩm</p>
        </div>
        <div className="flex gap-2">
          <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: '13px'}} />
          <span style={{fontSize: '13px', color: '#9CA3AF', alignSelf: 'center'}}>–</span>
          <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: '13px'}} />
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{fontSize: '13px'}}>
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      <AiDataBanner loading={loading} error={error} />

      {/* Trend chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Xu hướng đặt hàng theo thời gian</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" style={{fontSize: '11px'}} />
            <YAxis style={{fontSize: '11px'}} />
            <Tooltip />
            <Legend />
            {trendKeys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} stroke={chartColors[index % chartColors.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Rising / Falling */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-green-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-600" />
            <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Đang tăng mạnh</h3>
          </div>
          <div className="space-y-3">
            {rising.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <span style={{fontSize: '13.5px', color: '#374151'}}>{r.name}</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-green-600" />
                  <span style={{fontSize: '13px', fontWeight: 700, color: '#10B981'}}>{r.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-red-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-red-500" />
            <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Đang giảm mạnh</h3>
          </div>
          <div className="space-y-3">
            {falling.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <span style={{fontSize: '13.5px', color: '#374151'}}>{r.name}</span>
                <div className="flex items-center gap-1.5">
                  <TrendingDown size={13} className="text-red-500" />
                  <span style={{fontSize: '13px', fontWeight: 700, color: '#EF4444'}}>{r.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Heatmap xu hướng theo khung giờ × ngày</h3>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-16" />
                {weekdays.map(d => (
                  <th key={d} className="px-1 pb-2 text-center" style={{fontSize: '11.5px', color: '#6B7280', fontWeight: 500, minWidth: '56px'}}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h, hourIdx) => (
                <tr key={h}>
                  <td className="pr-2 text-right" style={{fontSize: '10.5px', color: '#9CA3AF', paddingBottom: '4px'}}>{h}</td>
                  {weekdays.map((_, dayIdx) => {
                    const v = heatmapData.find(d => d.day === dayIdx && d.hour === hourIdx)?.value || 0;
                    const opacity = 0.1 + (v / 100) * 0.9;
                    return (
                      <td key={dayIdx} className="p-0.5">
                        <div
                          className="w-12 h-7 rounded flex items-center justify-center"
                          style={{background: `rgba(15, 71, 97, ${opacity})`}}
                          title={`${v} đơn`}
                        >
                          <span style={{fontSize: '10px', color: opacity > 0.5 ? 'white' : '#374151'}}>{v}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-3">
            <span style={{fontSize: '11px', color: '#9CA3AF'}}>Ít đơn</span>
            <div className="flex gap-1">
              {[0.1,0.3,0.5,0.7,0.9].map(o => (
                <div key={o} className="w-6 h-4 rounded" style={{background: `rgba(15,71,97,${o})`}} />
              ))}
            </div>
            <span style={{fontSize: '11px', color: '#9CA3AF'}}>Nhiều đơn</span>
          </div>
        </div>
      </div>

      {/* Branch comparison */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>So sánh xu hướng giữa chi nhánh</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={branchData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="branch" style={{fontSize: '11px'}} />
            <YAxis style={{fontSize: '11px'}} />
            <Tooltip />
            <Legend />
            {branchKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={chartColors[index % chartColors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
