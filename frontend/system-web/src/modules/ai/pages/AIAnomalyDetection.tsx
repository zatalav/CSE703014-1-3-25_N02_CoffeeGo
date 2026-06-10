import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Eye, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { AiDataBanner } from "../components/AiDataBanner";

type Anomaly = {
  id: number;
  level: keyof typeof levelConfig;
  title: string;
  branch: string;
  time: string;
  desc: string;
  status: keyof typeof statusConfig;
};

type AnomalyPayload = {
  anomalies: Anomaly[];
  chartData: Array<{ time: string; actual: number; baseline: number }>;
};

const emptyAnomalyPayload: AnomalyPayload = {
  anomalies: [],
  chartData: [],
};

const levelConfig = {
  critical: { icon: <AlertTriangle size={15} />, color: "text-red-600", bg: "bg-red-50", badge: "bg-red-100 text-red-700", border: "border-l-red-500", label: "Nghiêm trọng" },
  warning: { icon: <AlertTriangle size={15} />, color: "text-yellow-500", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700", border: "border-l-yellow-400", label: "Cảnh báo" },
  info: { icon: <Eye size={15} />, color: "text-blue-500", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", border: "border-l-blue-400", label: "Theo dõi" },
};

const statusConfig = {
  new: { label: "Mới", class: "bg-red-100 text-red-700" },
  processing: { label: "Đang xử lý", class: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Đã xử lý", class: "bg-green-100 text-green-700" },
};

export function AIAnomalyDetection() {
  const [selected, setSelected] = useState<Anomaly | null>(null);
  const [levelFilter, setLevelFilter] = useState("all");
  const [showHistory, setShowHistory] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [payload, setPayload] = useState<AnomalyPayload>(emptyAnomalyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get<AnomalyPayload>("/admin/ai/anomaly-detection")
      .then(data => {
        if (!cancelled) {
          setPayload({
            anomalies: data.anomalies || [],
            chartData: data.chartData || [],
          });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Khong tai duoc du lieu AI.");
          setPayload(emptyAnomalyPayload);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const anomalies = payload.anomalies;
  const chartData = payload.chartData;

  const counts = {
    critical: anomalies.filter(a => a.level === "critical" && a.status !== "resolved").length,
    warning: anomalies.filter(a => a.level === "warning" && a.status !== "resolved").length,
    info: anomalies.filter(a => a.level === "info" && a.status !== "resolved").length,
    resolved: anomalies.filter(a => a.status === "resolved").length,
  };

  const filtered = anomalies.filter(a => {
    if (levelFilter === "unresolved") return a.status !== "resolved";
    if (levelFilter !== "all") return a.level === levelFilter;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>AI Phát hiện bất thường</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full" style={{fontSize: '12px', fontWeight: 600}}>AI Powered</span>
          </div>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Tự động phát hiện các bất thường trong hoạt động kinh doanh</p>
        </div>
      </div>

      <AiDataBanner loading={loading} error={error} />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Nghiêm trọng", count: counts.critical, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Cảnh báo", count: counts.warning, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
          { label: "Theo dõi", count: counts.info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Đã xử lý", count: counts.resolved, color: "text-green-600", bg: "bg-green-50 border-green-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border shadow-sm ${s.bg}`}>
            <div style={{fontSize: '12px', color: '#6B7280'}}>{s.label}</div>
            <div style={{fontSize: '32px', fontWeight: 800}} className={s.color}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="flex gap-2">
          {[["all","Tất cả"],["critical","Nghiêm trọng"],["warning","Cảnh báo"],["info","Theo dõi"],["unresolved","Chưa xử lý"]].map(([k,v]) => (
            <button
              key={k}
              onClick={() => setLevelFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs ${levelFilter === k ? "bg-[#0F4761] text-white" : "border border-gray-200 text-gray-500"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <select className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none ml-auto" style={{fontSize: '13px'}}>
          <option>Tất cả chi nhánh</option>
        </select>
      </div>

      {/* Anomaly list */}
      <div className="space-y-3">
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-500">
            Chưa phát hiện bất thường từ dữ liệu CSDL hiện tại.
          </div>
        )}
        {filtered.map(a => {
          const cfg = levelConfig[a.level as keyof typeof levelConfig];
          const st = statusConfig[a.status as keyof typeof statusConfig];
          return (
            <div key={a.id} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${cfg.border} shadow-sm p-5 hover:shadow-md transition-shadow ${a.status === "resolved" ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>{a.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${st.class}`}>{st.label}</span>
                    </div>
                    <div style={{fontSize: '12px', color: '#9CA3AF', marginTop: '2px'}}>
                      {a.branch} · {a.time}
                    </div>
                    <p style={{fontSize: '13.5px', color: '#374151', marginTop: '6px'}}>{a.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(a)}
                  className="shrink-0 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                  style={{fontSize: '12.5px'}}
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className={`px-6 py-4 border-b ${levelConfig[selected.level as keyof typeof levelConfig].bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${levelConfig[selected.level as keyof typeof levelConfig].color}`}>
                    {levelConfig[selected.level as keyof typeof levelConfig].icon}
                  </div>
                  <h2 style={{fontSize: '17px', fontWeight: 700, color: '#111827'}}>{selected.title}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-white/50 rounded-lg"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div style={{fontSize: '13.5px', color: '#374151'}}>{selected.desc}</div>
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
                {[["Chi nhánh", selected.branch], ["Thời điểm", selected.time], ["Mức độ", levelConfig[selected.level as keyof typeof levelConfig].label], ["Trạng thái", statusConfig[selected.status as keyof typeof statusConfig].label]].map(([k,v]) => (
                  <div key={k}>
                    <span style={{fontSize: '12px', color: '#9CA3AF'}}>{k}: </span>
                    <span style={{fontSize: '13px', fontWeight: 500, color: '#374151'}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Mini chart */}
              <div>
                <p style={{fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px'}}>Dữ liệu bất thường vs Baseline</p>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="time" style={{fontSize: '10px'}} />
                    <YAxis style={{fontSize: '10px'}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="baseline" name="Bình thường" stroke="#D1D5DB" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="actual" name="Thực tế" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* AI suggestions */}
              <div>
                <p style={{fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px'}}>Đề xuất hành động của AI</p>
                <ul className="space-y-2">
                  {["Kiểm tra tình trạng nhân sự và thiết bị tại chi nhánh", "Xem xét nguyên liệu có đủ không", "Liên hệ quản lý chi nhánh để xác nhận nguyên nhân"].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                      <span style={{fontSize: '13px', color: '#374151'}}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.status !== "resolved" && (
                <div>
                  <p style={{fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px'}}>Ghi chú xử lý</p>
                  <textarea
                    value={resolveNote}
                    onChange={e => setResolveNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none resize-none"
                    rows={2}
                    style={{fontSize: '13px'}}
                    placeholder="Nhập lý do / cách xử lý..."
                  />
                </div>
              )}
            </div>
            {selected.status !== "resolved" && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{fontSize: '13.5px'}}>Đóng</button>
                <button
                  onClick={() => { toast.success("Đã đánh dấu đã xử lý!"); setSelected(null); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg"
                  style={{fontSize: '13.5px'}}
                >
                  Đánh dấu Đã xử lý
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
