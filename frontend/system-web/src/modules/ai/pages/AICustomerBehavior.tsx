import { useEffect, useState } from "react";
import { Download, UserCheck } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { api } from "../../../lib/api";
import { AiDataBanner } from "../components/AiDataBanner";

type CustomerBehaviorData = {
  scatterData: Array<{ x: number; y: number; z: number; group: string; name: string }>;
  churnCustomers: Array<{ name: string; risk: number; lastOrder: string; totalSpend: string }>;
};

const groupColors: Record<string, string> = {
  loyal: "#0F4761",
  new: "#10B981",
  sparse: "#F59E0B",
  churn: "#EF4444",
};

const groupLabels: Record<string, {label: string; desc: string; color: string; bg: string}> = {
  loyal: { label: "Trung thành", desc: "Mua thường xuyên, giá trị cao", color: "text-blue-700", bg: "bg-blue-50" },
  new: { label: "Khách mới", desc: "Mới tham gia, đang khám phá", color: "text-green-700", bg: "bg-green-50" },
  sparse: { label: "Mua thưa", desc: "Không thường xuyên", color: "text-yellow-700", bg: "bg-yellow-50" },
  churn: { label: "Nguy cơ rời bỏ", desc: "Cần chiến dịch giữ chân", color: "text-red-700", bg: "bg-red-50" },
};

const emptyCustomerBehavior: CustomerBehaviorData = {
  scatterData: [],
  churnCustomers: [],
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0]?.payload;
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-3">
        <p style={{fontSize: '13px', fontWeight: 600}}>{d?.name}</p>
        <p style={{fontSize: '12px', color: '#6B7280'}}>Tần suất: {d?.x} lần/tháng</p>
        <p style={{fontSize: '12px', color: '#6B7280'}}>Giá trị TB: {(d?.y / 1000).toFixed(0)}K đ</p>
        <p style={{fontSize: '12px', color: '#6B7280'}}>Tổng chi tiêu: {(d?.z / 1000000).toFixed(1)}M đ</p>
      </div>
    );
  }
  return null;
};

export function AICustomerBehavior() {
  const [payload, setPayload] = useState<CustomerBehaviorData>(emptyCustomerBehavior);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get<CustomerBehaviorData>("/admin/ai/customer-behavior")
      .then(data => {
        if (!cancelled) {
          setPayload({
            scatterData: data.scatterData || [],
            churnCustomers: data.churnCustomers || [],
          });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khong tai duoc du lieu AI.");
          setPayload(emptyCustomerBehavior);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const { scatterData, churnCustomers } = payload;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>AI Phân tích hành vi khách hàng</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full" style={{fontSize: '12px', fontWeight: 600}}>AI Powered</span>
          </div>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Phân nhóm và phân tích hành vi mua hàng</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{fontSize: '13px'}}>
          <Download size={14} /> Xuất theo nhóm
        </button>
      </div>

      <AiDataBanner loading={loading} error={error} />

      {/* Bubble chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Phân nhóm khách hàng (Bubble Chart)</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(groupLabels).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{background: groupColors[k]}} />
                <span style={{fontSize: '11.5px', color: '#6B7280'}}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', textAlign: 'center'}}>
          Trục X = Tần suất mua (lần/tháng) · Trục Y = Giá trị đơn TB (đ) · Kích thước = Tổng chi tiêu
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="x" name="Tần suất" style={{fontSize: '11px'}} label={{ value: 'Tần suất mua/tháng', position: 'insideBottom', offset: -5, style: { fontSize: '11px', fill: '#9CA3AF' } }} />
            <YAxis dataKey="y" name="Giá trị" style={{fontSize: '11px'}} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => (
                <Cell key={i} fill={groupColors[d.group]} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Group cards */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(groupLabels).map(([k, v]) => {
          const count = scatterData.filter(d => d.group === k).length;
          return (
            <div key={k} className={`rounded-xl p-4 border border-gray-100 shadow-sm ${v.bg}`}>
              <div style={{fontSize: '12px'}} className={v.color}>{v.label}</div>
              <div style={{fontSize: '28px', fontWeight: 700, color: groupColors[k], margin: '4px 0'}}>{count}</div>
              <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>{v.desc}</div>
              <div style={{fontSize: '11px', color: '#6B7280', marginTop: '4px'}}>{scatterData.length ? ((count / scatterData.length) * 100).toFixed(0) : 0}% tổng KH</div>
            </div>
          );
        })}
      </div>

      {/* Churn risk table */}
      <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={15} className="text-red-500" />
            <h3 style={{fontSize: '14px', fontWeight: 600, color: '#EF4444'}}>Khách hàng nguy cơ rời bỏ cao</h3>
          </div>
          <button className="px-4 py-2 bg-[#0F4761] text-white rounded-lg" style={{fontSize: '12.5px'}}>
            Tạo chiến dịch giữ chân →
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Khách hàng", "Điểm rủi ro", "Mua hàng lần cuối", "Tổng chi tiêu"].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {churnCustomers.map(c => (
              <tr key={c.name} className="hover:bg-red-50/50">
                <td className="px-4 py-3" style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{width: `${c.risk}%`}} />
                    </div>
                    <span style={{fontSize: '13px', fontWeight: 700, color: '#EF4444'}}>{c.risk}%</span>
                  </div>
                </td>
                <td className="px-4 py-3" style={{fontSize: '13px', color: '#6B7280'}}>{c.lastOrder}</td>
                <td className="px-4 py-3" style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>{c.totalSpend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
