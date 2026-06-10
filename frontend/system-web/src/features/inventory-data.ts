import { api } from "../lib/api";
import type {
  BranchDto,
  IngredientCategoryDto,
  IngredientDto,
  LookupOptionDto,
  PageResponse,
  RestockRequestDto,
  StockExportDto,
  StockImportDto,
  SupplierDto,
  SupplierIngredientDto,
  WarehouseLocationDto,
  WarehouseStockDto,
} from "../lib/types";

export interface InventoryIngredient {
  id: number;
  categoryId?: number | null;
  name: string;
  category: string;
  unit: string;
  current: number;
  minLevel: number;
  price: number;
  supplier: string;
  supplierId?: number | null;
  location: string;
  branchId?: number | null;
  expiry?: string;
  status?: string | null;
}

export interface InventoryStockNoteItem {
  ingredientId: number;
  name: string;
  unit: string;
  qty: number;
  price: number;
}

export interface InventoryStockNote {
  id: string;
  numericId: number;
  type: "import" | "export";
  supplier?: string;
  supplierId?: number | null;
  branch: string;
  branchId?: number | null;
  date: string;
  occurredAt?: string | null;
  items: InventoryStockNoteItem[];
  total: number;
  status: "confirmed" | "draft" | "cancelled";
  note?: string;
  reason?: string;
  createdBy: string;
}

export interface InventoryBranch {
  id: number;
  name: string;
  type?: string | null;
  status?: string | null;
}

export interface InventorySupplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  rating: number;
  totalOrders: number;
  totalValue: number;
  onTimeRate: number;
  status: "active" | "inactive";
  note?: string;
}

export interface InventoryData {
  ingredients: InventoryIngredient[];
  categories: string[];
  categoryOptions: Array<{ id: number; name: string }>;
  suppliers: InventorySupplier[];
  branches: InventoryBranch[];
  stockNotes: InventoryStockNote[];
  restockRequests: RestockRequestDto[];
  locations: WarehouseLocationDto[];
  stocks: WarehouseStockDto[];
}

export const pageItems = <T>(payload: PageResponse<T> | T[] | null | undefined): T[] => {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.items || [];
};

const safeGet = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    return await api.get<T>(path);
  } catch {
    return fallback;
  }
};

const numberOrZero = (value?: number | null) => Number(value || 0);
const nameOrFallback = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;

const categoryIdOf = (item: IngredientCategoryDto | IngredientDto) =>
  "ingredientId" in item ? (item.iCategoryId ?? item.icategoryId ?? item.ICategoryId ?? null) : (item.iCategoryId ?? item.icategoryId ?? null);

const formatLocation = (location?: WarehouseLocationDto | null) => {
  if (!location) return "";
  const parts = [
    location.zone ? `Khu ${location.zone}` : "",
    location.shelf ? `Ke ${location.shelf}` : "",
    location.slot ? `O ${location.slot}` : "",
  ].filter(Boolean);
  return parts.join(" / ");
};

const fallbackLocation = (index: number) =>
  `Khu A / Ke ${Math.floor(index / 5) + 1} / O ${(index % 5) + 1}`;

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN");
};

async function loadSupplierLinks(suppliers: SupplierDto[]) {
  const results = await Promise.all(
    suppliers.map(async supplier => ({
      supplierId: supplier.supplierId,
      links: await safeGet<SupplierIngredientDto[]>(`/suppliers/${supplier.supplierId}/ingredients`, []),
    })),
  );
  return results.flatMap(result => result.links.map(link => ({ ...link, supplierId: result.supplierId })));
}

export async function loadInventoryData(branchId?: number | null): Promise<InventoryData> {
  const scoped = branchId ? `&branchId=${branchId}` : "";
  const exportScoped = branchId ? `&fromBranchId=${branchId}` : "";
  const [
    ingredientPayload,
    categoryPayload,
    supplierPayload,
    stockPayload,
    locationPayload,
    branchPayload,
    branchLookupPayload,
    importPayload,
    exportPayload,
    restockPayload,
  ] = await Promise.all([
    safeGet<PageResponse<IngredientDto> | IngredientDto[]>("/ingredients?size=500&sort=ingredientId,asc", []),
    safeGet<PageResponse<IngredientCategoryDto> | IngredientCategoryDto[]>("/ingredient-categories?size=200&sort=iCategoryId,asc", []),
    safeGet<PageResponse<SupplierDto> | SupplierDto[]>("/suppliers?size=500&sort=supplierId,asc", []),
    safeGet<PageResponse<WarehouseStockDto> | WarehouseStockDto[]>(`/admin/inventory/stocks?size=1000&sort=stockId,asc${scoped}`, []),
    safeGet<PageResponse<WarehouseLocationDto> | WarehouseLocationDto[]>(`/admin/inventory/locations?size=1000&sort=locationId,asc${scoped}`, []),
    safeGet<PageResponse<BranchDto> | BranchDto[]>("/branches?size=500&sort=branchId,asc", []),
    safeGet<LookupOptionDto[]>("/lookups/branches", []),
    safeGet<PageResponse<StockImportDto> | StockImportDto[]>(`/admin/inventory/stock-imports?size=100&sort=importedAt,desc${scoped}`, []),
    safeGet<PageResponse<StockExportDto> | StockExportDto[]>(`/admin/inventory/stock-exports?size=100&sort=exportedAt,desc${exportScoped}`, []),
    safeGet<PageResponse<RestockRequestDto> | RestockRequestDto[]>("/admin/inventory/restock-requests?size=100&sort=createdAt,desc", []),
  ]);

  const rawIngredients = pageItems(ingredientPayload);
  const rawCategories = pageItems(categoryPayload);
  const rawSuppliers = pageItems(supplierPayload);
  const rawStocks = pageItems(stockPayload);
  const rawLocations = pageItems(locationPayload);
  const rawBranches = pageItems(branchPayload);
  const rawBranchLookups = pageItems(branchLookupPayload);
  const rawImports = pageItems(importPayload);
  const rawExports = pageItems(exportPayload);
  const rawRestockRequests = pageItems(restockPayload);
  const supplierLinks = await loadSupplierLinks(rawSuppliers);
  const branchRecords: InventoryBranch[] = rawBranches.length
    ? rawBranches.map(branch => ({
        id: branch.branchId,
        name: nameOrFallback(branch.branchName, `CN-${branch.branchId}`),
        type: branch.branchType,
        status: branch.status,
      }))
    : rawBranchLookups.map(branch => ({
        id: branch.id,
        name: nameOrFallback(branch.name, `CN-${branch.id}`),
        type: branch.group,
        status: branch.status,
      }));

  const categoryById = new Map(rawCategories.map(category => [Number(categoryIdOf(category)), nameOrFallback(category.iCategoryName ?? category.icategoryName, "Khac")]));
  const supplierById = new Map(rawSuppliers.map(supplier => [supplier.supplierId, supplier]));
  const branchById = new Map(branchRecords.map(branch => [branch.id, { branchName: branch.name }]));
  const locationById = new Map(rawLocations.map(location => [location.locationId, location]));
  const linkByIngredient = new Map<number, SupplierIngredientDto>();
  supplierLinks.forEach(link => {
    if (!linkByIngredient.has(link.ingredientId)) linkByIngredient.set(link.ingredientId, link);
  });

  const relevantStocks = rawStocks;
  const stocksByIngredient = new Map<number, WarehouseStockDto[]>();
  relevantStocks.forEach(stock => {
    const items = stocksByIngredient.get(stock.ingredientId) || [];
    items.push(stock);
    stocksByIngredient.set(stock.ingredientId, items);
  });

  const ingredients = rawIngredients.map((ingredient, index) => {
    const stocks = stocksByIngredient.get(ingredient.ingredientId) || [];
    const firstStock = stocks[0];
    const supplierLink = linkByIngredient.get(ingredient.ingredientId);
    const supplier = supplierLink?.supplierId ? supplierById.get(supplierLink.supplierId) : undefined;
    const categoryId = categoryIdOf(ingredient);
    const quantity = stocks.reduce((sum, stock) => sum + numberOrZero(stock.quantity), 0);
    const minLevel = stocks.length
      ? Math.max(...stocks.map(stock => numberOrZero(stock.minQuantity)))
      : numberOrZero(supplierLink?.minimumStock);

    return {
      id: ingredient.ingredientId,
      categoryId,
      name: nameOrFallback(ingredient.ingredientName, `NL-${ingredient.ingredientId}`),
      category: categoryById.get(Number(categoryId)) || "Khac",
      unit: nameOrFallback(firstStock?.unit || ingredient.unit || supplierLink?.unit, ""),
      current: quantity,
      minLevel,
      price: numberOrZero(supplierLink?.price),
      supplier: nameOrFallback(supplier?.supplierName, ""),
      supplierId: supplier?.supplierId ?? null,
      location: formatLocation(firstStock?.locationId ? locationById.get(firstStock.locationId) : null) || (!rawLocations.length ? fallbackLocation(index) : ""),
      branchId: firstStock?.branchId ?? null,
      status: ingredient.status,
    };
  });
  const ingredientById = new Map(ingredients.map(ingredient => [ingredient.id, ingredient]));

  const categories = Array.from(new Set(rawCategories.map(category => nameOrFallback(category.iCategoryName ?? category.icategoryName, "Khac"))));
  const categoryOptions = rawCategories
    .map(category => ({ id: Number(categoryIdOf(category)), name: nameOrFallback(category.iCategoryName ?? category.icategoryName, "Khac") }))
    .filter(category => category.id);

  const importsBySupplier = new Map<number, StockImportDto[]>();
  rawImports.forEach(item => {
    if (!item.supplierId) return;
    const rows = importsBySupplier.get(item.supplierId) || [];
    rows.push(item);
    importsBySupplier.set(item.supplierId, rows);
  });

  const suppliers = rawSuppliers.map(supplier => {
    const supplierImports = importsBySupplier.get(supplier.supplierId) || [];
    const linkedIngredients = supplierLinks
      .filter(link => link.supplierId === supplier.supplierId)
      .map(link => ingredients.find(ingredient => ingredient.id === link.ingredientId))
      .filter(Boolean) as InventoryIngredient[];
    const firstCategory = linkedIngredients[0]?.category || "Tong hop";

    return {
      id: supplier.supplierId,
      name: nameOrFallback(supplier.supplierName, `NCC-${supplier.supplierId}`),
      contact: nameOrFallback(supplier.contactPerson, ""),
      phone: nameOrFallback(supplier.phone, ""),
      email: nameOrFallback(supplier.email, ""),
      address: nameOrFallback(supplier.address, ""),
      category: firstCategory,
      rating: 0,
      totalOrders: supplierImports.length,
      totalValue: supplierImports.reduce((sum, item) => sum + numberOrZero(item.totalAmount), 0),
      onTimeRate: supplierImports.length ? 100 : 0,
      status: supplier.status === "inactive" || supplier.status === "hidden" ? "inactive" : "active",
      note: supplier.note || undefined,
    };
  });

  const branches = branchRecords;

  const importNotes: InventoryStockNote[] = rawImports.map(item => {
    const supplier = item.supplierId ? supplierById.get(item.supplierId) : undefined;
    const branch = item.branchId ? branchById.get(item.branchId) : undefined;
    return {
      id: `PN${item.importId}`,
      numericId: item.importId,
      type: "import",
      supplier: supplier?.supplierName || "",
      supplierId: item.supplierId,
      branch: branch?.branchName || "",
      branchId: item.branchId,
      date: formatDate(item.importedAt),
      occurredAt: item.importedAt,
      items: (item.details || []).map(detail => {
        const ingredient = detail.ingredientId ? ingredientById.get(detail.ingredientId) : undefined;
        return {
          ingredientId: Number(detail.ingredientId || 0),
          name: ingredient?.name || `NL-${detail.ingredientId || ""}`,
          unit: nameOrFallback(detail.unit || ingredient?.unit, ""),
          qty: numberOrZero(detail.quantity),
          price: numberOrZero(detail.unitPrice),
        };
      }),
      total: numberOrZero(item.totalAmount),
      status: "confirmed",
      note: item.note || undefined,
      createdBy: item.employeeId ? `NV-${item.employeeId}` : "",
    };
  });

  const exportNotes: InventoryStockNote[] = rawExports.map(item => {
    const targetBranch = item.toBranchId ? branchById.get(item.toBranchId) : undefined;
    return {
      id: `PX${item.exportId}`,
      numericId: item.exportId,
      type: "export",
      branch: targetBranch?.branchName || "",
      branchId: item.toBranchId,
      date: formatDate(item.exportedAt),
      occurredAt: item.exportedAt,
      items: (item.details || []).map(detail => {
        const ingredient = detail.ingredientId ? ingredientById.get(detail.ingredientId) : undefined;
        return {
          ingredientId: Number(detail.ingredientId || 0),
          name: ingredient?.name || `NL-${detail.ingredientId || ""}`,
          unit: nameOrFallback(detail.unit || ingredient?.unit, ""),
          qty: numberOrZero(detail.quantity),
          price: numberOrZero(detail.unitPrice),
        };
      }),
      total: numberOrZero(item.totalAmount),
      status: "confirmed",
      reason: item.note || undefined,
      createdBy: item.employeeId ? `NV-${item.employeeId}` : "",
    };
  });

  return {
    ingredients,
    categories,
    categoryOptions,
    suppliers,
    branches,
    stockNotes: [...importNotes, ...exportNotes],
    restockRequests: rawRestockRequests,
    locations: rawLocations,
    stocks: rawStocks,
  };
}
