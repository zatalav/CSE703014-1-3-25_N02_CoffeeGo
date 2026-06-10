import { useEffect, useState } from "react";
import { Edit, Eye, EyeOff, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import type {
  IngredientCategoryDto,
  IngredientCategoryRequest,
  IngredientDto,
  IngredientRequestDto,
  PageResponse,
} from "../../../lib/types";

type ToppingStatus = "available" | "out";

type Topping = {
  id: number;
  categoryId: number;
  name: string;
  unit: string;
  price: number;
  status: ToppingStatus;
};

type ToppingForm = {
  name: string;
  unit: string;
  price: string;
  status: ToppingStatus;
};

const TOPPING_CATEGORY_NAME = "topping";
const DEFAULT_UNIT = "phan";

const emptyForm: ToppingForm = {
  name: "",
  unit: DEFAULT_UNIT,
  price: "5000",
  status: "available",
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const categoryIdOf = (dto: IngredientCategoryDto) => {
  const value = (dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId;
  return Number(value || 0);
};

const categoryNameOf = (dto: IngredientCategoryDto) =>
  String((dto as any).iCategoryName ?? (dto as any).icategoryName ?? (dto as any).ICategoryName ?? "");

const ingredientCategoryIdOf = (dto: IngredientDto) => {
  const value = (dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId;
  return Number(value || 0);
};

const isToppingCategory = (dto: IngredientCategoryDto) =>
  categoryNameOf(dto).trim().toLowerCase() === TOPPING_CATEGORY_NAME;

const toToppingStatus = (status?: string | null): ToppingStatus => (status === "inactive" ? "out" : "available");

const toIngredientStatus = (status: ToppingStatus): "active" | "inactive" =>
  status === "available" ? "active" : "inactive";

const formatMoney = (value: number) => `${Math.max(0, value).toLocaleString("vi-VN")}đ`;

const toTopping = (dto: IngredientDto): Topping => ({
  id: Number(dto.ingredientId),
  categoryId: ingredientCategoryIdOf(dto),
  name: dto.ingredientName || `Topping #${dto.ingredientId}`,
  unit: dto.unit || DEFAULT_UNIT,
  price: Number(dto.toppingPrice ?? 0),
  status: toToppingStatus(dto.status),
});

const toRequest = (form: ToppingForm, categoryId: number): IngredientRequestDto => ({
  iCategoryId: categoryId,
  icategoryId: categoryId,
  ingredientName: form.name.trim(),
  unit: form.unit.trim() || DEFAULT_UNIT,
  toppingPrice: Number(form.price || 0),
  status: toIngredientStatus(form.status),
});

export function Toppings() {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [toppingCategoryId, setToppingCategoryId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Topping | null>(null);
  const [deleting, setDeleting] = useState<Topping | null>(null);
  const [form, setForm] = useState<ToppingForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryData, ingredientData] = await Promise.all([
        api.get<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=100&sort=iCategoryId,asc"),
        api.get<PageResponse<IngredientDto> | IngredientDto[]>("/ingredients?size=500&sort=ingredientId,asc"),
      ]);

      const categories = pageItems(categoryData);
      const toppingCategory = categories.find(isToppingCategory);
      const categoryId = toppingCategory ? categoryIdOf(toppingCategory) : null;
      const ingredientRows = categoryId
        ? pageItems(ingredientData)
            .filter(item => ingredientCategoryIdOf(item) === categoryId)
            .map(toTopping)
        : [];

      setToppingCategoryId(categoryId);
      setToppings(ingredientRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách topping");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const ensureToppingCategory = async () => {
    if (toppingCategoryId) return toppingCategoryId;

    const categoryData = await api.get<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=100&sort=iCategoryId,asc");
    const existing = pageItems(categoryData).find(isToppingCategory);
    const existingId = existing ? categoryIdOf(existing) : 0;
    if (existingId) {
      setToppingCategoryId(existingId);
      return existingId;
    }

    const request: IngredientCategoryRequest = { iCategoryName: TOPPING_CATEGORY_NAME };
    const created = await api.post<IngredientCategoryDto>("/ingredient-categories", request);
    const createdId = categoryIdOf(created);
    if (!createdId) {
      throw new Error("Không thể tạo danh mục topping");
    }
    setToppingCategoryId(createdId);
    return createdId;
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (topping: Topping) => {
    setEditItem(topping);
    setForm({ name: topping.name, unit: topping.unit || DEFAULT_UNIT, price: String(topping.price || 0), status: topping.status });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Tên topping là bắt buộc");
      return;
    }
    if (Number(form.price) < 0 || !Number.isFinite(Number(form.price))) {
      toast.error("Giá topping phải là số không âm");
      return;
    }

    setSaving(true);
    try {
      const categoryId = await ensureToppingCategory();
      const request = toRequest(form, categoryId);
      if (editItem) {
        await api.put<IngredientDto>(`/ingredients/${editItem.id}`, request);
        toast.success("Đã cập nhật topping vào bảng nguyên liệu");
      } else {
        await api.post<IngredientDto>("/ingredients", request);
        toast.success("Đã thêm topping vào bảng nguyên liệu");
      }
      closeModal();
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu topping");
    } finally {
      setSaving(false);
    }
  };

  const hideTopping = async (topping: Topping) => {
    try {
      await api.patch<IngredientDto>(`/ingredients/${topping.id}/inactive`);
      toast.success("Đã ẩn topping");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể ẩn topping");
    }
  };

  const showTopping = async (topping: Topping) => {
    try {
      await api.patch<IngredientDto>(`/ingredients/${topping.id}/active`);
      toast.success("Đã mở lại topping");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể mở lại topping");
    }
  };

  const deleteTopping = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);
    try {
      await api.del<void>(`/ingredients/${target.id}`);
      toast.success("Đã xóa topping");
      await loadData();
      setToppings(prev => prev.filter(topping => topping.id !== target.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa topping");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Quản lý Topping</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {loading ? "Đang tải dữ liệu..." : `${toppings.length} topping từ bảng nguyên liệu`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadData()} className="p-2.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50" title="Tải lại">
            <RefreshCw size={16} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: "13.5px" }}>
            <Plus size={16} /> Thêm topping
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between gap-3">
          <span style={{ fontSize: "13px", color: "#B91C1C" }}>{error}</span>
          <button onClick={() => void loadData()} className="px-3 py-1.5 bg-white border border-red-100 text-red-600 rounded-lg" style={{ fontSize: "12.5px" }}>
            Tải lại
          </button>
        </div>
      )}

      {!loading && toppings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500" style={{ fontSize: "13px" }}>
          Chưa có topping nào trong danh mục nguyên liệu topping.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {toppings.map(topping => (
          <div key={topping.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
            <div className={`h-28 flex items-center justify-center ${topping.status === "out" ? "bg-gray-100" : "bg-amber-50"}`}>
              <span className="w-14 h-14 rounded-full bg-white border border-amber-100 flex items-center justify-center text-[#0F4761]" style={{ fontSize: "24px", fontWeight: 800 }}>
                {topping.name.trim().charAt(0).toUpperCase() || "T"}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{topping.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${topping.status === "available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {topping.status === "available" ? "Có sẵn" : "Hết hàng"}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "6px" }}>Đơn vị: {topping.unit || DEFAULT_UNIT}</p>
              <p style={{ fontSize: "13px", color: "#0F4761", marginTop: "4px", fontWeight: 700 }}>
                Giá: {formatMoney(topping.price)}
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(topping)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1" style={{ fontSize: "12.5px" }}>
                  <Edit size={13} /> Sửa
                </button>
                {topping.status === "available" ? (
                  <button onClick={() => void hideTopping(topping)} className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50" title="Ẩn topping">
                    <EyeOff size={14} />
                  </button>
                ) : (
                  <button onClick={() => void showTopping(topping)} className="p-1.5 border border-green-200 rounded-lg text-green-600 hover:bg-green-50" title="Mở lại topping">
                    <Eye size={14} />
                  </button>
                )}
                <button onClick={() => setDeleting(topping)} className="p-1.5 border border-red-200 rounded-lg text-red-400 hover:bg-red-50" title="Xóa topping">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0F4761" }}>{editItem ? "Sửa topping" : "Thêm topping mới"}</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Tên topping *</label>
                <input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} placeholder="VD: Tran chau den" />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Đơn vị</label>
                <input value={form.unit} onChange={event => setForm(prev => ({ ...prev, unit: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} placeholder={DEFAULT_UNIT} />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Giá topping (VND)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.price}
                  onFocus={event => event.currentTarget.select()}
                  onChange={event => setForm(prev => ({ ...prev, price: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                  style={{ fontSize: "13px" }}
                  placeholder="5000"
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Trạng thái</label>
                <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value as ToppingStatus }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: "13px" }}>
                  <option value="available">Có sẵn</option>
                  <option value="out">Hết hàng</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>
                Huy
              </button>
              <button onClick={() => void handleSave()} disabled={saving} className="flex-1 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{ fontSize: "13.5px" }}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteConfirmModal
          title="Xóa topping?"
          description={<>Topping <strong style={{ color: "#111827" }}>{deleting.name}</strong> sẽ bị xóa khỏi danh sách.</>}
          busy={deleteBusy}
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteTopping()}
        />
      )}
    </div>
  );
}
