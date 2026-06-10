import { useEffect, useMemo, useState } from "react";
import { Plus, Tag, Clock, TrendingDown, Copy, Edit, Eye, EyeOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import type { ComboDto, LookupOptionDto, PageResponse, ProductDto, SeasonalProductDto } from "../../../lib/types";

type DiscountType = "percent" | "fixed";
type VoucherStatus = "active" | "ended" | "expiring" | "hidden";
type ApplyTo = "Order" | "Product";
type TargetGroup = "Product" | "Combo" | "Seasonal";
type ApplyOption = { value: string; label: string };

type Voucher = {
  couponId?: number;
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  minOrder: number;
  used: number;
  from: string;
  to: string;
  status: VoucherStatus;
  applyTo: ApplyTo;
  targetGroup: TargetGroup;
  product: string;
  customerTarget: string;
  dripsPoints: number;
  note: string;
};

type CouponDto = {
  couponId: number;
  minRankId?: number | null;
  code?: string | null;
  description?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  applyFor?: string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
};

type CouponRequest = {
  minRankId?: number | null;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  applyFor: string;
  usageLimit?: number | null;
  usedCount?: number | null;
  startDate: string;
  endDate: string;
  status?: string | null;
};

const allProductsLabel = "Tất cả sản phẩm";
const allCustomerTarget = "ALL";
const allCustomerTargetLabel = "Tất cả đối tượng";

const vouchersSeed: Voucher[] = [];
const generateVoucherId = () => `VC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const statusConfig: Record<VoucherStatus, { label: string; class: string }> = {
  active: { label: "Đang chạy", class: "bg-green-100 text-green-700" },
  ended: { label: "Hết hạn", class: "bg-gray-100 text-gray-500" },
  expiring: { label: "Sắp hết hạn", class: "bg-red-100 text-red-600" },
  hidden: { label: "Đã ẩn", class: "bg-slate-100 text-slate-600" },
};

const groupLabel: Record<TargetGroup, string> = {
  Product: "Sản phẩm",
  Combo: "Combo",
  Seasonal: "Sản phẩm theo mùa",
};

const applyToLabel: Record<ApplyTo, string> = {
  Order: "Đơn hàng",
  Product: "Sản phẩm",
};

const createEmptyVoucher = (nextIndex: number): Voucher => ({
  id: generateVoucherId(),
  name: "",
  type: "percent",
  value: 0,
  minOrder: 0,
  used: 0,
  from: "",
  to: "",
  status: "active",
  applyTo: "Order",
  targetGroup: "Product",
  product: allProductsLabel,
  customerTarget: allCustomerTarget,
  dripsPoints: 0,
  note: "",
});

const formatDateTime = (value: string) => value ? value.replace("T", " ") : "Chưa đặt";
const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const formatDiscount = (voucher: Pick<Voucher, "type" | "value">) => voucher.type === "percent" ? `${voucher.value}%` : formatMoney(voucher.value);

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const activeStatus = (status: unknown) => String(status || "active").toLowerCase() !== "inactive";
const productTypeOf = (dto: ProductDto) => String((dto as any).productType ?? "regular").toLowerCase();

const toProductOption = (dto: ProductDto): ApplyOption => ({
  value: String(dto.productId),
  label: dto.productName || `Product #${dto.productId}`,
});

const toComboOption = (dto: ComboDto): ApplyOption => ({
  value: String(dto.comboId),
  label: dto.comboName || `Combo #${dto.comboId}`,
});

const productListForGroup = (group: TargetGroup, lookup: Record<TargetGroup, ApplyOption[]>) => {
  return lookup[group] ?? [];
};

const optionLabel = (group: TargetGroup, value: string, lookup: Record<TargetGroup, ApplyOption[]>) => {
  if (!value || value === allProductsLabel) return allProductsLabel;
  return lookup[group]?.find(option => option.value === value)?.label || value;
};

const couponStatus = (dto: CouponDto): VoucherStatus => {
  const status = String(dto.status || "active").toLowerCase();
  if (status === "inactive" || status === "hidden") return "hidden";
  const end = dto.endDate ? new Date(dto.endDate) : null;
  if (end && end.getTime() < Date.now()) return "ended";
  if (end && end.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000) return "expiring";
  return "active";
};

const toVoucher = (dto: CouponDto): Voucher => ({
  couponId: dto.couponId,
  id: dto.code || `CP-${dto.couponId}`,
  name: dto.description || dto.code || `Coupon #${dto.couponId}`,
  type: String(dto.discountType || "percent").toLowerCase().includes("percent") ? "percent" : "fixed",
  value: Number(dto.discountValue || 0),
  minOrder: Number(dto.minOrderValue || 0),
  used: Number(dto.usedCount || 0),
  from: dto.startDate || "",
  to: dto.endDate || "",
  status: couponStatus(dto),
  applyTo: String(dto.applyFor || "Order").toLowerCase().includes("product") ? "Product" : "Order",
  targetGroup: "Product",
  product: allProductsLabel,
  customerTarget: dto.minRankId ? String(dto.minRankId) : allCustomerTarget,
  dripsPoints: 0,
  note: "",
});

const toCouponRequest = (voucher: Voucher): CouponRequest => ({
  minRankId: voucher.customerTarget === allCustomerTarget ? null : Number(voucher.customerTarget),
  code: voucher.id.trim(),
  description: voucher.name.trim(),
  discountType: voucher.type === "percent" ? "percent" : "fixed",
  discountValue: Math.max(0, Math.round(voucher.value)),
  maxDiscount: null,
  minOrderValue: Math.max(0, Math.round(voucher.minOrder)),
  applyFor: voucher.applyTo,
  usageLimit: null,
  usedCount: voucher.used,
  startDate: (voucher.from || "").split("T")[0],
  endDate: (voucher.to || "").split("T")[0],
  status: voucher.status === "hidden" || voucher.status === "ended" ? "inactive" : "active",
});

export function Vouchers() {
  const [items, setItems] = useState<Voucher[]>(vouchersSeed);
  const [membershipRanks, setMembershipRanks] = useState<LookupOptionDto[]>([]);
  const [productLookup, setProductLookup] = useState<Record<TargetGroup, ApplyOption[]>>({
    Product: [],
    Combo: [],
    Seasonal: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Voucher | null>(null);
  const [hiding, setHiding] = useState<Voucher | null>(null);
  const [deleting, setDeleting] = useState<Voucher | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const customerTargetOptions = useMemo<Array<[string, string]>>(() => [
    [allCustomerTarget, allCustomerTargetLabel],
    ...membershipRanks.map(rank => [String(rank.id), rank.name] as [string, string]),
  ], [membershipRanks]);

  const loadVouchers = async () => {
    try {
      const data = await api.get<PageResponse<CouponDto> | CouponDto[]>("/admin/promotions/coupons?size=500&sort=couponId,desc");
      setItems(pageItems(data).map(toVoucher));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai voucher");
    }
  };

  useEffect(() => {
    const loadFormLookups = async () => {
      try {
        const [productsData, combosData, seasonalData, ranksData] = await Promise.all([
          api.get<PageResponse<ProductDto> | ProductDto[]>("/products?size=500&sort=productId,asc"),
          api.get<PageResponse<ComboDto> | ComboDto[]>("/products/combos?size=500&sort=comboId,asc"),
          api.get<SeasonalProductDto[]>("/products/seasonal-products"),
          api.get<LookupOptionDto[]>("/lookups/membership-ranks"),
        ]);
        const products = pageItems(productsData).filter(product => activeStatus(product.status));
        const seasonalIds = new Set(pageItems(seasonalData).map(item => Number(item.productId)));

        setProductLookup({
          Product: products.map(toProductOption),
          Combo: pageItems(combosData).filter(combo => activeStatus(combo.status)).map(toComboOption),
          Seasonal: products
            .filter(product => seasonalIds.has(Number(product.productId)) || productTypeOf(product) === "seasonal")
            .map(toProductOption),
        });
        setMembershipRanks((ranksData || []).filter(rank => activeStatus(rank.status)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Khong the tai du lieu ap dung voucher");
      }
    };
    void loadVouchers();
    void loadFormLookups();
  }, []);

  const appliedProductName = (voucher: Voucher) => (
    voucher.applyTo === "Order" ? allProductsLabel : optionLabel(voucher.targetGroup, voucher.product, productLookup)
  );

  const openAdd = () => {
    setForm(createEmptyVoucher(items.length + 1));
    setShowModal(true);
  };

  const openEdit = (voucher: Voucher) => {
    setForm({ ...voucher });
    setShowModal(true);
  };

  const saveVoucher = async () => {
    if (!form?.id.trim() || !form.name.trim()) {
      toast.error("Vui lòng nhập Id và tên chương trình.");
      return;
    }

    if (form.applyTo === "Product" && !form.product) {
      toast.error("Vui long chon san pham ap dung tu database.");
      return;
    }

    const request = toCouponRequest(form);
    if (!request.startDate || !request.endDate) {
      toast.error("Vui long chon ngay bat dau va ngay ket thuc.");
      return;
    }

    try {
      if (form.couponId) await api.put<CouponDto>(`/admin/promotions/coupons/${form.couponId}`, request);
      else await api.post<CouponDto>("/admin/promotions/coupons", request);
      await loadVouchers();
      setShowModal(false);
      setForm(null);
      toast.success(form.couponId ? "Da cap nhat ma giam gia" : "Da tao ma giam gia");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the luu voucher");
    }
    return;

    setItems(prev => {
      const exists = prev.some(item => item.id === form.id);
      if (!exists) return [form, ...prev];
      return prev.map(item => item.id === form.id ? form : item);
    });
    setShowModal(false);
    setForm(null);
    toast.success(items.some(item => item.id === form.id) ? "Đã cập nhật mã giảm giá!" : "Tạo mã giảm giá thành công!");
  };

  const hideVoucher = async () => {
    if (!hiding || !hideReason.trim()) return;

    if (!hiding.couponId) {
      setItems(prev => prev.map(item => item.id === hiding.id ? { ...item, status: "hidden", note: item.note || `An: ${hideReason.trim()}` } : item));
      setHiding(null);
      setHideReason("");
      toast.success("Da an ma giam gia");
      return;
    }

    try {
      await api.patch<CouponDto>(`/admin/promotions/coupons/${hiding.couponId}/inactive`);
      await loadVouchers();
      setHiding(null);
      setHideReason("");
      toast.success("Da an ma giam gia");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the an voucher");
    }
    return;

    setItems(prev => prev.map(item => item.id === hiding.id ? { ...item, status: "hidden", note: item.note || `Ẩn: ${hideReason.trim()}` } : item));
    setHiding(null);
    setHideReason("");
    toast.success("Đã ẩn mã giảm giá!");
  };

  const restoreVoucher = async (voucher: Voucher) => {
    if (!voucher.couponId) return;
    try {
      await api.patch<CouponDto>(`/admin/promotions/coupons/${voucher.couponId}/active`);
      await loadVouchers();
      toast.success("Da mo lai ma giam gia");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the mo lai voucher");
    }
  };

  const deleteVoucher = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);
    if (!target.couponId) {
      setItems(prev => prev.filter(item => item.id !== target.id));
      setDeleting(null);
      setDeleteBusy(false);
      toast.success("Da xoa ma giam gia");
      return;
    }
    try {
      await api.del<void>(`/admin/promotions/coupons/${target.couponId}`);
      await loadVouchers();
      setItems(prev => prev.filter(item => item.couponId !== target.couponId && item.id !== target.id));
      setDeleting(null);
      toast.success("Da xoa ma giam gia");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa voucher");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Quản lý mã giảm giá</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Tạo và quản lý voucher cho khách hàng</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{fontSize: '13.5px'}}>
            <Copy size={15} /> Tạo hàng loạt
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{fontSize: '13.5px'}}>
            <Plus size={16} /> Tạo mã giảm giá
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Tag size={20} className="text-green-600" /></div>
          <div>
            <div style={{fontSize: '12px', color: '#6B7280'}}>Lượt dùng tháng này</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#111827'}}>{items.reduce((sum, voucher) => sum + voucher.used, 0)}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><TrendingDown size={20} className="text-red-500" /></div>
          <div>
            <div style={{fontSize: '12px', color: '#6B7280'}}>Tổng giá trị giảm</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#111827'}}>0 đ</div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Clock size={20} className="text-red-500" /></div>
          <div>
            <div style={{fontSize: '12px', color: '#9CA3AF'}}>Sắp hết hạn (7 ngày)</div>
            <div style={{fontSize: '20px', fontWeight: 700, color: '#EF4444'}}>{items.filter(voucher => voucher.status === "expiring").length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Id</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Chương trình</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Loại / Giá trị</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Áp dụng</th>
              <th className="px-4 py-3 text-center" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Đã dùng</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Thời hạn</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Trạng thái</th>
              <th className="px-4 py-3 text-left" style={{fontSize: '12px', color: '#6B7280', fontWeight: 500}}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map(v => {
              const st = statusConfig[v.status];
              return (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.status === "ended" || v.status === "hidden" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="px-2.5 py-1 bg-[#0F4761]/10 text-[#0F4761] rounded-lg" style={{fontSize: '13px', fontWeight: 700}}>{v.id}</code>
                      <button onClick={() => { navigator.clipboard.writeText(v.id); toast.success("Đã copy!"); }}><Copy size={12} className="text-gray-400" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{fontSize: '13.5px', color: '#374151', fontWeight: 500}}>{v.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${v.type === "percent" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {v.type === "percent" ? `Giảm ${v.value}%` : `Giảm ${(v.value / 1000).toFixed(0)}K đ`}
                    </span>
                    <div style={{fontSize: '11.5px', color: '#9CA3AF', marginTop: '2px'}}>{v.minOrder > 0 ? `Đơn tối thiểu: ${(v.minOrder / 1000).toFixed(0)}K` : "Không yêu cầu đơn tối thiểu"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div style={{fontSize: '12.5px', color: '#374151', fontWeight: 600}}>{applyToLabel[v.applyTo]}</div>
                    <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>{v.applyTo === "Order" ? allProductsLabel : `${groupLabel[v.targetGroup]} · ${appliedProductName(v)}`}</div>
                    {v.dripsPoints > 0 && <div style={{fontSize: '11.5px', color: '#0F4761'}}>Đổi {v.dripsPoints} Drips</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div style={{fontSize: '13px', fontWeight: 600, color: '#374151'}}>{v.used}</div>
                  </td>
                  <td className="px-4 py-3" style={{fontSize: '12.5px', color: '#6B7280'}}>
                    {formatDateTime(v.from)} → {formatDateTime(v.to)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${st.class}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Sửa"><Edit size={15} /></button>
                      {v.status === "hidden" ? (
                        <button onClick={() => void restoreVoucher(v)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Mo lai"><Eye size={15} /></button>
                      ) : (
                        <button onClick={() => { setHiding(v); setHideReason(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Ẩn"><EyeOff size={15} /></button>
                      )}
                      <button onClick={() => setDeleting(v)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Xoa"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && form && (
        <VoucherFormModal
          form={form}
          isEdit={items.some(item => item.id === form.id)}
          onChange={setForm}
          onClose={() => { setShowModal(false); setForm(null); }}
          onSave={saveVoucher}
          customerTargetOptions={customerTargetOptions}
          productLookup={productLookup}
        />
      )}

      {hiding && (
        <VoucherHideModal
          voucher={hiding}
          reason={hideReason}
          onReasonChange={setHideReason}
          onClose={() => setHiding(null)}
          onConfirm={hideVoucher}
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          title="Xoa ma giam gia?"
          description={<>Ma <strong style={{ color: "#111827" }}>{deleting.id}</strong> se bi xoa khoi danh sach.</>}
          busy={deleteBusy}
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteVoucher()}
        />
      )}
    </div>
  );
}

function VoucherFormModal({
  form,
  isEdit,
  onChange,
  onClose,
  onSave,
  customerTargetOptions,
  productLookup,
}: {
  form: Voucher;
  isEdit: boolean;
  onChange: (voucher: Voucher) => void;
  onClose: () => void;
  onSave: () => void;
  customerTargetOptions: Array<[string, string]>;
  productLookup: Record<TargetGroup, ApplyOption[]>;
}) {
  const options = productListForGroup(form.targetGroup, productLookup);
  const currentProductLabel = optionLabel(form.targetGroup, form.product, productLookup);
  const targetSummary = form.applyTo === "Order" ? allProductsLabel : `${groupLabel[form.targetGroup]} · ${currentProductLabel}`;
  const customerTargetLabel = customerTargetOptions.find(([value]) => value === form.customerTarget)?.[1] || allCustomerTargetLabel;

  const setApplyTo = (applyTo: ApplyTo) => {
    onChange({
      ...form,
      applyTo,
      product: applyTo === "Order" ? allProductsLabel : "",
    });
  };

  const setTargetGroup = (targetGroup: TargetGroup) => {
    onChange({ ...form, targetGroup, product: "" });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 style={{fontSize: '18px', fontWeight: 700, color: '#0F4761'}}>{isEdit ? "Sửa mã giảm giá" : "Tạo mã giảm giá"}</h2>
            <p style={{fontSize: '12.5px', color: '#9CA3AF', marginTop: '2px'}}>{form.id || "Chưa có mã"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-4">
            <section className="border border-gray-100 rounded-xl p-4">
              <SectionTitle>Thông tin mã</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FormLabel>Id tự sinh</FormLabel>
                  <input value={form.id} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-500" style={{fontSize: '13px', fontFamily: 'monospace'}} />
                </div>
                <div>
                  <FormLabel>Tên chương trình *</FormLabel>
                  <input value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} placeholder="VD: Ưu đãi thành viên mới" />
                </div>
              </div>
            </section>

            <section className="border border-gray-100 rounded-xl p-4">
              <SectionTitle>Cấu hình giảm giá</SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["percent", "Phần trăm"],
                    ["fixed", "Số tiền cố định"],
                  ] as const).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => onChange({ ...form, type })}
                      className={`py-2.5 rounded-lg border transition-all ${form.type === type ? "border-[#0F4761] bg-[#0F4761]/5 text-[#0F4761]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                      style={{fontSize: '13.5px', fontWeight: 600}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel>Giá trị giảm *</FormLabel>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#0F4761]">
                      <input type="number" value={form.value} onChange={e => onChange({ ...form, value: Number(e.target.value) || 0 })} className="flex-1 px-3 py-2 outline-none" style={{fontSize: '13px'}} />
                      <span className="px-3 py-2 bg-gray-50 border-l border-gray-200" style={{fontSize: '13px', color: '#6B7280'}}>{form.type === "percent" ? "%" : "đ"}</span>
                    </div>
                  </div>
                  <div>
                    <FormLabel>Đơn tối thiểu</FormLabel>
                    <input type="number" value={form.minOrder} onChange={e => onChange({ ...form, minOrder: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} />
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-gray-100 rounded-xl p-4">
              <SectionTitle>Phạm vi áp dụng</SectionTitle>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["Order", "Product"] as ApplyTo[]).map(target => (
                    <button
                      key={target}
                      onClick={() => setApplyTo(target)}
                      className={`py-2.5 rounded-lg border transition-all ${form.applyTo === target ? "border-[#0F4761] bg-[#0F4761]/5 text-[#0F4761]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                      style={{fontSize: '13.5px', fontWeight: 600}}
                    >
                      {applyToLabel[target]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel>Nhóm áp dụng</FormLabel>
                    <select disabled={form.applyTo === "Order"} value={form.targetGroup} onChange={e => setTargetGroup(e.target.value as TargetGroup)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:border-[#0F4761]" style={{fontSize: '13px'}}>
                      <option value="Product">Sản phẩm</option>
                      <option value="Combo">Combo</option>
                      <option value="Seasonal">Sản phẩm theo mùa</option>
                    </select>
                  </div>
                  <div>
                    <FormLabel>Sản phẩm áp dụng</FormLabel>
                    {form.applyTo === "Order" ? (
                      <input value={allProductsLabel} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-500" style={{fontSize: '13px'}} />
                    ) : (
                      <select value={form.product} onChange={e => onChange({ ...form, product: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]" style={{fontSize: '13px'}}>
                        <option value="">{options.length === 0 ? "Chua co du lieu trong database" : "Chon san pham"}</option>
                        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <FormLabel>Đối tượng áp dụng</FormLabel>
                  <select value={form.customerTarget} onChange={e => onChange({ ...form, customerTarget: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]" style={{fontSize: '13px'}}>
                    {customerTargetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="border border-gray-100 rounded-xl p-4">
              <SectionTitle>Thời hạn & trạng thái</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FormLabel>Ngày bắt đầu</FormLabel>
                  <input type="datetime-local" value={form.from} onChange={e => onChange({ ...form, from: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} />
                </div>
                <div>
                  <FormLabel>Ngày kết thúc</FormLabel>
                  <input type="datetime-local" value={form.to} onChange={e => onChange({ ...form, to: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} />
                </div>
                <div>
                  <FormLabel>Số điểm Drips cần đổi</FormLabel>
                  <input type="number" value={form.dripsPoints} onChange={e => onChange({ ...form, dripsPoints: Number(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} />
                </div>
                <div>
                  <FormLabel>Trạng thái</FormLabel>
                  <select value={form.status} onChange={e => onChange({ ...form, status: e.target.value as VoucherStatus })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]" style={{fontSize: '13px'}}>
                    <option value="active">Đang chạy</option>
                    <option value="expiring">Sắp hết hạn</option>
                    <option value="ended">Hết hạn</option>
                    <option value="hidden">Đã ẩn</option>
                  </select>
                </div>
                <div>
                  <FormLabel>Ghi chú</FormLabel>
                  <input value={form.note} onChange={e => onChange({ ...form, note: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: '13px'}} placeholder="Ghi chú nội bộ..." />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <div style={{fontSize: '12px', color: '#6B7280', marginBottom: '10px'}}>Tóm tắt</div>
              <div className="space-y-3">
                <div>
                  <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>Mã</div>
                  <code className="inline-block mt-1 px-2.5 py-1 bg-[#0F4761]/10 text-[#0F4761] rounded-lg" style={{fontSize: '13px', fontWeight: 700}}>{form.id || "VC-0000"}</code>
                </div>
                <div>
                  <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>Chương trình</div>
                  <div style={{fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px'}}>{form.name || "Chưa đặt tên"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <div style={{fontSize: '11px', color: '#9CA3AF'}}>Giảm</div>
                    <div style={{fontSize: '16px', fontWeight: 700, color: '#0F4761'}}>{formatDiscount(form)}</div>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <div style={{fontSize: '11px', color: '#9CA3AF'}}>Tối thiểu</div>
                    <div style={{fontSize: '16px', fontWeight: 700, color: '#374151'}}>{form.minOrder > 0 ? `${(form.minOrder / 1000).toFixed(0)}K` : "0"}</div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>Áp dụng</div>
                  <div style={{fontSize: '13px', color: '#374151', marginTop: '2px'}}>{targetSummary}</div>
                </div>
                <div>
                  <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>Khách hàng</div>
                  <div style={{fontSize: '13px', color: '#374151', marginTop: '2px'}}>{customerTargetLabel}</div>
                </div>
                <div>
                  <div style={{fontSize: '11.5px', color: '#9CA3AF'}}>Thời hạn</div>
                  <div style={{fontSize: '12.5px', color: '#6B7280', marginTop: '2px'}}>{formatDateTime(form.from)} → {formatDateTime(form.to)}</div>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs ${statusConfig[form.status].class}`}>{statusConfig[form.status].label}</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
          <button onClick={onSave} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg" style={{fontSize: '13.5px'}}>{isEdit ? "Lưu thay đổi" : "Tạo mã"}</button>
        </div>
      </div>
    </div>
  );
}

function VoucherHideModal({
  voucher,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  voucher: Voucher;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <EyeOff size={20} className="text-gray-500" />
          </div>
          <h2 style={{fontSize: '17px', fontWeight: 700, color: '#111827'}}>Ẩn mã giảm giá?</h2>
          <p style={{fontSize: '13.5px', color: '#6B7280', marginTop: '6px'}}>
            Mã <strong style={{color: '#111827'}}>{voucher.id}</strong> sẽ chuyển sang trạng thái đã ẩn.
          </p>
          <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 500, display: 'block', marginTop: '16px'}}>Lý do ẩn *</label>
          <textarea
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] resize-none"
            style={{fontSize: '13.5px'}}
            placeholder="Nhập lý do ẩn mã giảm giá..."
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
          <button onClick={onConfirm} disabled={!reason.trim()} className="px-5 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50" style={{fontSize: '13.5px'}}>Ẩn</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px'}}>{children}</div>;
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return <label style={{fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px'}}>{children}</label>;
}
