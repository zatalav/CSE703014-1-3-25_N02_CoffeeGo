import { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import { Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";
import type {
  IngredientCategoryDto,
  IngredientDto,
  PageResponse,
  RecipeDetailDto,
  RecipeDetailRequestDto,
  RecipeDto,
  RecipeRequestDto,
} from "../../../lib/types";

type RecipeSizeMode = "one" | "many";

type RecipeRow = {
  id: number;
  name: string;
  ingredients: number;
  updated: string;
};

type IngredientOption = {
  id: number;
  categoryId: number | null;
  name: string;
  unit: string;
};

type IngredientCategoryOption = {
  id: number;
  name: string;
};

type RecipeIngredient = {
  ingredientId: string;
  qty: string;
  unit: string;
};

const fallbackUnits = ["ml", "g", "kg", "l", "cái", "muỗng"];
const recipeSizeRows: Record<RecipeSizeMode, Array<[string, string, string]>> = {
  one: [["One size", "1.0x", "0đ"]],
  many: [["S", "0.8x", "0đ"], ["M", "1.0x", "0đ"], ["L", "1.3x", "0đ"]],
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const categoryIdOf = (dto: IngredientCategoryDto) =>
  Number(dto.iCategoryId ?? dto.icategoryId ?? 0);

const categoryNameOf = (dto: IngredientCategoryDto) =>
  dto.iCategoryName || dto.icategoryName || `Danh mục #${categoryIdOf(dto)}`;

const ingredientCategoryIdOf = (dto: IngredientDto) => {
  const raw = dto.iCategoryId ?? dto.icategoryId ?? dto.ICategoryId ?? null;
  return raw == null ? null : Number(raw);
};

const toIngredientOption = (dto: IngredientDto): IngredientOption => ({
  id: Number(dto.ingredientId),
  categoryId: ingredientCategoryIdOf(dto),
  name: dto.ingredientName || `Nguyên liệu #${dto.ingredientId}`,
  unit: dto.unit || "g",
});

const sizeMultiplier = (value: string) => {
  const parsed = Number(value.replace("x", ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export function Recipes() {
  const [showForm, setShowForm] = useState(false);
  const [recipeSizeMode, setRecipeSizeMode] = useState<RecipeSizeMode>("many");
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategoryOption[]>([]);
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState("");
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<RecipeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const units = useMemo(
    () => Array.from(new Set([...fallbackUnits, ...ingredientOptions.map(item => item.unit).filter(Boolean)])),
    [ingredientOptions],
  );
  const filteredIngredientOptions = useMemo(() => {
    if (!ingredientCategoryFilter) return ingredientOptions;
    const categoryId = Number(ingredientCategoryFilter);
    return ingredientOptions.filter(item => item.categoryId === categoryId);
  }, [ingredientCategoryFilter, ingredientOptions]);
  const filteredRecipes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return recipes;
    return recipes.filter(recipe => recipe.name.toLowerCase().includes(keyword));
  }, [recipes, search]);
  const pagedRecipes = useMemo(() => getPagedItems(filteredRecipes, page), [filteredRecipes, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(filteredRecipes.length)));
  }, [filteredRecipes.length]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredientData, categoryData, recipeData, detailData] = await Promise.all([
        api.get<PageResponse<IngredientDto> | IngredientDto[]>("/ingredients?size=500&sort=ingredientId,asc"),
        api.get<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=200&sort=iCategoryId,asc"),
        api.get<PageResponse<RecipeDto> | RecipeDto[]>("/products/recipes?size=500&sort=recipeId,desc"),
        api.get<RecipeDetailDto[]>("/products/recipe-details"),
      ]);

      const ingredientsFromDb = pageItems(ingredientData).map(toIngredientOption).filter(item => item.id && item.name);
      const categoriesFromDb = pageItems(categoryData)
        .map(dto => ({ id: categoryIdOf(dto), name: categoryNameOf(dto) }))
        .filter(item => item.id && item.name);
      const details = pageItems(detailData);
      const recipeRows = pageItems(recipeData).map(recipe => {
        const recipeId = Number(recipe.recipeId);
        const uniqueIngredientCount = new Set(details.filter(item => Number(item.recipeId) === recipeId).map(item => item.ingredientId)).size;
        return {
          id: recipeId,
          name: recipe.recipeName || `Công thức #${recipeId}`,
          ingredients: uniqueIngredientCount,
          updated: "Database",
        };
      });

      setIngredientOptions(ingredientsFromDb);
      setIngredientCategories(categoriesFromDb);
      setRecipes(recipeRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu công thức");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setRecipeSizeMode("many");
    setRecipeName("");
    setDescription("");
    setIngredients([]);
    setIngredientCategoryFilter("");
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { ingredientId: "", qty: "", unit: filteredIngredientOptions[0]?.unit || ingredientOptions[0]?.unit || "ml" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    setIngredients(prev => prev.map((item, idx) => idx === index ? { ...item, ...patch } : item));
  };

  const selectIngredient = (index: number, ingredientId: string) => {
    const selected = ingredientOptions.find(item => String(item.id) === ingredientId);
    updateIngredient(index, { ingredientId, unit: selected?.unit || ingredients[index]?.unit || "ml" });
  };

  const saveRecipe = async () => {
    if (!recipeName.trim()) {
      toast.error("Tên công thức là bắt buộc");
      return;
    }
    if (!ingredients.length || ingredients.some(item => !item.ingredientId || !item.qty)) {
      toast.error("Vui lòng chọn nguyên liệu và nhập định lượng");
      return;
    }

    setSaving(true);
    try {
      const recipeRequest: RecipeRequestDto = {
        productId: null,
        recipeName: recipeName.trim(),
        description: description.trim() || null,
      };
      const savedRecipe = await api.post<RecipeDto>("/products/recipes", recipeRequest);
      const recipeId = Number(savedRecipe.recipeId);
      const sizes = recipeSizeRows[recipeSizeMode];

      const detailRequests: RecipeDetailRequestDto[] = ingredients.flatMap(item => {
        const quantity = Number(item.qty);
        return sizes.map(([size, multiplier]) => ({
          recipeId,
          ingredientId: Number(item.ingredientId),
          quantity: Number((quantity * sizeMultiplier(multiplier)).toFixed(3)),
          unit: item.unit,
          size,
          estimatedTotal: 0,
        }));
      });

      await Promise.all(detailRequests.map(request => api.post<RecipeDetailDto>("/products/recipe-details", request)));
      toast.success("Đã lưu công thức vào database");
      closeForm();
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu công thức");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecipe = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);

    try {
      const details = await api.get<RecipeDetailDto[]>(`/products/recipe-details?recipeId=${target.id}`);
      await Promise.all(pageItems(details).map(detail => api.del<void>(`/products/recipe-details/${detail.recipeDetailId}`)));
      await api.del<void>(`/products/recipes/${target.id}`);
      toast.success("Đã xóa công thức");
      await loadData();
      setRecipes(prev => prev.filter(recipe => recipe.id !== target.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa công thức");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Công thức pha chế</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {loading ? "Đang tải dữ liệu..." : `${recipes.length} công thức, ${ingredientOptions.length} nguyên liệu từ database`}
          </p>
        </div>
        <button onClick={openForm} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: "13.5px" }}>
          <Plus size={16} /> Thêm công thức
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm công thức hoặc nguyên liệu..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
        </div>
        {error && (
          <button onClick={() => void loadData()} className="px-3 py-2 border border-red-100 bg-red-50 text-red-600 rounded-lg" style={{ fontSize: "13px" }}>
            Tải lại
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-700" style={{ fontSize: "13px" }}>
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <TableHead>Tên công thức</TableHead>
              <TableHead align="center">Số nguyên liệu</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead>Hành động</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!loading && filteredRecipes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500" style={{ fontSize: "13px" }}>
                  Chưa có công thức trong database.
                </td>
              </tr>
            )}
            {pagedRecipes.map(recipe => (
              <tr key={recipe.id} className="hover:bg-gray-50">
                <td className="px-4 py-3" style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>{recipe.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className="w-7 h-7 rounded-full bg-[#0F4761]/10 text-[#0F4761] flex items-center justify-center mx-auto" style={{ fontSize: "12px", fontWeight: 700 }}>{recipe.ingredients}</span>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{recipe.updated}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><Eye size={15} /></button>
                    <button onClick={openForm} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500"><Edit size={15} /></button>
                    <button onClick={() => setDeleting(recipe)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filteredRecipes.length} onPageChange={setPage} itemLabel="công thức" />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>Thêm công thức pha chế</h2>
              <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Tên công thức *</label>
                <input value={recipeName} onChange={event => setRecipeName(event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} placeholder="Nhập tên công thức" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Danh sách nguyên liệu</label>
                  <button onClick={addIngredient} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#0F4761] text-[#0F4761] rounded-lg hover:bg-blue-50" style={{ fontSize: "12.5px" }}>
                    <Plus size={13} /> Thêm nguyên liệu
                  </button>
                </div>
                <div className="mb-3">
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "4px" }}>Lọc theo danh mục nguyên liệu</label>
                  <select
                    value={ingredientCategoryFilter}
                    onChange={event => setIngredientCategoryFilter(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none"
                    style={{ fontSize: "13px" }}
                  >
                    <option value="">Tất cả danh mục</option>
                    {ingredientCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  {ingredients.length === 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-500" style={{ fontSize: "12.5px" }}>
                      Chưa có dòng nguyên liệu nào.
                    </div>
                  )}
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                      <select value={ingredient.ingredientId} onChange={event => selectIngredient(index, event.target.value)} className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg outline-none" style={{ fontSize: "12.5px" }}>
                        <option value="">Chọn nguyên liệu...</option>
                        {filteredIngredientOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </select>
                      <input type="number" value={ingredient.qty} onChange={event => updateIngredient(index, { qty: event.target.value })} className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg outline-none text-center" style={{ fontSize: "12.5px" }} placeholder="Qty" />
                      <select value={ingredient.unit} onChange={event => updateIngredient(index, { unit: event.target.value })} className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg outline-none" style={{ fontSize: "12.5px" }}>
                        {units.map(unit => <option key={unit}>{unit}</option>)}
                      </select>
                      <button onClick={() => removeIngredient(index)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Dinh muc theo size</label>
                  <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                    {(["one", "many"] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setRecipeSizeMode(mode)} className={`px-3 py-1.5 rounded-md transition-colors ${recipeSizeMode === mode ? "bg-[#0F4761] text-white" : "text-gray-500 hover:bg-white"}`} style={{ fontSize: "12.5px", fontWeight: 600 }}>
                        {mode === "one" ? "One size" : "Many size"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`grid gap-3 ${recipeSizeMode === "one" ? "grid-cols-1" : "grid-cols-3"}`}>
                  {recipeSizeRows[recipeSizeMode].map(([size, multiplier]) => (
                    <div key={size} className="p-3 bg-gray-50 rounded-xl">
                      <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>{size === "One size" ? size : `Size ${size}`}</div>
                      <input value={multiplier} readOnly className="w-full px-2 py-1 border border-gray-200 rounded-lg outline-none text-center bg-white" style={{ fontSize: "13.5px", fontWeight: 600 }} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Huong dan pha che</label>
                <textarea value={description} onChange={event => setDescription(event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none" rows={3} style={{ fontSize: "13px" }} placeholder="Ghi chú quy trình pha chế..." />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeForm} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Huy</button>
              <button onClick={() => void saveRecipe()} disabled={saving} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{ fontSize: "13.5px" }}>
                {saving ? "Đang lưu..." : "Lưu công thức"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteConfirmModal
          title="Xóa công thức?"
          description={<>Công thức <strong style={{ color: "#111827" }}>{deleting.name}</strong> sẽ bị xóa khỏi danh sách.</>}
          busy={deleteBusy}
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteRecipe()}
        />
      )}
    </div>
  );
}

function TableHead({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return (
    <th className={`px-4 py-3 ${align === "center" ? "text-center" : "text-left"}`} style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
      {children}
    </th>
  );
}
