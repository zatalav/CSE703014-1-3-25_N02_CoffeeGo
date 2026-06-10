import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronRight, Edit, Trash2, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import type {
  IngredientCategoryDto,
  IngredientCategoryRequest,
  IngredientDto,
  PageResponse,
  ProductCategoryDto,
  ProductCategoryRequest,
  ProductDto,
  ProductSizeDto,
} from "../../../lib/types";

type CategoryType = "product" | "ingredient";

type Category = {
  id: number;
  name: string;
  count: number;
  type: CategoryType;
};

type ProductRow = {
  id: number;
  name: string;
  categoryId: number | null;
  price: number | null;
  status: string;
};

type IngredientRow = {
  id: number;
  name: string;
  categoryId: number | null;
  unit: string;
  status: string;
};

type CategoryForm = {
  type: CategoryType;
  name: string;
};

const pageItems = <T,>(data: PageResponse<T> | T[]) => Array.isArray(data) ? data : data.items;
const productCategoryId = (dto: ProductCategoryDto) => Number((dto as any).pCategoryId ?? (dto as any).pcategoryId ?? (dto as any).PCategoryId ?? 0);
const productCategoryName = (dto: ProductCategoryDto) => String((dto as any).pCategoryName ?? (dto as any).pcategoryName ?? (dto as any).PCategoryName ?? "");
const ingredientCategoryId = (dto: IngredientCategoryDto) => Number((dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId ?? 0);
const ingredientCategoryName = (dto: IngredientCategoryDto) => String((dto as any).iCategoryName ?? (dto as any).icategoryName ?? (dto as any).ICategoryName ?? "");
const dtoProductCategoryId = (dto: ProductDto) => {
  const value = (dto as any).pCategoryId ?? (dto as any).pcategoryId ?? (dto as any).PCategoryId;
  return value == null ? null : Number(value);
};
const dtoIngredientCategoryId = (dto: IngredientDto) => {
  const value = (dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId;
  return value == null ? null : Number(value);
};
const productPriceFromSizes = (dto: ProductDto, sizes: ProductSizeDto[]) => {
  const basePrice = dto.basePrice == null ? 0 : Number(dto.basePrice);
  const productSizes = sizes.filter(size => Number(size.productId) === Number(dto.productId) && size.status !== "inactive");
  if (productSizes.length > 0) {
    return Math.min(...productSizes.map(size => basePrice + Number(size.extraPrice ?? 0)));
  }
  return dto.basePrice == null ? null : Number(dto.basePrice);
};
const formatProductPrice = (price: number | null) => price == null ? "Chưa có giá" : `${price.toLocaleString("vi-VN")}đ`;

export function ProductCategories() {
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>({ type: "product", name: "" });
  const [loading, setLoading] = useState(true);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productCategoryData, ingredientCategoryData, productData, ingredientData, sizeData] = await Promise.all([
        api.get<PageResponse<ProductCategoryDto> | ProductCategoryDto[]>("/product-categories?size=100"),
        api.get<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=100"),
        api.get<PageResponse<ProductDto> | ProductDto[]>("/products?size=200"),
        api.get<PageResponse<IngredientDto> | IngredientDto[]>("/ingredients?size=500&sort=ingredientId,asc"),
        api.get<PageResponse<ProductSizeDto> | ProductSizeDto[]>("/admin/products/sizes?size=1000&sort=sizeId,asc"),
      ]);
      const sizes = pageItems(sizeData);

      const productRows = pageItems(productData).map(dto => ({
        id: dto.productId,
        name: dto.productName || `Product #${dto.productId}`,
        categoryId: dtoProductCategoryId(dto),
        price: productPriceFromSizes(dto, sizes),
        status: dto.status || "inactive",
      }));
      const ingredientRows = pageItems(ingredientData).map(dto => ({
        id: Number(dto.ingredientId),
        name: dto.ingredientName || `Nguyên liệu #${dto.ingredientId}`,
        categoryId: dtoIngredientCategoryId(dto),
        unit: dto.unit || "",
        status: dto.status || "inactive",
      }));

      const productCategoryRows = pageItems(productCategoryData)
        .map(dto => {
          const id = productCategoryId(dto);
          return {
            id,
            name: productCategoryName(dto),
            type: "product" as const,
            count: productRows.filter(product => product.categoryId === id).length,
          };
        })
        .filter(category => category.id && category.name);

      const ingredientCategoryRows = pageItems(ingredientCategoryData)
        .map(dto => ({
          id: ingredientCategoryId(dto),
          name: ingredientCategoryName(dto),
          type: "ingredient" as const,
          count: ingredientRows.filter(ingredient => ingredient.categoryId === ingredientCategoryId(dto)).length,
        }))
        .filter(category => category.id && category.name);

      setProducts(productRows);
      setIngredients(ingredientRows);
      setProductCategories(productCategoryRows);
      setIngredientCategories(ingredientCategoryRows);
      setSelected(current => {
        if (current) {
          return [...productCategoryRows, ...ingredientCategoryRows].find(item => item.type === current.type && item.id === current.id) || null;
        }
        return productCategoryRows[0] || ingredientCategoryRows[0] || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedProductRows = useMemo(() => {
    if (!selected || selected.type !== "product") return [];
    return products.filter(product => product.categoryId === selected.id);
  }, [products, selected]);
  const selectedIngredientRows = useMemo(() => {
    if (!selected || selected.type !== "ingredient") return [];
    return ingredients.filter(ingredient => ingredient.categoryId === selected.id);
  }, [ingredients, selected]);

  const openCreate = () => {
    setEditing(null);
    setForm({ type: selected?.type || "product", name: "" });
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ type: category.type, name: category.name });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ type: "product", name: "" });
  };

  const saveCategory = async () => {
    if (!form.name.trim()) {
      toast.error("Tên danh mục là bắt buộc");
      return;
    }

    try {
      if (editing?.type === "product" || (!editing && form.type === "product")) {
        const request: ProductCategoryRequest = { pCategoryName: form.name.trim() };
        if (editing) await api.put<ProductCategoryDto>(`/product-categories/${editing.id}`, request);
        else await api.post<ProductCategoryDto>("/product-categories", request);
      } else {
        const request: IngredientCategoryRequest = { iCategoryName: form.name.trim() };
        if (editing) await api.put<IngredientCategoryDto>(`/ingredient-categories/${editing.id}`, request);
        else await api.post<IngredientCategoryDto>("/ingredient-categories", request);
      }
      toast.success(editing ? "Đã cập nhật danh mục" : "Đã thêm danh mục");
      closeModal();
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu danh mục");
    }
  };

  const requestDeleteCategory = (category: Category) => {
    if (category.count > 0) {
      toast.error("Không thể xóa danh mục đang có dữ liệu liên kết");
      return;
    }
    setDeletingCategory(category);
  };

  const deleteCategory = async () => {
    if (!deletingCategory) return;
    const target = deletingCategory;
    setDeleteBusy(true);
    try {
      if (target.type === "product") await api.del<void>(`/product-categories/${target.id}`);
      else await api.del<void>(`/ingredient-categories/${target.id}`);
      toast.success("Đã xóa danh mục");
      await loadData();
      if (target.type === "product") {
        setProductCategories(prev => prev.filter(category => category.id !== target.id));
      } else {
        setIngredientCategories(prev => prev.filter(category => category.id !== target.id));
      }
      setSelected(current => current?.type === target.type && current.id === target.id ? null : current);
      setDeletingCategory(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa danh mục");
    } finally {
      setDeleteBusy(false);
    }
  };

  const categoryGroups: Array<[string, Category[]]> = [
    ["Danh mục sản phẩm", productCategories],
    ["Danh mục nguyên liệu", ingredientCategories],
  ];
  const sectionLabel = selected?.type === "ingredient" ? "Danh mục nguyên liệu" : "Danh mục sản phẩm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: "22px", fontWeight: 700, color: "#0F4761"}}>Danh mục</h1>
          <p style={{fontSize: "13px", color: "#6B7280", marginTop: "2px"}}>Dữ liệu danh mục được đọc trực tiếp từ database</p>
        </div>
      </div>

      {loading && <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">Đang tải danh mục...</div>}
      {!loading && error && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => void loadData()} className="px-3 py-1.5 rounded-lg bg-white border border-red-100">Thử lại</button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex gap-4">
          <div className="w-72 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span style={{fontSize: "13.5px", fontWeight: 600, color: "#111827"}}>Danh sách danh mục</span>
              <button onClick={openCreate} className="flex items-center gap-1 px-3 py-1.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{fontSize: "12.5px"}}>
                <Plus size={13} /> Thêm
              </button>
            </div>
            <div>
              {categoryGroups.map(([title, items]) => (
                <div key={title} className="border-b border-gray-50 last:border-b-0">
                  <div className="px-4 pt-4 pb-2 bg-gray-50/70" style={{fontSize: "12px", fontWeight: 700, color: "#0F4761"}}>
                    {title}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.length === 0 && <div className="px-4 py-3 text-gray-400" style={{fontSize: "12.5px"}}>Chưa có dữ liệu</div>}
                    {items.map(category => (
                      <button
                        key={`${category.type}-${category.id}`}
                        onClick={() => setSelected(category)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${selected?.type === category.type && selected?.id === category.id ? "bg-[#0F4761]/5 border-l-4 border-[#0F4761]" : "hover:bg-gray-50 border-l-4 border-transparent"}`}
                      >
                        <span className="w-9 h-9 rounded-xl bg-amber-50 text-[#0F4761] flex items-center justify-center" style={{fontSize: "13px", fontWeight: 700}}>
                          {category.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{fontSize: "13.5px", fontWeight: 500, color: "#1F2937"}}>{category.name}</span>
                          </div>
                          <span style={{fontSize: "11.5px", color: "#9CA3AF"}}>
                            {category.count} {category.type === "ingredient" ? "nguyên liệu" : "sản phẩm"}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-gray-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {selected ? (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#0F4761] flex items-center justify-center" style={{fontSize: "18px", fontWeight: 700}}>{selected.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <h3 style={{fontSize: "18px", fontWeight: 700, color: "#111827"}}>{selected.name}</h3>
                        <p style={{fontSize: "13px", color: "#9CA3AF"}}>{sectionLabel}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50" style={{fontSize: "13px"}}>
                        <Edit size={14} /> Sửa
                      </button>
                      <button onClick={() => requestDeleteCategory(selected)} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50" style={{fontSize: "13px"}}>
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Mã danh mục" value={`#${selected.id}`} />
                    <Info label="Số lượng liên kết" value={String(selected.count)} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h4 style={{fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "12px"}}>
                    {selected.type === "ingredient" ? "Nguyên liệu trong danh mục" : "Sản phẩm trong danh mục"} ({selected.type === "ingredient" ? selectedIngredientRows.length : selectedProductRows.length})
                  </h4>
                  {selected.type === "ingredient" ? (
                    selectedIngredientRows.length === 0 ? (
                      <div className="text-gray-500" style={{fontSize: "13px"}}>Chưa có nguyên liệu trong danh mục này.</div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Tên nguyên liệu</th>
                            <th className="px-3 py-2 text-left" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Đơn vị</th>
                            <th className="px-3 py-2 text-left" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedIngredientRows.map(ingredient => (
                            <tr key={ingredient.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2.5" style={{fontSize: "13.5px", color: "#374151"}}>{ingredient.name}</td>
                              <td className="px-3 py-2.5" style={{fontSize: "13px", color: "#6B7280"}}>{ingredient.unit || "Chưa có"}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${ingredient.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                  {ingredient.status === "active" ? "Đang dùng" : "Tạm ẩn"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : selectedProductRows.length === 0 ? (
                    <div className="text-gray-500" style={{fontSize: "13px"}}>Chưa có sản phẩm trong danh mục này.</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Tên sản phẩm</th>
                          <th className="px-3 py-2 text-left" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Giá</th>
                          <th className="px-3 py-2 text-left" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedProductRows.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5" style={{fontSize: "13.5px", color: "#374151"}}>{product.name}</td>
                            <td className="px-3 py-2.5" style={{fontSize: "13px", color: "#6B7280"}}>{formatProductPrice(product.price)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${product.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {product.status === "active" ? "Đang bán" : "Tạm ẩn"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center h-64">
                <p style={{fontSize: "14px", color: "#9CA3AF"}}>Chưa có danh mục trong database</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{fontSize: "17px", fontWeight: 700, color: "#0F4761"}}>{editing ? "Sửa danh mục" : "Thêm danh mục"}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label style={{fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px"}}>Tên danh mục *</label>
                <input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: "13px"}} />
              </div>
              <div>
                <label style={{fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px"}}>Loại danh mục</label>
                <select disabled={Boolean(editing)} value={form.type} onChange={event => setForm(prev => ({ ...prev, type: event.target.value as CategoryType }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none disabled:bg-gray-50" style={{fontSize: "13px"}}>
                  <option value="product">Danh mục sản phẩm</option>
                  <option value="ingredient">Danh mục nguyên liệu</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600" style={{fontSize: "13.5px"}}>Huy</button>
              <button onClick={() => void saveCategory()} className="flex-1 py-2 bg-[#0F4761] text-white rounded-lg" style={{fontSize: "13.5px"}}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {deletingCategory && (
        <DeleteConfirmModal
          title="Xóa danh mục?"
          description={<>Danh mục <strong style={{ color: "#111827" }}>{deletingCategory.name}</strong> sẽ bị xóa khỏi danh sách.</>}
          busy={deleteBusy}
          onClose={() => setDeletingCategory(null)}
          onConfirm={() => void deleteCategory()}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={{fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "4px"}}>{label}</label>
      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50" style={{fontSize: "13px"}}>{value}</div>
    </div>
  );
}
