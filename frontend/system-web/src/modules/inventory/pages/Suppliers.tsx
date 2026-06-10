import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Eye, Edit, EyeOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import { Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";
import type { IngredientDto, PageResponse, SupplierDto, SupplierIngredientDto, SupplierRequestDto } from "../../../lib/types";

type SupplierStatus = "active" | "paused" | "hidden";

type Supplier = {
  id: number | null;
  code: string;
  name: string;
  address: string;
  contact: string;
  phone: string;
  email: string;
  ingredients: string[];
  status: SupplierStatus;
  deliveryDays: number;
  moqValue: string;
  moqUnit: string;
  note: string;
};

const initialSuppliers: Supplier[] = [];
const moqUnits = ["ml", "g", "kg", "lít", "cái", "muỗng"];

const statusLabel: Record<SupplierStatus, string> = {
  active: "Đang hợp tác",
  paused: "Tạm ngừng",
  hidden: "Đã ẩn",
};

const statusColors: Record<SupplierStatus, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-600",
  hidden: "bg-gray-100 text-gray-500",
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};
const randomCode = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const supplierCode = (id: number) => `NCC-${((id * 7919) % 1679616).toString(36).toUpperCase().padStart(4, "0")}`;

const createEmptySupplier = (): Supplier => ({
  id: null,
  code: randomCode("NCC"),
  name: "",
  address: "",
  contact: "",
  phone: "",
  email: "",
  ingredients: [],
  status: "active",
  deliveryDays: 3,
  moqValue: "",
  moqUnit: "ml",
  note: "",
});

const toSupplier = (dto: SupplierDto, ingredientNames: Map<number, string>, links: SupplierIngredientDto[] = []): Supplier => ({
  id: dto.supplierId,
  code: supplierCode(dto.supplierId),
  name: dto.supplierName || "",
  address: dto.address || "",
  contact: dto.contactPerson || "",
  phone: dto.phone || "",
  email: dto.email || "",
  ingredients: links
    .filter(link => Number(link.supplierId) === Number(dto.supplierId))
    .map(link => ingredientNames.get(Number(link.ingredientId)) || `NL-${link.ingredientId}`),
  status: dto.status === "hidden" ? "hidden" : dto.status === "paused" || dto.status === "inactive" ? "paused" : "active",
  deliveryDays: Number(dto.deliveryTime || 0),
  moqValue: dto.moqValue == null ? "" : String(dto.moqValue),
  moqUnit: dto.moqUnit || "ml",
  note: dto.note || "",
});

const toRequest = (supplier: Supplier): SupplierRequestDto => ({
  supplierName: supplier.name.trim(),
  address: supplier.address.trim() || "Chưa cập nhật",
  status: supplier.status === "paused" ? "inactive" : supplier.status,
  contactPerson: supplier.contact.trim(),
  phone: supplier.phone.trim(),
  email: supplier.email.trim(),
  deliveryTime: supplier.deliveryDays,
  moqValue: supplier.moqValue ? Number(supplier.moqValue) : null,
  moqUnit: supplier.moqUnit,
  note: supplier.note.trim(),
  urlImg: null,
});

export function Suppliers() {
  const [items, setItems] = useState<Supplier[]>(initialSuppliers);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Supplier | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [hiding, setHiding] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const [supplierData, ingredientData] = await Promise.all([
        api.get<PageResponse<SupplierDto> | SupplierDto[]>("/suppliers?size=100&sort=supplierId,desc"),
        api.get<PageResponse<IngredientDto> | IngredientDto[]>("/ingredients?size=500&sort=ingredientId,asc"),
      ]);
      const suppliers = pageItems(supplierData);
      const ingredientNames = new Map(
        pageItems(ingredientData).map(item => [Number(item.ingredientId), item.ingredientName || `NL-${item.ingredientId}`]),
      );
      const supplierLinks = await Promise.all(
        suppliers.map(async supplier => {
          try {
            const links = await api.get<SupplierIngredientDto[]>(`/suppliers/${supplier.supplierId}/ingredients`);
            return links.map(link => ({ ...link, supplierId: supplier.supplierId }));
          } catch {
            return [];
          }
        }),
      );
      const linksBySupplier = new Map<number, SupplierIngredientDto[]>();
      supplierLinks.flat().forEach(link => {
        const supplierId = Number(link.supplierId);
        linksBySupplier.set(supplierId, [...(linksBySupplier.get(supplierId) || []), link]);
      });
      setItems(suppliers.map(supplier => toSupplier(supplier, ingredientNames, linksBySupplier.get(supplier.supplierId) || [])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải nhà cung cấp từ database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const ingredientOptions = useMemo(
    () => Array.from(new Set(items.flatMap(s => s.ingredients))).sort((a, b) => a.localeCompare(b, "vi")),
    [items],
  );

  const filtered = items.filter(s => {
    const normalizedSearch = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(normalizedSearch) ||
      s.contact.toLowerCase().includes(normalizedSearch) ||
      s.email.toLowerCase().includes(normalizedSearch) ||
      s.ingredients.some(ingredient => ingredient.toLowerCase().includes(normalizedSearch));
    const matchIngredient = ingredientFilter === "all" || s.ingredients.includes(ingredientFilter);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchIngredient && matchStatus;
  });
  const pagedSuppliers = getPagedItems(filtered, page);

  useEffect(() => {
    setPage(1);
  }, [ingredientFilter, search, statusFilter]);

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(filtered.length)));
  }, [filtered.length]);

  const openAdd = () => {
    setForm(createEmptySupplier());
    setShowModal(true);
  };

  const openEdit = (supplier: Supplier) => {
    setForm({ ...supplier });
    setShowModal(true);
  };

  const saveSupplier = async () => {
    if (!form?.name.trim()) {
      toast.error("Vui lòng nhập tên công ty.");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.put<SupplierDto>(`/suppliers/${form.id}`, toRequest(form));
        toast.success("Đã cập nhật nhà cung cấp");
      } else {
        await api.post<SupplierDto>("/suppliers", toRequest(form));
        toast.success("Đã thêm nhà cung cấp");
      }
      setShowModal(false);
      setForm(null);
      await loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu nhà cung cấp");
    } finally {
      setSaving(false);
    }
  };

  const hideSupplier = async () => {
    if (!hiding || !hideReason.trim()) return;

    if (!hiding.id) return;
    try {
      await api.patch<SupplierDto>(`/suppliers/${hiding.id}/hidden`);
      setHiding(null);
      setHideReason("");
      toast.success("Đã ẩn nhà cung cấp");
      await loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể ẩn nhà cung cấp");
    }
  };

  const activateSupplier = async (supplier: Supplier) => {
    if (!supplier.id) return;
    try {
      await api.patch<SupplierDto>(`/suppliers/${supplier.id}/active`);
      toast.success("Da mo lai nha cung cap");
      await loadSuppliers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the mo lai nha cung cap");
    }
  };

  const deleteSupplier = async () => {
    if (!deleting?.id) return;
    const target = deleting;
    setDeleteBusy(true);
    try {
      await api.del<void>(`/suppliers/${target.id}`);
      toast.success("Da xoa nha cung cap");
      await loadSuppliers();
      setItems(prev => prev.filter(item => item.id !== target.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa nha cung cap");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Quản lý nhà cung cấp</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>{items.length} nhà cung cấp đang hợp tác</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{fontSize: '13.5px'}}>
          <Plus size={16} /> Thêm nhà cung cấp
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhà cung cấp hoặc nguyên liệu..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}} />
        </div>
        <select value={ingredientFilter} onChange={e => setIngredientFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}}>
          <option value="all">Tất cả nguyên liệu</option>
          {ingredientOptions.map(ingredient => <option key={ingredient}>{ingredient}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hợp tác</option>
          <option value="paused">Tạm ngừng</option>
          <option value="hidden">Đã ẩn</option>
        </select>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-gray-500" style={{fontSize: '13px'}}>
          Đang tải nhà cung cấp từ database...
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Nhà cung cấp</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Người liên hệ</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Nguyên liệu</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Trạng thái</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedSuppliers.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div style={{fontSize: '13.5px', fontWeight: 500, color: '#1F2937'}}>{s.name}</div>
                      <div style={{fontSize: '12px', color: '#9CA3AF'}}>{s.code} · {s.email || "Chưa có email"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div style={{fontSize: '13px', color: '#374151'}}>{s.contact}</div>
                  <div style={{fontSize: '12px', color: '#9CA3AF'}}>{s.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <IngredientBadges ingredients={s.ingredients} />
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[s.status]}`}>
                    {statusLabel[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewing(s)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Xem"><Eye size={15} /></button>
                    <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Sửa"><Edit size={15} /></button>
                    {s.status === "active" ? (
                      <button onClick={() => { setHiding(s); setHideReason(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Ẩn"><EyeOff size={15} /></button>
                    ) : (
                      <button onClick={() => void activateSupplier(s)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Mo lai"><Eye size={15} /></button>
                    )}
                    <button onClick={() => setDeleting(s)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Xoa"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>
                  Chưa có nhà cung cấp phù hợp trong database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} onPageChange={setPage} itemLabel="nha cung cap" />
      </div>

      {showModal && form && (
        <SupplierFormModal
          form={form}
          isEdit={Boolean(form.id)}
          onChange={setForm}
          onClose={() => { setShowModal(false); setForm(null); }}
          onSave={saveSupplier}
          saving={saving}
        />
      )}

      {viewing && (
        <SupplierViewModal supplier={viewing} onClose={() => setViewing(null)} onEdit={() => { openEdit(viewing); setViewing(null); }} />
      )}

      {hiding && (
        <SupplierHideModal
          supplier={hiding}
          reason={hideReason}
          onReasonChange={setHideReason}
          onClose={() => setHiding(null)}
          onConfirm={hideSupplier}
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          title="Xoa nha cung cap?"
          description={<>Nha cung cap <strong style={{ color: "#111827" }}>{deleting.name}</strong> se bi xoa khoi danh sach.</>}
          busy={deleteBusy}
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteSupplier()}
        />
      )}
    </div>
  );
}

function SupplierFormModal({
  form,
  isEdit,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  form: Supplier;
  isEdit: boolean;
  onChange: (supplier: Supplier) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 style={{fontSize: '18px', fontWeight: 700, color: '#0F4761'}}>{isEdit ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}</h2>
            <p style={{fontSize: '12.5px', color: '#9CA3AF', marginTop: '2px'}}>ID tự sinh: {form.code}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <section className="border border-gray-100 rounded-xl p-4">
            <div style={{fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px'}}>Thông tin công ty</div>
            <div className="space-y-3">
              <Field label="Tên công ty *" value={form.name} onChange={value => onChange({ ...form, name: value })} placeholder="VD: Công ty TNHH Trà Việt Nam" />
              <Field label="Địa chỉ" value={form.address} onChange={value => onChange({ ...form, address: value })} placeholder="Số nhà, đường, quận/huyện..." />
            </div>
          </section>

          <section className="border border-gray-100 rounded-xl p-4">
            <div style={{fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px'}}>Thông tin liên hệ</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Người liên hệ" value={form.contact} onChange={value => onChange({ ...form, contact: value })} placeholder="Tên người phụ trách" />
              </div>
              <Field label="Số điện thoại" value={form.phone} onChange={value => onChange({ ...form, phone: value })} placeholder="028-xxxx-xxxx" />
              <Field label="Email" value={form.email} onChange={value => onChange({ ...form, email: value })} type="email" placeholder="email@domain.com" />
            </div>
          </section>

          <section className="border border-gray-100 rounded-xl p-4">
            <div style={{fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px'}}>Điều khoản</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px'}}>Thời gian giao hàng (ngày)</label>
                <input type="number" value={form.deliveryDays} onChange={e => onChange({ ...form, deliveryDays: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} />
              </div>
              <div className="col-span-2">
                <label style={{fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px'}}>MOQ tối thiểu</label>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Số lượng tối thiểu</th>
                        <th className="px-3 py-2 text-left w-36" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Đơn vị</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2">
                          <input type="number" min="0" value={form.moqValue} onChange={e => onChange({ ...form, moqValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} placeholder="VD: 10" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={form.moqUnit} onChange={e => onChange({ ...form, moqUnit: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]" style={{fontSize: '13px'}}>
                            {moqUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <label style={{fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px'}}>Trạng thái</label>
                <select value={form.status} onChange={e => onChange({ ...form, status: e.target.value as SupplierStatus })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]" style={{fontSize: '13px'}}>
                  <option value="active">Đang hợp tác</option>
                  <option value="paused">Tạm ngừng</option>
                  <option value="hidden">Đã ẩn</option>
                </select>
              </div>
            </div>
            <textarea value={form.note} onChange={e => onChange({ ...form, note: e.target.value })} placeholder="Ghi chú điều khoản..." className="w-full mt-3 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none" rows={3} style={{fontSize: '13px'}} />
          </section>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{fontSize: '13.5px'}}>{saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm nhà cung cấp"}</button>
        </div>
      </div>
    </div>
  );
}

function SupplierViewModal({ supplier, onClose, onEdit }: { supplier: Supplier; onClose: () => void; onEdit: () => void }) {
  const rows = [
    ["Tên công ty", supplier.name],
    ["Địa chỉ", supplier.address || "Chưa cập nhật"],
    ["Người liên hệ", supplier.contact || "Chưa cập nhật"],
    ["Số điện thoại", supplier.phone || "Chưa cập nhật"],
    ["Email", supplier.email || "Chưa cập nhật"],
    ["Nguyên liệu", supplier.ingredients.join(", ") || "Chưa cập nhật"],
    ["Giao hàng", `${supplier.deliveryDays} ngày`],
    ["MOQ tối thiểu", supplier.moqValue ? `${supplier.moqValue} ${supplier.moqUnit}` : "Chưa cập nhật"],
    ["Trạng thái", statusLabel[supplier.status]],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 style={{fontSize: '17px', fontWeight: 700, color: '#111827'}}>Chi tiết nhà cung cấp</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div>
              <h3 style={{fontSize: '18px', fontWeight: 700, color: '#111827'}}>{supplier.name}</h3>
              <p style={{fontSize: '12px', color: '#9CA3AF', marginTop: '2px'}}>{supplier.code}</p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full ${statusColors[supplier.status]}`} style={{fontSize: '11.5px'}}>{statusLabel[supplier.status]}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rows.map(([label, value]) => (
              <div key={label} className="border border-gray-100 rounded-xl px-3 py-2.5">
                <p style={{fontSize: '11.5px', color: '#9CA3AF'}}>{label}</p>
                <p style={{fontSize: '13px', color: '#1F2937', fontWeight: 500, marginTop: '2px'}}>{value}</p>
              </div>
            ))}
          </div>
          {supplier.note && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p style={{fontSize: '12px', color: '#B45309', fontWeight: 600}}>Ghi chú</p>
              <p style={{fontSize: '13px', color: '#78350F', marginTop: '4px'}}>{supplier.note}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{fontSize: '13.5px'}}>Đóng</button>
          <button onClick={onEdit} className="px-4 py-2 bg-[#0F4761] text-white rounded-xl hover:bg-[#0d3d54]" style={{fontSize: '13.5px'}}>Chỉnh sửa</button>
        </div>
      </div>
    </div>
  );
}

function SupplierHideModal({
  supplier,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  supplier: Supplier;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <EyeOff size={20} className="text-gray-500" />
          </div>
          <h2 style={{fontSize: '17px', fontWeight: 700, color: '#111827'}}>Ẩn nhà cung cấp?</h2>
          <p style={{fontSize: '13.5px', color: '#6B7280', marginTop: '6px'}}>
            Nhà cung cấp <strong style={{color: '#111827'}}>{supplier.name}</strong> sẽ chuyển sang trạng thái đã ẩn.
          </p>
          <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 500, display: 'block', marginTop: '16px'}}>Lý do ẩn *</label>
          <textarea
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] resize-none"
            style={{fontSize: '13.5px'}}
            placeholder="Nhập lý do ẩn nhà cung cấp..."
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
          <button onClick={onConfirm} disabled={!reason.trim()} className="px-5 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50" style={{fontSize: '13.5px'}}>Ẩn</button>
        </div>
      </div>
    </div>
  );
}

function IngredientBadges({ ingredients }: { ingredients: string[] }) {
  if (!ingredients.length) {
    return <span style={{fontSize: '12.5px', color: '#9CA3AF'}}>Chưa có nguyên liệu</span>;
  }

  const visible = ingredients.slice(0, 3);
  const hasMore = ingredients.length > visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(ingredient => (
        <span key={ingredient} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full" style={{fontSize: '11.5px'}}>{ingredient}</span>
      ))}
      {hasMore && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full" style={{fontSize: '11.5px'}}>v.v</span>}
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={{fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px'}}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
        style={{fontSize: '13px'}}
      />
    </div>
  );
}
