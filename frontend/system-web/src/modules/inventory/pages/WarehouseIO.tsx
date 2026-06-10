import { useEffect, useMemo, useState } from "react";
import { Download, TrendingUp, Package, DollarSign, ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import { loadInventoryData, type InventoryStockNote } from "../../../features/inventory-data";
import { Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";

type Filter = "all" | "import" | "export";

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const partnerName = (note: InventoryStockNote) => {
  if (note.type === "import") return note.supplier || "Nhà cung cấp";
  return note.reason || "Luân chuyển nội bộ";
};

export function WarehouseIO() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<InventoryStockNote[]>([]);
  const [stockValue, setStockValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        setLoading(true);
        setError("");
        const data = await loadInventoryData();
        if (!mounted) return;
        setHistory(data.stockNotes);
        setStockValue(data.ingredients.reduce((sum, item) => sum + item.current * item.price, 0));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Không tải được lịch sử kho từ CSDL.");
        setHistory([]);
        setStockValue(0);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => history.filter(h => {
    const keyword = search.trim().toLowerCase();
    const matchType = filter === "all" || h.type === filter;
    const matchSearch = !keyword
      || h.id.toLowerCase().includes(keyword)
      || partnerName(h).toLowerCase().includes(keyword)
      || h.branch.toLowerCase().includes(keyword);
    return matchType && matchSearch;
  }), [filter, history, search]);
  const pagedHistory = useMemo(() => getPagedItems(filtered, page), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(filtered.length)));
  }, [filtered.length]);

  const totalImport = history.filter(h => h.type === "import").reduce((acc, h) => acc + h.total, 0);
  const totalExport = history.filter(h => h.type === "export").reduce((acc, h) => acc + h.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Lịch sử nhập / xuất kho</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Toàn bộ lịch sử giao dịch nguyên liệu</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{ fontSize: "13.5px" }}>
          <Download size={15} className="text-gray-500" /> Xuất Excel
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#6B7280" }}>Tổng nhập</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{formatCurrency(totalImport)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Package size={20} className="text-blue-600" />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#6B7280" }}>Số phiếu</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{history.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#6B7280" }}>Giá trị tồn kho</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{formatCurrency(stockValue)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex gap-2">
            {([["all", "Tất cả"], ["import", "Nhập kho"], ["export", "Xuất kho"]] as [Filter, string][]).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filter === k ? "bg-[#0F4761] text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                style={{ fontSize: "13px" }}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm mã phiếu, đối tác..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
              style={{ fontSize: "13px", width: "220px" }}
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Mã phiếu", "Ngày", "Loại", "Đối tác", "Chi nhánh", "Số MH", "Tổng tiền"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>Đang tải dữ liệu...</td>
              </tr>
            )}
            {!loading && pagedHistory.map(h => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span style={{ fontSize: "13px", fontWeight: 600, color: h.type === "import" ? "#10B981" : "#F59E0B" }}>{h.id}</span>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{h.date}</td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${h.type === "import" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-600"}`}>
                    {h.type === "import" ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
                    <span style={{ fontSize: "11.5px", fontWeight: 500 }}>{h.type === "import" ? "Nhập kho" : "Xuất kho"}</span>
                  </div>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151" }}>{partnerName(h)}</td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{h.branch || "-"}</td>
                <td className="px-4 py-3 text-center" style={{ fontSize: "13px", color: "#374151" }}>{h.items.length}</td>
                <td className="px-4 py-3" style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{formatCurrency(h.total)}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>Không tìm thấy kết quả phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={page}
          total={filtered.length}
          onPageChange={setPage}
          itemLabel="phieu"
          extraContent={(
            <div className="flex gap-4">
              <span style={{ fontSize: "12.5px", color: "#10B981" }}>Nhap: {history.filter(h => h.type === "import").length} phieu</span>
              <span style={{ fontSize: "12.5px", color: "#F59E0B" }}>Xuat: {history.filter(h => h.type === "export").length} phieu - {formatCurrency(totalExport)}</span>
            </div>
          )}
        />
        <div className="hidden">
          <span style={{ fontSize: "12.5px", color: "#6B7280" }}>Hiển thị {filtered.length} / {history.length} phiếu</span>
          <div className="flex gap-4">
            <span style={{ fontSize: "12.5px", color: "#10B981" }}>Nhập: {history.filter(h => h.type === "import").length} phiếu</span>
            <span style={{ fontSize: "12.5px", color: "#F59E0B" }}>Xuất: {history.filter(h => h.type === "export").length} phiếu - {formatCurrency(totalExport)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
