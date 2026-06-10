import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronRight, Package, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../../lib/auth";
import { loadInventoryData, type InventoryData, type InventoryIngredient } from "../../inventory-data";

const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";

const fmtVND = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
};

interface Props {
  onNavigate: (page: string) => void;
}

function isLowStock(item: InventoryIngredient) {
  return item.minLevel > 0 && item.current <= item.minLevel;
}

export function WMDashboardPage({ onNavigate }: Props) {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState<"import-export" | "value">("import-export");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        setData(await loadInventoryData(branchId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được dashboard kho.");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [branchId]);

  const ingredients = data?.ingredients || [];
  const stockNotes = data?.stockNotes || [];
  const totalValue = ingredients.reduce((sum, item) => sum + item.current * item.price, 0);
  const criticalItems = ingredients.filter(item => item.minLevel > 0 && item.current <= item.minLevel * 0.5);
  const warningItems = ingredients.filter(item => item.minLevel > 0 && item.current > item.minLevel * 0.5 && item.current <= item.minLevel);
  const lowStockItems = ingredients.filter(isLowStock).sort((a, b) => (a.current / (a.minLevel || 1)) - (b.current / (b.minLevel || 1)));

  const importTotal = stockNotes.filter(note => note.type === "import").reduce((sum, note) => sum + note.total, 0);
  const exportTotal = stockNotes.filter(note => note.type === "export").reduce((sum, note) => sum + note.total, 0);

  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; import: number; export: number; value: number }>();
    stockNotes.forEach(note => {
      const date = note.date || "Chưa ngày";
      const row = byDate.get(date) || { date, import: 0, export: 0, value: 0 };
      row[note.type] += note.total;
      row.value = totalValue;
      byDate.set(date, row);
    });
    return Array.from(byDate.values()).slice(0, 7).reverse();
  }, [stockNotes, totalValue]);

  const zoneStats = useMemo(() => {
    const zones = new Map<string, { zone: string; total: number; occupied: number }>();
    data?.locations.forEach(location => {
      const zone = location.zone || "A";
      const row = zones.get(zone) || { zone, total: 0, occupied: 0 };
      row.total += 1;
      if (data.stocks.some(stock => stock.locationId === location.locationId && Number(stock.quantity || 0) > 0)) row.occupied += 1;
      zones.set(zone, row);
    });
    return Array.from(zones.values());
  }, [data]);

  const kpis = [
    { label: "Tổng giá trị tồn kho", value: `${(totalValue / 1000000).toFixed(1)} triệu đ`, sub: `${ingredients.length} SKU đang lưu trữ`, icon: Package, color: PRIMARY, bg: "#E8F5F0" },
    { label: "Nhập kho", value: `${(importTotal / 1000000).toFixed(1)} tr đ`, sub: `${stockNotes.filter(note => note.type === "import").length} phiếu nhập`, icon: ArrowUpCircle, color: "#2563EB", bg: "#EFF6FF" },
    { label: "Xuất kho", value: `${(exportTotal / 1000000).toFixed(1)} tr đ`, sub: `${stockNotes.filter(note => note.type === "export").length} phiếu xuất`, icon: ArrowDownCircle, color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Cần đặt hàng", value: `${criticalItems.length + warningItems.length} mặt hàng`, sub: `${criticalItems.length} nghiêm trọng, ${warningItems.length} cảnh báo`, icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl px-6 py-5 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #2D7A5F 100%)` }}>
        <div>
          <h1 className="text-white font-bold text-xl">Kho trung tâm</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
            Dữ liệu dashboard được tổng hợp từ inventory database · {lowStockItems.length} mặt hàng cần theo dõi
          </p>
        </div>
        <button onClick={() => onNavigate("wm-stock")} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>
          <ArrowUpCircle size={16} /> Tạo phiếu nhập
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">Đang tải dữ liệu...</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}><Icon size={20} style={{ color: kpi.color }} /></div>
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#059669" }}><TrendingUp size={10} /> DB</span>
              </div>
              <p className="text-gray-500 text-xs mt-3">{kpi.label}</p>
              <p className="font-bold text-gray-900 mt-0.5" style={{ fontSize: 18 }}>{kpi.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Biến động kho</h3>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "#F3F4F6" }}>
              {(["import-export", "value"] as const).map(type => (
                <button key={type} onClick={() => setChartType(type)} className="px-3 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: chartType === type ? "#fff" : "transparent", color: chartType === type ? PRIMARY : "#9CA3AF", boxShadow: chartType === type ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {type === "import-export" ? "Nhập / Xuất" : "Giá trị tồn"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer key={`wm-dash-${chartType}`} width="100%" height={220}>
            {chartType === "import-export" ? (
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={fmtVND} />
                <Tooltip formatter={(v: number) => [`${new Intl.NumberFormat("vi-VN").format(v)}đ`, ""]} />
                <Legend />
                <Bar dataKey="import" name="Nhập kho" fill={ACCENT} radius={[4, 4, 0, 0]} />
                <Bar dataKey="export" name="Xuất kho" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={fmtVND} />
                <Tooltip formatter={(v: number) => [`${new Intl.NumberFormat("vi-VN").format(v)}đ`, "Giá trị tồn kho"]} />
                <Line dataKey="value" name="Giá trị tồn kho" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 4, fill: PRIMARY }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Cảnh báo tồn kho</h3>
            <button onClick={() => onNavigate("wm-ingredients")} className="text-xs font-medium flex items-center gap-0.5" style={{ color: PRIMARY }}>Xem tất cả <ChevronRight size={12} /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: 240 }}>
            {lowStockItems.map(item => {
              const pct = Math.round((item.current / (item.minLevel || 1)) * 100);
              const isCritical = item.current <= item.minLevel * 0.5;
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 truncate pr-2" style={{ maxWidth: 160 }}>{item.name}</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: isCritical ? "#FEF2F2" : "#FFFBEB", color: isCritical ? "#DC2626" : "#D97706" }}>{item.current} {item.unit}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isCritical ? "#EF4444" : "#F59E0B" }} /></div>
                  <p className="text-xs text-gray-400">Tối thiểu: {item.minLevel} {item.unit}</p>
                </div>
              );
            })}
            {!loading && lowStockItems.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Không có cảnh báo tồn kho</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Phiếu nhập / xuất gần đây</h3>
            <button onClick={() => onNavigate("wm-stock")} className="text-xs font-medium flex items-center gap-0.5" style={{ color: PRIMARY }}>Xem tất cả <ChevronRight size={12} /></button>
          </div>
          <div className="space-y-2">
            {stockNotes.slice(0, 8).map(note => (
              <div key={`${note.type}-${note.numericId}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: note.type === "import" ? "#ECFDF5" : "#F5F3FF" }}>
                  {note.type === "import" ? <ArrowUpCircle size={16} style={{ color: ACCENT }} /> : <ArrowDownCircle size={16} style={{ color: "#7C3AED" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-800">{note.id}</span>
                  <p className="text-xs text-gray-500 truncate">{note.type === "import" ? note.supplier : note.branch}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-800">{new Intl.NumberFormat("vi-VN").format(note.total)}đ</p>
                  <p className="text-xs text-gray-400">{note.date}</p>
                </div>
              </div>
            ))}
            {!loading && stockNotes.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Chưa có phiếu nhập/xuất trong database</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 className="font-semibold text-gray-800 mb-4">Sức chứa theo khu</h3>
          <div className="grid grid-cols-4 gap-2">
            {zoneStats.map(zone => (
              <div key={zone.zone} className="text-center p-3 rounded-xl border" style={{ borderColor: "#E5E7EB" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 text-sm font-bold" style={{ backgroundColor: "#E8F5F0", color: PRIMARY }}>{zone.zone}</div>
                <p className="text-xs font-semibold text-gray-700">{zone.occupied}/{zone.total}</p>
                <p className="text-xs text-gray-400 leading-tight">Ô đã dùng</p>
              </div>
            ))}
            {!loading && zoneStats.length === 0 && <p className="col-span-4 py-8 text-center text-sm text-gray-400">Chưa có vị trí kho trong database</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
