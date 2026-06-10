import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Edit2, Filter, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { IngredientRequestDto } from "../../../lib/types";
import { loadInventoryData, type InventoryData, type InventoryIngredient } from "../../inventory-data";

const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";

function stockStatus(ing: InventoryIngredient) {
  if (ing.minLevel > 0 && ing.current <= ing.minLevel * 0.5) return { label: "Nguy cấp", color: "#DC2626", bg: "#FEF2F2" };
  if (ing.minLevel > 0 && ing.current <= ing.minLevel) return { label: "Cảnh báo", color: "#D97706", bg: "#FFFBEB" };
  return { label: "Đủ hàng", color: "#059669", bg: "#ECFDF5" };
}

interface EditModalProps {
  ingredient: InventoryIngredient | null;
  data: InventoryData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function EditModal({ ingredient, data, onClose, onSaved }: EditModalProps) {
  const isNew = !ingredient;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: ingredient?.name || "",
    category: ingredient?.category || data.categoryOptions[0]?.name || "",
    unit: ingredient?.unit || "",
    status: ingredient?.status === "inactive" ? "inactive" : "active",
  });

  const update = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Tên nguyên liệu không được để trống.");
      return;
    }

    const categoryId = data.categoryOptions.find(category => category.name === form.category)?.id ?? ingredient?.categoryId ?? null;
    const payload: IngredientRequestDto = {
      ingredientName: form.name.trim(),
      iCategoryId: categoryId,
      unit: form.unit.trim() || null,
      status: form.status as "active" | "inactive",
    };

    try {
      setSaving(true);
      setError("");
      if (ingredient) {
        await api.put(`/ingredients/${ingredient.id}`, payload);
      } else {
        await api.post("/ingredients", payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được nguyên liệu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{isNew ? "Thêm nguyên liệu mới" : "Chỉnh sửa nguyên liệu"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tên nguyên liệu *</label>
            <input
              value={form.name}
              onChange={e => update("name", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Danh mục</label>
            <select
              value={form.category}
              onChange={e => update("category", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "#E5E7EB" }}
            >
              {data.categoryOptions.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
              {data.categoryOptions.length === 0 && <option value="">Chưa có danh mục</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Đơn vị tính</label>
            <input
              value={form.unit}
              onChange={e => update("unit", e.target.value)}
              placeholder="kg, lít, hộp..."
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Trạng thái</label>
            <select
              value={form.status}
              onChange={e => update("status", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "#E5E7EB" }}
            >
              <option value="active">Đang dùng</option>
              <option value="inactive">Ngừng dùng</option>
            </select>
          </div>
          {!isNew && (
            <div className="col-span-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
              Tồn kho, mức tối thiểu, nhà cung cấp và vị trí được lấy từ bảng tồn kho/liên kết nhà cung cấp trong database.
            </div>
          )}
          {error && <div className="col-span-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200">Hủy</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isNew ? "Thêm nguyên liệu" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WMIngredientsPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [editTarget, setEditTarget] = useState<InventoryIngredient | null | undefined>(undefined);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await loadInventoryData(branchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu nguyên liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [branchId]);

  const ingredients = data?.ingredients || [];
  const categories = data?.categories || [];

  const filtered = useMemo(() => ingredients.filter(ing => {
    const keyword = search.trim().toLowerCase();
    const matchSearch = !keyword || ing.name.toLowerCase().includes(keyword) || ing.supplier.toLowerCase().includes(keyword);
    const matchCat = categoryFilter === "Tất cả" || ing.category === categoryFilter;
    const matchStatus = statusFilter === "Tất cả" || stockStatus(ing).label === statusFilter;
    return matchSearch && matchCat && matchStatus;
  }), [ingredients, search, categoryFilter, statusFilter]);

  const counts = {
    ok: ingredients.filter(i => stockStatus(i).label === "Đủ hàng").length,
    warn: ingredients.filter(i => stockStatus(i).label === "Cảnh báo").length,
    critical: ingredients.filter(i => stockStatus(i).label === "Nguy cấp").length,
  };
  const totalValue = ingredients.reduce((sum, item) => sum + item.current * item.price, 0);

  const deleteIngredient = async (ingredient: InventoryIngredient) => {
    if (!window.confirm(`Xóa nguyên liệu "${ingredient.name}"?`)) return;
    try {
      await api.del(`/ingredients/${ingredient.id}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được nguyên liệu.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900" style={{ fontSize: 20 }}>Danh mục nguyên liệu</h2>
          <p className="text-sm text-gray-500 mt-0.5">Dữ liệu được tải từ database qua API inventory-service</p>
        </div>
        <button onClick={() => setEditTarget(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>
          <Plus size={15} /> Thêm nguyên liệu
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng nguyên liệu", value: `${ingredients.length} SKU`, color: PRIMARY, filter: "Tất cả", sub: `${(totalValue / 1000000).toFixed(1)}M đ` },
          { label: "Đủ hàng", value: `${counts.ok} mặt hàng`, color: "#059669", filter: "Đủ hàng" },
          { label: "Cảnh báo", value: `${counts.warn} mặt hàng`, color: "#D97706", filter: "Cảnh báo" },
          { label: "Nguy cấp", value: `${counts.critical} mặt hàng`, color: "#DC2626", filter: "Nguy cấp" },
        ].map(card => (
          <button
            key={card.label}
            onClick={() => setStatusFilter(card.filter)}
            className="bg-white rounded-2xl p-4 border-2 text-left transition-all"
            style={{ borderColor: statusFilter === card.filter ? card.color : "#F3F4F6", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="font-bold mt-0.5" style={{ color: card.color, fontSize: 18 }}>{card.value}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-0.5">Tổng: {card.sub}</p>}
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm nguyên liệu, nhà cung cấp..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500"
            style={{ borderColor: "#E5E7EB" }}
          />
        </div>
        <div className="relative">
          <button onClick={() => setShowCatDropdown(!showCatDropdown)} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: "#E5E7EB" }}>
            <Filter size={13} className="text-gray-400" />
            <span className="text-gray-600">{categoryFilter}</span>
            <ChevronDown size={13} className="text-gray-400" />
          </button>
          {showCatDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCatDropdown(false)} />
              <div className="absolute top-full mt-1 left-0 bg-white rounded-xl border border-gray-100 py-1 z-20 min-w-[200px]" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                {["Tất cả", ...categories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategoryFilter(cat); setShowCatDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm"
                    style={{ backgroundColor: categoryFilter === cat ? "#F0FDF4" : "transparent", color: categoryFilter === cat ? ACCENT : "#374151" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 ml-auto">Hiển thị {filtered.length}/{ingredients.length}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["Nguyên liệu", "Danh mục", "Tồn kho", "Mức tồn", "Đơn giá", "Nhà cung cấp", "Vị trí", "Trạng thái", ""].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">Đang tải dữ liệu...</td></tr>}
              {!loading && filtered.map(ing => {
                const status = stockStatus(ing);
                const pct = ing.minLevel > 0 ? Math.min(Math.round((ing.current / ing.minLevel) * 100), 100) : 0;
                return (
                  <tr key={ing.id} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{ing.name}</p>
                      {ing.expiry && <p className="text-xs text-red-500">HSD: {ing.expiry}</p>}
                    </td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{ing.category}</span></td>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: status.color }}>{ing.current} {ing.unit}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: status.color }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Min: {ing.minLevel} {ing.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{new Intl.NumberFormat("vi-VN").format(ing.price)}đ/{ing.unit}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{ing.supplier || "Chưa liên kết"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{ing.location || "Chưa có"}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditTarget(ing)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-emerald-700"><Edit2 size={13} /></button>
                        <button onClick={() => void deleteIngredient(ing)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">Không có dữ liệu trong database</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget !== undefined && data && <EditModal ingredient={editTarget} data={data} onClose={() => setEditTarget(undefined)} onSaved={loadData} />}
    </div>
  );
}
