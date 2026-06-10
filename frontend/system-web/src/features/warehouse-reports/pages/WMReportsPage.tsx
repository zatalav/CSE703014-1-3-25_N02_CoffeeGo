import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Download, Package, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../../lib/auth";
import { loadInventoryData, type InventoryData } from "../../inventory-data";
import { formatDateParam, isDateInRange, parseReportDate, rangeForPeriod, reportPeriodLabels, type ReportPeriod } from "../../../shared/utils/reportPeriods";

const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";
const PIE_COLORS = [PRIMARY, "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#F97316"];

const fmtVND = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)} tr` : `${(n / 1000).toFixed(0)}k`;

const warehousePeriods: ReportPeriod[] = ["today", "week", "month", "quarter", "year"];

export function WMReportsPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        setData(await loadInventoryData(branchId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được báo cáo kho.");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [branchId]);

  const ingredients = data?.ingredients || [];
  const stockNotes = data?.stockNotes || [];
  const selectedRange = useMemo(() => rangeForPeriod(period), [period]);
  const periodStockNotes = useMemo(
    () => stockNotes.filter(note => isDateInRange(note.occurredAt || note.date, selectedRange)),
    [selectedRange, stockNotes]
  );
  const totalValue = ingredients.reduce((sum, item) => sum + item.current * item.price, 0);
  const lowStock = ingredients.filter(item => item.minLevel > 0 && item.current <= item.minLevel).length;
  const totalImport = periodStockNotes.filter(note => note.type === "import").reduce((sum, note) => sum + note.total, 0);
  const totalExport = periodStockNotes.filter(note => note.type === "export").reduce((sum, note) => sum + note.total, 0);

  const monthlyData = useMemo(() => {
    const byPeriod = new Map<string, { month: string; import: number; export: number }>();
    periodStockNotes.forEach(note => {
      const date = parseReportDate(note.occurredAt || note.date);
      const key = date ? (period === "quarter" || period === "year" ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : formatDateParam(date)) : "unknown";
      const label = date
        ? (period === "quarter" || period === "year"
          ? date.toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })
          : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }))
        : "Khác";
      const row = byPeriod.get(key) || { month: label, import: 0, export: 0 };
      row[note.type] += note.total;
      byPeriod.set(key, row);
    });
    return Array.from(byPeriod.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value);
  }, [period, periodStockNotes]);

  const categoryData = useMemo(() => {
    const byCategory = new Map<string, number>();
    ingredients.forEach(item => byCategory.set(item.category, (byCategory.get(item.category) || 0) + 1));
    return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }));
  }, [ingredients]);

  const supplierStats = data?.suppliers || [];
  const stockRows = [...ingredients].sort((a, b) => (a.current / (a.minLevel || 1)) - (b.current / (b.minLevel || 1))).slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900" style={{ fontSize: 20 }}>Báo cáo kho</h2>
          <p className="text-sm text-gray-500 mt-0.5">Báo cáo được tổng hợp trực tiếp từ database inventory-service</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "#F3F4F6" }}>
            {warehousePeriods.map(item => (
              <button key={item} onClick={() => setPeriod(item)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: period === item ? "#fff" : "transparent", color: period === item ? PRIMARY : "#9CA3AF", boxShadow: period === item ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                {reportPeriodLabels[item]}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border font-medium" style={{ borderColor: "#D1FAE5", color: ACCENT, backgroundColor: "#F0FDF4" }}><Download size={14} /> Xuất báo cáo</button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">Đang tải dữ liệu...</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Giá trị tồn kho", value: `${(totalValue / 1000000).toFixed(1)}M đ`, icon: Package, color: PRIMARY, bg: "#E8F5F0" },
          { label: "Tổng nhập", value: `${fmtVND(totalImport)} đ`, icon: ArrowUpCircle, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Tổng xuất", value: `${fmtVND(totalExport)} đ`, icon: ArrowDownCircle, color: "#7C3AED", bg: "#F5F3FF" },
          { label: "Mặt hàng cần đặt", value: `${lowStock} mặt hàng`, icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}><Icon size={20} style={{ color: kpi.color }} /></div>
                <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#059669" }}><TrendingUp size={10} /> DB</span>
              </div>
              <p className="text-gray-500 text-xs mt-3">{kpi.label}</p>
              <p className="font-bold text-gray-900 mt-0.5" style={{ fontSize: 18 }}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 className="font-semibold text-gray-800 mb-4">Nhập / Xuất theo kỳ</h3>
          <ResponsiveContainer key={`wm-rpt-${period}`} width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={fmtVND} />
              <Tooltip formatter={(v: number) => [`${new Intl.NumberFormat("vi-VN").format(v)}đ`, ""]} />
              <Legend />
              <Bar dataKey="import" name="Nhập kho" fill={ACCENT} radius={[4, 4, 0, 0]} />
              <Bar dataKey="export" name="Xuất kho" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 className="font-semibold text-gray-800 mb-4">Cơ cấu danh mục</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                {categoryData.map((_, i) => <Cell key={`cat-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} SKU`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {categoryData.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-gray-600 truncate flex-1">{cat.name}</span>
                <span className="text-xs font-semibold text-gray-800">{cat.value}</span>
              </div>
            ))}
            {!loading && categoryData.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Chưa có danh mục</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 className="font-semibold text-gray-800 mb-4">Vòng quay hàng tồn kho</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData.map(row => ({ month: row.month, turnover: row.export && totalValue ? Number((row.export / totalValue).toFixed(2)) : 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)} lần`, "Vòng quay"]} />
              <Line dataKey="turnover" name="Vòng quay" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 className="font-semibold text-gray-800 mb-4">Tình trạng tồn kho hiện tại</h3>
          <div className="space-y-3">
            {stockRows.map(item => {
              const pct = item.minLevel ? Math.min(Math.round((item.current / item.minLevel) * 100), 150) : 100;
              const barColor = item.minLevel && item.current <= item.minLevel * 0.5 ? "#EF4444" : item.minLevel && item.current <= item.minLevel ? "#F59E0B" : ACCENT;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <p className="text-xs text-gray-700 truncate" style={{ minWidth: 140, maxWidth: 140 }}>{item.name}</p>
                  <div className="flex-1 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} /></div>
                  <span className="text-xs font-semibold w-16 text-right" style={{ color: barColor }}>{item.current} {item.unit}</span>
                </div>
              );
            })}
            {!loading && stockRows.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Chưa có tồn kho</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Hiệu suất nhà cung cấp</h3>
          <span className="text-xs text-gray-400">Theo phiếu nhập trong database</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["Nhà cung cấp", "Số đơn", "Tổng giá trị", "Tỷ lệ đúng hạn"].map(header => <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {supplierStats.map(supplier => (
                <tr key={supplier.id} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800">{supplier.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{supplier.totalOrders} đơn</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-800">{new Intl.NumberFormat("vi-VN").format(supplier.totalValue)}đ</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{ width: `${supplier.onTimeRate}%`, backgroundColor: supplier.onTimeRate >= 95 ? ACCENT : supplier.onTimeRate >= 85 ? "#F59E0B" : "#EF4444" }} /></div>
                      <span className="text-xs font-medium">{supplier.onTimeRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && supplierStats.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-400">Chưa có nhà cung cấp</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
