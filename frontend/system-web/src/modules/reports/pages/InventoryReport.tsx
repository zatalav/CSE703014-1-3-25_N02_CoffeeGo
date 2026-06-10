import { useEffect, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../../../lib/api";
import { inventoryFallback } from "../reportFallbacks";
import { queryForPeriod, type ReportPeriod } from "../../../shared/utils/reportPeriods";

type InventoryReportData = {
  kpis: Array<{ label: string; value: string; color: string; bg: string }>;
  weeklyData: Array<{ week: string; import: number; export: number }>;
  ingredientTable: Array<{ name: string; unit: string; open: number; import_: number; export_: number; close: number; min: number }>;
  alerts: Array<{ name: string; current: number; min: number; unit: string; suggested: number }>;
};

const weeklyData: Array<{ week: string; import: number; export: number }> = [];

const ingredientTable: Array<{ name: string; unit: string; open: number; import_: number; export_: number; close: number; min: number }> = [];

const alerts: Array<{ name: string; current: number; min: number; unit: string; suggested: number }> = [];

export function InventoryReport() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [report, setReport] = useState<InventoryReportData>({
    kpis: inventoryFallback.kpis,
    weeklyData: inventoryFallback.weeklyData,
    ingredientTable: inventoryFallback.ingredientTable,
    alerts: inventoryFallback.alerts,
  });

  useEffect(() => {
    let cancelled = false;
    api.get<InventoryReportData>(`/admin/reports/inventory?${queryForPeriod(period)}`)
      .then(data => {
        if (!cancelled) {
          setReport({
            kpis: data.kpis?.length ? data.kpis : inventoryFallback.kpis,
            weeklyData: data.weeklyData?.length ? data.weeklyData : inventoryFallback.weeklyData,
            ingredientTable: data.ingredientTable?.length ? data.ingredientTable : inventoryFallback.ingredientTable,
            alerts: data.alerts?.length ? data.alerts : inventoryFallback.alerts,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setReport(inventoryFallback);
      });
    return () => { cancelled = true; };
  }, [period]);

  const { weeklyData, ingredientTable, alerts } = report;
  const inventoryKpis = report.kpis.length ? report.kpis : inventoryFallback.kpis;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Báo cáo Nhập xuất tồn</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Tổng quan nhập xuất và tồn kho nguyên liệu</p>
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
        {inventoryKpis.map(k => (
          (() => {
            const isLowStockKpi = k.label.includes("tối thiểu") || k.label.toLowerCase().includes("toi thieu");
            return (
              <div key={k.label} className={`rounded-xl p-5 border border-gray-100 shadow-sm ${isLowStockKpi && alerts.length > 0 ? "bg-red-50 border-red-200" : "bg-white"}`}>
                <p style={{fontSize: '12px', color: '#6B7280'}}>{k.label}</p>
                <p style={{fontSize: '26px', fontWeight: 700, color: isLowStockKpi && alerts.length > 0 ? '#EF4444' : '#111827', marginTop: '4px'}}>{k.value}</p>
                {isLowStockKpi && alerts.length > 0 && (
                  <div className="flex items-center gap-1 mt-1" style={{fontSize: '11.5px', color: '#EF4444'}}>
                    <AlertTriangle size={12} /> Cần đặt hàng ngay
                  </div>
                )}
              </div>
            );
          })()
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px'}}>Nhập vs. Xuất theo tuần</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="week" style={{fontSize: '11px'}} />
            <YAxis style={{fontSize: '11px'}} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
            <Tooltip formatter={(v: any) => `${(v/1000000).toFixed(1)}M đ`} />
            <Legend />
            <Bar dataKey="import" name="Nhập kho" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="export" name="Xuất kho" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Bảng tổng hợp nhập xuất tồn</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Nguyên liệu", "Đơn vị", "Tồn đầu kỳ", "Nhập trong kỳ", "Xuất trong kỳ", "Tồn cuối kỳ"].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ingredientTable.map(r => {
              const low = r.close < r.min;
              return (
                <tr key={r.name} className={`hover:bg-gray-50 ${low ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle size={13} className="text-red-500" />}
                      <span style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{fontSize: '13px', color: '#6B7280'}}>{r.unit}</td>
                  <td className="px-4 py-3" style={{fontSize: '13px', color: '#374151'}}>{r.open}</td>
                  <td className="px-4 py-3" style={{fontSize: '13px', color: '#10B981', fontWeight: 600}}>+{r.import_}</td>
                  <td className="px-4 py-3" style={{fontSize: '13px', color: '#F59E0B', fontWeight: 600}}>-{r.export_}</td>
                  <td className="px-4 py-3">
                    <span style={{fontSize: '14px', fontWeight: 700, color: low ? '#EF4444' : '#10B981'}}>{r.close}</span>
                    {low && <span style={{fontSize: '11px', color: '#EF4444', marginLeft: '4px'}}>({r.min} min)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-500" />
          <h3 style={{fontSize: '14px', fontWeight: 600, color: '#EF4444'}}>Nguyên liệu cần đặt hàng ({alerts.length})</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Nguyên liệu", "Tồn hiện tại", "Mức tối thiểu", "Đề xuất nhập"].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {alerts.map(a => (
              <tr key={a.name} className="hover:bg-red-50/50">
                <td className="px-4 py-3" style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{a.name}</td>
                <td className="px-4 py-3" style={{fontSize: '14px', fontWeight: 700, color: '#EF4444'}}>{a.current} {a.unit}</td>
                <td className="px-4 py-3" style={{fontSize: '13px', color: '#9CA3AF'}}>{a.min} {a.unit}</td>
                <td className="px-4 py-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full" style={{fontSize: '13px', fontWeight: 600}}>
                    {a.suggested} {a.unit}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
