import { useCallback, useEffect, useState } from "react";
import { apiRequest, pageItems, PageResponse } from "./api";

export type ProductPrice = {
  size: string;
  price: number;
  sizeId?: number;
};

export type Topping = {
  id?: number;
  name: string;
  price: number;
};

export type ComboItem = {
  productId: number;
  name: string;
  quantity: number;
  image?: string;
  price?: number;
};

export type Product = {
  id: string;
  productId: number;
  comboId?: number;
  name: string;
  description: string;
  prices: ProductPrice[];
  image: string;
  category: string;
  categoryId?: number;
  kind?: "product" | "combo";
  productType?: string;
  startDate?: string;
  endDate?: string;
  badges?: string[];
  variants?: string[];
  toppings: Topping[];
  comboItems?: ComboItem[];
};

export type ProductCategory = {
  id: string;
  label: string;
  icon: string;
  categoryId?: number;
};

export type CustomerMenuData = {
  products: Product[];
  categories: ProductCategory[];
  toppings: Topping[];
};

type ProductDto = {
  productId: number;
  pCategoryId?: number;
  productName?: string;
  description?: string;
  basePrice?: number;
  productType?: string;
  imgUrl?: string;
  status?: string;
};

type ComboDto = {
  comboId: number;
  comboName?: string;
  description?: string;
  category?: string;
  imgUrl?: string;
  price?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
};

type ProductCategoryDto = {
  pCategoryId: number;
  pCategoryName?: string;
};

type ProductSizeDto = {
  sizeId?: number;
  productId: number;
  size?: string;
  extraPrice?: number;
  status?: string;
};

type ProductVariantDto = {
  productId: number;
  variantId: number;
  isDefault?: boolean;
};

type VariantDto = {
  variantId: number;
  variantLabel?: string;
  status?: string;
};

type IngredientDto = {
  ingredientId: number;
  ingredientName?: string;
  status?: string;
  toppingPrice?: number;
  price?: number;
  extraPrice?: number;
  unitPrice?: number;
  sellingPrice?: number;
};

type ProductToppingDto = {
  productId: number;
  ingredientId: number;
};

type ComboDetailDto = {
  comboId: number;
  productId: number;
  productName?: string;
  quantity?: number;
};

const EMPTY_MENU: CustomerMenuData = {
  products: [],
  categories: [],
  toppings: [],
};

let cachedMenu: CustomerMenuData | null = null;
let menuRequest: Promise<CustomerMenuData> | null = null;
const comboItemsCache = new Map<number, Promise<ComboItem[]> | ComboItem[]>();

const DEFAULT_TOPPING_PRICE = 5000;
const TOPPING_PRICE_RULES = [
  { keywords: ["kem cheese", "cream cheese", "foam", "macchiato"], price: 10000 },
  { keywords: ["pudding", "flan"], price: 8000 },
  { keywords: ["tran chau", "boba", "pearl"], price: 7000 },
  { keywords: ["nha dam", "aloe", "duong den", "caramel"], price: 6000 },
  { keywords: ["thach", "jelly", "hat", "dau do"], price: 5000 },
];

function isActive(status?: string) {
  const normalized = (status || "").trim().toLowerCase();
  return !normalized || normalized === "active";
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isFoodProduct(product: ProductDto, categoryLabel?: string) {
  const type = normalizeText(product.productType);
  if (["cake", "bakery", "pastry", "snack", "food"].includes(type)) return true;

  const text = normalizeText([
    product.productName,
    product.description,
    categoryLabel,
  ].filter(Boolean).join(" "));

  return ["banh", "cake", "bakery", "pastry", "croissant", "snack", "food"]
    .some((keyword) => text.includes(keyword));
}

function knownPrice(values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const price = Number(value);
    if (Number.isFinite(price) && price >= 0) return price;
  }
  return undefined;
}

function fallbackToppingPrice(name?: string) {
  const normalized = normalizeText(name);
  const rule = TOPPING_PRICE_RULES.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword))
  );
  return rule?.price ?? DEFAULT_TOPPING_PRICE;
}

function normalizeTopping(topping: Topping): Topping {
  return {
    ...topping,
    price: knownPrice([topping.price]) ?? fallbackToppingPrice(topping.name),
  };
}

function categoryKey(categoryId?: number) {
  return categoryId ? `category-${categoryId}` : "category-other";
}

function categoryIcon(label?: string) {
  const normalized = normalizeText(label);
  if (normalized.includes("ca phe") || normalized.includes("coffee")) return "coffee";
  if (normalized.includes("tra") || normalized.includes("matcha")) return "tea";
  if (normalized.includes("banh") || normalized.includes("snack")) return "snack";
  if (normalized.includes("combo")) return "combo";
  if (normalized.includes("sinh to") || normalized.includes("nuoc") || normalized.includes("do uong")) return "drink";
  return "menu";
}

function sortSizes(a: ProductPrice, b: ProductPrice) {
  const order = new Map([
    ["s", 1],
    ["m", 2],
    ["l", 3],
  ]);
  const aOrder = order.get(normalizeText(a.size)) || 99;
  const bOrder = order.get(normalizeText(b.size)) || 99;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.price - b.price;
}

function badgesFor(product: ProductDto) {
  const type = normalizeText(product.productType);
  const name = normalizeText(product.productName);
  const description = normalizeText(product.description);
  const text = `${type} ${name} ${description}`;
  const badges: string[] = [];

  if (type === "seasonal" || text.includes("mua vu") || text.includes("mua he")) {
    badges.push("Mùa vụ");
  }
  if (text.includes("best") || text.includes("ban chay") || text.includes("bestseller")) {
    badges.push("Bán chạy");
  }
  if (text.includes("hot")) {
    badges.push("HOT");
  }

  return badges.length ? badges : undefined;
}

function badgesForCombo(combo: ComboDto) {
  const text = normalizeText(`${combo.category || ""} ${combo.comboName || ""} ${combo.description || ""}`);
  const badges = ["Combo"];
  if (text.includes("hot") || text.includes("ban chay") || text.includes("bestseller")) {
    badges.unshift("HOT");
  }
  return badges;
}

function isCurrentCombo(combo: ComboDto) {
  if (!isActive(combo.status)) return false;
  const today = new Date().toISOString().slice(0, 10);
  const startDate = combo.startDate?.slice(0, 10);
  const endDate = combo.endDate?.slice(0, 10);
  if (startDate && startDate > today) return false;
  if (endDate && endDate < today) return false;
  return true;
}

function toTopping(dto: IngredientDto): Topping {
  return {
    id: dto.ingredientId,
    name: dto.ingredientName || `Topping #${dto.ingredientId}`,
    price: knownPrice([dto.toppingPrice, dto.price, dto.extraPrice, dto.unitPrice, dto.sellingPrice])
      ?? fallbackToppingPrice(dto.ingredientName),
  };
}

function normalizeAggregatedMenu(menu: CustomerMenuData): CustomerMenuData {
  const toppings = (Array.isArray(menu.toppings) ? menu.toppings : []).map(normalizeTopping);
  return {
    products: (Array.isArray(menu.products) ? menu.products : []).map((product) => ({
      ...product,
      prices: Array.isArray(product.prices) ? product.prices : [],
      toppings: (Array.isArray(product.toppings) ? product.toppings : []).map(normalizeTopping),
      comboItems: Array.isArray(product.comboItems) ? product.comboItems : undefined,
    })),
    categories: Array.isArray(menu.categories) ? menu.categories : [],
    toppings,
  };
}

async function comboDetails(comboId: number, productById: Map<number, Product>): Promise<ComboItem[]> {
  const payload = await apiRequest<ComboDetailDto[] | PageResponse<ComboDetailDto>>(`/api/products/combos/${comboId}/details`).catch(() => []);
  const details = Array.isArray(payload) ? payload : pageItems(payload);

  return details
    .map((detail) => {
      const productId = Number(detail.productId);
      const product = productById.get(productId);
      return {
        productId,
        name: product?.name || detail.productName || `Sản phẩm #${productId}`,
        quantity: Math.max(1, toNumber(detail.quantity) || 1),
        image: product?.image,
        price: product?.prices?.[0]?.price,
      };
    })
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);
}

export function loadComboItems(product: Product, products = cachedMenu?.products ?? []): Promise<ComboItem[]> {
  if (product.kind !== "combo" || !product.comboId) return Promise.resolve([]);
  if (product.comboItems?.length) return Promise.resolve(product.comboItems);

  const cached = comboItemsCache.get(product.comboId);
  if (cached) return Promise.resolve(cached);

  const productById = new Map(
    products
      .filter((item) => item.kind !== "combo" && item.productId > 0)
      .map((item) => [item.productId, item])
  );

  const request = comboDetails(product.comboId, productById)
    .then((items) => {
      comboItemsCache.set(product.comboId as number, items);
      if (cachedMenu) {
        cachedMenu = {
          ...cachedMenu,
          products: cachedMenu.products.map((item) =>
            item.comboId === product.comboId ? { ...item, comboItems: items } : item
          ),
        };
      }
      return items;
    })
    .catch((error) => {
      comboItemsCache.delete(product.comboId as number);
      throw error;
    });

  comboItemsCache.set(product.comboId, request);
  return request;
}

function prefetchComboDetails(menu: CustomerMenuData) {
  menu.products.forEach((product) => {
    if (product.kind === "combo" && product.comboId && !product.comboItems?.length) {
      loadComboItems(product, menu.products).catch(() => []);
    }
  });
}

async function productDetails(
  product: ProductDto,
  variantById: Map<number, VariantDto>,
  toppingById: Map<number, IngredientDto>
) {
  const [sizesPayload, variantPayload, toppingPayload] = await Promise.all([
    apiRequest<ProductSizeDto[]>(`/api/products/${product.productId}/sizes`).catch(() => []),
    apiRequest<ProductVariantDto[]>(`/api/products/${product.productId}/variants`).catch(() => []),
    apiRequest<ProductToppingDto[]>(`/api/products/${product.productId}/toppings`).catch(() => []),
  ]);

  const basePrice = toNumber(product.basePrice);
  const prices = sizesPayload
    .filter((size) => isActive(size.status))
    .map((size) => ({
      size: size.size || "Tiêu chuẩn",
      price: basePrice + toNumber(size.extraPrice),
      sizeId: size.sizeId,
    }))
    .sort(sortSizes);

  const variants = variantPayload
    .map((relation) => variantById.get(relation.variantId))
    .filter((variant): variant is VariantDto => Boolean(variant && isActive(variant.status)))
    .map((variant) => variant.variantLabel || `Variant #${variant.variantId}`)
    .filter(Boolean);

  const productToppings = toppingPayload
    .map((relation) => toppingById.get(relation.ingredientId))
    .filter((topping): topping is IngredientDto => Boolean(topping && isActive(topping.status)))
    .map(toTopping);

  return {
    prices: prices.length ? prices : [{ size: "Tiêu chuẩn", price: basePrice }],
    variants,
    toppings: productToppings,
  };
}

async function fetchCustomerMenuLegacy(): Promise<CustomerMenuData> {
  const [productPayload, categoryPayload, variantPayload, toppingPayload, comboPayload] = await Promise.all([
    apiRequest<PageResponse<ProductDto> | ProductDto[]>("/api/products?size=500&sort=productId,asc"),
    apiRequest<PageResponse<ProductCategoryDto> | ProductCategoryDto[]>("/api/product-categories?size=200&sort=pCategoryId,asc").catch(() => []),
    apiRequest<PageResponse<VariantDto> | VariantDto[]>("/api/products/variants?size=500&sort=variantId,asc").catch(() => []),
    apiRequest<PageResponse<IngredientDto> | IngredientDto[]>("/api/products/toppings?size=500&sort=ingredientId,asc").catch(() => []),
    apiRequest<PageResponse<ComboDto> | ComboDto[]>("/api/products/combos?size=500&sort=comboId,desc").catch(() => []),
  ]);

  const rawProducts = pageItems(productPayload).filter((product) => product.productId && isActive(product.status));
  const rawCombos = pageItems(comboPayload).filter((combo) => combo.comboId && isCurrentCombo(combo));
  const rawCategories = pageItems(categoryPayload);
  const rawVariants = pageItems(variantPayload).filter((variant) => isActive(variant.status));
  const rawToppings = pageItems(toppingPayload).filter((topping) => isActive(topping.status));
  const allToppings = rawToppings.map(toTopping);

  const categoryById = new Map(rawCategories.map((category) => [category.pCategoryId, category]));
  const variantById = new Map(rawVariants.map((variant) => [variant.variantId, variant]));
  const toppingById = new Map(rawToppings.map((topping) => [topping.ingredientId, topping]));

  const baseProducts = await Promise.all(rawProducts.map(async (product) => {
    const category = product.pCategoryId ? categoryById.get(product.pCategoryId) : undefined;
    const foodProduct = isFoodProduct(product, category?.pCategoryName);
    const details = foodProduct
      ? { prices: [{ size: "Tieu chuan", price: toNumber(product.basePrice) }], variants: [], toppings: [] }
      : await productDetails(product, variantById, toppingById);

    return {
      id: String(product.productId),
      productId: product.productId,
      name: product.productName || `Sản phẩm #${product.productId}`,
      description: product.description || "",
      prices: details.prices,
      image: product.imgUrl || "",
      category: categoryKey(product.pCategoryId),
      categoryId: product.pCategoryId,
      kind: "product" as const,
      productType: foodProduct ? "cake" : product.productType || "regular",
      badges: badgesFor(product),
      variants: details.variants.length ? details.variants : undefined,
      toppings: details.toppings,
    };
  }));

  const comboProducts: Product[] = rawCombos.map((combo) => ({
    id: `combo-${combo.comboId}`,
    productId: -Number(combo.comboId),
    comboId: Number(combo.comboId),
    name: combo.comboName || `Combo #${combo.comboId}`,
    description: combo.description || "Combo ưu đãi được CoffeeGo chuẩn bị sẵn cho nhóm khách đi cùng nhau.",
    prices: [{ size: "Combo", price: toNumber(combo.price) }],
    image: combo.imgUrl || "/customer-assets/summer-combo-banner.png",
    category: "combo",
    kind: "combo",
    productType: "combo",
    startDate: combo.startDate,
    endDate: combo.endDate,
    badges: badgesForCombo(combo),
    toppings: [],
    comboItems: [],
  }));

  const products = [...baseProducts, ...comboProducts];

  const usedCategoryIds = new Set(products.map((product) => product.category));
  const categories = rawCategories
    .map((category) => ({
      id: categoryKey(category.pCategoryId),
      label: category.pCategoryName || `Danh mục #${category.pCategoryId}`,
      icon: categoryIcon(category.pCategoryName),
      categoryId: category.pCategoryId,
    }))
    .filter((category) => usedCategoryIds.has(category.id));
  const existingCategoryIds = new Set(categories.map((category) => category.id));

  if (comboProducts.length && !existingCategoryIds.has("combo")) {
    categories.push({ id: "combo", label: "Combo", icon: "combo" });
    existingCategoryIds.add("combo");
  }

  products.forEach((product) => {
    if (existingCategoryIds.has(product.category)) return;
    const fallback = {
      id: product.category,
      label: product.categoryId ? `Danh mục #${product.categoryId}` : "Khác",
      icon: "menu",
      categoryId: product.categoryId,
    };
    categories.push(fallback);
    existingCategoryIds.add(fallback.id);
  });

  if (products.some((product) => product.category === "category-other") && !categories.some((category) => category.id === "category-other")) {
    categories.push({ id: "category-other", label: "Khác", icon: "menu" });
  }

  return { products, categories, toppings: allToppings };
}

async function fetchCustomerMenuFresh(): Promise<CustomerMenuData> {
  try {
    const menu = await apiRequest<CustomerMenuData>("/api/products/customer-menu");
    return normalizeAggregatedMenu(menu);
  } catch {
    return fetchCustomerMenuLegacy();
  }
}

export async function fetchCustomerMenu(options: { force?: boolean } = {}): Promise<CustomerMenuData> {
  if (!options.force && cachedMenu) return cachedMenu;
  if (!options.force && menuRequest) return menuRequest;

  if (options.force) comboItemsCache.clear();

  menuRequest = fetchCustomerMenuFresh()
    .then((menu) => {
      cachedMenu = menu;
      prefetchComboDetails(menu);
      return menu;
    })
    .finally(() => {
      menuRequest = null;
    });

  return menuRequest;
}

export function useCustomerMenu() {
  const [data, setData] = useState<CustomerMenuData>(() => cachedMenu ?? EMPTY_MENU);
  const [loading, setLoading] = useState(() => !cachedMenu);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const force = reloadKey > 0;

    if (cachedMenu && !force) {
      setData(cachedMenu);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(force || !cachedMenu);
    setError(null);

    fetchCustomerMenu({ force })
      .then((menu) => {
        if (cancelled) return;
        setData(menu);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(EMPTY_MENU);
        setError(err instanceof Error ? err.message : "Không tải được thực đơn.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { ...data, loading, error, reload };
}
