import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Edit, Eye, EyeOff, Plus, Search, Tag, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import type {
  ComboDetailDto,
  ComboDetailRequestDto,
  ComboDto,
  ComboRequestDto,
  FileUploadDto,
  PageResponse,
  ProductDto,
  ProductSizeDto,
} from "../../../lib/types";

type ComboStatus = "active" | "inactive";
type ComboFormMode = "create" | "edit";

interface ProductOption {
  id: number;
  name: string;
  price: number | null;
  status: string;
}

interface ComboItemRow {
  productId: number;
  productName: string;
  quantity: number;
  price: number | null;
}

interface ComboRow {
  id: number;
  name: string;
  description: string;
  category: string;
  imgUrl: string;
  price: number;
  startDate: string;
  endDate: string;
  status: ComboStatus;
  items: ComboItemRow[];
  originalPrice: number;
}

interface ComboForm {
  comboName: string;
  category: string;
  imgUrl: string;
  description: string;
  price: string;
  startDate: string;
  endDate: string;
  status: ComboStatus;
  items: Array<{ productId: string; quantity: string }>;
}

const emptyForm: ComboForm = {
  comboName: "",
  category: "Combo",
  imgUrl: "",
  description: "",
  price: "",
  startDate: "",
  endDate: "",
  status: "active",
  items: [],
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const moneyValue = (value: string) => Number(value || 0);
const todayIso = () => new Date().toISOString().slice(0, 10);
const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";

function productPriceFromSizes(dto: ProductDto, sizes: ProductSizeDto[]) {
  const basePrice = dto.basePrice == null ? 0 : Number(dto.basePrice);
  const productSizes = sizes.filter(size => Number(size.productId) === Number(dto.productId) && size.status !== "inactive");
  if (productSizes.length > 0) {
    return Math.min(...productSizes.map(size => basePrice + Number(size.extraPrice ?? 0)));
  }
  return dto.basePrice == null ? null : Number(dto.basePrice);
}

function toProductOption(dto: ProductDto, sizes: ProductSizeDto[]): ProductOption {
  return {
    id: Number(dto.productId),
    name: dto.productName || `Product #${dto.productId}`,
    price: productPriceFromSizes(dto, sizes),
    status: String(dto.status || "active"),
  };
}

function toComboRow(dto: ComboDto, details: ComboDetailDto[], productsById: Map<number, ProductOption>): ComboRow {
  const items = details
    .filter(detail => Number(detail.comboId) === Number(dto.comboId))
    .map(detail => {
      const product = productsById.get(Number(detail.productId));
      return {
        productId: Number(detail.productId),
        productName: product?.name || `Product #${detail.productId}`,
        quantity: Number(detail.quantity || 0),
        price: product?.price ?? null,
      };
    });
  const originalPrice = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);

  return {
    id: Number(dto.comboId),
    name: dto.comboName || `Combo #${dto.comboId}`,
    description: dto.description || "",
    category: dto.category || "Combo",
    imgUrl: dto.imgUrl || "",
    price: Number(dto.price || 0),
    startDate: dto.startDate || "",
    endDate: dto.endDate || "",
    status: dto.status === "active" ? "active" : "inactive",
    items,
    originalPrice,
  };
}

function toRequest(form: ComboForm): ComboRequestDto {
  return {
    comboName: form.comboName.trim(),
    description: form.description.trim() || null,
    category: form.category.trim() || null,
    imgUrl: form.imgUrl.trim() || null,
    price: Math.round(moneyValue(form.price)),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    status: form.status,
  };
}

function formatMoney(value: number | null) {
  if (value == null) return "Theo size";
  return `${value.toLocaleString("vi-VN")}d`;
}

function formatDate(value: string) {
  if (!value) return "Chưa đặt";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN");
}

export function Combos() {
  const [combos, setCombos] = useState<ComboRow[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [formMode, setFormMode] = useState<ComboFormMode | null>(null);
  const [editingCombo, setEditingCombo] = useState<ComboRow | null>(null);
  const [form, setForm] = useState<ComboForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [deletingCombo, setDeletingCombo] = useState<ComboRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productsById = useMemo(() => new Map(productOptions.map(product => [product.id, product])), [productOptions]);

  const formOriginalTotal = useMemo(() => (
    form.items.reduce((sum, item) => {
      const product = productsById.get(Number(item.productId));
      return sum + (product?.price ?? 0) * moneyValue(item.quantity);
    }, 0)
  ), [form.items, productsById]);
  const formSaving = formOriginalTotal - moneyValue(form.price);
  const formPct = formOriginalTotal > 0 ? Math.max(0, Math.round((formSaving / formOriginalTotal) * 100)) : 0;

  const loadCombos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [comboData, productData, detailData, sizeData] = await Promise.all([
        api.get<PageResponse<ComboDto> | ComboDto[]>("/products/combos?size=500&sort=comboId,desc"),
        api.get<PageResponse<ProductDto> | ProductDto[]>("/products?size=500&sort=productId,asc"),
        api.get<ComboDetailDto[]>("/products/combos/details"),
        api.get<PageResponse<ProductSizeDto> | ProductSizeDto[]>("/admin/products/sizes?size=1000&sort=sizeId,asc"),
      ]);
      const sizes = pageItems(sizeData);
      const products = pageItems(productData)
        .map(product => toProductOption(product, sizes))
        .filter(product => product.id && product.name);
      const productMap = new Map(products.map(product => [product.id, product]));
      const details = pageItems(detailData);
      const comboRows = pageItems(comboData)
        .map(combo => toComboRow(combo, details, productMap))
        .filter(combo => combo.id && combo.name);

      setProductOptions(products);
      setCombos(comboRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu combo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCombos();
  }, []);

  const filteredCombos = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return combos;
    return combos.filter(combo => (
      [combo.name, combo.category, combo.description, ...combo.items.map(item => item.productName)]
        .some(value => value.toLowerCase().includes(keyword))
    ));
  }, [combos, search]);

  const updateForm = <K extends keyof ComboForm>(field: K, value: ComboForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateFormItem = (index: number, patch: Partial<{ productId: string; quantity: string }>) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const productOptionsForItem = (index: number) => {
    const selectedIds = new Set(
      form.items
        .filter((_, itemIndex) => itemIndex !== index)
        .map(item => item.productId)
        .filter(Boolean),
    );
    return productOptions.filter(product => !selectedIds.has(String(product.id)));
  };

  const addFormItem = () => {
    if (productOptions.length === 0) {
      toast.error("Chưa có sản phẩm trong database");
      return;
    }
    const selectedIds = new Set(form.items.map(item => item.productId).filter(Boolean));
    if (selectedIds.size >= productOptions.length) {
      toast.error("Đã chọn hết sản phẩm trong database");
      return;
    }
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: "1" }],
    }));
  };

  const removeFormItem = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const openCreateForm = () => {
    setEditingCombo(null);
    setForm({
      ...emptyForm,
      items: productOptions.length > 0 ? [{ productId: "", quantity: "1" }] : [],
    });
    setFormMode("create");
  };

  const openEditForm = (combo: ComboRow) => {
    setEditingCombo(combo);
    setForm({
      comboName: combo.name,
      category: combo.category,
      imgUrl: combo.imgUrl,
      description: combo.description,
      price: String(combo.price || ""),
      startDate: combo.startDate,
      endDate: combo.endDate,
      status: combo.status,
      items: combo.items.map(item => ({ productId: String(item.productId), quantity: String(item.quantity) })),
    });
    setFormMode("edit");
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingCombo(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.comboName.trim()) {
      toast.error("Tên combo là bắt buộc");
      return false;
    }
    if (moneyValue(form.price) <= 0) {
      toast.error("Giá combo phải lớn hơn 0");
      return false;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error("Ngay ket thuc phai sau ngay bat dau");
      return false;
    }
    if (form.items.length === 0) {
      toast.error("Cần chọn ít nhất 1 sản phẩm từ database");
      return false;
    }

    const ids = new Set<string>();
    for (const item of form.items) {
      if (!item.productId) {
        toast.error("Vui lòng chọn sản phẩm trong combo");
        return false;
      }
      if (!productsById.has(Number(item.productId))) {
        toast.error("Sản phẩm đã chọn không tồn tại trong database");
        return false;
      }
      if (moneyValue(item.quantity) <= 0) {
        toast.error("Số lượng sản phẩm phải lớn hơn 0");
        return false;
      }
      if (ids.has(item.productId)) {
        toast.error("Một sản phẩm chỉ được chọn một lần trong combo");
        return false;
      }
      ids.add(item.productId);
    }

    return true;
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploaded = await api.upload<FileUploadDto>("/upload/image", file);
      const imgUrl = uploadResultUrl(uploaded);
      if (!imgUrl) throw new Error("Upload không trả về URL ảnh");
      updateForm("imgUrl", imgUrl);
      toast.success("Đã tải ảnh combo lên");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải ảnh combo");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const syncComboDetails = async (comboId: number) => {
    const currentDetails = await api.get<ComboDetailDto[]>(`/products/combos/${comboId}/details`);
    const detailRequests: ComboDetailRequestDto[] = form.items.map(item => ({
      comboId,
      productId: Number(item.productId),
      quantity: Math.round(moneyValue(item.quantity)),
    }));
    const selectedIds = new Set(detailRequests.map(item => item.productId));
    const currentIds = new Set(currentDetails.map(item => Number(item.productId)));

    await Promise.all(
      currentDetails
        .filter(detail => !selectedIds.has(Number(detail.productId)))
        .map(detail => api.del<void>(`/products/combos/${comboId}/details/${detail.productId}`)),
    );
    await Promise.all(detailRequests.map(request => (
      currentIds.has(request.productId)
        ? api.put<ComboDetailDto>(`/products/combos/${comboId}/details/${request.productId}`, request)
        : api.post<ComboDetailDto>(`/products/combos/${comboId}/details`, request)
    )));
  };

  const handleSaveCombo = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const request = toRequest(form);
      const saved = formMode === "edit" && editingCombo
        ? await api.put<ComboDto>(`/products/combos/${editingCombo.id}`, request)
        : await api.post<ComboDto>("/products/combos", request);
      await syncComboDetails(Number(saved.comboId));
      toast.success(formMode === "edit" ? "Đã cập nhật combo" : "Đã tạo combo");
      closeForm();
      await loadCombos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu combo");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCombo = async () => {
    if (!deletingCombo) return;
    const target = deletingCombo;
    setDeleteBusy(true);
    try {
      await api.del<void>(`/products/combos/${target.id}`);
      toast.success("Đã xóa combo");
      await loadCombos();
      setCombos(prev => prev.filter(combo => combo.id !== target.id));
      setDeletingCombo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa combo");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleToggleCombo = async (combo: ComboRow) => {
    try {
      const action = combo.status === "active" ? "hide" : "show";
      await api.patch<ComboDto>(`/products/combos/${combo.id}/${action}`);
      toast.success(action === "hide" ? "Đã ẩn combo" : "Đã hiện combo");
      await loadCombos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật trạng thái combo");
    }
  };

  const renderForm = () => {
    if (!formMode) return null;
    const title = formMode === "edit" ? "Sửa combo" : "Tạo combo mới";
    const actionLabel = formMode === "edit" ? "Lưu thay đổi" : "Tạo combo";

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>{title}</h2>
            <button type="button" onClick={closeForm} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <FormSection title="Thong tin combo">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <FieldLabel>Tên combo *</FieldLabel>
                  <input
                    value={form.comboName}
                    onChange={event => updateForm("comboName", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                    style={{ fontSize: "13px" }}
                    placeholder="VD: Combo doi"
                  />
                </div>
                <div>
                  <FieldLabel>Loai</FieldLabel>
                  <select
                    value={form.category}
                    onChange={event => updateForm("category", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                    style={{ fontSize: "13px" }}
                  >
                    <option value="Combo">Combo</option>
                    <option value="Set meal">Set meal</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel>Mô tả</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={event => updateForm("description", event.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none"
                  rows={2}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </FormSection>

            <FormSection title="Hình ảnh combo">
              <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4">
                <div className="border border-dashed border-gray-200 rounded-lg p-3 text-center bg-gray-50">
                  {form.imgUrl ? (
                    <img src={form.imgUrl} alt={form.comboName || "Combo"} className="h-36 w-full rounded-lg object-cover bg-white" />
                  ) : (
                    <div className="h-36 flex items-center justify-center text-gray-400" style={{ fontSize: "13px" }}>
                      {uploadingImage ? "Đang tải ảnh..." : "Chưa có ảnh"}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer" style={{ fontSize: "13px" }}>
                    <Upload size={15} />
                    {uploadingImage ? "Đang tải..." : "Chọn ảnh combo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  <div>
                    <FieldLabel>URL anh</FieldLabel>
                    <input
                      value={form.imgUrl}
                      onChange={event => updateForm("imgUrl", event.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                      style={{ fontSize: "13px" }}
                      placeholder="https://res.cloudinary.com/..."
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Sản phẩm trong combo">
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_96px_36px] gap-2 p-2 bg-gray-50 rounded-lg">
                    <select
                      value={item.productId}
                      onChange={event => updateFormItem(index, { productId: event.target.value })}
                      disabled={productOptions.length === 0}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none disabled:bg-gray-100 disabled:text-gray-400"
                      style={{ fontSize: "12.5px" }}
                    >
                      <option value="">{productOptions.length === 0 ? "Chưa có sản phẩm trong database" : "Chọn sản phẩm"}</option>
                      {productOptionsForItem(index).map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatMoney(product.price)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={event => updateFormItem(index, { quantity: event.target.value })}
                      className="px-2 py-2 bg-white border border-gray-200 rounded-lg outline-none text-center"
                      style={{ fontSize: "12.5px" }}
                    />
                    <button type="button" onClick={() => removeFormItem(index)} className="p-2 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addFormItem}
                className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#0F4761] hover:text-[#0F4761]"
                style={{ fontSize: "13px" }}
              >
                + Thêm sản phẩm từ database
              </button>
            </FormSection>

            <FormSection title="Giá và thời gian">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Giá gốc từ sản phẩm</FieldLabel>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-700" style={{ fontSize: "13px", fontWeight: 600 }}>
                    {formatMoney(formOriginalTotal)}
                  </div>
                </div>
                <div>
                  <FieldLabel>Giá combo *</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={event => updateForm("price", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                    style={{ fontSize: "13px", fontWeight: 700 }}
                  />
                </div>
                <div>
                  <FieldLabel>Ngay bat dau</FieldLabel>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={event => updateForm("startDate", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                    style={{ fontSize: "13px" }}
                  />
                </div>
                <div>
                  <FieldLabel>Ngay ket thuc</FieldLabel>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={event => updateForm("endDate", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                    style={{ fontSize: "13px" }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 px-3 py-2">
                <span style={{ fontSize: "13px", color: "#047857", fontWeight: 600 }}>Tiết kiệm dự kiến</span>
                <span style={{ fontSize: "13px", color: "#047857", fontWeight: 700 }}>{formatMoney(Math.max(0, formSaving))} ({formPct}%)</span>
              </div>
              <div>
                <FieldLabel>Trạng thái</FieldLabel>
                <select
                  value={form.status}
                  onChange={event => updateForm("status", event.target.value as ComboStatus)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white"
                  style={{ fontSize: "13px" }}
                >
                  <option value="active">Đang bán</option>
                  <option value="inactive">Tạm ẩn</option>
                </select>
              </div>
            </FormSection>
          </div>

          <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>
              Huy
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCombo()}
              disabled={saving}
              className="px-5 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60"
              style={{ fontSize: "13.5px" }}
            >
              {saving ? "Đang lưu..." : actionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Combo & Set Meal</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {combos.length} combo, {productOptions.length} sản phẩm lấy từ database
          </p>
        </div>
        <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: "13.5px" }}>
          <Plus size={16} /> Tạo combo mới
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm combo hoặc sản phẩm..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
            style={{ fontSize: "13px" }}
          />
        </div>
        <button onClick={() => void loadCombos()} className="px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" style={{ fontSize: "13px" }}>
          Tải lại
        </button>
      </div>

      {loading && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-gray-500">Đang tải combo...</div>}
      {!loading && error && (
        <div className="bg-red-50 rounded-lg border border-red-100 p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => void loadCombos()} className="px-3 py-1.5 rounded-lg bg-white border border-red-100">Thử lại</button>
        </div>
      )}
      {!loading && !error && filteredCombos.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-gray-500">
          Chưa có combo trong database.
        </div>
      )}

      {!loading && !error && filteredCombos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCombos.map(combo => {
            const expired = combo.endDate ? combo.endDate < todayIso() : false;
            const discount = combo.originalPrice > 0 ? Math.max(0, Math.round((1 - combo.price / combo.originalPrice) * 100)) : 0;
            const productSummary = combo.items.length > 0
              ? combo.items.map(item => `${item.productName} x${item.quantity}`).join(" + ")
              : "Chưa có sản phẩm";
            const statusClass = combo.status === "active" && !expired ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";
            const statusLabel = combo.status === "active" && !expired ? "Đang bán" : expired ? "Hết hạn" : "Tạm ẩn";

            return (
              <div key={combo.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 h-32 flex items-center justify-center overflow-hidden">
                  {combo.imgUrl ? (
                    <img src={combo.imgUrl} alt={combo.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white border border-amber-100 flex items-center justify-center text-[#0F4761]">
                      <Tag size={24} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate" style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>{combo.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${combo.category === "Combo" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {combo.category}
                        </span>
                      </div>
                      <p className="line-clamp-2" style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>{productSummary}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {combo.originalPrice > 0 && (
                      <span style={{ fontSize: "12.5px", color: "#9CA3AF", textDecoration: "line-through" }}>{formatMoney(combo.originalPrice)}</span>
                    )}
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>{formatMoney(combo.price)}</span>
                    {discount > 0 && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full flex items-center gap-1" style={{ fontSize: "12px" }}>
                        <Tag size={11} /> -{discount}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3" style={{ fontSize: "12px", color: "#6B7280" }}>
                    <div>Bat dau: {formatDate(combo.startDate)}</div>
                    <div>Ket thuc: {formatDate(combo.endDate)}</div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => openEditForm(combo)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1" style={{ fontSize: "12.5px" }}>
                      <Edit size={13} /> Sửa
                    </button>
                    <button
                      onClick={() => void handleToggleCombo(combo)}
                      className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                      title={combo.status === "active" ? "Ẩn combo" : "Hiện combo"}
                    >
                      {combo.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => setDeletingCombo(combo)}
                      className="p-1.5 border border-red-200 rounded-lg text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renderForm()}
      {deletingCombo && (
        <DeleteConfirmModal
          title="Xóa combo?"
          description={<>Combo <strong style={{ color: "#111827" }}>{deletingCombo.name}</strong> sẽ bị xóa khỏi danh sách.</>}
          busy={deleteBusy}
          onClose={() => setDeletingCombo(null)}
          onConfirm={() => void handleDeleteCombo()}
        />
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>{children}</label>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F4761" }}>{title}</h3>
      {children}
    </section>
  );
}
