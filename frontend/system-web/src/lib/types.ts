export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: Array<{ field?: string; message: string }> | null;
  timestamp: string;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type CommonStatus = "active" | "inactive" | "locked" | "banned" | "draft" | "published" | "archived";

export interface BranchDto {
  branchId: number;
  branchName: string;
  address: string;
  addressDetail?: string | null;
  imgUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  phone?: string | null;
  email: string;
  branchType: "sales" | "warehouse" | string;
  status: CommonStatus | string;
}

export interface BranchRequest {
  branchName: string;
  address: string;
  addressDetail?: string | null;
  imgUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  phone?: string;
  email: string;
  branchType: "sales" | "warehouse";
  status?: "active" | "inactive";
}

export interface BranchHoursDto {
  hoursId?: number;
  branchId: number;
  dayOfWeek: string;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean | null;
}

export interface BranchHoursRequest {
  branchId?: number;
  dayOfWeek: string;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
}

export interface WorkScheduleDto {
  scheduleId: number;
  employeeId: number;
  branchId: number;
  workDate: string;
  shift: string;
  startTime: string;
  endTime: string;
  status?: CommonStatus | string | null;
  note?: string | null;
  createdAt?: string | null;
}

export interface WorkScheduleRequestDto {
  employeeId: number;
  branchId: number;
  workDate: string;
  shift: string;
  startTime: string;
  endTime: string;
  status?: "pending" | "confirmed" | "cancelled";
  note?: string | null;
  createdAt?: string | null;
}

export interface ProductCategoryDto {
  pcategoryId?: number;
  pCategoryId?: number;
  pcategoryName?: string;
  pCategoryName?: string;
}

export interface ProductCategoryRequest {
  pCategoryName: string;
}

export interface IngredientCategoryDto {
  icategoryId?: number;
  iCategoryId?: number;
  icategoryName?: string;
  iCategoryName?: string;
}

export interface IngredientCategoryRequest {
  iCategoryName: string;
}

export interface IngredientDto {
  ingredientId: number;
  icategoryId?: number | null;
  iCategoryId?: number | null;
  ICategoryId?: number | null;
  ingredientName?: string | null;
  unit?: string | null;
  toppingPrice?: number | null;
  status?: CommonStatus | string | null;
}

export interface IngredientRequestDto {
  iCategoryId?: number | null;
  icategoryId?: number | null;
  ingredientName: string;
  unit?: string | null;
  toppingPrice?: number | null;
  status?: "active" | "inactive";
}

export interface SupplierIngredientDto {
  supplierId: number;
  ingredientId: number;
  minimumStock?: number | null;
  unit?: string | null;
  price?: number | null;
}

export interface SupplierIngredientRequestDto {
  supplierId?: number | null;
  ingredientId: number;
  minimumStock: number;
  unit?: string | null;
  price: number;
}

export interface ProductDto {
  productId: number;
  pcategoryId?: number;
  pCategoryId?: number;
  productName?: string;
  description?: string | null;
  basePrice?: number | null;
  productType?: "regular" | "seasonal" | "drink" | "cake" | string | null;
  imgUrl?: string | null;
  status?: CommonStatus | string | null;
  createdAt?: string | null;
}

export interface ProductRequest {
  pCategoryId?: number | null;
  productName: string;
  description?: string | null;
  basePrice?: number | null;
  productType?: "regular" | "seasonal" | "drink" | "cake" | string | null;
  imgUrl?: string | null;
  status?: "active" | "inactive";
  createdAt?: string | null;
}

export interface ComboDto {
  comboId: number;
  comboName?: string | null;
  description?: string | null;
  category?: string | null;
  imgUrl?: string | null;
  price?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: CommonStatus | string | null;
}

export interface ComboRequestDto {
  comboName: string;
  description?: string | null;
  category?: string | null;
  imgUrl?: string | null;
  price: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: "active" | "inactive";
}

export interface ComboDetailDto {
  comboId: number;
  productId: number;
  quantity: number;
}

export interface ComboDetailRequestDto {
  comboId?: number | null;
  productId: number;
  quantity: number;
}

export interface RecipeDto {
  recipeId: number;
  productId?: number | null;
  recipeName?: string | null;
  description?: string | null;
}

export interface RecipeRequestDto {
  productId?: number | null;
  recipeName?: string | null;
  description?: string | null;
}

export interface RecipeDetailDto {
  recipeDetailId: number;
  recipeId: number;
  ingredientId: number;
  quantity: number;
  unit: string;
  size: string;
  estimatedTotal: number;
}

export interface RecipeDetailRequestDto {
  recipeId: number;
  ingredientId: number;
  quantity: number;
  unit: string;
  size: string;
  estimatedTotal: number;
}

export interface ProductSizeDto {
  sizeId: number;
  productId: number;
  size: string;
  extraPrice?: number | null;
  status?: string | null;
}

export interface ProductSizeRequestDto {
  productId?: number | null;
  size: string;
  extraPrice?: number | null;
  status?: string | null;
}

export interface VariantDto {
  variantId: number;
  variantGroup: string;
  variantLabel: string;
  extraPrice?: number | null;
  status?: string | null;
}

export interface VariantRequestDto {
  variantGroup: string;
  variantLabel: string;
  extraPrice?: number | null;
  status?: string | null;
}

export interface ProductVariantDto {
  productId: number;
  variantId: number;
  isDefault?: boolean | null;
}

export interface SeasonDto {
  seasonId: number;
  seasonName: string;
  startDate: string;
  endDate: string;
  status?: string | null;
}

export interface SeasonRequestDto {
  seasonName: string;
  startDate: string;
  endDate: string;
  status?: string | null;
}

export interface SeasonalProductDto {
  seasonId: number;
  productId: number;
}

export interface ProductToppingDto {
  productId: number;
  ingredientId: number;
}

export interface LookupOptionDto {
  id: number;
  name: string;
  group?: string | null;
  status?: string | null;
}

export interface MembershipRankDto {
  rankId: number;
  rankName: string;
  rankOrder: number;
  minExp: number;
  minTotalMoney: number;
  minTotalOrders: number;
  discountPercent: number;
  expMultiplier: number;
  dripsMultiplier: number;
  description?: string | null;
  status?: CommonStatus | string | null;
  color?: string | null;
  icon?: string | null;
}

export interface MembershipRankRequestDto {
  rankName: string;
  rankOrder: number;
  minExp: number;
  discountPercent: number;
  expMultiplier: number;
  dripsMultiplier: number;
  description?: string | null;
  status?: "active" | "inactive";
  color?: string | null;
  icon?: string | null;
}

export interface EmployeeLookupDto {
  id: number;
  name: string;
  branchId?: number | null;
  roleId?: number | null;
  roleName?: string | null;
  status?: string | null;
}

export interface EmployeeDto {
  id: number;
  roleId: number;
  branchId?: number | null;
  name?: string | null;
  status?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  imgUrl?: string | null;
  createdAt?: string | null;
}

export interface EmployeeRequestDto {
  roleId: number;
  branchId?: number | null;
  name: string;
  status?: string;
  email?: string | null;
  phoneNumber?: string | null;
  imgUrl?: string | null;
  createdAt?: string | null;
}

export interface FileUploadDto {
  imgUrl?: string;
  fileName?: string;
  originalFileName?: string;
  contentType?: string;
  size?: number;
  bytes?: number;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  format?: string;
  resourceType?: string;
}

export interface SupplierDto {
  supplierId: number;
  supplierName: string;
  address?: string | null;
  status?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  deliveryTime?: number | null;
  moqValue?: number | null;
  moqUnit?: string | null;
  note?: string | null;
  urlImg?: string | null;
}

export interface SupplierRequestDto {
  supplierName: string;
  address: string;
  status?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  deliveryTime?: number;
  moqValue?: number | null;
  moqUnit?: string | null;
  note?: string;
  urlImg?: string | null;
}

export interface WarehouseStockDto {
  stockId: number;
  ingredientId: number;
  locationId?: number | null;
  branchId?: number | null;
  quantity?: number | null;
  minQuantity?: number | null;
  unit?: string | null;
}

export interface WarehouseLocationDto {
  locationId: number;
  branchId?: number | null;
  zone?: string | null;
  shelf?: string | null;
  slot?: string | null;
}

export interface StockImportDto {
  importId: number;
  branchId?: number | null;
  supplierId?: number | null;
  employeeId?: number | null;
  totalAmount?: number | null;
  note?: string | null;
  importedAt?: string | null;
  details?: StockImportDetailDto[];
}

export interface StockImportRequestDto {
  branchId: number;
  supplierId: number;
  employeeId: number;
  totalAmount: number;
  note?: string | null;
  importedAt?: string | null;
  details?: StockImportDetailRequestDto[];
}

export interface StockImportDetailDto {
  importDetailId: number;
  importId?: number | null;
  ingredientId?: number | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  expiryDate?: string | null;
}

export interface StockImportDetailRequestDto {
  ingredientId: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  expiryDate?: string | null;
}

export interface RestockRequestDetailDto {
  requestDetailId: number;
  requestId?: number | null;
  ingredientId?: number | null;
  quantity?: number | null;
  unit?: string | null;
  currentQuantity?: number | null;
  minQuantity?: number | null;
}

export interface RestockRequestDto {
  requestId: number;
  branchId?: number | null;
  employeeId?: number | null;
  status?: "pending" | "processing" | "fulfilled" | "cancelled" | string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items?: RestockRequestDetailDto[];
}

export interface RestockRequestDetailRequestDto {
  ingredientId: number;
  quantity: number;
  unit?: string | null;
  currentQuantity?: number | null;
  minQuantity?: number | null;
}

export interface RestockRequestCreateRequestDto {
  branchId: number;
  employeeId: number;
  note?: string | null;
  items: RestockRequestDetailRequestDto[];
}

export interface StockExportDto {
  exportId: number;
  fromBranchId?: number | null;
  toBranchId?: number | null;
  employeeId?: number | null;
  note?: string | null;
  totalAmount?: number | null;
  exportedAt?: string | null;
  details?: StockExportDetailDto[];
}

export interface StockExportRequestDto {
  fromBranchId: number;
  toBranchId: number;
  employeeId: number;
  note?: string | null;
  totalAmount: number;
  exportedAt?: string | null;
  details?: StockExportDetailRequestDto[];
}

export interface StockExportDetailDto {
  exportDetailId: number;
  exportId?: number | null;
  ingredientId?: number | null;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
}

export interface StockExportDetailRequestDto {
  ingredientId: number;
  quantity: number;
  unit: string;
  unitPrice: number;
}
