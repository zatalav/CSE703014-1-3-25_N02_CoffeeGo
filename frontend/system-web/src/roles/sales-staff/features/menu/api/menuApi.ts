import { employeeApi, pageItems, type PageResponse } from "../../../shared/api/client";
import { Category, Product, SizeKey, Topping } from "../types";

interface ProductCategoryDto {
  pCategoryId?: number;
  pcategoryId?: number;
  pCategoryName?: string;
  pcategoryName?: string;
}

interface ProductDto {
  productId: number;
  pCategoryId?: number;
  pcategoryId?: number;
  productName?: string;
  basePrice?: number;
  productType?: string;
  imgUrl?: string;
  status?: string;
}

interface ProductSizeDto {
  sizeId: number;
  productId: number;
  size: string;
  extraPrice?: number;
  status?: string;
}

interface ToppingDto {
  ingredientId: number;
  ingredientName?: string;
  toppingPrice?: number;
  price?: number;
  status?: string;
}

interface ProductToppingDto {
  productId: number;
  ingredientId: number;
}

export interface MenuData {
  categories: Category[];
  products: Product[];
  toppings: Topping[];
}

const categoryIdOf = (category: ProductCategoryDto) => String(category.pCategoryId ?? category.pcategoryId ?? "");
const categoryNameOf = (category: ProductCategoryDto) => category.pCategoryName ?? category.pcategoryName ?? "Khac";

function iconFor(label: string) {
  const clean = label.trim();
  return clean ? clean[0].toUpperCase() : "#";
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isFoodProduct(product: ProductDto, categoryLabel: string) {
  const productType = normalizeSearchText(product.productType || "");
  if (["cake", "bakery", "pastry", "snack", "food"].includes(productType)) return true;
  const text = normalizeSearchText(`${product.productName || ""} ${categoryLabel}`);
  return ["banh", "cake", "bakery", "pastry", "croissant", "snack", "food", "do an"].some(keyword => text.includes(keyword));
}

export async function fetchMenuData(): Promise<MenuData> {
  const [categoryPage, productPage, toppingPage] = await Promise.all([
    employeeApi.get<PageResponse<ProductCategoryDto> | ProductCategoryDto[]>("/product-categories?size=200&sort=pCategoryId,asc"),
    employeeApi.get<PageResponse<ProductDto> | ProductDto[]>("/products?size=500&sort=productId,asc"),
    employeeApi.get<PageResponse<ToppingDto> | ToppingDto[]>("/products/toppings?size=500&sort=ingredientId,asc").catch(() => [] as ToppingDto[]),
  ]);

  const dbCategories = pageItems(categoryPage);
  const categoryMap = new Map(dbCategories.map(category => [categoryIdOf(category), categoryNameOf(category)]));
  const categories: Category[] = [
    { id: "all", label: "Tat ca", icon: "*" },
    ...dbCategories.map(category => {
      const label = categoryNameOf(category);
      return { id: categoryIdOf(category), label, icon: iconFor(label) };
    }),
  ];

  const rawProducts = pageItems(productPage);
  const [sizesByProduct, toppingsByProduct] = await Promise.all([
    Promise.all(rawProducts.map(product =>
      employeeApi.get<ProductSizeDto[]>(`/products/${product.productId}/sizes`).catch(() => [] as ProductSizeDto[])
    )),
    Promise.all(rawProducts.map(product =>
      employeeApi.get<ProductToppingDto[]>(`/products/${product.productId}/toppings`).catch(() => [] as ProductToppingDto[])
    )),
  ]);

  const products: Product[] = rawProducts.map((product, index) => {
    const basePrice = Number(product.basePrice ?? 0);
    const sizes: Partial<Record<SizeKey, number>> = {};
    const sizeIds: Partial<Record<SizeKey, string>> = {};
    const categoryId = String(product.pCategoryId ?? product.pcategoryId ?? "");
    const categoryLabel = categoryMap.get(categoryId) || "";
    const foodProduct = isFoodProduct(product, categoryLabel);
    const activeSizes = sizesByProduct[index]
      .filter(size => !size.status || size.status.toLowerCase() === "active")
      .filter(() => !foodProduct);

    activeSizes.forEach(size => {
      const key = (size.size || "").toUpperCase();
      if (!key) return;
      sizes[key] = basePrice + Number(size.extraPrice ?? 0);
      sizeIds[key] = String(size.sizeId);
    });

    return {
      id: String(product.productId),
      numericId: product.productId,
      name: product.productName || `Product #${product.productId}`,
      price: basePrice,
      category: categoryId,
      productType: product.productType || "regular",
      emoji: iconFor(categoryMap.get(categoryId) || product.productType || "P"),
      image: product.imgUrl || undefined,
      available: !product.status || product.status.toLowerCase() === "active",
      sizes,
      sizeIds,
      availableToppingIds: foodProduct ? [] : toppingsByProduct[index].map(topping => String(topping.ingredientId)),
      allowCustomizations: !foodProduct && activeSizes.length > 0,
    };
  });

  const toppings: Topping[] = pageItems(toppingPage)
    .filter(topping => !topping.status || topping.status.toLowerCase() === "active")
    .map(topping => ({
      id: String(topping.ingredientId),
      numericId: topping.ingredientId,
      name: topping.ingredientName || `Topping #${topping.ingredientId}`,
      price: Number(topping.toppingPrice ?? topping.price ?? 0),
    }));

  return { categories, products, toppings };
}
