import { employeeApi, pageItems, type PageResponse } from "../../../shared/api/client";
import { CartItem, Order, OrderStatus } from "../types";
import { PaymentMethod } from "../../payment/types";
import { Topping } from "../../menu/types";

interface StaffOrderDto {
  id?: string;
  orderId?: number;
  orderNumber?: string;
  customerId?: number;
  employeeId?: number;
  branchId?: number;
  status?: OrderStatus;
  orderType?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  paymentMethod?: PaymentMethod;
  paymentProvider?: string;
  paymentStatus?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  total?: number;
  discount?: number;
  amount?: number;
  items?: StaffOrderItemDto[];
}

interface StaffOrderItemDto {
  productId?: number;
  name?: string;
  qty?: number;
  quantity?: number;
  size?: string;
  sizeId?: number;
  toppings?: string[];
  note?: string;
  price?: number;
  unitPrice?: number;
}

export interface CreateOrderInput {
  employeeId: number;
  branchId: number;
  customerId?: number;
  couponId?: number;
  note?: string;
  paymentMethod: PaymentMethod;
  status?: OrderStatus;
  dripsUsed?: number;
  total: number;
  discount: number;
  cart: CartItem[];
  toppings: Topping[];
}

export interface CouponValidation {
  couponId: number;
  code: string;
  discount: number;
}

export interface CouponOption {
  couponId: number;
  code: string;
  description?: string | null;
  status?: string | null;
}

const parseDate = (value?: string) => value ? new Date(value) : new Date();

export function mapStaffOrder(row: StaffOrderDto): Order {
  const createdAt = parseDate(row.createdAt);
  return {
    id: String(row.orderId ?? row.id ?? ""),
    customerId: row.customerId,
    orderNumber: row.orderNumber || String(row.orderId ?? row.id ?? "").padStart(3, "0"),
    items: (row.items || []).map(item => ({
      productId: item.productId == null ? undefined : String(item.productId),
      name: item.name || `Product #${item.productId ?? ""}`,
      qty: item.qty ?? item.quantity ?? 0,
      size: item.size || "",
      sizeId: item.sizeId == null ? undefined : String(item.sizeId),
      toppings: item.toppings || [],
      note: item.note || "",
      price: Number(item.price ?? item.unitPrice ?? 0),
    })),
    total: Number(row.total ?? 0),
    discount: Number(row.discount ?? 0),
    paymentMethod: row.paymentMethod || "cash",
    paymentProvider: row.paymentProvider || "",
    paymentStatus: row.paymentStatus || "",
    orderType: row.orderType || "dine-in",
    customerName: row.customerName || "",
    customerPhone: row.customerPhone || "",
    customerEmail: row.customerEmail || "",
    deliveryAddress: row.deliveryAddress || "",
    note: row.note || "",
    status: row.status || "pending",
    createdAt,
    updatedAt: parseDate(row.updatedAt) || createdAt,
    staffName: "",
  };
}

export async function fetchStaffOrders(branchId?: number, employeeId?: number): Promise<Order[]> {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", String(branchId));
  if (employeeId) params.set("employeeId", String(employeeId));
  params.set("size", "200");
  const rows = await employeeApi.get<StaffOrderDto[]>(`/orders?${params.toString()}`);
  return rows.map(mapStaffOrder);
}

export async function createStaffOrder(input: CreateOrderInput): Promise<Order> {
  const toppingById = new Map(input.toppings.map(topping => [topping.id, topping]));
  const payload = {
    customerId: input.customerId,
    employeeId: input.employeeId,
    branchId: input.branchId,
    couponId: input.couponId,
    orderType: "counter",
    note: input.note,
    status: input.status,
    paymentMethod: input.paymentMethod,
    dripsUsed: input.dripsUsed,
    amount: Math.max(0, input.total - input.discount),
    discount: input.discount,
    items: input.cart.map(item => ({
      productId: Number(item.productId),
      quantity: item.qty,
      unitPrice: item.price,
      sizeId: item.sizeId ? Number(item.sizeId) : undefined,
      note: item.note,
      toppings: item.toppings.map(toppingId => {
        const topping = toppingById.get(toppingId);
        return {
          ingredientId: Number(toppingId),
          quantity: 1,
          toppingPrice: topping?.price ?? 0,
        };
      }),
    })),
  };
  return mapStaffOrder(await employeeApi.post<StaffOrderDto>("/orders", payload));
}

export async function updateStaffOrderStatus(orderId: string, status: OrderStatus, cancelReason?: string): Promise<Order> {
  return mapStaffOrder(await employeeApi.patch<StaffOrderDto>(`/orders/${orderId}/status`, { status, cancelReason }));
}

export async function validateCoupon(code: string, total: number): Promise<CouponValidation> {
  const q = new URLSearchParams({ code: code.trim().toUpperCase(), total: String(total) });
  return employeeApi.get<CouponValidation>(`/orders/coupons/validate?${q.toString()}`);
}

export async function fetchCoupons(): Promise<CouponOption[]> {
  const payload = await employeeApi.get<PageResponse<CouponOption> | CouponOption[]>("/admin/promotions/coupons?size=200&sort=couponId,desc");
  return pageItems(payload).filter(coupon => !coupon.status || coupon.status.toLowerCase() === "active");
}
