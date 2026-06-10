import { useEffect, useState } from "react";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Tag,
  User, X, CheckCircle2, Printer, RefreshCw, ChevronDown,
} from "lucide-react";
import { PaymentModal } from "../../payment/components/PaymentModal";
import { CustomerSearchModal } from "../../customer/components/CustomerSearchModal";
import { Customer } from "../../customer/types";
import { Order, CartItem, DrinkCustomizations } from "../../order/types";
import { PaymentMethod } from "../../payment/types";
import { Product, SizeKey } from "../../menu/types";
import { formatVnd } from "../../../shared/lib/format";
import { fetchMenuData } from "../../menu/api/menuApi";
import { createStaffOrder, fetchCoupons, validateCoupon, type CouponOption } from "../../order/api/orderApi";
import { printOrderInvoice } from "../../order/utils/invoicePdf";

interface POSScreenProps {
  staffName: string;
  employeeId?: number;
  branchId?: number;
  onLogout: () => void;
  onOrderCreated: (order: Order) => void;
}

const DEFAULT_DRINK_CUSTOMIZATIONS: DrinkCustomizations = {
  sugar: 100,
  milk: 100,
  ice: 100,
};

const CUSTOMIZATION_GROUPS: Array<{ key: keyof DrinkCustomizations; label: string; options: number[] }> = [
  { key: "sugar", label: "Đường", options: [0, 30, 50, 70, 100] },
  { key: "milk", label: "Sữa", options: [0, 30, 50, 70, 100] },
  { key: "ice", label: "Đá", options: [0, 30, 50, 70, 100] },
];

const sameDrinkCustomizations = (a: DrinkCustomizations, b: DrinkCustomizations) =>
  a.sugar === b.sugar && a.milk === b.milk && a.ice === b.ice;

const formatDrinkCustomizations = (customizations: DrinkCustomizations) =>
  CUSTOMIZATION_GROUPS
    .filter(({ key }) => customizations[key] !== DEFAULT_DRINK_CUSTOMIZATIONS[key])
    .map(({ key, label }) => `${label} ${customizations[key]}%`)
    .join(", ");

const buildItemNote = (note: string, customizations: DrinkCustomizations) =>
  [formatDrinkCustomizations(customizations), note.trim()].filter(Boolean).join(" | ");

const productSizeKeys = (product: Product) =>
  Object.keys(product.sizes).filter(size => product.sizes[size] != null) as SizeKey[];

export function POSScreen({ staffName, employeeId, branchId, onOrderCreated }: POSScreenProps) {
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [productGroup, setProductGroup] = useState<"regular" | "seasonal">("regular");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string; icon: string }[]>([]);
  const [toppings, setToppings] = useState<{ id: string; name: string; price: number }[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerStepForPayment, setCustomerStepForPayment] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState<number | undefined>();
  const [discountMsg, setDiscountMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [showAddModal, setShowAddModal] = useState<{ product: Product } | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeKey>("M");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [showVariantOptions, setShowVariantOptions] = useState(false);
  const [drinkCustomizations, setDrinkCustomizations] = useState<DrinkCustomizations>(DEFAULT_DRINK_CUSTOMIZATIONS);
  const [itemNote, setItemNote] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadingMenu(true);
    fetchMenuData()
      .then((data) => {
        if (!alive) return;
        setCategories(data.categories);
        setProducts(data.products);
        setToppings(data.toppings);
        setMenuError("");
      })
      .catch((error) => {
        if (!alive) return;
        setMenuError(error instanceof Error ? error.message : "Không tải được dữ liệu menu");
      })
      .finally(() => {
        if (alive) setLoadingMenu(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    fetchCoupons()
      .then(setCouponOptions)
      .catch(() => setCouponOptions([]));
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchCat = category === "all" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup = productGroup === "seasonal"
      ? p.productType === "seasonal"
      : p.productType !== "seasonal";
    return matchGroup && matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((sum, item) => {
    const toppingPrice = item.toppings.reduce((ts, tid) => ts + (toppings.find(t => t.id === tid)?.price ?? 0), 0);
    return sum + (item.price + toppingPrice) * item.qty;
  }, 0);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const productToppingOptions = (product: Product) => {
    const allowedIds = product.availableToppingIds || [];
    if (allowedIds.length === 0) return [];
    const allowed = new Set(allowedIds);
    return toppings.filter(topping => allowed.has(topping.id));
  };

  const addProductToCart = (
    product: Product,
    options: {
      size?: SizeKey;
      toppings?: string[];
      customizations?: DrinkCustomizations;
      note?: string;
    } = {}
  ) => {
    const size = options.size || "";
    const selectedToppingIds = options.toppings || [];
    const itemCustomizations = options.customizations;
    const note = options.note || "";
    const price = size ? product.sizes[size] ?? product.price : product.price;
    const sameCustomizationsForItem = (item: CartItem) => {
      if (!itemCustomizations) return !item.customizations;
      return sameDrinkCustomizations(item.customizations ?? DEFAULT_DRINK_CUSTOMIZATIONS, itemCustomizations);
    };
    const existing = cart.find(
      (i) =>
        i.productId === product.id &&
        i.size === size &&
        JSON.stringify(i.toppings) === JSON.stringify(selectedToppingIds) &&
        sameCustomizationsForItem(i) &&
        i.note === note
    );
    if (existing) {
      setCart(cart.map((i) => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i));
      return;
    }
    setCart([...cart, {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productNumericId: product.numericId,
      name: product.name,
      price,
      qty: 1,
      size,
      sizeId: size ? product.sizeIds?.[size] : undefined,
      toppings: selectedToppingIds,
      customizations: itemCustomizations,
      note,
    }]);
  };

  const openAddModal = (product: Product) => {
    if (!product.available) return;
    const sizeKeys = productSizeKeys(product);
    const availableToppings = productToppingOptions(product);
    setSelectedToppings([]);
    setShowVariantOptions(false);
    setDrinkCustomizations({ ...DEFAULT_DRINK_CUSTOMIZATIONS });
    setItemNote("");
    if (sizeKeys.length === 0 && availableToppings.length === 0) {
      addProductToCart(product);
      return;
    }
    setSelectedSize(sizeKeys[0] || "");
    setShowAddModal({ product });
  };

  const confirmAddToCart = () => {
    if (!showAddModal) return;
    const { product } = showAddModal;
    const hasSizes = productSizeKeys(product).length > 0;
    const availableToppingIds = new Set(productToppingOptions(product).map(topping => topping.id));
    const currentToppings = selectedToppings.filter(toppingId => availableToppingIds.has(toppingId));
    const currentCustomizations = product.allowCustomizations && hasSizes ? { ...drinkCustomizations } : undefined;
    const composedNote = currentCustomizations ? buildItemNote(itemNote, currentCustomizations) : itemNote.trim();
    addProductToCart(product, {
      size: hasSizes ? selectedSize : "",
      toppings: currentToppings,
      customizations: currentCustomizations,
      note: composedNote,
    });
    setShowAddModal(null);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart
      .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (id: string) => setCart(cart.filter((i) => i.id !== id));

  const applyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;
    try {
      const coupon = await validateCoupon(code, cartTotal);
      setAppliedCouponId(coupon.couponId);
      setAppliedDiscount(coupon.discount);
      setDiscountMsg({ type: "ok", text: `Áp dụng thành công! Giảm ${coupon.discount.toLocaleString("vi-VN")}đ` });
    } catch (error) {
      setAppliedCouponId(undefined);
      setAppliedDiscount(0);
      setDiscountMsg({ type: "err", text: error instanceof Error ? error.message : "Mã giảm giá không hợp lệ hoặc đã hết hạn." });
    }
  };

  const handlePaymentSuccess = async (paymentMethod: PaymentMethod, pointsUsed = 0) => {
    if (!employeeId || !branchId) {
      throw new Error("Tài khoản nhân viên chưa có mã nhân viên hoặc chi nhánh.");
    }
    const newOrder = await createStaffOrder({
      employeeId,
      branchId,
      customerId: customer?.id ? Number(customer.id) : undefined,
      couponId: appliedCouponId,
      note: orderNote,
      paymentMethod,
      status: "completed",
      dripsUsed: pointsUsed,
      total: cartTotal,
      discount: appliedDiscount,
      cart,
      toppings,
    });
    newOrder.staffName = staffName;
    newOrder.status = "completed";
    newOrder.orderType = "dine-in";
    onOrderCreated(newOrder);
    printOrderInvoice(newOrder, "Hoa don tai quan");
    setCart([]);
    setCustomer(null);
    setAppliedCouponId(undefined);
    setAppliedDiscount(0);
    setDiscountCode("");
    setDiscountMsg(null);
    setOrderNote("");
  };

  const handleSelectCustomer = (c: Customer | null) => {
    setCustomer(c);
    setShowCustomerSearch(false);
    if (customerStepForPayment) {
      setShowPayment(true);
      setCustomerStepForPayment(false);
    }
  };

  const openPaymentFlow = () => {
    if (cart.length === 0) return;
    setCustomerStepForPayment(true);
    setShowCustomerSearch(true);
  };

  const modalProduct = showAddModal?.product;
  const modalSizeKeys = modalProduct ? productSizeKeys(modalProduct) : [];
  const modalToppings = modalProduct ? productToppingOptions(modalProduct) : [];
  const modalToppingIds = new Set(modalToppings.map(topping => topping.id));
  const modalAllowsCustomizations = Boolean(modalProduct?.allowCustomizations && modalSizeKeys.length > 0);
  const modalTotal = modalProduct
    ? (modalSizeKeys.length > 0 ? modalProduct.sizes[selectedSize] ?? modalProduct.price : modalProduct.price)
      + selectedToppings
        .filter(toppingId => modalToppingIds.has(toppingId))
        .reduce((s, tid) => s + (toppings.find(t => t.id === tid)?.price ?? 0), 0)
    : 0;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: "#F6F8FB" }}>

      <div className="flex flex-1 overflow-hidden">

        <aside className="hidden md:flex flex-col w-16 lg:w-20 py-3 gap-1 shrink-0 overflow-y-auto border-r" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="flex flex-col items-center py-3 mx-1 rounded-xl transition-all"
              style={{
                background: category === cat.id ? "#E6F4F8" : "transparent",
                border: category === cat.id ? "1px solid #BEE3F0" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <span style={{ color: category === cat.id ? "#0F4761" : "#94A3B8", fontSize: "1.3rem", fontWeight: 800 }}>{cat.icon}</span>
              <span style={{ color: category === cat.id ? "#0F4761" : "#64748B", fontSize: "0.55rem", marginTop: 3, textAlign: "center", lineHeight: 1.2, fontWeight: category === cat.id ? 700 : 500 }}>
                {cat.label}
              </span>
            </button>
          ))}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm sản phẩm..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border outline-none"
                style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "0.85rem" }}
                onFocus={(e) => { e.target.style.borderColor = "#0F4761"; }}
                onBlur={(e) => { e.target.style.borderColor = "#CBD5E1"; }}
              />
            </div>
            <div className="flex md:hidden gap-1.5 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl text-xs"
                  style={{
                    background: category === cat.id ? "linear-gradient(135deg, #0F4761, #0E7490)" : "#F8FAFC",
                    color: category === cat.id ? "#FFFFFF" : "#334155",
                    border: `1px solid ${category === cat.id ? "#0E7490" : "#E2E8F0"}`,
                    cursor: "pointer",
                    fontWeight: category === cat.id ? 600 : 400,
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            <div style={{ color: "#64748B", fontSize: "0.78rem", marginLeft: "auto", whiteSpace: "nowrap" }}>
              {filteredProducts.length} sản phẩm
            </div>
          </div>

          <div className="px-4 py-2 flex gap-2" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
            {([
              ["regular", "Sản phẩm thường"],
              ["seasonal", "Sản phẩm theo mùa"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setProductGroup(key)}
                className="px-3 py-1.5 rounded-xl"
                style={{
                  background: productGroup === key ? "linear-gradient(135deg, #0F4761, #0E7490)" : "#F8FAFC",
                  color: productGroup === key ? "#FFFFFF" : "#334155",
                  border: `1px solid ${productGroup === key ? "#0E7490" : "#E2E8F0"}`,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {loadingMenu && (
              <div className="h-full flex items-center justify-center" style={{ color: "#0F4761", fontSize: "0.9rem" }}>
                Đang tải dữ liệu menu...
              </div>
            )}
            {!loadingMenu && menuError && (
              <div className="h-full flex items-center justify-center text-center px-6" style={{ color: "#DC2626", fontSize: "0.9rem" }}>
                {menuError}
              </div>
            )}
            {!loadingMenu && !menuError && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => openAddModal(product)}
                  disabled={!product.available}
                  className="flex flex-col rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] relative"
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #E2E8F0",
                    cursor: product.available ? "pointer" : "not-allowed",
                    opacity: product.available ? 1 : 0.55,
                    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    if (product.available) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 14px 28px rgba(15,71,97,0.16)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 20px rgba(15,23,42,0.06)";
                  }}
                >
                  <div className="w-full aspect-square relative overflow-hidden" style={{ background: "#F8FAFC" }}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ fontSize: "2.5rem" }}>
                        {product.emoji}
                      </div>
                    )}
                    {!product.available && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)" }}>
                        <span className="px-2 py-1 rounded-full" style={{ background: "#FEE2E2", color: "#DC2626", fontSize: "0.65rem", fontWeight: 700 }}>Hết hàng</span>
                      </div>
                    )}
                    {product.category === "combo" && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full" style={{ background: "#0F4761", fontSize: "0.6rem", color: "#FFFFFF", fontWeight: 700 }}>COMBO</div>
                    )}
                    {product.available && (
                      <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F4761, #0E7490)", boxShadow: "0 2px 8px rgba(15,71,97,0.35)" }}>
                        <Plus size={14} color="#FFF" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.3 }} className="line-clamp-2">{product.name}</p>
                    <p className="mt-1" style={{ color: "#D97706", fontWeight: 700, fontSize: "0.85rem" }}>
                      {formatVnd(product.price)}
                    </p>
                    {productSizeKeys(product).length > 0 && (
                      <p style={{ color: "#64748B", fontSize: "0.68rem" }}>
                        {productSizeKeys(product).join(" / ")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              </div>
            )}
          </div>
        </main>

        <aside className="w-72 lg:w-80 xl:w-88 flex flex-col shrink-0 border-l" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>

          <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
            <div className="flex items-center gap-2">
              <ShoppingCart size={17} style={{ color: "#0F4761" }} />
              <span style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem" }}>Đơn hàng</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#0E7490", color: "#FFF", fontSize: "0.7rem", fontWeight: 700 }}>
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "#FEE2E2", color: "#DC2626", border: "none", cursor: "pointer", fontSize: "0.72rem" }}
              >
                <RefreshCw size={11} /> Xóa tất cả
              </button>
            )}
          </div>

          <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: "#E2E8F0" }}>
            <button
              onClick={() => { setCustomerStepForPayment(false); setShowCustomerSearch(true); }}
              className="w-full flex items-center gap-2 py-2 px-3 rounded-xl transition-all"
              style={{
                background: customer ? "#E6F4F8" : "#F8FAFC",
                border: `1.5px solid ${customer ? "#BEE3F0" : "#E2E8F0"}`,
                cursor: "pointer",
              }}
            >
              <User size={15} style={{ color: customer ? "#0F4761" : "#64748B" }} />
              <div className="flex-1 text-left">
                {customer ? (
                  <div>
                    <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.82rem" }}>{customer.name}</p>
                    <p style={{ color: "#0E7490", fontSize: "0.7rem" }}>⭐ {customer.points.toLocaleString()} điểm · {customer.rank}</p>
                  </div>
                ) : (
                  <p style={{ color: "#64748B", fontSize: "0.82rem" }}>Thêm khách hàng thành viên</p>
                )}
              </div>
              {customer ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setCustomer(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  <X size={13} style={{ color: "#0F4761" }} />
                </button>
              ) : (
                <Plus size={13} style={{ color: "#64748B" }} />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#F8FAFC" }}>
                  <ShoppingCart size={28} style={{ color: "#CBD5E1" }} />
                </div>
                <p style={{ color: "#94A3B8", fontSize: "0.85rem", textAlign: "center" }}>
                  Chưa có sản phẩm.<br />Chọn từ menu để bắt đầu.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                {cart.map((item) => {
                  const toppingPrice = item.toppings.reduce((s, tid) => s + (toppings.find(t => t.id === tid)?.price ?? 0), 0);
                  const lineTotal = (item.price + toppingPrice) * item.qty;
                  return (
                    <div
                      key={item.id}
                      className="flex gap-2 py-2.5 px-2 rounded-xl"
                      style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p style={{ color: "#111827", fontWeight: 600, fontSize: "0.83rem" }} className="truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.size && (
                            <span className="px-1.5 py-0.5 rounded" style={{ background: "#0F4761", color: "#FFF", fontSize: "0.65rem", fontWeight: 700 }}>{item.size}</span>
                          )}
                          {item.toppings.map((tid) => {
                            const t = toppings.find(tp => tp.id === tid);
                            return t ? (
                              <span key={tid} style={{ color: "#0F4761", fontSize: "0.65rem", background: "#E6F4F8", padding: "1px 5px", borderRadius: 4 }}>{t.name}</span>
                            ) : null;
                          })}
                        </div>
                        {item.note && <p style={{ color: "#64748B", fontSize: "0.68rem", marginTop: 2 }}>📝 {item.note}</p>}
                        <p className="mt-1" style={{ color: "#D97706", fontWeight: 700, fontSize: "0.82rem" }}>{formatVnd(lineTotal)}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                          <Trash2 size={13} style={{ color: "#FCA5A5" }} />
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "#E2E8F0", border: "none", cursor: "pointer" }}
                          >
                            <Minus size={11} style={{ color: "#334155" }} />
                          </button>
                          <span style={{ color: "#111827", fontWeight: 700, fontSize: "0.85rem", minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "#0F4761", border: "none", cursor: "pointer" }}
                          >
                            <Plus size={11} style={{ color: "#FFF" }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="px-4 py-2.5 border-t shrink-0" style={{ borderColor: "#E2E8F0" }}>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }} />
                  <select
                    value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value); setDiscountMsg(null); }}
                    className="w-full pl-7 pr-2 py-2 rounded-xl border outline-none"
                    style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "0.8rem" }}
                    onFocus={(e) => { e.target.style.borderColor = "#0F4761"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#CBD5E1"; }}
                  >
                    <option value="">Chọn mã giảm giá</option>
                    {couponOptions.map(coupon => (
                      <option key={coupon.couponId} value={coupon.code}>
                        {coupon.code}{coupon.description ? ` - ${coupon.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={applyDiscount}
                  className="px-3 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #0F4761, #0E7490)", color: "#FFF", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                >
                  Áp dụng
                </button>
              </div>
              {discountMsg && (
                <p className="mt-1" style={{ color: discountMsg.type === "ok" ? "#059669" : "#DC2626", fontSize: "0.72rem" }}>
                  {discountMsg.type === "ok" ? "✓" : "✗"} {discountMsg.text}
                </p>
              )}
            </div>
          )}

          {cart.length > 0 && (
            <div className="px-4 pb-2 shrink-0">
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Ghi chú đơn hàng..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border outline-none resize-none"
                style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "0.8rem" }}
                onFocus={(e) => { e.target.style.borderColor = "#0F4761"; }}
                onBlur={(e) => { e.target.style.borderColor = "#CBD5E1"; }}
              />
            </div>
          )}

          <div className="px-4 py-3 shrink-0 border-t" style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between">
                <span style={{ color: "#475569", fontSize: "0.82rem" }}>Tạm tính ({cartCount} sp)</span>
                <span style={{ color: "#111827", fontSize: "0.82rem" }}>{formatVnd(cartTotal)}</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "#475569", fontSize: "0.82rem" }}>Mã giảm giá</span>
                  <span style={{ color: "#059669", fontSize: "0.82rem", fontWeight: 600 }}>-{formatVnd(appliedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t" style={{ borderColor: "#E2E8F0" }}>
                <span style={{ color: "#111827", fontWeight: 700, fontSize: "0.95rem" }}>Tổng cộng</span>
                <span style={{ color: "#D97706", fontWeight: 800, fontSize: "1.05rem" }}>
                  {formatVnd(Math.max(0, cartTotal - appliedDiscount))}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={cart.length === 0}
                className="flex items-center gap-1 px-3 py-3 rounded-xl"
                style={{ background: cart.length > 0 ? "#F8FAFC" : "#E5E7EB", color: "#0F4761", border: "1px solid #E2E8F0", cursor: cart.length > 0 ? "pointer" : "not-allowed", fontSize: "0.78rem" }}
              >
                <Printer size={15} />
              </button>
              <button
                onClick={openPaymentFlow}
                disabled={cart.length === 0}
                className="flex-1 py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{
                  background: cart.length > 0 ? "linear-gradient(135deg, #0F4761, #0E7490)" : "#D1D5DB",
                  color: cart.length > 0 ? "#FFFFFF" : "#9CA3AF",
                  border: "none",
                  cursor: cart.length > 0 ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  boxShadow: cart.length > 0 ? "0 4px 15px rgba(15,71,97,0.25)" : "none",
                }}
              >
                Thanh toán →
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm max-h-[92vh] mx-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={{ background: "#FFFFFF" }}>
            <div className="relative h-40 shrink-0 overflow-hidden" style={{ background: "#F8FAFC" }}>
              {showAddModal.product.image ? (
                <img src={showAddModal.product.image} alt={showAddModal.product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ fontSize: "4rem" }}>
                  {showAddModal.product.emoji}
                </div>
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,23,42,0.65), transparent)" }} />
              <button
                onClick={() => setShowAddModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer" }}
              >
                <X size={16} style={{ color: "#111827" }} />
              </button>
              <div className="absolute bottom-3 left-4">
                <h3 style={{ color: "#FFF", fontWeight: 700, fontSize: "1.1rem" }}>{showAddModal.product.name}</h3>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {modalSizeKeys.length > 0 && (
              <div>
                <label style={{ color: "#334155", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Chọn cỡ</label>
                <div className="flex gap-2">
                  {modalSizeKeys.map((s) => {
                    const price = showAddModal.product.sizes[s];
                    if (!price) return null;
                    return (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className="flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all"
                        style={{
                          background: selectedSize === s ? "linear-gradient(135deg, #0F4761, #0E7490)" : "#F8FAFC",
                          border: `1.5px solid ${selectedSize === s ? "#0E7490" : "#E2E8F0"}`,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ color: selectedSize === s ? "#FFFFFF" : "#334155", fontWeight: 700, fontSize: "0.9rem" }}>{s}</span>
                        <span style={{ color: selectedSize === s ? "rgba(255,255,255,0.82)" : "#64748B", fontSize: "0.7rem" }}>{formatVnd(price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {modalToppings.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowVariantOptions(open => !open)}
                  aria-expanded={showVariantOptions}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    background: "#F8FAFC",
                    border: `1.5px solid ${showVariantOptions || selectedToppings.length > 0 ? "#0E7490" : "#E2E8F0"}`,
                    cursor: "pointer",
                  }}
                >
                  <div className="min-w-0">
                    <p style={{ color: "#334155", fontSize: "0.82rem", fontWeight: 700 }}>Biến thể</p>
                    <p style={{ color: "#64748B", fontSize: "0.7rem", marginTop: 1 }}>
                      {selectedToppings.length > 0 ? `${selectedToppings.length} đã chọn` : "Chọn topping nếu cần"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" style={{ color: "#0F4761", fontSize: "0.75rem", fontWeight: 700 }}>
                    {showVariantOptions ? "Ẩn" : "Chọn"}
                    <ChevronDown
                      size={15}
                      style={{
                        transform: showVariantOptions ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 160ms ease",
                      }}
                    />
                  </div>
                </button>

                {!showVariantOptions && selectedToppings.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedToppings.filter(toppingId => modalToppingIds.has(toppingId)).map((tid) => {
                      const t = modalToppings.find(tp => tp.id === tid);
                      return t ? (
                        <span key={tid} className="px-2 py-1 rounded-lg" style={{ color: "#0F4761", background: "#E6F4F8", fontSize: "0.68rem", fontWeight: 600 }}>
                          {t.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {showVariantOptions && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {modalToppings.map((t) => {
                      const isOn = selectedToppings.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedToppings(isOn ? selectedToppings.filter(x => x !== t.id) : [...selectedToppings, t.id])}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-left transition-all min-h-[56px]"
                          style={{
                            background: isOn ? "#E6F4F8" : "#F8FAFC",
                            border: `1.5px solid ${isOn ? "#BEE3F0" : "#E2E8F0"}`,
                            cursor: "pointer",
                          }}
                        >
                          {isOn ? <CheckCircle2 size={13} style={{ color: "#0F4761" }} /> : <Plus size={13} style={{ color: "#64748B" }} />}
                          <div className="min-w-0">
                            <p className="line-clamp-2" style={{ color: "#111827", fontSize: "0.75rem", fontWeight: 500, lineHeight: 1.25 }}>{t.name}</p>
                            <p style={{ color: "#D97706", fontSize: "0.68rem" }}>+{formatVnd(t.price)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              )}

              {modalAllowsCustomizations && (
              <div>
                <label style={{ color: "#334155", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Đường / sữa / đá</label>
                <div className="space-y-2">
                  {CUSTOMIZATION_GROUPS.map((group) => (
                    <div key={group.key}>
                      <div className="mb-1 flex items-center justify-between">
                        <span style={{ color: "#475569", fontSize: "0.74rem", fontWeight: 600 }}>{group.label}</span>
                        <span style={{ color: "#0F4761", fontSize: "0.72rem", fontWeight: 700 }}>{drinkCustomizations[group.key]}%</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {group.options.map((option) => {
                          const isSelected = drinkCustomizations[group.key] === option;
                          return (
                            <button
                              key={`${group.key}-${option}`}
                              type="button"
                              onClick={() => setDrinkCustomizations(current => ({ ...current, [group.key]: option }))}
                              className="min-h-[32px] rounded-lg transition-all"
                              style={{
                                background: isSelected ? "linear-gradient(135deg, #0F4761, #0E7490)" : "#F8FAFC",
                                border: `1px solid ${isSelected ? "#0E7490" : "#E2E8F0"}`,
                                color: isSelected ? "#FFFFFF" : "#334155",
                                cursor: "pointer",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                              }}
                            >
                              {option}%
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div>
                <label style={{ color: "#334155", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú</label>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="Yêu cầu khác..."
                  className="w-full px-3 py-2 rounded-xl border outline-none"
                  style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", color: "#111827", fontSize: "0.82rem" }}
                />
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p style={{ color: "#64748B", fontSize: "0.72rem" }}>Tổng</p>
                  <p style={{ color: "#D97706", fontWeight: 800, fontSize: "1.1rem" }}>
                    {formatVnd(modalTotal)}
                  </p>
                </div>
                <button
                  onClick={confirmAddToCart}
                  className="flex-1 py-3 rounded-xl transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #0F4761, #0E7490)",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    boxShadow: "0 4px 15px rgba(15,71,97,0.25)",
                  }}
                >
                  Thêm vào đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerSearch && (
        <CustomerSearchModal
          onSelect={handleSelectCustomer}
          onClose={() => { setShowCustomerSearch(false); setCustomerStepForPayment(false); }}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={cartTotal}
          discount={appliedDiscount}
          cartItems={cart.map(item => ({
            ...item,
            toppings: item.toppings.map(tid => toppings.find(topping => topping.id === tid)?.name || tid),
          }))}
          customerPoints={customer?.points ?? 0}
          customerName={customer?.name ?? ""}
          onClose={() => setShowPayment(false)}
          onSuccess={(method) => handlePaymentSuccess(method)}
        />
      )}
    </div>
  );
}
