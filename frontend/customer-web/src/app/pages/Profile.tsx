import { useEffect, useState } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router";
import { User as AppUser, formatVND, useApp } from "../store";
import { User as UserIcon, Package, Award, Star, Plus, MapPin, Save, X } from "lucide-react";
import { toast } from "sonner";
import { composeAddress, DistrictOption, geocodeVietnamAddress, getVietnamAddressBook, ProvinceOption } from "../utils/address";
import { apiUrl, clearCustomerAuthStorage } from "../api";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type PageResponse<T> = {
  items?: T[];
  content?: T[];
  data?: T[];
};

type CustomerOrderDto = {
  id?: string;
  orderId?: number;
  orderNumber?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  amount?: number;
  total?: number;
  discount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  items?: { name?: string; qty?: number; quantity?: number; size?: string }[];
  loyalty?: {
    rankName?: string;
    dripPoints?: number;
    expPoints?: number;
  };
};

type CustomerProfileDto = {
  id?: number;
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  addressLabel?: string;
  addressDetail?: string;
  addressWard?: string;
  addressDistrict?: string;
  addressProvince?: string;
  addressWardCode?: number;
  addressDistrictCode?: number;
  addressProvinceCode?: number;
  addressLat?: number;
  addressLng?: number;
};

type MembershipRankDto = {
  rankId?: number;
  rankName?: string;
  rankOrder?: number;
  minExp?: number;
  minTotalMoney?: number;
  minTotalOrders?: number;
  discountPercent?: number;
  expMultiplier?: number;
  dripsMultiplier?: number;
  description?: string;
  status?: string;
  color?: string;
  icon?: string;
};

type AddressForm = {
  label: string;
  detail: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
};

function isInvalidTokenMessage(message?: string) {
  return (message || "").trim().toLowerCase() === "invalid or expired token";
}

function sessionExpiredError() {
  return new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
}

async function apiRequest<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as ApiEnvelope<T> | T : undefined;
  const message = (payload as ApiEnvelope<T> | undefined)?.message;
  if (token && !response.ok && (response.status === 401 || response.status === 403 || isInvalidTokenMessage(message))) {
    clearCustomerAuthStorage();
    throw sessionExpiredError();
  }
  if (!response.ok) throw new Error((payload as ApiEnvelope<T>)?.message || "Không tải được dữ liệu.");
  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (token && envelope.success === false && isInvalidTokenMessage(envelope.message)) {
      clearCustomerAuthStorage();
      throw sessionExpiredError();
    }
    if (envelope.success === false) throw new Error(envelope.message || "Không tải được dữ liệu.");
    return envelope.data as T;
  }
  return payload as T;
}

function normalizeTier(value?: string): AppUser["tier"] {
  const normalized = (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("black")) return "Black";
  if (normalized.includes("platinum")) return "Platinum";
  return "Gold";
}

function statusMeta(status?: string) {
  const key = (status || "pending").toLowerCase();
  if (key === "completed") return { label: "Hoàn thành", color: "#1E8449" };
  if (key === "cancelled") return { label: "Đã hủy", color: "#C0392B" };
  if (key === "delivering") return { label: "Đang giao", color: "#2471A3" };
  if (key === "ready") return { label: "Sẵn sàng", color: "#7B4A2D" };
  if (key === "preparing") return { label: "Đang pha chế", color: "#8E44AD" };
  if (key === "confirmed") return { label: "Đã xác nhận", color: "#2E86C1" };
  return { label: "Đang xử lý", color: "#B7770D" };
}

function orderItemsText(order: CustomerOrderDto) {
  const items = order.items || [];
  if (items.length === 0) return "Chưa có món";
  return items.map((item) => {
    const qty = item.qty ?? item.quantity ?? 0;
    const size = item.size ? ` (${item.size})` : "";
    return `${item.name || "Sản phẩm"}${size} x${qty}`;
  }).join(", ");
}

function addressFormFromProfile(profile?: CustomerProfileDto): AddressForm {
  return {
    label: profile?.addressLabel || "Nhà riêng",
    detail: profile?.addressDetail || "",
    provinceCode: profile?.addressProvinceCode ? String(profile.addressProvinceCode) : "",
    districtCode: profile?.addressDistrictCode ? String(profile.addressDistrictCode) : "",
    wardCode: profile?.addressWardCode ? String(profile.addressWardCode) : "",
  };
}

function findDistrict(province: ProvinceOption | undefined, code: string): DistrictOption | undefined {
  return province?.districts?.find((district) => String(district.code) === code);
}

export default function Profile({ initialTab = "info" }: { initialTab?: "info" | "orders" | "membership" | "reviews" } = {}) {
  const { user, logout } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || initialTab;
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  const tabs = [
    { k: "info", l: "Thông tin", icon: UserIcon },
    { k: "orders", l: "Đơn hàng", icon: Package },
    { k: "membership", l: "Hạng thành viên", icon: Award },
    { k: "reviews", l: "Đánh giá", icon: Star },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[260px_1fr] gap-8">
      <aside className="space-y-2">
        <div className="p-6 rounded-2xl text-center" style={{ background: "var(--bg-section)", border: "1px solid var(--border-line)" }}>
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-semibold mb-3" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>{user.name}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{user.tier} · {user.dripPoints} điểm</div>
        </div>
        <div className="lg:space-y-1 flex lg:flex-col overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.k;
            return (
              <button key={t.k} onClick={() => setParams({ tab: t.k })}
                className="flex items-center gap-3 px-4 py-3 ui-text text-sm whitespace-nowrap transition rounded-lg"
                style={{
                  background: active ? "var(--bg-section)" : "transparent",
                  color: active ? "var(--brand-brown)" : "var(--text-secondary)",
                  borderLeft: active ? "3px solid var(--brand-brown)" : "3px solid transparent",
                  fontWeight: active ? 600 : 400,
                }}>
                <Icon size={16} /> {t.l}
              </button>
            );
          })}
          <button onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-3 px-4 py-3 ui-text text-sm rounded-lg" style={{ color: "var(--error)" }}>Đăng xuất</button>
        </div>
      </aside>

      <div>
        {tab === "info" && <InfoTab />}
        {tab === "orders" && <RealOrdersTab />}
        {tab === "membership" && <MembershipTab />}
        {tab === "reviews" && <ReviewsTab />}
      </div>
    </div>
  );
}

function InfoTab() {
  const { user, login } = useApp();
  const token = user?.accessToken || localStorage.getItem("customerAccessToken") || undefined;
  const [profile, setProfile] = useState<CustomerProfileDto | null>(null);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    dateOfBirth: "",
    gender: "",
  });
  const [addressForm, setAddressForm] = useState<AddressForm>(addressFormFromProfile());
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [editingAddress, setEditingAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVietnamAddressBook()
      .then((data) => {
        if (!cancelled) setProvinces(data);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Không tải được API địa chỉ.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    apiRequest<CustomerProfileDto>(`/api/customers/${user.id}/profile`, token)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setForm({
          name: data.name || user.name || "",
          phone: data.phoneNumber || user.phone || "",
          email: data.email || user.email || "",
          dateOfBirth: data.dateOfBirth || "",
          gender: data.gender || "",
        });
        setAddressForm(addressFormFromProfile(data));
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Không tải được thông tin khách hàng.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.accessToken]);

  if (!user) return null;

  const selectedProvince = provinces.find((province) => String(province.code) === addressForm.provinceCode);
  const selectedDistrict = findDistrict(selectedProvince, addressForm.districtCode);
  const selectedWard = selectedDistrict?.wards?.find((ward) => String(ward.code) === addressForm.wardCode);
  const fullAddress = composeAddress({
    detail: addressForm.detail,
    ward: selectedWard?.name || profile?.addressWard,
    district: selectedDistrict?.name || profile?.addressDistrict,
    province: selectedProvince?.name || profile?.addressProvince,
  });

  const saveProfile = async () => {
    if (!user.id) return;
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Vui lòng nhập họ tên, số điện thoại và email.");
      return;
    }
    if (editingAddress && (!addressForm.detail.trim() || !selectedProvince || !selectedDistrict || !selectedWard)) {
      toast.error("Vui lòng nhập đủ số nhà/đường, tỉnh, quận/huyện và phường/xã.");
      return;
    }

    setSaving(true);
    try {
      let geoPoint: { lat: number; lng: number } | null = null;
      if (editingAddress) {
        try {
          geoPoint = await geocodeVietnamAddress(fullAddress);
        } catch {
          geoPoint = null;
        }
      }
      const nextProfile = await apiRequest<CustomerProfileDto>(`/api/customers/${user.id}/profile`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          phoneNumber: form.phone.trim(),
          email: form.email.trim(),
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          address: editingAddress ? fullAddress : profile?.address,
          addressLabel: editingAddress ? addressForm.label.trim() || "Địa chỉ giao hàng" : profile?.addressLabel,
          addressDetail: editingAddress ? addressForm.detail.trim() : profile?.addressDetail,
          addressWard: editingAddress ? selectedWard?.name : profile?.addressWard,
          addressDistrict: editingAddress ? selectedDistrict?.name : profile?.addressDistrict,
          addressProvince: editingAddress ? selectedProvince?.name : profile?.addressProvince,
          addressWardCode: editingAddress ? selectedWard?.code : profile?.addressWardCode,
          addressDistrictCode: editingAddress ? selectedDistrict?.code : profile?.addressDistrictCode,
          addressProvinceCode: editingAddress ? selectedProvince?.code : profile?.addressProvinceCode,
          addressLat: editingAddress ? geoPoint?.lat : profile?.addressLat,
          addressLng: editingAddress ? geoPoint?.lng : profile?.addressLng,
        }),
      });
      setProfile(nextProfile);
      setAddressForm(addressFormFromProfile(nextProfile));
      setEditingAddress(false);
      login({
        ...user,
        name: nextProfile.name || form.name.trim(),
        phone: nextProfile.phoneNumber || form.phone.trim(),
        email: nextProfile.email || form.email.trim(),
      });
      toast.success("Đã lưu thông tin khách hàng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu thông tin thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Thông tin cá nhân</h1>
      <div className="rounded-2xl p-6 grid md:grid-cols-2 gap-4" style={{ background: "white", border: "1px solid var(--border-line)" }}>
        <div>
          <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Họ tên</label>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
        </div>
        <div>
          <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Số điện thoại</label>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
        </div>
        <div>
          <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Email</label>
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
        </div>
        <div>
          <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Ngày sinh</label>
          <input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--border-line)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>Địa chỉ giao hàng</h2>
          <button
            onClick={() => setEditingAddress((value) => !value)}
            className="text-sm ui-text flex items-center gap-1"
            style={{ color: "var(--brand-brown)" }}
          >
            {editingAddress ? <X size={14} /> : <Plus size={14} />}
            {editingAddress ? "Đóng" : profile?.address ? "Sửa địa chỉ" : "Thêm địa chỉ"}
          </button>
        </div>

        {loading && <div className="p-4 rounded-xl text-sm" style={{ background: "var(--bg-section)", color: "var(--text-secondary)" }}>Đang tải thông tin...</div>}

        {!loading && profile?.address && !editingAddress && (
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-section)" }}>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} style={{ color: "var(--brand-brown)" }} />
              <span className="font-semibold">{profile.addressLabel || "Địa chỉ giao hàng"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Mặc định</span>
            </div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.address}</div>
          </div>
        )}

        {!loading && !profile?.address && !editingAddress && (
          <div className="p-4 rounded-xl text-sm" style={{ background: "var(--bg-section)", color: "var(--text-secondary)" }}>
            Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ để checkout tự điền và tính phí giao hàng theo khoảng cách.
          </div>
        )}

        {editingAddress && (
          <div className="grid gap-3">
            <div>
              <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Tên địa chỉ</label>
              <input value={addressForm.label} onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })} placeholder="Nhà riêng, Công ty..." className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
            </div>
            <div>
              <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Số nhà, tên đường</label>
              <input value={addressForm.detail} onChange={(event) => setAddressForm({ ...addressForm, detail: event.target.value })} placeholder="Ví dụ: 234 Lạc Long Quân" className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <select value={addressForm.provinceCode} onChange={(event) => setAddressForm({ ...addressForm, provinceCode: event.target.value, districtCode: "", wardCode: "" })} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }}>
                <option value="">Tỉnh / Thành phố</option>
                {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </select>
              <select value={addressForm.districtCode} onChange={(event) => setAddressForm({ ...addressForm, districtCode: event.target.value, wardCode: "" })} disabled={!selectedProvince} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }}>
                <option value="">Quận / Huyện</option>
                {selectedProvince?.districts?.map((district) => <option key={district.code} value={district.code}>{district.name}</option>)}
              </select>
              <select value={addressForm.wardCode} onChange={(event) => setAddressForm({ ...addressForm, wardCode: event.target.value })} disabled={!selectedDistrict} className="w-full px-3 py-2.5 rounded-lg outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }}>
                <option value="">Phường / Xã</option>
                {selectedDistrict?.wards?.map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
              </select>
            </div>
            {fullAddress && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--bg-section)", color: "var(--text-secondary)" }}>
                {fullAddress}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={saveProfile} disabled={saving} className="px-6 py-3 rounded-lg ui-text font-semibold inline-flex items-center gap-2" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)", opacity: saving ? 0.7 : 1 }}>
          <Save size={16} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button className="px-6 py-3 rounded-lg ui-text" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>Đổi mật khẩu</button>
      </div>
    </div>
  );
}

function RealOrdersTab() {
  const { user, login } = useApp();
  const [orders, setOrders] = useState<CustomerOrderDto[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const token = user?.accessToken || localStorage.getItem("customerAccessToken") || undefined;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadOrders = async () => {
      try {
        const data = await apiRequest<CustomerOrderDto[]>(`/api/orders/customer?customerId=${user.id}`, token);
        if (cancelled) return;
        setOrders(data || []);
        const loyalty = data?.find((order) => order.loyalty)?.loyalty;
        if (loyalty && user) {
          const nextTier = normalizeTier(loyalty.rankName);
          const nextDrip = loyalty.dripPoints ?? user.dripPoints;
          if (nextTier !== user.tier || nextDrip !== user.dripPoints) {
            login({ ...user, tier: nextTier, dripPoints: nextDrip });
          }
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Không tải được đơn hàng.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadOrders();
    const timer = window.setInterval(loadOrders, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id, user?.accessToken, user?.dripPoints, user?.tier]);

  const filters = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: "Đang xử lý" },
    { key: "delivering", label: "Đang giao" },
    { key: "completed", label: "Hoàn thành" },
    { key: "cancelled", label: "Đã hủy" },
  ];
  const visibleOrders = orders.filter((order) => {
    if (filter === "all") return true;
    const status = (order.status || "pending").toLowerCase();
    if (filter === "pending") return ["pending", "confirmed", "preparing", "ready"].includes(status);
    return status === filter;
  });

  return (
    <div className="space-y-6">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Đơn hàng của tôi</h1>
      <div className="flex gap-2 flex-wrap">
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <button key={item.key} onClick={() => setFilter(item.key)} className="px-4 py-1.5 rounded-full text-sm ui-text" style={{
              background: active ? "var(--brand-brown)" : "transparent",
              color: active ? "var(--bg-primary)" : "var(--text-secondary)",
              border: "1px solid " + (active ? "var(--brand-brown)" : "var(--border-line)"),
            }}>{item.label}</button>
          );
        })}
      </div>
      <div className="space-y-3">
        {loading && <div className="p-5 rounded-xl" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>Đang tải đơn hàng...</div>}
        {!loading && visibleOrders.length === 0 && <div className="p-5 rounded-xl" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>Chưa có đơn hàng phù hợp.</div>}
        {visibleOrders.map((order) => {
          const meta = statusMeta(order.status);
          const date = order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "";
          const total = Number(order.amount ?? order.total ?? 0);
          return (
            <div key={order.id || order.orderId} className="p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ background: "white", border: "1px solid var(--border-line)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold" style={{ color: "var(--brand-brown)" }}>{order.orderNumber || order.id || order.orderId}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: meta.color + "20", color: meta.color }}>{meta.label}</span>
                </div>
                <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{date} · {orderItemsText(order)}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Thanh toán: {order.paymentMethod || "-"} · {order.paymentStatus || "pending"}</div>
              </div>
              <div className="font-bold" style={{ color: "var(--brand-brown)" }}>{formatVND(total)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrdersTab() {
  const orders = [
    { id: "CG12345678", date: "30/05/2026", items: "CF Sữa Đá, Bánh Mì Thịt Nguội", total: 65000, status: "Hoàn thành", color: "#1E8449" },
    { id: "CG12345677", date: "28/05/2026", items: "Bạc Xỉu Đá, Croissant", total: 67000, status: "Đang giao", color: "#2471A3" },
    { id: "CG12345676", date: "25/05/2026", items: "Combo Sáng x2", total: 98000, status: "Đang xử lý", color: "#B7770D" },
  ];
  return (
    <div className="space-y-6">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Đơn hàng của tôi</h1>
      <div className="flex gap-2 flex-wrap">
        {["Tất cả", "Đang xử lý", "Đang giao", "Hoàn thành", "Đã huỷ"].map((s, i) => (
          <button key={s} className="px-4 py-1.5 rounded-full text-sm ui-text" style={{
            background: i === 0 ? "var(--brand-brown)" : "transparent",
            color: i === 0 ? "var(--bg-primary)" : "var(--text-secondary)",
            border: "1px solid " + (i === 0 ? "var(--brand-brown)" : "var(--border-line)"),
          }}>{s}</button>
        ))}
      </div>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3" style={{ background: "white", border: "1px solid var(--border-line)" }}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold" style={{ color: "var(--brand-brown)" }}>{o.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: o.color + "20", color: o.color }}>{o.status}</span>
              </div>
              <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{o.date} · {o.items}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-bold" style={{ color: "var(--brand-brown)" }}>{o.total.toLocaleString("vi-VN")}đ</div>
              <button className="px-4 py-2 rounded-lg text-sm ui-text" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>Chi tiết</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const fallbackMembershipRanks: Required<Pick<MembershipRankDto, "rankName" | "rankOrder" | "minExp" | "minTotalMoney" | "minTotalOrders" | "discountPercent" | "expMultiplier" | "dripsMultiplier" | "description" | "color" | "icon">>[] = [
  {
    rankName: "Gold",
    rankOrder: 1,
    minExp: 0,
    minTotalMoney: 0,
    minTotalOrders: 0,
    discountPercent: 3,
    expMultiplier: 1.1,
    dripsMultiplier: 1.1,
    description: "Hang mac dinh cho khach hang moi; giam gia 3%, tich EXP va Drips x1.1.",
    color: "#F59E0B",
    icon: "G",
  },
  {
    rankName: "Platinum",
    rankOrder: 2,
    minExp: 1500,
    minTotalMoney: 1_500_000,
    minTotalOrders: 16,
    discountPercent: 5,
    expMultiplier: 1.2,
    dripsMultiplier: 1.2,
    description: "Dat tu 1.500 diem, 1.500.000d chi tieu hoac 16 don; giam gia 5%, tich EXP va Drips x1.2.",
    color: "#6366F1",
    icon: "P",
  },
  {
    rankName: "Black",
    rankOrder: 3,
    minExp: 3000,
    minTotalMoney: 3_000_000,
    minTotalOrders: 30,
    discountPercent: 8,
    expMultiplier: 1.4,
    dripsMultiplier: 1.4,
    description: "Hang cao nhat cho khach than thiet; dat tu 3.000 diem, 3.000.000d chi tieu hoac 30 don; giam gia 8%, tich EXP va Drips x1.4.",
    color: "#111827",
    icon: "B",
  },
];

function pageItems<T>(payload: PageResponse<T> | T[] | null | undefined) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function normalizeRankName(value?: string): AppUser["tier"] {
  const normalized = (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("black")) return "Black";
  if (normalized.includes("platinum")) return "Platinum";
  return "Gold";
}

function parseMembershipRanks(items: MembershipRankDto[]) {
  const parsed = items
    .filter((rank) => {
      const normalized = (rank.rankName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return normalized.includes("gold") || normalized.includes("platinum") || normalized.includes("black");
    })
    .map((rank) => {
      const rankName = normalizeRankName(rank.rankName);
      const fallback = fallbackMembershipRanks.find((item) => item.rankName === rankName) || fallbackMembershipRanks[0];
      return {
        ...fallback,
        ...rank,
        rankName,
        rankOrder: rank.rankOrder ?? fallback.rankOrder,
        minExp: rank.minExp ?? fallback.minExp,
        minTotalMoney: rank.minTotalMoney ?? fallback.minTotalMoney,
        minTotalOrders: rank.minTotalOrders ?? fallback.minTotalOrders,
        discountPercent: rank.discountPercent ?? fallback.discountPercent,
        expMultiplier: rank.expMultiplier ?? fallback.expMultiplier,
        dripsMultiplier: rank.dripsMultiplier ?? fallback.dripsMultiplier,
        description: rank.description || fallback.description,
        color: rank.color || fallback.color,
        icon: rank.icon || fallback.icon,
      };
    })
    .sort((a, b) => a.rankOrder - b.rankOrder);
  return parsed.length ? parsed : fallbackMembershipRanks;
}

function formatMultiplier(value: number) {
  return `x${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function formatMoney(value: number) {
  return value > 0 ? `${value.toLocaleString("vi-VN")}đ` : "Không yêu cầu";
}

function nextMembershipRank(ranks: ReturnType<typeof parseMembershipRanks>, points: number) {
  const sorted = [...ranks].sort((a, b) => a.minExp - b.minExp);
  const next = sorted.find((rank) => points < rank.minExp);
  if (!next) return { label: sorted[sorted.length - 1]?.rankName || "Black", remain: 0, progress: 100 };
  const nextIndex = sorted.findIndex((rank) => rank.rankName === next.rankName);
  const previous = sorted[Math.max(0, nextIndex - 1)] || sorted[0];
  const span = Math.max(1, next.minExp - previous.minExp);
  return {
    label: next.rankName,
    remain: Math.max(0, next.minExp - points),
    progress: Math.min(Math.max(((points - previous.minExp) / span) * 100, 0), 100),
  };
}

function rankCardBackground(rank: ReturnType<typeof parseMembershipRanks>[number]) {
  if (rank.rankName === "Black") return "linear-gradient(135deg, #151515 0%, #4A2B17 100%)";
  return `linear-gradient(135deg, ${rank.color}22 0%, ${rank.color}55 100%)`;
}

function MembershipTab() {
  const { user } = useApp();
  const [ranks, setRanks] = useState(parseMembershipRanks([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<PageResponse<MembershipRankDto>>("/customers/membership-ranks?size=20&sort=rankOrder,asc")
      .then((data) => {
        if (!cancelled) setRanks(parseMembershipRanks(pageItems(data)));
      })
      .catch((error) => {
        if (!cancelled) {
          setRanks(parseMembershipRanks([]));
          toast.error(error instanceof Error ? error.message : "Không tải được hạng thành viên từ CSDL.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const points = user?.dripPoints ?? 0;
  const currentRankName = normalizeRankName(user?.tier);
  const currentRank = ranks.find((rank) => rank.rankName === currentRankName) || ranks[0];
  const progress = nextMembershipRank(ranks, points);
  const textColor = currentRank.rankName === "Black" ? "#FFF7E6" : currentRank.color;
  const benefitRows = [
    { label: "Điều kiện EXP", value: (rank: typeof currentRank) => `${rank.minExp.toLocaleString("vi-VN")} điểm` },
    { label: "Chi tiêu tối thiểu", value: (rank: typeof currentRank) => formatMoney(rank.minTotalMoney) },
    { label: "Số đơn tối thiểu", value: (rank: typeof currentRank) => rank.minTotalOrders > 0 ? `${rank.minTotalOrders} đơn` : "Không yêu cầu" },
    { label: "Giảm giá", value: (rank: typeof currentRank) => `${rank.discountPercent}%` },
    { label: "Hệ số EXP", value: (rank: typeof currentRank) => formatMultiplier(rank.expMultiplier) },
    { label: "Hệ số Drips", value: (rank: typeof currentRank) => formatMultiplier(rank.dripsMultiplier) },
    { label: "Mô tả", value: (rank: typeof currentRank) => rank.description },
  ];
  if (!user) return null;
  return (
    <div className="space-y-6">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Hạng thành viên</h1>
      <div className="rounded-2xl p-8 text-center" style={{ background: rankCardBackground(currentRank), color: textColor }}>
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 text-2xl font-bold" style={{ background: currentRank.rankName === "Black" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.72)" }}>
          {currentRank.icon}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem" }}>{currentRank.rankName}</div>
        <div className="mt-2 text-sm">{user.dripPoints.toLocaleString("vi-VN")} điểm DRIP</div>
        {loading && <div className="mt-2 text-xs opacity-80">Đang đồng bộ hạng từ CSDL...</div>}
        <div className="mt-4 max-w-md mx-auto">
          <div className="h-2 rounded-full" style={{ background: "rgba(0,0,0,0.14)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress.progress}%`, background: textColor }} />
          </div>
          <div className="text-xs mt-2">
            {progress.remain > 0
              ? `Còn ${progress.remain.toLocaleString("vi-VN")} điểm để lên ${progress.label}`
              : `Bạn đang ở hạng ${progress.label} cao nhất`}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-x-auto" style={{ background: "white", border: "1px solid var(--border-line)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg-section)" }}>
              <th className="p-4 text-left">Quyền lợi</th>
              {ranks.map((rank) => (
                <th key={rank.rankName} className="p-4 text-center" style={{ color: rank.color }}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-xs" style={{ background: `${rank.color}22` }}>{rank.icon}</span>
                  {rank.rankName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {benefitRows.map((row) => (
              <tr key={row.label} className="border-t" style={{ borderColor: "var(--border-line)" }}>
                <td className="p-4 font-medium">{row.label}</td>
                {ranks.map((rank) => <td key={rank.rankName} className="p-4 text-center">{row.value(rank)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsTab() {
  const reviews = [
    { item: "Cà Phê Trứng (Phố Cổ)", stars: 5, date: "25/05/2026", content: "Ly cà phê trứng tuyệt vời, bọt trứng béo mịn, cà phê đậm vừa phải. Quán đẹp nữa!", status: "Đã duyệt" },
    { item: "Combo Sáng (Hồ Tây)", stars: 4, date: "20/05/2026", content: "Bánh mì giòn, cà phê thơm. Phục vụ nhanh chóng.", status: "Đã duyệt" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Đánh giá của tôi</h1>
        <button className="px-5 py-2.5 rounded-lg ui-text font-semibold flex items-center gap-2" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
          <Plus size={16} /> Viết đánh giá
        </button>
      </div>
      <div className="space-y-3">
        {reviews.map((r, i) => (
          <div key={i} className="p-5 rounded-xl" style={{ background: "white", border: "1px solid var(--border-line)" }}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.item}</div>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#E8F5E9", color: "#1E8449" }}>{r.status}</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-yellow-500">
              {[...Array(5)].map((_, j) => <Star key={j} size={14} fill={j < r.stars ? "currentColor" : "none"} />)}
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{r.content}</p>
            <div className="text-xs mt-2 flex gap-3" style={{ color: "var(--text-secondary)" }}>
              <span>{r.date}</span>
              <button style={{ color: "var(--brand-brown)" }}>Chỉnh sửa</button>
              <button style={{ color: "var(--error)" }}>Xoá</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
