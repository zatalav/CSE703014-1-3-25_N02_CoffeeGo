import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, FileText, Loader2, Package, Search, ShoppingBag, X } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { RestockRequestCreateRequestDto } from "../../../lib/types";
import { loadInventoryData, type InventoryData, type InventoryIngredient } from "../../inventory-data";

interface ImportRequestItem {
  ingredientId: number;
  qty: string;
}

function levelPct(item: InventoryIngredient) {
  if (!item.minLevel) return item.current > 0 ? 100 : 0;
  return Math.min(100, (item.current / item.minLevel) * 100);
}

function getStatus(item: InventoryIngredient): "critical" | "warning" | "ok" {
  const pct = levelPct(item);
  if (pct < 50) return "critical";
  if (pct < 100) return "warning";
  return "ok";
}

function suggestedRequestQty(item: InventoryIngredient) {
  const shortage = Math.max(0, item.minLevel - item.current);
  return Math.max(1, Math.ceil(shortage || item.minLevel || 1));
}

export function BMInventoryPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const employeeId = session?.userInfo?.id ?? null;
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [filter, setFilter] = useState<"all" | "low" | "ok">("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestItems, setRequestItems] = useState<ImportRequestItem[]>([]);
  const [requestNote, setRequestNote] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestError, setRequestError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await loadInventoryData(branchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu tồn kho.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [branchId]);

  const ingredients = data?.ingredients || [];
  const categories = ["Tất cả", ...(data?.categories || [])];
  const branchName = data?.branches.find(branch => branch.id === branchId)?.name
    || (branchId ? `Chi nhánh #${branchId}` : "Chi nhánh");

  const filtered = useMemo(() => ingredients.filter(item => {
    const keyword = search.trim().toLowerCase();
    const matchSearch = !keyword || item.name.toLowerCase().includes(keyword);
    const matchCat = category === "Tất cả" || item.category === category;
    const status = getStatus(item);
    const matchFilter = filter === "all" || (filter === "low" && status !== "ok") || (filter === "ok" && status === "ok");
    return matchSearch && matchCat && matchFilter;
  }), [ingredients, search, category, filter]);

  const critical = ingredients.filter(item => getStatus(item) === "critical").length;
  const warning = ingredients.filter(item => getStatus(item) === "warning").length;
  const ok = ingredients.filter(item => getStatus(item) === "ok").length;

  const openRequestModal = () => {
    const lowItems = ingredients.filter(item => getStatus(item) !== "ok");
    setRequestItems(lowItems.map(item => ({ ingredientId: item.id, qty: String(suggestedRequestQty(item)) })));
    setShowRequestModal(true);
    setRequestSent(false);
    setRequestError("");
  };

  const sendRequest = async () => {
    if (!branchId || !employeeId) {
      setRequestError("Không xác định được chi nhánh hoặc người gửi. Vui lòng đăng nhập lại.");
      return;
    }

    const items = requestItems
      .map(requestItem => {
        const item = ingredients.find(ingredient => ingredient.id === requestItem.ingredientId);
        const quantity = Number(requestItem.qty);
        if (!item || !Number.isFinite(quantity) || quantity <= 0) return null;
        return {
          ingredientId: item.id,
          quantity,
          unit: item.unit,
          currentQuantity: item.current,
          minQuantity: item.minLevel,
        };
      })
      .filter(Boolean) as RestockRequestCreateRequestDto["items"];

    if (items.length === 0) {
      setRequestError("Vui lòng nhập số lượng cần đặt cho ít nhất một nguyên liệu.");
      return;
    }

    const payload: RestockRequestCreateRequestDto = {
      branchId,
      employeeId,
      note: requestNote.trim() || null,
      items,
    };

    try {
      setRequestSaving(true);
      setRequestError("");
      await api.post("/admin/inventory/restock-requests", payload);
      window.dispatchEvent(new Event("coffee.inventory.changed"));
      setRequestSent(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSent(false);
        setRequestNote("");
      }, 1500);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Không gửi được yêu cầu nhập hàng.");
    } finally {
      setRequestSaving(false);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ color: "#111827" }}>Kho nguyên liệu</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branchName} · dữ liệu lấy từ database</p>
        </div>
        <button onClick={openRequestModal} className="flex items-center gap-2 px-4 py-2.5 text-sm text-white rounded-xl font-medium shadow-sm" style={{ backgroundColor: critical > 0 ? "#EF4444" : "#1a5276" }}>
          <ShoppingBag size={15} />
          Tạo yêu cầu nhập hàng
          {critical > 0 && <span className="bg-white text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{critical}</span>}
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Cần đặt ngay", count: critical, color: "#EF4444", filter: "low" as const },
          { label: "Cảnh báo thấp", count: warning, color: "#F59E0B", filter: "low" as const },
          { label: "Đủ tồn kho", count: ok, color: "#10B981", filter: "ok" as const },
        ].map(card => (
          <button key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 text-left transition-all" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} onClick={() => setFilter(current => current === card.filter && card.count > 0 ? "all" : card.filter)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">mặt hàng</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nguyên liệu..." className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none text-gray-700">
          {categories.map(item => <option key={item}>{item}</option>)}
        </select>
        {filter !== "all" && (
          <button onClick={() => setFilter("all")} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 rounded-xl text-gray-600">
            <X size={13} /> Xóa lọc
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["Nguyên liệu", "Danh mục", "Tồn kho", "Mức tồn min", "Trạng thái", "Vị trí", "Nhà cung cấp"].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Đang tải dữ liệu...</td></tr>}
              {!loading && filtered.map(item => {
                const status = getStatus(item);
                const pct = levelPct(item);
                const statusColor = status === "critical" ? "#EF4444" : status === "warning" ? "#F59E0B" : "#10B981";
                const statusBg = status === "critical" ? "#FEE2E2" : status === "warning" ? "#FEF3C7" : "#D1FAE5";
                const statusLabel = status === "critical" ? "Cần đặt" : status === "warning" ? "Sắp hết" : "Đủ";
                return (
                  <tr key={item.id} className="transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statusBg }}>
                          <Package size={14} style={{ color: statusColor }} />
                        </div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.category}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: statusColor }}>{item.current} {item.unit}</span>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: statusColor }} /></div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-500">{item.minLevel} {item.unit}</span></td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 w-fit px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: statusBg, color: statusColor }}>
                        {status === "ok" ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-500">{item.location || "Chưa có"}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-gray-500">{item.supplier || "Chưa liên kết"}</span></td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">Không có dữ liệu tồn kho trong database</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">Hiển thị <span className="font-medium text-gray-700">{filtered.length}</span> / {ingredients.length} nguyên liệu</p>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRequestModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxWidth: 540, maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ backgroundColor: "#1a5276" }}>
              <div>
                <p className="text-white font-semibold">Yêu cầu nhập hàng nguyên liệu</p>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{branchName} · {new Date().toLocaleDateString("vi-VN")}</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}><X size={16} className="text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {!requestSent ? (
                <>
                  <p className="text-sm text-gray-600">Danh sách nguyên liệu cần đặt (<span className="font-semibold text-red-600">{requestItems.length} mặt hàng</span>):</p>
                  {requestItems.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Không có nguyên liệu dưới mức tối thiểu.</p>}
                  {requestItems.map((requestItem, idx) => {
                    const item = ingredients.find(ingredient => ingredient.id === requestItem.ingredientId);
                    if (!item) return null;
                    const status = getStatus(item);
                    return (
                      <div key={requestItem.ingredientId} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: status === "critical" ? "#FCA5A5" : "#FDE68A", backgroundColor: status === "critical" ? "#FFF5F5" : "#FFFBEB" }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status === "critical" ? "#EF4444" : "#F59E0B" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">Tồn: {item.current} {item.unit} | Tối thiểu: {item.minLevel} {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input type="number" min={0} placeholder="SL" value={requestItem.qty} onChange={e => setRequestItems(prev => prev.map((row, i) => i === idx ? { ...row, qty: e.target.value } : row))} className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 text-center" />
                          <span className="text-xs text-gray-500">{item.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                  <textarea value={requestNote} onChange={e => setRequestNote(e.target.value)} placeholder="Ghi chú cho kho trung tâm..." rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none" />
                  {requestError && <p className="text-xs text-red-600">{requestError}</p>}
                </>
              ) : (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4"><CheckCircle size={28} className="text-green-600" /></div>
                  <p className="text-gray-800 font-semibold">Yêu cầu nhập hàng đã được gửi đến quản lý kho.</p>
                  <p className="text-sm text-gray-500 mt-1">Dữ liệu đã được lưu vào inventory-service.</p>
                </div>
              )}
            </div>

            {!requestSent && (
              <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setShowRequestModal(false)} disabled={requestSaving} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl bg-white disabled:opacity-60">Hủy</button>
                <button onClick={() => void sendRequest()} disabled={requestSaving || requestItems.length === 0} className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: "#1a5276" }}>
                  {requestSaving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                  Gửi yêu cầu
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
