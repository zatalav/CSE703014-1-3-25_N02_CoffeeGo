import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { CartItem, useApp, formatVND } from "../store";
import { toast } from "sonner";
import { Banknote, Bike, CheckCircle2, Landmark, Smartphone, Store, Trash2 } from "lucide-react";
import { productImg } from "../data";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { geocodeVietnamAddress, haversineKm } from "../utils/address";
import { apiRequest, pageItems, PageResponse } from "../api";
import { usePublicStores } from "../storeLocations";
import { savePendingVnpayOrder } from "../paymentFlow";

type ProductDto = {
  productId: number;
  productName?: string;
  basePrice?: number;
  status?: string;
};

type ProductSizeDto = {
  sizeId: number;
  productId: number;
  size?: string;
  status?: string;
};

type CustomerOrderResponse = {
  id?: string;
  orderId?: number;
  orderNumber?: string;
};

type PaymentIntentResponse = {
  payUrl?: string;
  qrData?: string;
};

type CustomerOrderPayload = Record<string, unknown> & {
  customerId: number;
  branchId: number;
  amount: number;
  items: unknown[];
};

type CouponValidationResponse = {
  couponId?: number;
  discount?: number;
};

type CustomerProfileResponse = {
  address?: string;
  addressLabel?: string;
  addressWard?: string;
  addressDistrict?: string;
  addressProvince?: string;
  addressLat?: number;
  addressLng?: number;
};

type ShippingQuote = {
  fee: number;
  distanceKm?: number;
  branchId?: number;
  branchName?: string;
  driverCommission: number;
  status: "idle" | "loading" | "ready" | "fallback";
};

const FALLBACK_SHIPPING_FEE = 15000;
const SHIPPING_BASE_FEE = 12000;
const SHIPPING_BASE_KM = 2;
const SHIPPING_PER_KM = 5000;
const SHIPPING_MAX_FEE = 65000;
const DRIVER_COMMISSION_RATE = 0.8;

function normalizeText(value?: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isDefaultSizeLabel(value?: string) {
  const normalized = normalizeText(value);
  return normalized === "tieu chuan" || normalized === "standard";
}

function paymentPayload(payment: "cash" | "transfer" | "wallet") {
  if (payment === "cash") return { paymentMethod: "cash", paymentProvider: "cash" };
  if (payment === "transfer") return { paymentMethod: "e_wallet", paymentProvider: "vietqr" };
  return { paymentMethod: "e_wallet", paymentProvider: "vnpay" };
}

function roundVnd(value: number) {
  return Math.round(value / 1000) * 1000;
}

function deliveryFeeFromDistance(distanceKm: number) {
  const extraKm = Math.max(0, distanceKm - SHIPPING_BASE_KM);
  const fee = SHIPPING_BASE_FEE + extraKm * SHIPPING_PER_KM;
  return Math.min(SHIPPING_MAX_FEE, Math.max(SHIPPING_BASE_FEE, roundVnd(fee)));
}

function driverCommissionFromFee(fee: number) {
  return roundVnd(fee * DRIVER_COMMISSION_RATE);
}

async function resolveCartItems(cart: CartItem[], token?: string) {
  const productPayload = await apiRequest<PageResponse<ProductDto> | ProductDto[]>("/api/products?size=500&sort=productId,asc", {}, token);
  const products = pageItems(productPayload).filter((product) => !product.status || product.status.toLowerCase() === "active");
  const productByName = new Map(products.map((product) => [normalizeText(product.productName), product]));
  const productById = new Map(products.map((product) => [product.productId, product]));
  const sizeCache = new Map<number, ProductSizeDto[]>();

  return Promise.all(cart.map(async (item) => {
    if (item.comboId) {
      return {
        comboId: item.comboId,
        name: item.name,
        quantity: item.qty,
        unitPrice: item.price,
        size: item.size,
        sizeName: item.size,
        note: item.note,
      };
    }

    const product = item.productId ? productById.get(item.productId) : productByName.get(normalizeText(item.name));
    if (!product) {
      throw new Error(`Không tìm thấy sản phẩm trong CSDL: ${item.name}`);
    }

    let sizeId = item.sizeId;
    let sizeName = item.size;
    if (!sizeId && item.size) {
      if (!sizeCache.has(product.productId)) {
        const sizes = await apiRequest<ProductSizeDto[]>(`/api/products/${product.productId}/sizes`, {}, token).catch(() => []);
        sizeCache.set(product.productId, sizes.filter((size) => !size.status || size.status.toLowerCase() === "active"));
      }
      const activeSizes = sizeCache.get(product.productId) || [];
      const matchedSize = activeSizes.find((size) => normalizeText(size.size) === normalizeText(item.size));
      sizeId = matchedSize?.sizeId;
      sizeName = matchedSize?.size || item.size;
      if (!matchedSize && (!activeSizes.length || isDefaultSizeLabel(item.size))) {
        sizeName = undefined;
      }
    }

    return {
      productId: product.productId,
      productName: product.productName || item.name,
      name: item.name,
      quantity: item.qty,
      unitPrice: item.price,
      sizeId,
      size: sizeName,
      sizeName,
      note: item.note,
    };
  }));
}

export default function Order() {
  const { cart, updateQty, removeFromCart, clearCart, user } = useApp();
  const { stores: branchStores } = usePublicStores();
  const navigate = useNavigate();
  const token = user?.accessToken || localStorage.getItem("customerAccessToken") || undefined;
  const [step, setStep] = useState<"form" | "success">("form");
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    note: "",
    type: "delivery" as "delivery" | "pickup",
    address: "",
    district: "",
    ward: "",
    province: "",
    addressLabel: "",
    store: "",
    time: "now",
    payment: "cash" as "cash" | "transfer" | "wallet",
  });
  const [customerAddress, setCustomerAddress] = useState<CustomerProfileResponse | null>(null);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote>({
    fee: FALLBACK_SHIPPING_FEE,
    driverCommission: driverCommissionFromFee(FALLBACK_SHIPPING_FEE),
    status: "idle",
  });
  const [voucher, setVoucher] = useState("");
  const [couponId, setCouponId] = useState<number | undefined>();
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đặt hàng.");
      navigate("/login");
      return;
    }
    if (cart.length === 0 && step === "form") {
      toast.error("Giỏ hàng trống, hãy chọn món trước nhé!");
      navigate("/products");
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    apiRequest<CustomerProfileResponse>(`/api/customers/${user.id}/profile`, {}, token)
      .then((profile) => {
        if (cancelled) return;
        setCustomerAddress(profile);
        if (profile.address) {
          setForm((current) => ({
            ...current,
            address: current.address || profile.address || "",
            district: current.district || profile.addressDistrict || "",
            ward: current.ward || profile.addressWard || "",
            province: current.province || profile.addressProvince || "",
            addressLabel: current.addressLabel || profile.addressLabel || "",
          }));
        } else {
          toast.info("Bạn chưa có địa chỉ giao hàng. Hãy thêm trong trang thông tin cá nhân hoặc nhập tạm khi đặt hàng.");
        }
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Không tải được địa chỉ khách hàng.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.accessToken]);

  useEffect(() => {
    if (form.type !== "delivery") {
      setShippingQuote({ fee: 0, driverCommission: 0, status: "idle" });
      return;
    }

    const address = form.address.trim();
    if (!address) {
      setShippingQuote({
        fee: FALLBACK_SHIPPING_FEE,
        driverCommission: driverCommissionFromFee(FALLBACK_SHIPPING_FEE),
        status: "idle",
      });
      return;
    }

    let cancelled = false;
    setShippingQuote((current) => ({ ...current, status: "loading" }));

    const quote = async () => {
      const profilePoint = customerAddress?.addressLat && customerAddress?.addressLng
        ? { lat: customerAddress.addressLat, lng: customerAddress.addressLng }
        : null;
      const point = profilePoint || await geocodeVietnamAddress(address);
      if (!point) {
        throw new Error("Không tìm thấy tọa độ địa chỉ.");
      }
      const nearestStore = branchStores
        .filter((store) => store.open)
        .map((store) => ({
          ...store,
          distanceKm: haversineKm(point, { lat: store.lat, lng: store.lng }),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];

      if (!nearestStore) throw new Error("Không tìm thấy chi nhánh đang mở.");
      const fee = deliveryFeeFromDistance(nearestStore.distanceKm);
      if (!cancelled) {
        setShippingQuote({
          fee,
          distanceKm: nearestStore.distanceKm,
          branchId: nearestStore.id,
          branchName: nearestStore.name,
          driverCommission: driverCommissionFromFee(fee),
          status: "ready",
        });
      }
    };

    quote().catch(() => {
      if (!cancelled) {
        setShippingQuote({
          fee: FALLBACK_SHIPPING_FEE,
          driverCommission: driverCommissionFromFee(FALLBACK_SHIPPING_FEE),
          status: "fallback",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [branchStores, form.type, form.address, customerAddress?.addressLat, customerAddress?.addressLng]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = form.type === "delivery" ? shippingQuote.fee : 0;
  const total = subtotal + shipping - discount;

  const applyVoucher = async () => {
    if (!voucher.trim()) {
      toast.error("Vui lòng nhập mã voucher.");
      return;
    }
    try {
      const result = await apiRequest<CouponValidationResponse>(`/api/orders/customer/coupons/validate?code=${encodeURIComponent(voucher.trim())}&total=${subtotal}`, {}, token);
      setCouponId(result.couponId);
      setDiscount(Number(result.discount ?? 0));
      toast.success("Áp dụng voucher thành công!");
    } catch (error) {
      setCouponId(undefined);
      setDiscount(0);
      toast.error(error instanceof Error ? error.message : "Mã không hợp lệ");
    }
  };

  const submit = async () => {
    if (!user?.id) {
      toast.error("Vui lòng đăng nhập để đặt hàng.");
      navigate("/login");
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Vui lòng điền họ tên và SĐT");
      return;
    }
    if (form.type === "delivery" && !form.address.trim()) {
      toast.error("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }
    if (form.type === "pickup" && !form.store) {
      toast.error("Vui lòng chọn chi nhánh nhận hàng.");
      return;
    }

    setSubmitting(true);
    try {
      const branchId = form.type === "pickup"
        ? Number(form.store)
        : shippingQuote.branchId || branchStores.find((store) => store.open)?.id || branchStores[0]?.id;
      const selectedStore = branchStores.find((store) => store.id === branchId);
      if (!branchId) throw new Error("Không xác định được chi nhánh nhận đơn.");

      const items = await resolveCartItems(cart, token);
      const payment = paymentPayload(form.payment);
      const orderPayload: CustomerOrderPayload = {
        customerId: user.id,
        branchId,
        couponId,
        orderType: form.type,
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: user.email,
        deliveryAddress: form.type === "delivery" ? form.address.trim() : selectedStore?.address,
        deliveryAddressLabel: form.type === "delivery" ? form.addressLabel : undefined,
        deliveryWard: form.type === "delivery" ? form.ward : undefined,
        deliveryDistrict: form.district.trim(),
        deliveryProvince: form.type === "delivery" ? form.province : undefined,
        pickupStore: selectedStore?.name,
        paymentMethod: payment.paymentMethod,
        paymentProvider: payment.paymentProvider,
        paymentStatus: "paid",
        shippingFee: form.type === "delivery" ? shipping : 0,
        deliveryDistanceKm: form.type === "delivery" ? shippingQuote.distanceKm : undefined,
        driverCommissionRate: form.type === "delivery" ? DRIVER_COMMISSION_RATE : 0,
        driverCommission: form.type === "delivery" ? shippingQuote.driverCommission : 0,
        amount: total,
        discount,
        note: form.note,
        items,
      };

      if (form.payment === "wallet") {
        const transactionRef = `CG-${Date.now()}-${user.id}`;
        savePendingVnpayOrder({
          transactionRef,
          amount: total,
          orderPayload,
          cart,
          createdAt: new Date().toISOString(),
        });
        const intent = await apiRequest<PaymentIntentResponse>("/api/payments/sandbox/create", {
          method: "POST",
          body: JSON.stringify({
            provider: "vnpay",
            amount: total,
            orderId: transactionRef,
            orderInfo: `Thanh toan don hang ${transactionRef}`,
            returnUrl: `${window.location.origin}/payment-return`,
          }),
        }, token);
        const redirectUrl = intent.payUrl || intent.qrData;
        if (!redirectUrl) throw new Error("Khong tao duoc link thanh toan VNPAY.");
        window.location.href = redirectUrl;
        return;
      }

      const order = await apiRequest<CustomerOrderResponse>("/api/orders/customer", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      }, token);

      setOrderId(order.orderNumber || order.id || String(order.orderId || ""));
      setStep("success");
      clearCart();
      toast.success("Đơn hàng đã được gửi đến nhân viên phục vụ.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tạo đơn hàng thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-lg w-full text-center p-10 rounded-3xl" style={{ background: "white", border: "1px solid var(--border-line)", boxShadow: "0 12px 40px rgba(92,51,23,0.1)" }}>
          <CheckCircle2 size={80} className="mx-auto mb-6" style={{ color: "var(--brand-brown)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Đặt hàng thành công! ☕</h1>
          <div className="mt-4 mb-6">
            <div className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>MÃ ĐƠN HÀNG</div>
            <div className="font-mono font-bold text-xl mt-1" style={{ color: "var(--brand-brown)" }}>{orderId}</div>
          </div>
          <p style={{ color: "var(--text-secondary)" }}>Đơn hàng của bạn đã được gửi đến nhân viên phục vụ. Trạng thái sẽ được cập nhật trong mục Theo dõi đơn.</p>
          <div className="flex gap-3 mt-8">
            <Link to="/profile?tab=orders" className="flex-1 py-3 rounded-xl ui-text font-semibold" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Theo dõi đơn</Link>
            <Link to="/" className="flex-1 py-3 rounded-xl ui-text font-semibold" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-xs ui-text mb-4" style={{ color: "var(--text-secondary)" }}>
        <Link to="/" className="hover:underline">Trang chủ</Link> › Đặt hàng
      </div>
      <h1 className="mb-8" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Hoàn tất đơn hàng</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Cart summary */}
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border-line)" }}>
          <h2 className="mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>Tóm tắt giỏ hàng</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 py-3 border-b" style={{ borderColor: "var(--border-line)" }}>
                <div className="w-14 h-14 overflow-hidden rounded-lg flex-shrink-0" style={{ background: "var(--bg-card)" }}>
                  {item.image ? (
                    <ImageWithFallback src={productImg(item.image)} alt={item.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{item.name}</div>
                  {item.size && <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.size}</div>}
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 rounded border text-xs">−</button>
                    <span className="text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 rounded border text-xs">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: "var(--brand-brown)" }}>{formatVND(item.price * item.qty)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="text-xs mt-2" style={{ color: "var(--error)" }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <input value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="Mã voucher" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
            <button onClick={applyVoucher} className="px-4 py-2 rounded-lg ui-text text-sm" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>Áp dụng</button>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: "var(--text-secondary)" }}>Tạm tính</span><span>{formatVND(subtotal)}</span></div>
            <div className="flex justify-between"><span style={{ color: "var(--text-secondary)" }}>Phí giao hàng</span><span>{formatVND(shipping)}</span></div>
            {discount > 0 && <div className="flex justify-between"><span style={{ color: "var(--text-secondary)" }}>Giảm giá</span><span style={{ color: "var(--success)" }}>−{formatVND(discount)}</span></div>}
            <div className="flex justify-between pt-3 border-t mt-3 font-bold text-lg" style={{ borderColor: "var(--border-line)" }}>
              <span>Tổng thanh toán</span>
              <span style={{ color: "var(--brand-brown)" }}>{formatVND(total)}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border-line)" }}>
            <h3 className="mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>Thông tin người nhận</h3>
            {[
              { label: "Họ tên *", key: "name", placeholder: "Nguyễn Văn A" },
              { label: "Số điện thoại *", key: "phone", placeholder: "0987 654 321" },
            ].map((f) => (
              <div key={f.key} className="mb-3">
                <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
              </div>
            ))}
            <div className="mb-3">
              <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Ghi chú đơn</label>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none resize-none" rows={2} style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border-line)" }}>
            <h3 className="mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>Hình thức nhận</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { k: "delivery", l: "Giao tận nơi", icon: Bike },
                { k: "pickup", l: "Đến lấy", icon: Store },
              ].map((o) => {
                const Icon = o.icon;
                return (
                <button key={o.k} onClick={() => setForm({ ...form, type: o.k as any })}
                  className="inline-flex items-center justify-center gap-2 py-3 rounded-xl ui-text text-sm transition"
                  style={{
                    background: form.type === o.k ? "var(--bg-section)" : "white",
                    border: "1.5px solid " + (form.type === o.k ? "var(--brand-brown)" : "var(--border-line)"),
                  }}>
                  <Icon size={17} />
                  {o.l}
                </button>
                );
              })}
            </div>
            {form.type === "delivery" ? (
              <div className="space-y-3">
                {customerAddress?.address && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--bg-section)", border: "1px solid var(--border-line)" }}>
                    <div className="font-semibold" style={{ color: "var(--brand-brown)" }}>{customerAddress.addressLabel || "Địa chỉ mặc định"}</div>
                    <div className="mt-1" style={{ color: "var(--text-secondary)" }}>{customerAddress.address}</div>
                  </div>
                )}
                {!customerAddress?.address && (
                  <Link to="/profile?tab=info" className="block rounded-xl px-4 py-3 text-sm underline" style={{ background: "var(--bg-section)", color: "var(--brand-brown)", border: "1px solid var(--border-line)" }}>
                    Thêm địa chỉ mặc định trong thông tin cá nhân
                  </Link>
                )}
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ giao hàng" className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
                <div className="grid md:grid-cols-3 gap-2">
                  <input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} placeholder="Phường / Xã" className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
                  <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Quận / Huyện" className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
                  <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Tỉnh / Thành phố" className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
                </div>
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--bg-section)", color: "var(--text-secondary)", border: "1px solid var(--border-line)" }}>
                  <div className="flex justify-between gap-3">
                    <span>Phí giao hàng</span>
                    <span className="font-semibold" style={{ color: "var(--brand-brown)" }}>{shippingQuote.status === "loading" ? "Đang tính..." : formatVND(shipping)}</span>
                  </div>
                  {shippingQuote.distanceKm && (
                    <div className="mt-1 flex justify-between gap-3">
                      <span>{shippingQuote.branchName}</span>
                      <span>~{shippingQuote.distanceKm.toFixed(1)} km</span>
                    </div>
                  )}
                  {form.type === "delivery" && (
                    <div className="mt-1 flex justify-between gap-3">
                      <span>Shipper nhận</span>
                      <span>{formatVND(shippingQuote.driverCommission)} ({Math.round(DRIVER_COMMISSION_RATE * 100)}%)</span>
                    </div>
                  )}
                  {shippingQuote.status === "fallback" && (
                    <div className="mt-1 text-xs" style={{ color: "#B7770D" }}>Đang dùng phí dự phòng vì chưa định vị được địa chỉ.</div>
                  )}
                </div>
              </div>
            ) : (
              <select value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }}>
                <option value="">Chọn chi nhánh</option>
                {branchStores.filter((store) => store.open).map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border-line)" }}>
            <h3 className="mb-4" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>Phương thức thanh toán</h3>
            <div className="space-y-2">
              {[
                { k: "cash", l: "Tiền mặt khi nhận", icon: Banknote },
                { k: "transfer", l: "Chuyển khoản", icon: Landmark },
                { k: "wallet", l: "Ví điện tử (MoMo/ZaloPay/VNPay)", icon: Smartphone },
              ].map((o) => {
                const Icon = o.icon;
                return (
                <button key={o.k} onClick={() => setForm({ ...form, payment: o.k as any })}
                  className="flex w-full items-center gap-3 text-left p-3 rounded-xl ui-text text-sm transition"
                  style={{
                    background: form.payment === o.k ? "var(--bg-section)" : "white",
                    border: "1.5px solid " + (form.payment === o.k ? "var(--brand-brown)" : "var(--border-line)"),
                  }}>
                  <Icon size={17} />
                  <span>{o.l}</span>
                </button>
                );
              })}
            </div>
          </div>

          <button onClick={submit} disabled={submitting} className="w-full py-4 rounded-xl ui-text font-semibold text-lg transition hover:scale-[1.01]" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Đang tạo đơn..." : `Xác nhận đặt hàng — ${formatVND(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
