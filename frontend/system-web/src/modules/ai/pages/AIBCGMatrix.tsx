import { type CSSProperties, useEffect, useState } from "react";
import { Download, Star, TrendingUp, HelpCircle, Turtle } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from "recharts";
import { api } from "../../../lib/api";
import { queryForPeriod, reportPeriodLabels, type ReportPeriod } from "../../../shared/utils/reportPeriods";
import { AiDataBanner } from "../components/AiDataBanner";

type BcgData = {
  products: Array<{ name: string; x: number; y: number; revenue: number; quad: string }>;
  recommendations: Record<string, { action: string; detail: string }[]>;
};

const quadColors: Record<string, string> = {
  star: "#F59E0B",
  cash: "#10B981",
  question: "#6366F1",
  dog: "#9CA3AF",
};

const quadConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string; desc: string }> = {
  star: { label: "Ngôi sao", icon: Star, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", desc: "Thị phần cao, tăng trưởng cao — Ưu tiên đầu tư" },
  cash: { label: "Bò sữa", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", desc: "Thị phần cao, tăng trưởng thấp — Khai thác lợi nhuận" },
  question: { label: "Dấu hỏi", icon: HelpCircle, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", desc: "Thị phần thấp, tăng trưởng cao — Cân nhắc đầu tư" },
  dog: { label: "Chú rùa", icon: Turtle, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", desc: "Thị phần thấp, tăng trưởng thấp — Xem xét loại bỏ" },
};

const emptyRecommendations: Record<string, { action: string; detail: string }[]> = {
  star: [],
  cash: [],
  question: [],
  dog: [],
};

const emptyBcgData: BcgData = {
  products: [],
  recommendations: emptyRecommendations,
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0]?.payload;
    const cfg = quadConfig[d.quad];
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-3 min-w-[180px]">
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>{d.name}</p>
        <p style={{ fontSize: "12px", color: "#6B7280" }}>Thị phần: <span style={{ fontWeight: 600 }}>{d.x}%</span></p>
        <p style={{ fontSize: "12px", color: "#6B7280" }}>Tăng trưởng: <span style={{ fontWeight: 600 }}>{d.y}%</span></p>
        <p style={{ fontSize: "12px", color: "#6B7280" }}>Doanh thu: <span style={{ fontWeight: 600 }}>{d.revenue}M đ</span></p>
        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
      </div>
    );
  }
  return null;
};

export function AIBCGMatrix() {
  const [activeTab, setActiveTab] = useState<"star" | "cash" | "question" | "dog">("star");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [payload, setPayload] = useState<BcgData>(emptyBcgData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get<BcgData>(`/admin/ai/best-slow-products?${queryForPeriod(period)}`)
      .then(data => {
        if (!cancelled) {
          setPayload({
            products: data.products || [],
            recommendations: data.recommendations || emptyRecommendations,
          });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khong tai duoc du lieu AI.");
          setPayload(emptyBcgData);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period]);

  const { products, recommendations: recommendationData } = payload;
  const tabProducts = products.filter(p => p.quad === activeTab);
  const tabRecs = recommendationData[activeTab] || [];
  const tabCfg = quadConfig[activeTab];
  const TabIcon = tabCfg.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>AI Ma trận BCG</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full" style={{ fontSize: "12px", fontWeight: 600 }}>AI Powered</span>
          </div>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Phân tích danh mục sản phẩm theo thị phần và tốc độ tăng trưởng</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as ReportPeriod)}
            className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
            style={{ fontSize: "13px" }}
          >
            {(["today", "week", "month", "quarter"] as ReportPeriod[]).map(item => (
              <option key={item} value={item}>{reportPeriodLabels[item]}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{ fontSize: "13px" }}>
            <Download size={14} /> Xuất Excel
          </button>
        </div>
      </div>

      <AiDataBanner loading={loading} error={error} />

      {/* BCG Chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Biểu đồ BCG Matrix</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(quadConfig).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: quadColors[k] }} />
                <span style={{ fontSize: "11.5px", color: "#6B7280" }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* Quadrant labels */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{ top: "16px", bottom: "40px", left: "40px", right: "0" }}>
            <div className="absolute top-2 right-4 text-center">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#F59E0B" }}>⭐ NGÔI SAO</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Thị phần cao · Tăng trưởng cao</div>
            </div>
            <div className="absolute top-2 left-4 text-center">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#6366F1" }}>❓ DẤU HỎI</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Thị phần thấp · Tăng trưởng cao</div>
            </div>
            <div className="absolute bottom-10 right-4 text-center">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#10B981" }}>🐄 BÒ SỮA</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Thị phần cao · Tăng trưởng thấp</div>
            </div>
            <div className="absolute bottom-10 left-4 text-center">
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF" }}>🐢 CHÚ RÙA</div>
              <div style={{ fontSize: "10px", color: "#9CA3AF" }}>Thị phần thấp · Tăng trưởng thấp</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="x"
                name="Thị phần"
                type="number"
                domain={[0, 100]}
                style={{ fontSize: "11px" }}
                label={{ value: "Thị phần tương đối (%)", position: "insideBottom", offset: -12, style: { fontSize: "11px", fill: "#9CA3AF" } }}
              />
              <YAxis
                dataKey="y"
                name="Tăng trưởng"
                type="number"
                domain={[0, 16]}
                style={{ fontSize: "11px" }}
                label={{ value: "Tốc độ tăng trưởng (%)", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: "11px", fill: "#9CA3AF" } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={50} stroke="#E5E7EB" strokeWidth={2} strokeDasharray="6 3" />
              <ReferenceLine y={6} stroke="#E5E7EB" strokeWidth={2} strokeDasharray="6 3" />
              <Scatter data={products} shape={(props: any) => {
                const { cx, cy, payload } = props;
                const r = Math.sqrt(payload.revenue) * 2.5;
                return (
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill={quadColors[payload.quad]}
                    fillOpacity={0.75}
                    stroke={quadColors[payload.quad]}
                    strokeWidth={1.5}
                  />
                );
              }}>
                {products.map((p, i) => (
                  <Cell key={i} fill={quadColors[p.quad]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center", marginTop: "-4px" }}>
          Kích thước bong bóng = Doanh thu · Đường kẻ dọc/ngang = Ngưỡng phân loại
        </p>
      </div>

      {/* Quadrant summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(quadConfig).map(([k, v]) => {
          const count = products.filter(p => p.quad === k).length;
          const totalRev = products.filter(p => p.quad === k).reduce((s, p) => s + p.revenue, 0);
          const Icon = v.icon;
          return (
            <button
              key={k}
              onClick={() => setActiveTab(k as any)}
              className={`rounded-xl p-4 border shadow-sm text-left transition-all ${activeTab === k ? `${v.bg} ${v.border} ring-2 ring-offset-1` : "bg-white border-gray-100 hover:bg-gray-50"}`}
              style={{ "--tw-ring-color": quadColors[k] } as CSSProperties}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={v.color} />
                <span style={{ fontSize: "13px", fontWeight: 600 }} className={v.color}>{v.label}</span>
              </div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: quadColors[k] }}>{count}</div>
              <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>sản phẩm</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>{totalRev.toFixed(1)}M doanh thu</div>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <div className={`rounded-xl border shadow-sm overflow-hidden ${tabCfg.bg} ${tabCfg.border}`}>
        <div className={`px-5 py-4 border-b ${tabCfg.border}`}>
          <div className="flex items-center gap-2">
            <TabIcon size={16} className={tabCfg.color} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Nhóm {tabCfg.label}</h3>
            <span style={{ fontSize: "12px" }} className={`${tabCfg.color} ml-2`}>— {tabCfg.desc}</span>
          </div>
        </div>
        <div className="p-5 grid grid-cols-5 gap-5">
          {/* Products list */}
          <div className="col-span-2 space-y-3">
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Sản phẩm trong nhóm</p>
            {tabProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>{p.name}</div>
                  <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>Thị phần {p.x}% · Tăng trưởng {p.y}%</div>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: quadColors[p.quad] }}>{p.revenue}M</div>
              </div>
            ))}
          </div>

          {/* AI recommendations */}
          <div className="col-span-3">
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Đề xuất chiến lược của AI</p>
            <div className="space-y-3">
              {tabRecs.map((r, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tabCfg.bg}`}>
                      <span style={{ fontSize: "12px", fontWeight: 700 }} className={tabCfg.color}>{i + 1}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#111827" }}>{r.action}</p>
                      <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: "2px" }}>{r.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className={`px-4 py-2 rounded-lg text-white`} style={{ fontSize: "13px", fontWeight: 600, background: quadColors[activeTab] }}>
                Áp dụng chiến lược
              </button>
              <button className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-gray-600" style={{ fontSize: "13px" }}>
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
