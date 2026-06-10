import { useEffect, useMemo, useState } from "react";
import { Edit2, Loader2, Mail, MapPin, Package, Phone, Plus, Save, Search, Star, Trash2, TrendingUp, X } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { SupplierRequestDto } from "../../../lib/types";
import { loadInventoryData, type InventoryData, type InventorySupplier } from "../../inventory-data";

const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";

interface SupplierModalProps {
  supplier: InventorySupplier | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function SupplierModal({ supplier, onClose, onSaved }: SupplierModalProps) {
  const isNew = !supplier;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: supplier?.name || "",
    contact: supplier?.contact || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    address: supplier?.address || "",
    status: supplier?.status || "active",
    note: supplier?.note || "",
  });

  const update = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      setError("Tên nhà cung cấp và địa chỉ không được để trống.");
      return;
    }

    const payload: SupplierRequestDto = {
      supplierName: form.name.trim(),
      address: form.address.trim(),
      status: form.status,
      contactPerson: form.contact.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      note: form.note.trim(),
      urlImg: null,
    };

    try {
      setSaving(true);
      setError("");
      if (supplier) {
        await api.put(`/suppliers/${supplier.id}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được nhà cung cấp.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-xl" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">{isNew ? "Thêm nhà cung cấp" : "Chỉnh sửa nhà cung cấp"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tên công ty / nhà cung cấp *</label>
            <input value={form.name} onChange={e => update("name", e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Người liên hệ</label>
            <input value={form.contact} onChange={e => update("contact", e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Số điện thoại</label>
            <input value={form.phone} onChange={e => update("phone", e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Trạng thái</label>
            <select value={form.status} onChange={e => update("status", e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500" style={{ borderColor: "#E5E7EB" }}>
              <option value="active">Đang hợp tác</option>
              <option value="inactive">Ngừng hợp tác</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Địa chỉ *</label>
            <input value={form.address} onChange={e => update("address", e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Ghi chú</label>
            <textarea value={form.note} onChange={e => update("note", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 resize-none" style={{ borderColor: "#E5E7EB" }} />
          </div>
          {error && <div className="col-span-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: ACCENT }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isNew ? "Thêm nhà cung cấp" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WMSuppliersPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<InventorySupplier | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await loadInventoryData(branchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu nhà cung cấp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [branchId]);

  const suppliers = data?.suppliers || [];
  const ingredients = data?.ingredients || [];

  const filtered = useMemo(() => suppliers.filter(supplier => {
    const keyword = search.trim().toLowerCase();
    return !keyword
      || supplier.name.toLowerCase().includes(keyword)
      || supplier.contact.toLowerCase().includes(keyword)
      || supplier.category.toLowerCase().includes(keyword);
  }), [suppliers, search]);

  const detail = suppliers.find(supplier => supplier.id === detailId);
  const totalValue = suppliers.reduce((sum, supplier) => sum + supplier.totalValue, 0);
  const activeSuppliers = suppliers.filter(supplier => supplier.status === "active");
  const avgOnTime = activeSuppliers.length
    ? Math.round(activeSuppliers.reduce((sum, supplier) => sum + supplier.onTimeRate, 0) / activeSuppliers.length)
    : 0;

  const deleteSupplier = async (supplier: InventorySupplier) => {
    if (!window.confirm(`Xóa nhà cung cấp "${supplier.name}"?`)) return;
    try {
      await api.del(`/suppliers/${supplier.id}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được nhà cung cấp.");
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900" style={{ fontSize: 20 }}>Nhà cung cấp</h2>
          <p className="text-sm text-gray-500 mt-0.5">Dữ liệu lấy từ bảng supplier và liên kết supplier-ingredient</p>
        </div>
        <button onClick={() => setEditTarget(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>
          <Plus size={15} /> Thêm nhà cung cấp
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng nhà cung cấp", value: `${suppliers.length} đối tác`, color: PRIMARY },
          { label: "Đang hợp tác", value: `${activeSuppliers.length} đối tác`, color: "#059669" },
          { label: "Tổng giá trị nhập", value: `${(totalValue / 1000000).toFixed(1)}M đ`, color: "#2563EB" },
          { label: "Tỷ lệ đúng hạn TB", value: `${avgOnTime}%`, color: "#D97706" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="font-bold mt-0.5" style={{ color: card.color, fontSize: 20 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhà cung cấp, người liên hệ..." className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 bg-white" style={{ borderColor: "#E5E7EB" }} />
          </div>

          <div className="space-y-3">
            {loading && <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-sm text-gray-400">Đang tải dữ liệu...</div>}
            {!loading && filtered.map(supplier => {
              const ingCount = ingredients.filter(ingredient => ingredient.supplierId === supplier.id).length;
              const isActive = detailId === supplier.id;
              return (
                <div
                  key={supplier.id}
                  className="bg-white rounded-2xl p-4 border-2 cursor-pointer transition-all"
                  style={{ borderColor: isActive ? ACCENT : "#F3F4F6", boxShadow: isActive ? `0 0 0 3px ${ACCENT}22` : "0 1px 4px rgba(0,0,0,0.06)" }}
                  onClick={() => setDetailId(isActive ? null : supplier.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold" style={{ backgroundColor: "#E8F5F0", color: PRIMARY }}>
                      {supplier.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-800">{supplier.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{supplier.contact || "Chưa có người liên hệ"} · {supplier.phone || "Chưa có SĐT"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: supplier.status === "active" ? "#ECFDF5" : "#F3F4F6", color: supplier.status === "active" ? "#059669" : "#6B7280" }}>
                            {supplier.status === "active" ? "Hoạt động" : "Ngừng"}
                          </span>
                          <button onClick={event => { event.stopPropagation(); setEditTarget(supplier); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-emerald-700"><Edit2 size={13} /></button>
                          <button onClick={event => { event.stopPropagation(); void deleteSupplier(supplier); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{supplier.category}</span>
                        <span className="text-xs text-gray-400">{ingCount} mặt hàng</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={11} style={{ fill: i < supplier.rating ? "#F59E0B" : "transparent", color: i < supplier.rating ? "#F59E0B" : "#D1D5DB" }} />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-800">{supplier.totalOrders}</p>
                          <p className="text-xs text-gray-400">Đơn nhập</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-800">{(supplier.totalValue / 1000000).toFixed(1)}M đ</p>
                          <p className="text-xs text-gray-400">Tổng giá trị</p>
                        </div>
                        {supplier.note && <p className="text-xs text-gray-400 italic flex-1 truncate">{supplier.note}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filtered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400 text-sm">Không có dữ liệu trong database</div>}
          </div>
        </div>

        <div className="space-y-3">
          {detail ? (
            <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">Chi tiết nhà cung cấp</h3>
                <button onClick={() => setDetailId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-3" style={{ backgroundColor: "#E8F5F0", color: PRIMARY }}>{detail.name.charAt(0)}</div>
              <p className="font-bold text-gray-800 text-center">{detail.name}</p>

              <div className="space-y-2.5 mt-4">
                {[{ icon: <Phone size={13} />, label: detail.phone || "Chưa có SĐT" }, { icon: <Mail size={13} />, label: detail.email || "Chưa có email" }, { icon: <MapPin size={13} />, label: detail.address || "Chưa có địa chỉ" }].map((row, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0 text-gray-400">{row.icon}</div>
                    <p className="text-xs text-gray-600">{row.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Nguyên liệu cung cấp</p>
                <div className="space-y-1.5">
                  {ingredients.filter(ingredient => ingredient.supplierId === detail.id).map(ingredient => (
                    <div key={ingredient.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Package size={11} style={{ color: ACCENT }} />
                        <span className="text-xs text-gray-700">{ingredient.name}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: ingredient.current <= ingredient.minLevel ? "#DC2626" : "#059669" }}>{ingredient.current} {ingredient.unit}</span>
                    </div>
                  ))}
                  {ingredients.filter(ingredient => ingredient.supplierId === detail.id).length === 0 && <p className="text-xs text-gray-400 text-center py-2">Chưa liên kết nguyên liệu</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#E8F5F0" }}><TrendingUp size={20} style={{ color: PRIMARY }} /></div>
              <p className="text-sm font-medium text-gray-600">Chọn nhà cung cấp</p>
              <p className="text-xs text-gray-400 mt-1">Nhấn vào thẻ để xem chi tiết và danh sách nguyên liệu</p>
            </div>
          )}
        </div>
      </div>

      {editTarget !== undefined && <SupplierModal supplier={editTarget} onClose={() => setEditTarget(undefined)} onSaved={loadData} />}
    </div>
  );
}
