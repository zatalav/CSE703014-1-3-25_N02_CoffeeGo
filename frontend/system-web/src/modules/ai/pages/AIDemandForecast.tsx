import { useEffect, useState } from "react";
import { Zap, Download, AlertTriangle, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../../lib/api";
import { AiDataBanner } from "../components/AiDataBanner";

type DemandForecastData = {
  message?: string;
  confidenceScore?: number;
  forecastData: Array<{ day: string; predicted: number; low: number; high: number }>;
  topProducts: Array<{ name: string; qty: number; change: string }>;
  importRecs: Array<{ name: string; current: number; suggested: number; unit: string }>;
  branches: Array<{ id: number; name: string }>;
};

const emptyForecast: DemandForecastData = {
  forecastData: [],
  topProducts: [],
  importRecs: [],
  branches: [],
  confidenceScore: 0,
};

export function AIDemandForecast() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [branch, setBranch] = useState("");
  const [period, setPeriod] = useState("7 ngày");
  const [forecast, setForecast] = useState<DemandForecastData>(emptyForecast);

  const runForecast = async (showSpinner = true) => {
    if (showSpinner) {
      setRunning(true);
      setDone(false);
    } else {
      setLoading(true);
    }
    setError("");
    const horizon = Number.parseInt(period, 10) || 7;
    const branchQuery = branch ? `&branchId=${encodeURIComponent(branch)}` : "";
    try {
      const data = await api.post<DemandForecastData>(`/admin/ai/demand-forecast?horizon=${horizon}${branchQuery}`);
      setForecast({
        forecastData: data.forecastData || [],
        topProducts: data.topProducts || [],
        importRecs: data.importRecs || [],
        branches: data.branches || forecast.branches || [],
        confidenceScore: data.confidenceScore || 0,
        message: data.message,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc du lieu AI.");
      setDone(false);
    } finally {
      if (showSpinner) setRunning(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void runForecast(false).catch(() => undefined);
  }, []);

  const { forecastData, topProducts, importRecs } = forecast;
  const confidence = Math.round((forecast.confidenceScore || 0.64) * 100);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>AI Dự báo nhu cầu</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center gap-1.5" style={{fontSize: '12px', fontWeight: 600}}>
              <Zap size={12} /> AI Powered
            </span>
          </div>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Dự báo nhu cầu bán hàng và khuyến nghị nhập kho</p>
        </div>
      </div>

      <AiDataBanner loading={loading || running} error={error} message={forecast.message} />

      {/* Params */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Tham số dự báo</h3>
        <div className="flex items-end gap-4">
          <div>
            <label style={{fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px'}}>Chi nhánh</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}}>
              <option value="">Tất cả chi nhánh</option>
              {forecast.branches.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px'}}>Khoảng dự báo</label>
            <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
              {["7 ngày", "14 ngày", "30 ngày"].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md transition-all ${period === p ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  style={{fontSize: '12.5px'}}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => void runForecast(true).catch(() => undefined)}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition-all"
            style={{fontSize: '13.5px', fontWeight: 600}}
          >
            {running ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <><Zap size={15} /> Chạy dự báo</>
            )}
          </button>
        </div>
      </div>

      {done && !error && forecastData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-500">
          Chưa có đủ dữ liệu đơn hàng trong CSDL để tạo dự báo.
        </div>
      )}

      {done && !error && forecastData.length > 0 && (
        <>
          {/* Forecast chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Dự báo lượng đơn hàng — {period} tới</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1.5" style={{fontSize: '12px', fontWeight: 600}}>
                <TrendingUp size={12} /> Độ tin cậy: {confidence}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" style={{fontSize: '11px'}} />
                <YAxis style={{fontSize: '11px'}} />
                <Tooltip />
                <Area type="monotone" dataKey="high" stroke="none" fill="url(#colorRange)" />
                <Area type="monotone" dataKey="low" stroke="none" fill="white" />
                <Area type="monotone" dataKey="predicted" stroke="#7C3AED" strokeWidth={2.5} fill="none" dot={{ r: 4, fill: "#7C3AED" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Top products */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px'}}>Top sản phẩm dự kiến bán chạy</h3>
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center" style={{fontSize: '11px', fontWeight: 700}}>{i+1}</div>
                      <span style={{fontSize: '13.5px', color: '#374151'}}>{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div style={{fontSize: '13px', fontWeight: 700, color: '#111827'}}>{p.qty.toLocaleString()} ly</div>
                      <div style={{fontSize: '11.5px', color: '#10B981'}}>{p.change}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Import recs */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Khuyến nghị nhập kho</h3>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50" style={{fontSize: '12px'}}>
                  <Download size={13} /> Xuất xlsx
                </button>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Nguyên liệu</th>
                    <th className="px-3 py-2 text-center" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Tồn kho</th>
                    <th className="px-3 py-2 text-center" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Đề xuất nhập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importRecs.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2" style={{fontSize: '13px', color: '#374151'}}>{r.name}</td>
                      <td className="px-3 py-2 text-center" style={{fontSize: '13px', color: r.current < 10 ? '#EF4444' : '#374151', fontWeight: r.current < 10 ? 700 : 400}}>
                        {r.current} {r.unit}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full" style={{fontSize: '12px', fontWeight: 600}}>+{r.suggested} {r.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!done && !running && !loading && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <p style={{fontSize: '13.5px', fontWeight: 600, color: '#92400E'}}>Chưa đủ dữ liệu lịch sử</p>
            <p style={{fontSize: '12.5px', color: '#A16207', marginTop: '2px'}}>Cần ít nhất 30 ngày dữ liệu giao dịch để dự báo chính xác.</p>
          </div>
        </div>
      )}
    </div>
  );
}
