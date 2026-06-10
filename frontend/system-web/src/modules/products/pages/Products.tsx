import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  CalendarDays,
  Check,
  Edit,
  Eye,
  EyeOff,
  Grid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";
import type {
  FileUploadDto,
  IngredientCategoryDto,
  IngredientDto,
  PageResponse,
  ProductCategoryDto,
  ProductDto,
  ProductRequest,
  ProductSizeDto,
  ProductSizeRequestDto,
  ProductToppingDto,
  ProductVariantDto,
  RecipeDto,
  RecipeRequestDto,
  SeasonDto,
  SeasonalProductDto,
  VariantDto,
  VariantRequestDto,
} from "../../../lib/types";

type ProductStatus = "active" | "hidden";
type ProductFormMode = "create" | "edit";
type ProductKind = "drink" | "cake";
type SizeKey = "S" | "M" | "L";

interface Product {
  id: number;
  name: string;
  categoryId: number | null;
  category: string;
  price: number | null;
  productKind: ProductKind;
  status: ProductStatus;
  description: string;
  imgUrl: string;
  recipeId: number | null;
  recipeName: string;
  seasonId: number | null;
  seasonName: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface RecipeOption {
  id: number;
  name: string;
  productId: number | null;
  description: string;
}

interface SeasonOption {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface VariantOption {
  id: number;
  group: string;
  label: string;
  status: string;
}

interface ToppingOption {
  id: number;
  name: string;
  unit: string;
}

interface ProductForm {
  name: string;
  categoryId: string;
  productKind: ProductKind;
  recipeId: string;
  price: string;
  imgUrl: string;
  description: string;
  status: ProductStatus;
  enableSizes: boolean;
  sizes: Record<SizeKey, string>;
  enableToppings: boolean;
  toppingIds: string[];
  enableVariants: boolean;
  variantIds: string[];
}

type ProductAction = { type: "delete" | "hide" | "show"; product: Product };

const PRODUCT_PAGE_SIZE = 9;
const sizeKeys: SizeKey[] = ["S", "M", "L"];
const emptySizes: Record<SizeKey, string> = { S: "0", M: "0", L: "0" };

const emptyForm: ProductForm = {
  name: "",
  categoryId: "",
  productKind: "drink",
  recipeId: "",
  price: "",
  imgUrl: "",
  description: "",
  status: "active",
  enableSizes: false,
  sizes: emptySizes,
  enableToppings: false,
  toppingIds: [],
  enableVariants: false,
  variantIds: [],
};

const defaultVariantGroups = [
  { id: "temperature", title: "Nhiet do", options: ["Nong", "Lanh"] },
  { id: "sugar", title: "Đường", options: ["0%", "30%", "50%", "70%", "100%"] },
  { id: "ice", title: "Đá", options: ["Ít đá", "Bình thường", "Nhiều đá"] },
  { id: "flavor", title: "Hương vị", options: ["Caramel", "Chocolate", "Hạnh nhân", "Kem sữa"] },
  { id: "coffee_shot", title: "Shot cà phê", options: ["Single", "Double", "Extra shot"] },
];

const statusLabels: Record<ProductStatus, { label: string; class: string }> = {
  active: { label: "Đang bán", class: "bg-green-100 text-green-700" },
  hidden: { label: "Tạm ẩn", class: "bg-gray-100 text-gray-500" },
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const dtoCategoryId = (dto: ProductCategoryDto) => Number((dto as any).pCategoryId ?? (dto as any).pcategoryId ?? (dto as any).PCategoryId ?? 0);
const dtoCategoryName = (dto: ProductCategoryDto) => String((dto as any).pCategoryName ?? (dto as any).pcategoryName ?? (dto as any).PCategoryName ?? "");
const dtoProductCategoryId = (dto: ProductDto) => {
  const value = (dto as any).pCategoryId ?? (dto as any).pcategoryId ?? (dto as any).PCategoryId;
  return value == null ? null : Number(value);
};
const dtoIngredientCategoryId = (dto: IngredientDto) => {
  const value = (dto as any).iCategoryId ?? (dto as any).icategoryId ?? (dto as any).ICategoryId;
  return Number(value || 0);
};
const dtoIngredientCategoryName = (dto: IngredientCategoryDto) =>
  String((dto as any).iCategoryName ?? (dto as any).icategoryName ?? (dto as any).ICategoryName ?? "");
const dtoRecipeProductId = (dto: RecipeDto) => {
  const value = (dto as any).productId;
  return value == null ? null : Number(value);
};
const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";
const moneyValue = (value: string) => Number(value || 0);
const normalizeKey = (value: string) => value.trim().toLowerCase();
const normalizeText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const inferProductKindFromCategory = (categoryName?: string | null): ProductKind | null => {
  const normalized = normalizeText(categoryName || "");
  if (!normalized) return null;
  if (["banh", "cake", "bakery", "pastry", "snack", "food"].some(keyword => normalized.includes(keyword))) {
    return "cake";
  }
  if (["ca phe", "coffee", "tra", "matcha", "sinh to", "nuoc", "do uong", "latte", "espresso"].some(keyword => normalized.includes(keyword))) {
    return "drink";
  }
  return null;
};

const resolveProductKind = (productType: unknown, categoryName?: string | null): ProductKind => {
  const normalized = normalizeText(String(productType || ""));
  if (["cake", "bakery", "pastry", "snack", "food"].includes(normalized)) return "cake";
  if (["drink", "beverage", "coffee", "tea"].includes(normalized)) return "drink";
  return inferProductKindFromCategory(categoryName) || "drink";
};

const applyProductKindRules = (form: ProductForm): ProductForm => {
  if (form.productKind !== "cake") return form;
  return {
    ...form,
    recipeId: "",
    enableSizes: false,
    sizes: { ...emptySizes },
    enableToppings: false,
    toppingIds: [],
    enableVariants: false,
    variantIds: [],
  };
};

const localDateTimeNow = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19);
};

function toRecipeOption(dto: RecipeDto): RecipeOption {
  return {
    id: Number(dto.recipeId),
    name: dto.recipeName || `Công thức #${dto.recipeId}`,
    productId: dtoRecipeProductId(dto),
    description: dto.description || "",
  };
}

function toSeasonOption(dto: SeasonDto): SeasonOption {
  return {
    id: Number(dto.seasonId),
    name: dto.seasonName || `Mua #${dto.seasonId}`,
    startDate: dto.startDate,
    endDate: dto.endDate,
    status: dto.status || "active",
  };
}

function toVariantOption(dto: VariantDto): VariantOption {
  return {
    id: Number(dto.variantId),
    group: dto.variantGroup,
    label: dto.variantLabel,
    status: dto.status || "active",
  };
}

function toProduct(
  dto: ProductDto,
  categories: CategoryOption[],
  recipes: RecipeOption[],
  seasonalLinks: SeasonalProductDto[],
  seasons: SeasonOption[],
): Product {
  const categoryId = dtoProductCategoryId(dto);
  const category = categories.find(item => item.id === categoryId)?.name || "Chưa phân loại";
  const status = dto.status === "active" ? "active" : "hidden";
  const recipe = recipes.find(item => item.productId === dto.productId);
  const seasonal = seasonalLinks.find(item => Number(item.productId) === Number(dto.productId));
  const season = seasons.find(item => item.id === Number(seasonal?.seasonId));
  const productKind = resolveProductKind((dto as any).productType, category);

  return {
    id: dto.productId,
    name: dto.productName || `Product #${dto.productId}`,
    categoryId,
    category,
    price: dto.basePrice == null ? null : Number(dto.basePrice),
    productKind,
    status,
    description: dto.description || "",
    imgUrl: dto.imgUrl || "",
    recipeId: recipe?.id ?? null,
    recipeName: recipe?.name ?? "Chưa gắn công thức",
    seasonId: seasonal ? Number(seasonal.seasonId) : null,
    seasonName: season?.name ?? "Sản phẩm thường",
  };
}

function toRequest(form: ProductForm): ProductRequest {
  return {
    productName: form.name.trim(),
    pCategoryId: form.categoryId ? Number(form.categoryId) : null,
    basePrice: form.productKind === "drink" && form.enableSizes ? null : moneyValue(form.price),
    productType: form.productKind,
    imgUrl: form.imgUrl.trim() || null,
    description: form.description.trim() || null,
    status: form.status === "active" ? "active" : "inactive",
  };
}

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [toppings, setToppings] = useState<ToppingOption[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [formMode, setFormMode] = useState<ProductFormMode | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [pendingAction, setPendingAction] = useState<ProductAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFormRelations, setLoadingFormRelations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureDefaultVariants = async (loadedVariants?: VariantOption[]) => {
    const loadVariantOptions = async () => {
      const data = await api.get<PageResponse<VariantDto> | VariantDto[]>("/products/variants?size=500&sort=variantId,asc");
      return pageItems(data).map(toVariantOption).filter(item => item.id && item.group && item.label);
    };

    let options = loadedVariants ?? await loadVariantOptions();

    const byKey = new Map(options.map(item => [`${normalizeKey(item.group)}::${normalizeKey(item.label)}`, item]));
    const created: VariantOption[] = [];
    for (const group of defaultVariantGroups) {
      for (const label of group.options) {
        const key = `${normalizeKey(group.id)}::${normalizeKey(label)}`;
        if (!byKey.has(key)) {
          const request: VariantRequestDto = {
            variantGroup: group.id,
            variantLabel: label,
            extraPrice: 0,
            status: "active",
          };
          try {
            const saved = await api.post<VariantDto>("/products/variants", request);
            const option = toVariantOption(saved);
            byKey.set(key, option);
            created.push(option);
          } catch (error) {
            const refreshed = await loadVariantOptions();
            const existing = refreshed.find(item => `${normalizeKey(item.group)}::${normalizeKey(item.label)}` === key);
            if (!existing) throw error;
            byKey.set(key, existing);
            created.push(existing);
          }
        }
      }
    }
    return [...options, ...created];
  };

  const loadToppings = async () => {
    const [categoryData, ingredientData] = await Promise.all([
      api.get<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=100&sort=iCategoryId,asc"),
      api.get<PageResponse<IngredientDto> | IngredientDto[]>("/ingredients?size=500&sort=ingredientId,asc"),
    ]);
    const toppingCategory = pageItems(categoryData).find(category => dtoIngredientCategoryName(category).trim().toLowerCase() === "topping");
    const toppingCategoryId = toppingCategory ? Number((toppingCategory as any).iCategoryId ?? (toppingCategory as any).icategoryId ?? 0) : 0;
    if (!toppingCategoryId) return [];
    return pageItems(ingredientData)
      .filter(item => dtoIngredientCategoryId(item) === toppingCategoryId && item.status !== "inactive")
      .map(item => ({
        id: Number(item.ingredientId),
        name: item.ingredientName || `Topping #${item.ingredientId}`,
        unit: item.unit || "phan",
      }))
      .filter(item => item.id && item.name);
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryData, productData, recipeData, seasonData, seasonalData, variantData, toppingData] = await Promise.all([
        api.get<PageResponse<ProductCategoryDto> | ProductCategoryDto[]>("/product-categories?size=100&sort=pCategoryId,asc"),
        api.get<PageResponse<ProductDto> | ProductDto[]>("/products?size=100&sort=productId,desc"),
        api.get<PageResponse<RecipeDto> | RecipeDto[]>("/products/recipes?size=500&sort=recipeId,desc"),
        api.get<PageResponse<SeasonDto> | SeasonDto[]>("/products/seasons?size=100&sort=seasonId,desc"),
        api.get<SeasonalProductDto[]>("/products/seasonal-products"),
        api.get<PageResponse<VariantDto> | VariantDto[]>("/products/variants?size=500&sort=variantId,asc"),
        loadToppings(),
      ]);

      const categoryOptions = pageItems(categoryData)
        .map(dto => ({ id: dtoCategoryId(dto), name: dtoCategoryName(dto) }))
        .filter(item => item.id && item.name);
      const recipeOptions = pageItems(recipeData).map(toRecipeOption).filter(item => item.id && item.name);
      const seasonOptions = pageItems(seasonData).map(toSeasonOption).filter(item => item.id && item.name);
      const variantOptions = await ensureDefaultVariants(pageItems(variantData).map(toVariantOption).filter(item => item.id && item.group && item.label));
      const seasonalLinks = pageItems(seasonalData);
      const mappedProducts = pageItems(productData).map(dto => toProduct(dto, categoryOptions, recipeOptions, seasonalLinks, seasonOptions));

      setCategories(categoryOptions);
      setRecipes(recipeOptions);
      setVariants(variantOptions);
      setToppings(toppingData);
      setProducts(mappedProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return products.filter(product => {
      const matchSearch = !keyword || [product.name, product.category, product.description, product.recipeName, product.seasonName].some(value => value.toLowerCase().includes(keyword));
      const matchCat = catFilter === "all" || String(product.categoryId) === catFilter;
      const matchStatus = statusFilter === "all" || product.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [catFilter, products, search, statusFilter]);
  const pagedProducts = useMemo(() => getPagedItems(filtered, page, PRODUCT_PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [catFilter, search, statusFilter]);

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(filtered.length, PRODUCT_PAGE_SIZE)));
  }, [filtered.length]);

  const updateForm = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(item => String(item.id) === categoryId);
    const inferredKind = inferProductKindFromCategory(category?.name);
    setForm(prev => applyProductKindRules({
      ...prev,
      categoryId,
      productKind: inferredKind || prev.productKind,
    }));
  };

  const handleProductKindChange = (productKind: ProductKind) => {
    setForm(prev => applyProductKindRules({ ...prev, productKind }));
  };

  const setSizePrice = (size: SizeKey, value: string) => {
    setForm(prev => ({ ...prev, sizes: { ...prev.sizes, [size]: value } }));
  };

  const toggleFormArrayValue = (field: "toppingIds" | "variantIds", value: string) => {
    setForm(prev => {
      const exists = prev[field].includes(value);
      return { ...prev, [field]: exists ? prev[field].filter(item => item !== value) : [...prev[field], value] };
    });
  };

  const openCreateForm = () => {
    const defaultCategoryId = categories[0]?.id ? String(categories[0].id) : "";
    const defaultCategory = categories.find(item => String(item.id) === defaultCategoryId);
    setEditingProduct(null);
    setForm(applyProductKindRules({
      ...emptyForm,
      sizes: { ...emptySizes },
      categoryId: defaultCategoryId,
      productKind: inferProductKindFromCategory(defaultCategory?.name) || "drink",
    }));
    setFormMode("create");
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setForm(applyProductKindRules({
      ...emptyForm,
      name: product.name,
      categoryId: product.categoryId ? String(product.categoryId) : "",
      productKind: product.productKind,
      recipeId: product.recipeId ? String(product.recipeId) : "",
      price: product.price == null ? "" : String(product.price),
      imgUrl: product.imgUrl,
      description: product.description,
      status: product.status,
      sizes: { ...emptySizes },
    }));
    setFormMode("edit");
    void loadProductRelations(product.id);
  };

  const loadProductRelations = async (productId: number) => {
    setLoadingFormRelations(true);
    try {
      const [sizeData, variantData, toppingData] = await Promise.all([
        api.get<ProductSizeDto[]>(`/products/${productId}/sizes`),
        api.get<ProductVariantDto[]>(`/products/${productId}/variants`),
        api.get<ProductToppingDto[]>(`/products/${productId}/toppings`),
      ]);
      const sizes = { ...emptySizes };
      pageItems(sizeData).forEach(size => {
        if (sizeKeys.includes(size.size as SizeKey)) {
          sizes[size.size as SizeKey] = String(size.extraPrice ?? 0);
        }
      });
      const hasSizes = pageItems(sizeData).length > 0;
      setForm(prev => applyProductKindRules({
        ...prev,
        enableSizes: hasSizes,
        price: hasSizes ? "" : prev.price,
        sizes,
        enableVariants: pageItems(variantData).length > 0,
        variantIds: pageItems(variantData).map(item => String(item.variantId)),
        enableToppings: pageItems(toppingData).length > 0,
        toppingIds: pageItems(toppingData).map(item => String(item.ingredientId)),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải cấu hình sản phẩm");
    } finally {
      setLoadingFormRelations(false);
    }
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploaded = await api.upload<FileUploadDto>("/upload/image", file);
      updateForm("imgUrl", uploadResultUrl(uploaded));
      toast.success("Đã tải ảnh lên Cloudinary");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải ảnh");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const updateRecipeProduct = async (recipeId: number, productId: number | null) => {
    const recipe = recipes.find(item => item.id === recipeId);
    const request: RecipeRequestDto = {
      productId,
      recipeName: recipe?.name ?? null,
      description: recipe?.description ?? null,
    };
    await api.put<RecipeDto>(`/products/recipes/${recipeId}`, request);
  };

  const syncRecipe = async (productId: number, enabled: boolean) => {
    const previousRecipeId = editingProduct?.recipeId ?? null;
    const selectedRecipeId = enabled && form.recipeId ? Number(form.recipeId) : null;
    if (previousRecipeId && previousRecipeId !== selectedRecipeId) {
      await updateRecipeProduct(previousRecipeId, null);
    }
    if (selectedRecipeId) {
      await updateRecipeProduct(selectedRecipeId, productId);
    }
  };

  const saveProductSize = (sizeId: number, request: ProductSizeRequestDto) => {
    return api.put<ProductSizeDto>(`/admin/products/sizes/${sizeId}`, request);
  };

  const syncSizes = async (productId: number, enabled: boolean) => {
    const current = await api.get<ProductSizeDto[]>(`/products/${productId}/sizes`);
    const currentItems = pageItems(current);

    if (!enabled) {
      await Promise.all(currentItems
        .filter(size => size.status !== "inactive")
        .map(size => saveProductSize(size.sizeId, {
          productId,
          size: size.size,
          extraPrice: size.extraPrice ?? 0,
          status: "inactive",
        })));
      return;
    }

    const bySize = new Map<string, ProductSizeDto>();
    currentItems.forEach(size => {
      const key = normalizeKey(size.size);
      if (!bySize.has(key) || bySize.get(key)?.status === "inactive") {
        bySize.set(key, size);
      }
    });
    const retainedSizeIds = new Set(sizeKeys
      .map(size => bySize.get(normalizeKey(size))?.sizeId)
      .filter((sizeId): sizeId is number => sizeId != null));
    await Promise.all(sizeKeys.map(size => {
      const request: ProductSizeRequestDto = {
        productId,
        size,
        extraPrice: moneyValue(form.sizes[size]),
        status: "active",
      };
      const existing = bySize.get(normalizeKey(size));
      return existing
        ? saveProductSize(existing.sizeId, request)
        : api.post<ProductSizeDto>(`/products/${productId}/sizes`, request);
    }));

    await Promise.all(currentItems
      .filter(size => !retainedSizeIds.has(size.sizeId) && size.status !== "inactive")
      .map(size => saveProductSize(size.sizeId, {
        productId,
        size: size.size,
        extraPrice: size.extraPrice ?? 0,
        status: "inactive",
      })));
  };

  const syncVariants = async (productId: number, enabled: boolean) => {
    const selected = enabled && form.enableVariants ? form.variantIds.map(Number) : [];
    const current = await api.get<ProductVariantDto[]>(`/products/${productId}/variants`);
    const currentIds = pageItems(current).map(item => Number(item.variantId));

    await Promise.all(currentIds.filter(id => !selected.includes(id)).map(id => api.del<void>(`/products/${productId}/variants/${id}`)));
    await Promise.all(selected.filter(id => !currentIds.includes(id)).map(id => api.post<void>(`/products/${productId}/variants/${id}`)));
  };

  const syncToppings = async (productId: number, enabled: boolean) => {
    const selected = enabled && form.enableToppings ? form.toppingIds.map(Number) : [];
    const current = await api.get<ProductToppingDto[]>(`/products/${productId}/toppings`);
    const currentIds = pageItems(current).map(item => Number(item.ingredientId));

    await Promise.all(currentIds.filter(id => !selected.includes(id)).map(id => api.del<void>(`/products/${productId}/toppings/${id}`)));
    await Promise.all(selected.filter(id => !currentIds.includes(id)).map(id => api.post<void>(`/products/${productId}/toppings/${id}`)));
  };

  const deleteProductRelations = async (product: Product) => {
    const [sizes, variantsData, toppingsData, seasonalData] = await Promise.all([
      api.get<ProductSizeDto[]>(`/products/${product.id}/sizes`),
      api.get<ProductVariantDto[]>(`/products/${product.id}/variants`),
      api.get<ProductToppingDto[]>(`/products/${product.id}/toppings`),
      api.get<SeasonalProductDto[]>("/products/seasonal-products"),
    ]);

    await Promise.all([
      ...pageItems(sizes).map(size => api.del<void>(`/products/${product.id}/sizes/${size.sizeId}`)),
      ...pageItems(variantsData).map(variant => api.del<void>(`/products/${product.id}/variants/${variant.variantId}`)),
      ...pageItems(toppingsData).map(topping => api.del<void>(`/products/${product.id}/toppings/${topping.ingredientId}`)),
      ...pageItems(seasonalData)
        .filter(link => Number(link.productId) === product.id)
        .map(link => api.del<void>(`/products/seasons/${link.seasonId}/products/${product.id}`)),
    ]);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim()) {
      toast.error("Tên sản phẩm là bắt buộc");
      return;
    }
    const effectiveForm = applyProductKindRules(form);
    const isDrinkProduct = effectiveForm.productKind === "drink";
    if (!isDrinkProduct && !effectiveForm.price.trim()) {
      toast.error("Giá bán là bắt buộc với sản phẩm dạng bánh");
      return;
    }

    setSaving(true);
    try {
      let savedProduct: ProductDto;
      if (formMode === "edit" && editingProduct) {
        savedProduct = await api.put<ProductDto>(`/products/${editingProduct.id}`, toRequest(effectiveForm));
      } else {
        savedProduct = await api.post<ProductDto>("/products", { ...toRequest(effectiveForm), createdAt: localDateTimeNow() });
      }

      const productId = Number(savedProduct.productId || editingProduct?.id || 0);
      if (!productId) throw new Error("Không lấy được mã sản phẩm sau khi lưu");

      await syncRecipe(productId, isDrinkProduct);
      await syncSizes(productId, isDrinkProduct && effectiveForm.enableSizes);
      await syncVariants(productId, isDrinkProduct);
      await syncToppings(productId, isDrinkProduct);

      toast.success(formMode === "edit" ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm");
      closeForm();
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  const handleProductAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;

    try {
      if (action.type === "delete") {
        await deleteProductRelations(action.product);
        await api.del<void>(`/products/${action.product.id}`);
        toast.success("Đã xóa sản phẩm");
      } else if (action.type === "hide") {
        await api.patch<ProductDto>(`/products/${action.product.id}/hide`);
        toast.success("Đã ẩn sản phẩm");
      } else {
        await api.patch<ProductDto>(`/products/${action.product.id}/show`);
        toast.success("Đã hiện sản phẩm");
      }
      setPendingAction(null);
      await loadProducts();
      if (action.type === "delete") {
        setProducts(prev => prev.filter(product => product.id !== action.product.id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể thực hiện thao tác");
    }
  };

  if (formMode) {
    const title = formMode === "edit" ? "Sửa sản phẩm" : "Thêm sản phẩm mới";
    const isDrinkProduct = form.productKind === "drink";
    const availableRecipes = isDrinkProduct
      ? recipes.filter(recipe => !recipe.productId || (editingProduct && recipe.productId === editingProduct.id))
      : [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <X size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0F4761" }}>{title}</h1>
              <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: 2 }}>
                {loadingFormRelations ? "Đang tải cấu hình..." : isDrinkProduct ? "Thông tin, size, topping và biến thể" : "Thông tin và giá bán"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={closeForm} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Huy</button>
            <button disabled={saving} onClick={() => void handleSaveProduct()} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{ fontSize: "13.5px" }}>
              {saving ? "Đang lưu..." : formMode === "edit" ? "Cập nhật" : "Thêm sản phẩm"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
          <div className="space-y-4">
            <FormSection icon={<Tags size={16} />} title="Thông tin sản phẩm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Tên sản phẩm *</FieldLabel>
                  <input value={form.name} onChange={event => updateForm("name", event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
                </div>
                <div>
                  <FieldLabel>Danh mục</FieldLabel>
                  <select value={form.categoryId} onChange={event => handleCategoryChange(event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: "13px" }}>
                    <option value="">Chưa phân loại</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Giá cơ bản</FieldLabel>
                  <input
                    type="number"
                    value={form.price}
                    onChange={event => updateForm("price", event.target.value)}
                    disabled={isDrinkProduct && form.enableSizes}
                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg outline-none ${isDrinkProduct && form.enableSizes ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                    style={{ fontSize: "13px" }}
                  />
                </div>
                <div>
                  <FieldLabel>Trạng thái</FieldLabel>
                  <select value={form.status} onChange={event => updateForm("status", event.target.value as ProductStatus)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: "13px" }}>
                    <option value="active">Đang bán</option>
                    <option value="hidden">Tạm ẩn</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel>Mô tả</FieldLabel>
                <textarea value={form.description} onChange={event => updateForm("description", event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none" rows={4} style={{ fontSize: "13px" }} />
              </div>
            </FormSection>

            <FormSection icon={<CalendarDays size={16} />} title="Dạng sản phẩm">
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton active={form.productKind === "drink"} onClick={() => handleProductKindChange("drink")}>
                  Nước / đồ uống
                </ChoiceButton>
                <ChoiceButton active={form.productKind === "cake"} onClick={() => handleProductKindChange("cake")}>
                  Bánh / đồ ăn
                </ChoiceButton>
              </div>
            </FormSection>

            {isDrinkProduct && <FormSection icon={<SlidersHorizontal size={16} />} title="Cấu hình bán hàng">
              <div>
                <FieldLabel>Công thức</FieldLabel>
                <select
                  value={form.recipeId}
                  onChange={event => updateForm("recipeId", event.target.value)}
                  disabled={availableRecipes.length === 0}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  style={{ fontSize: "13px" }}
                >
                  <option value="">{recipes.length === 0 ? "Chưa có công thức trong database" : "Không có công thức"}</option>
                  {availableRecipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
                </select>
              </div>

              <SwitchRow
                checked={form.enableSizes}
                onChange={() => setForm(prev => ({ ...prev, enableSizes: !prev.enableSizes, price: !prev.enableSizes ? "" : prev.price }))}
                title="Thêm size S/M/L"
              />
              {form.enableSizes && (
                <div className="grid grid-cols-3 gap-3">
                  {sizeKeys.map(size => (
                    <div key={size}>
                      <FieldLabel>Size {size}</FieldLabel>
                      <input type="number" value={form.sizes[size]} onChange={event => setSizePrice(size, event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} placeholder="0" />
                    </div>
                  ))}
                </div>
              )}

              <SwitchRow checked={form.enableToppings} onChange={() => updateForm("enableToppings", !form.enableToppings)} title="Cho phep topping" />
              {form.enableToppings && (
                <OptionGrid emptyText="Chưa có topping trong danh mục nguyên liệu topping.">
                  {toppings.map(topping => (
                    <CheckboxPill
                      key={topping.id}
                      checked={form.toppingIds.includes(String(topping.id))}
                      onClick={() => toggleFormArrayValue("toppingIds", String(topping.id))}
                    >
                      {topping.name}
                    </CheckboxPill>
                  ))}
                </OptionGrid>
              )}

              <SwitchRow checked={form.enableVariants} onChange={() => updateForm("enableVariants", !form.enableVariants)} title="Bat bien the" />
              {form.enableVariants && (
                <div className="space-y-3">
                  {defaultVariantGroups.map(group => {
                    const groupOptions = variants.filter(variant => normalizeKey(variant.group) === normalizeKey(group.id));
                    return (
                      <div key={group.id}>
                        <FieldLabel>{group.title}</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          {groupOptions.map(variant => (
                            <CheckboxPill
                              key={variant.id}
                              checked={form.variantIds.includes(String(variant.id))}
                              onClick={() => toggleFormArrayValue("variantIds", String(variant.id))}
                            >
                              {variant.label}
                            </CheckboxPill>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </FormSection>}
          </div>

          <div className="space-y-4">
            <FormSection icon={<Upload size={16} />} title="Hình ảnh">
              <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center bg-gray-50">
                {form.imgUrl ? (
                  <img src={form.imgUrl} alt={form.name || "Product"} className="mx-auto h-44 w-full object-cover rounded-lg bg-white" />
                ) : (
                  <div className="h-44 flex items-center justify-center text-gray-400" style={{ fontSize: "13px" }}>
                    {uploadingImage ? "Đang tải ảnh..." : "Chưa có ảnh"}
                  </div>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer" style={{ fontSize: "13px" }}>
                <Upload size={15} />
                {uploadingImage ? "Đang tải..." : "Chọn ảnh"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
              <input value={form.imgUrl} onChange={event => updateForm("imgUrl", event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} placeholder="https://res.cloudinary.com/..." />
            </FormSection>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Quản lý sản phẩm</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{products.length} sản phẩm lấy từ database</p>
        </div>
        <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: "13.5px" }}>
          <Plus size={16} /> Thêm sản phẩm
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm sản phẩm..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
        </div>
        <select value={catFilter} onChange={event => setCatFilter(event.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả danh mục</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="hidden">Tạm ẩn</option>
        </select>
        <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-[#0F4761] text-white" : "text-gray-400"}`}><Grid size={15} /></button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-[#0F4761] text-white" : "text-gray-400"}`}><List size={15} /></button>
        </div>
      </div>

      {loading && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-gray-500">Đang tải sản phẩm...</div>}
      {!loading && error && (
        <div className="bg-red-50 rounded-lg border border-red-100 p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => void loadProducts()} className="px-3 py-1.5 rounded-lg bg-white border border-red-100">Thử lại</button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-gray-500">Chưa có sản phẩm trong database.</div>
      )}

      {!loading && !error && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagedProducts.map(product => <ProductCard key={product.id} product={product} onEdit={openEditForm} onAction={setPendingAction} />)}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && viewMode === "list" && (
        <ProductTable products={pagedProducts} onEdit={openEditForm} onAction={setPendingAction} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <Pagination
          page={page}
          total={filtered.length}
          pageSize={PRODUCT_PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="sản phẩm"
          containerClassName="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3"
        />
      )}

      {pendingAction && (
        <ProductActionModal
          action={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void handleProductAction()}
        />
      )}
    </div>
  );
}

function formatPrice(value: number | null) {
  return value == null ? "Theo size" : `${value.toLocaleString("vi-VN")}d`;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>{children}</label>;
}

function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 text-[#0F4761]" style={{ fontSize: "14px", fontWeight: 700 }}>
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 border rounded-lg flex items-center justify-center gap-2 ${active ? "border-[#0F4761] bg-[#0F4761] text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
      style={{ fontSize: "13px", fontWeight: 600 }}
    >
      {active && <Check size={14} />}
      {children}
    </button>
  );
}

function SwitchRow({ checked, onChange, title }: { checked: boolean; onChange: () => void; title: string }) {
  return (
    <button type="button" onClick={onChange} className="w-full flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100">
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{title}</span>
      <span className={`w-10 h-5 rounded-full p-0.5 transition-colors ${checked ? "bg-[#0F4761]" : "bg-gray-300"}`}>
        <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function OptionGrid({ children, emptyText }: { children: ReactNode; emptyText: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasChildren) {
    return <div className="p-3 bg-gray-50 rounded-lg text-gray-500" style={{ fontSize: "12.5px" }}>{emptyText}</div>;
  }
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function CheckboxPill({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 border rounded-lg flex items-center gap-1.5 ${checked ? "border-[#0F4761] bg-[#0F4761]/10 text-[#0F4761]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
      style={{ fontSize: "12.5px", fontWeight: 600 }}
    >
      {checked && <Check size={13} />}
      {children}
    </button>
  );
}

function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  if (product.imgUrl) {
    return <img src={product.imgUrl} alt={product.name} className="w-full h-full object-cover" />;
  }
  return <span style={{ fontSize: large ? "20px" : "12px", color: "#9CA3AF" }}>Chưa có ảnh</span>;
}

function ProductKindBadge({ product }: { product: Product }) {
  if (product.productKind === "cake") {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Bánh</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-700">Nước</span>;
}

function ProductCard({ product, onEdit, onAction }: { product: Product; onEdit: (product: Product) => void; onAction: (action: ProductAction) => void }) {
  const status = statusLabels[product.status];
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-40 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <ProductImage product={product} large />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{product.name}</h3>
            <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{product.category} - #{product.id}</p>
            <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>Công thức: {product.recipeName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${status.class}`}>{status.label}</span>
            <ProductKindBadge product={product} />
          </div>
        </div>
        <div className="mt-2" style={{ fontSize: "13px", color: "#6B7280" }}>{formatPrice(product.price)}</div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => onEdit(product)} className="flex-1 py-1.5 text-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50" style={{ fontSize: "12.5px" }}>
            <Edit size={13} className="inline mr-1" /> Sửa
          </button>
          <button onClick={() => onAction({ type: product.status === "active" ? "hide" : "show", product })} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50">
            {product.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={() => onAction({ type: "delete", product })} className="p-1.5 border border-red-200 rounded-lg text-red-400 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductTable({ products, onEdit, onAction }: { products: Product[]; onEdit: (product: Product) => void; onAction: (action: ProductAction) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Danh mục</TableHead>
            <TableHead>Công thức</TableHead>
            <TableHead>Giá</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.map(product => {
            const status = statusLabels[product.status];
            return (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center overflow-hidden">
                      <ProductImage product={product} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>{product.name}</div>
                      <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>#{product.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><ProductKindBadge product={product} /></td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151" }}>{product.category}</td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{product.recipeName}</td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{formatPrice(product.price)}</td>
                <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs ${status.class}`}>{status.label}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onEdit(product)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500"><Edit size={15} /></button>
                    <button onClick={() => onAction({ type: product.status === "active" ? "hide" : "show", product })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">{product.status === "active" ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button onClick={() => onAction({ type: "delete", product })} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{children}</th>;
}

function ProductActionModal({ action, onClose, onConfirm }: { action: ProductAction; onClose: () => void; onConfirm: () => void }) {
  const isDelete = action.type === "delete";
  const label = isDelete ? "Xóa sản phẩm" : action.type === "hide" ? "Ẩn sản phẩm" : "Hiện sản phẩm";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-2xl p-6">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isDelete ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
          {isDelete ? <Trash2 size={18} /> : <EyeOff size={18} />}
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "6px" }}>{label}</h2>
        <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.6 }}>
          Bạn có chắc muốn thực hiện thao tác này với {action.product.name}?
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Huy</button>
          <button onClick={onConfirm} className={`flex-1 py-2 rounded-lg text-white ${isDelete ? "bg-red-500 hover:bg-red-600" : "bg-[#0F4761] hover:bg-[#0d3e54]"}`} style={{ fontSize: "13.5px" }}>
            Xac nhan
          </button>
        </div>
      </div>
    </div>
  );
}
