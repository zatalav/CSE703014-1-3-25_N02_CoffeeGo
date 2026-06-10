import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronRight, Edit, Eye, EyeOff, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import type {
  IngredientCategoryDto,
  IngredientDto,
  IngredientRequestDto,
  PageResponse,
  SupplierDto,
  SupplierIngredientDto,
  SupplierIngredientRequestDto,
} from "../../../lib/types";

type IngredientStatus = "active" | "inactive";

type Category = {
  id: number;
  name: string;
  count: number;
};

type Ingredient = {
  id: number | null;
  categoryId: number | null;
  supplierId: number | null;
  supplierName: string;
  name: string;
  unit: string;
  status: IngredientStatus;
};

type SupplierOption = {
  id: number;
  name: string;
};

const unitOptions = ["kg", "g", "ml", "l", "chai", "hop", "goi", "cai"];

const statusLabel: Record<IngredientStatus, string> = {
  active: "Hoat dong",
  inactive: "Da an",
};

const statusColors: Record<IngredientStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const dtoCategoryId = (dto: IngredientCategoryDto) => {
  const value = (dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId;
  return value == null ? 0 : Number(value);
};

const dtoCategoryName = (dto: IngredientCategoryDto) =>
  String((dto as any).iCategoryName ?? (dto as any).icategoryName ?? (dto as any).ICategoryName ?? "");

const dtoIngredientCategoryId = (dto: IngredientDto) => {
  const value = (dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId;
  return value == null ? null : Number(value);
};

const toSupplierOption = (dto: SupplierDto): SupplierOption => ({
  id: Number(dto.supplierId),
  name: dto.supplierName || `Nha cung cap #${dto.supplierId}`,
});

const toIngredient = (
  dto: IngredientDto,
  supplierByIngredient: Map<number, SupplierIngredientDto>,
  supplierNameById: Map<number, string>,
): Ingredient => {
  const id = Number(dto.ingredientId);
  const supplierLink = supplierByIngredient.get(id);
  const supplierId = supplierLink?.supplierId == null ? null : Number(supplierLink.supplierId);

  return {
    id,
    categoryId: dtoIngredientCategoryId(dto),
    supplierId,
    supplierName: supplierId ? supplierNameById.get(supplierId) || `Nha cung cap #${supplierId}` : "",
    name: dto.ingredientName || `Ingredient #${dto.ingredientId}`,
    unit: dto.unit || supplierLink?.unit || "kg",
    status: dto.status === "active" ? "active" : "inactive",
  };
};

const emptyIngredient = (categoryId: number | null): Ingredient => ({
  id: null,
  categoryId,
  supplierId: null,
  supplierName: "",
  name: "",
  unit: "kg",
  status: "active",
});

const toRequest = (ingredient: Ingredient): IngredientRequestDto => ({
  iCategoryId: ingredient.categoryId,
  icategoryId: ingredient.categoryId,
  ingredientName: ingredient.name.trim(),
  unit: ingredient.unit,
  status: ingredient.status,
});

const toSupplierIngredientRequest = (ingredientId: number, ingredient: Ingredient): SupplierIngredientRequestDto => ({
  supplierId: ingredient.supplierId,
  ingredientId,
  minimumStock: 0,
  unit: ingredient.unit,
  price: 0,
});

export function IngredientCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredientError, setIngredientError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | IngredientStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Ingredient | null>(null);
  const [viewing, setViewing] = useState<Ingredient | null>(null);
  const [hiding, setHiding] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setIngredientError(null);

    try {
      const [categoryData, supplierData] = await Promise.all([
        api.get<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=100&sort=iCategoryId,asc"),
        api.get<PageResponse<SupplierDto> | SupplierDto[]>("/suppliers?size=100&sort=supplierId,asc"),
      ]);

      const supplierRows = pageItems(supplierData).map(toSupplierOption).filter(supplier => supplier.id && supplier.name);
      const supplierNameById = new Map(supplierRows.map(supplier => [supplier.id, supplier.name]));

      let ingredientRows: Ingredient[] = [];
      try {
        const ingredientData = await api.get<PageResponse<IngredientDto> | IngredientDto[]>(
          "/ingredients?size=500&sort=ingredientId,desc",
        );

        const supplierLinkResults = await Promise.allSettled(
          supplierRows.map(supplier =>
            api.get<SupplierIngredientDto[]>(`/suppliers/${supplier.id}/ingredients`),
          ),
        );
        const supplierByIngredient = new Map<number, SupplierIngredientDto>();
        supplierLinkResults.forEach(result => {
          if (result.status !== "fulfilled") return;
          pageItems(result.value).forEach(link => {
            const ingredientId = Number(link.ingredientId);
            if (ingredientId && !supplierByIngredient.has(ingredientId)) {
              supplierByIngredient.set(ingredientId, link);
            }
          });
        });

        ingredientRows = pageItems(ingredientData)
          .map(dto => toIngredient(dto, supplierByIngredient, supplierNameById))
          .filter(item => item.id && item.name);
      } catch (err) {
        setIngredientError(err instanceof Error ? err.message : "Khong the tai danh sach nguyen lieu");
      }

      const categoryRows = pageItems(categoryData)
        .map(dto => {
          const id = dtoCategoryId(dto);
          return {
            id,
            name: dtoCategoryName(dto),
            count: ingredientRows.filter(item => item.categoryId === id).length,
          };
        })
        .filter(category => category.id && category.name);

      setCategories(categoryRows);
      setIngredients(ingredientRows);
      setSuppliers(supplierRows);
      setSelected(current => {
        if (current) return categoryRows.find(item => item.id === current.id) || null;
        return categoryRows[0] || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong the tai danh muc nguyen lieu");
      setCategories([]);
      setIngredients([]);
      setSuppliers([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedItems = useMemo(() => {
    if (!selected) return [];
    const keyword = search.trim().toLowerCase();
    return ingredients.filter(item => {
      const matchCategory = item.categoryId === selected.id;
      const matchSearch =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.unit.toLowerCase().includes(keyword) ||
        item.supplierName.toLowerCase().includes(keyword);
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchCategory && matchSearch && matchStatus;
    });
  }, [ingredients, search, selected, statusFilter]);

  const selectedCategoryName = selected?.name || "Chua co danh muc";

  const openAdd = () => {
    if (!selected) {
      toast.error("Chua co danh muc nguyen lieu de them nguyen lieu");
      return;
    }
    setForm(emptyIngredient(selected.id));
    setShowModal(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setForm({ ...ingredient });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(null);
  };

  const syncSupplier = async (ingredientId: number, ingredient: Ingredient, previousSupplierId: number | null) => {
    if (previousSupplierId && previousSupplierId !== ingredient.supplierId) {
      await api.del<void>(`/suppliers/${previousSupplierId}/ingredients/${ingredientId}`);
    }

    if (ingredient.supplierId) {
      await api.post<SupplierIngredientDto>(
        `/suppliers/${ingredient.supplierId}/ingredients`,
        toSupplierIngredientRequest(ingredientId, ingredient),
      );
    }
  };

  const saveIngredient = async () => {
    if (!form?.name.trim()) {
      toast.error("Ten nguyen lieu la bat buoc");
      return;
    }
    if (!form.categoryId) {
      toast.error("Danh muc nguyen lieu la bat buoc");
      return;
    }

    setSaving(true);
    try {
      let saved: IngredientDto;
      const previousSupplierId = form.id ? ingredients.find(item => item.id === form.id)?.supplierId ?? null : null;

      if (form.id) {
        saved = await api.put<IngredientDto>(`/ingredients/${form.id}`, toRequest(form));
        toast.success("Da cap nhat nguyen lieu");
      } else {
        saved = await api.post<IngredientDto>("/ingredients", toRequest(form));
        toast.success("Da them nguyen lieu");
      }

      const savedId = Number(saved.ingredientId ?? form.id);
      if (savedId) {
        try {
          await syncSupplier(savedId, form, previousSupplierId);
        } catch (err) {
          toast.warning(err instanceof Error ? `Da luu nguyen lieu, nhung chua gan duoc nha cung cap: ${err.message}` : "Da luu nguyen lieu, nhung chua gan duoc nha cung cap");
        }
      }

      closeModal();
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the luu nguyen lieu");
    } finally {
      setSaving(false);
    }
  };

  const hideIngredient = async () => {
    if (!hiding?.id) return;

    try {
      await api.patch<IngredientDto>(`/ingredients/${hiding.id}/inactive`);
      setHiding(null);
      toast.success("Da an nguyen lieu");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the an nguyen lieu");
    }
  };

  const showIngredient = async (ingredient: Ingredient) => {
    if (!ingredient.id) return;

    try {
      await api.patch<IngredientDto>(`/ingredients/${ingredient.id}/active`);
      toast.success("Da mo lai nguyen lieu");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the mo lai nguyen lieu");
    }
  };

  const deleteIngredient = async () => {
    if (!deleting?.id) return;
    const target = deleting;

    try {
      await api.del<void>(`/ingredients/${target.id}`);
      setDeleting(null);
      toast.success("Da xoa nguyen lieu");
      await loadData();
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== target.id));
      setCategories(prev => prev.map(category => (
        category.id === target.categoryId ? { ...category, count: Math.max(0, category.count - 1) } : category
      )));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa nguyen lieu");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Danh muc nguyen lieu</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {categories.length} danh muc tu database
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          style={{ fontSize: "13px" }}
        >
          <RefreshCw size={15} /> Tai lai
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500" style={{ fontSize: "13px" }}>
          Dang tai danh muc nguyen lieu...
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-red-700 flex items-center justify-between" style={{ fontSize: "13px" }}>
          <span>{error}</span>
          <button onClick={() => void loadData()} className="px-3 py-1.5 rounded-lg bg-white border border-red-100">
            Thu lai
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex gap-4">
          <aside className="w-64 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#111827" }}>Danh muc</span>
            </div>
            <div className="divide-y divide-gray-50">
              {categories.length === 0 && (
                <div className="px-4 py-6 text-gray-400" style={{ fontSize: "12.5px" }}>
                  Chua co du lieu danh muc
                </div>
              )}
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelected(category)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                    selected?.id === category.id ? "bg-[#0F4761]/5 border-l-4 border-[#0F4761]" : "hover:bg-gray-50 border-l-4 border-transparent"
                  }`}
                >
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-[#0F4761] flex items-center justify-center shrink-0" style={{ fontSize: "13px", fontWeight: 700 }}>
                    {category.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>
                      {category.name}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{category.count} nguyen lieu</div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              ))}
            </div>
          </aside>

          <main className="flex-1 space-y-4 min-w-0">
            {ingredientError && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-amber-700 flex items-start gap-2" style={{ fontSize: "13px" }}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>Da tai duoc danh muc, nhung chua tai duoc bang nguyen lieu: {ingredientError}</span>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate" style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>{selectedCategoryName}</h2>
                  <p style={{ fontSize: "12.5px", color: "#9CA3AF", marginTop: "2px" }}>
                    {selectedItems.length} nguyen lieu dang hien thi
                  </p>
                </div>
                <button
                  onClick={openAdd}
                  disabled={!selected}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-50"
                  style={{ fontSize: "13px" }}
                >
                  <Plus size={14} /> Them nguyen lieu
                </button>
              </div>

              <div className="p-4 border-b border-gray-100 flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Tim ten nguyen lieu, don vi hoac nha cung cap..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                    style={{ fontSize: "13px" }}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as "all" | IngredientStatus)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                  style={{ fontSize: "13px" }}
                >
                  <option value="all">Tat ca trang thai</option>
                  <option value="active">Hoat dong</option>
                  <option value="inactive">Da an</option>
                </select>
              </div>

              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <TableHead>Ma</TableHead>
                    <TableHead>Ten nguyen lieu</TableHead>
                    <TableHead>Don vi</TableHead>
                    <TableHead>Nha cung cap</TableHead>
                    <TableHead>Trang thai</TableHead>
                    <TableHead>Hanh dong</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500" style={{ fontSize: "13px" }}>
                        Chua co nguyen lieu trong danh muc nay.
                      </td>
                    </tr>
                  )}
                  {selectedItems.map(ingredient => (
                    <tr key={ingredient.id} className={`hover:bg-gray-50 ${ingredient.status === "inactive" ? "opacity-70" : ""}`}>
                      <td className="px-4 py-3" style={{ fontSize: "12.5px", color: "#9CA3AF" }}>
                        NL-{String(ingredient.id).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "13.5px", color: "#1F2937", fontWeight: 500 }}>
                        {ingredient.name}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>
                        {ingredient.unit}
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>
                        {ingredient.supplierName || "Chua chon"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[ingredient.status]}`}>
                          {statusLabel[ingredient.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewing(ingredient)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Xem">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => openEdit(ingredient)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Sua">
                            <Edit size={15} />
                          </button>
                          {ingredient.status === "inactive" ? (
                            <button
                              onClick={() => void showIngredient(ingredient)}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"
                              title="Mo lai"
                            >
                              <Eye size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setHiding(ingredient)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                              title="An"
                            >
                              <EyeOff size={15} />
                            </button>
                          )}
                          <button onClick={() => setDeleting(ingredient)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Xoa">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      )}

      {showModal && form && (
        <IngredientFormModal
          form={form}
          categories={categories}
          suppliers={suppliers}
          saving={saving}
          onChange={setForm}
          onClose={closeModal}
          onSave={saveIngredient}
        />
      )}

      {viewing && (
        <IngredientViewModal
          ingredient={viewing}
          categoryName={categories.find(category => category.id === viewing.categoryId)?.name || "Chua cap nhat"}
          onClose={() => setViewing(null)}
          onEdit={() => {
            openEdit(viewing);
            setViewing(null);
          }}
        />
      )}

      {hiding && (
        <ConfirmModal
          title="An nguyen lieu?"
          description={`Nguyen lieu "${hiding.name}" se chuyen sang trang thai da an.`}
          confirmLabel="An"
          onClose={() => setHiding(null)}
          onConfirm={hideIngredient}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Xoa nguyen lieu?"
          description={`Nguyen lieu "${deleting.name}" se bi xoa khoi database.`}
          confirmLabel="Xoa"
          onClose={() => setDeleting(null)}
          onConfirm={deleteIngredient}
        />
      )}
    </div>
  );
}

function IngredientFormModal({
  form,
  categories,
  suppliers,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  form: Ingredient;
  categories: Category[];
  suppliers: SupplierOption[];
  saving: boolean;
  onChange: (ingredient: Ingredient) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = Boolean(form.id);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>{isEdit ? "Sua nguyen lieu" : "Them nguyen lieu"}</h2>
            {isEdit && (
              <p style={{ fontSize: "12.5px", color: "#9CA3AF", marginTop: "2px" }}>
                NL-{String(form.id).padStart(4, "0")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <section className="border border-gray-100 rounded-xl p-4">
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>Thong tin nguyen lieu</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FormLabel>Ten nguyen lieu *</FormLabel>
                <input
                  value={form.name}
                  onChange={event => onChange({ ...form, name: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                  style={{ fontSize: "13px" }}
                  placeholder="Nhap ten nguyen lieu"
                />
              </div>
              <div>
                <FormLabel>Danh muc</FormLabel>
                <select
                  value={form.categoryId ?? ""}
                  onChange={event => onChange({ ...form, categoryId: Number(event.target.value) || null })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]"
                  style={{ fontSize: "13px" }}
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Don vi tinh</FormLabel>
                <select
                  value={form.unit}
                  onChange={event => onChange({ ...form, unit: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]"
                  style={{ fontSize: "13px" }}
                >
                  {unitOptions.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Nha cung cap</FormLabel>
                <select
                  value={form.supplierId ?? ""}
                  onChange={event => {
                    const supplierId = Number(event.target.value) || null;
                    const supplierName = supplierId ? suppliers.find(supplier => supplier.id === supplierId)?.name || "" : "";
                    onChange({ ...form, supplierId, supplierName });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]"
                  style={{ fontSize: "13px" }}
                >
                  <option value="">Chua chon nha cung cap</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Trang thai</FormLabel>
                <select
                  value={form.status}
                  onChange={event => onChange({ ...form, status: event.target.value as IngredientStatus })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]"
                  style={{ fontSize: "13px" }}
                >
                  <option value="active">Hoat dong</option>
                  <option value="inactive">Da an</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>
            Huy
          </button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{ fontSize: "13.5px" }}>
            {saving ? "Dang luu..." : isEdit ? "Luu thay doi" : "Them nguyen lieu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IngredientViewModal({
  ingredient,
  categoryName,
  onClose,
  onEdit,
}: {
  ingredient: Ingredient;
  categoryName: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const rows = [
    ["Ma nguyen lieu", `NL-${String(ingredient.id).padStart(4, "0")}`],
    ["Ten nguyen lieu", ingredient.name],
    ["Danh muc", categoryName],
    ["Nha cung cap", ingredient.supplierName || "Chua chon"],
    ["Don vi", ingredient.unit],
    ["Trang thai", statusLabel[ingredient.status]],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Chi tiet nguyen lieu</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="border border-gray-100 rounded-xl px-3 py-2.5">
              <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{label}</p>
              <p style={{ fontSize: "13px", color: "#1F2937", fontWeight: 500, marginTop: "2px" }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>
            Dong
          </button>
          <button onClick={onEdit} className="px-4 py-2 bg-[#0F4761] text-white rounded-xl hover:bg-[#0d3d54]" style={{ fontSize: "13.5px" }}>
            Chinh sua
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <EyeOff size={20} className="text-gray-500" />
          </div>
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>{title}</h2>
          <p style={{ fontSize: "13.5px", color: "#6B7280", marginTop: "6px" }}>{description}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>
            Huy
          </button>
          <button onClick={onConfirm} className="px-5 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800" style={{ fontSize: "13.5px" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{children}</th>;
}

function FormLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>{children}</label>;
}
