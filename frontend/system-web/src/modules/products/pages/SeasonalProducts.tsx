import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Calendar, CheckCircle, Clock, Plus, RefreshCw, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import type { PageResponse, ProductDto, SeasonDto, SeasonalProductDto, SeasonRequestDto } from "../../../lib/types";

type CampaignStatus = "running" | "upcoming" | "ended";

type ProductOption = {
  id: number;
  name: string;
};

type SeasonOption = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

type Campaign = SeasonOption & {
  products: ProductOption[];
  campaignStatus: CampaignStatus;
};

type SeasonForm = {
  seasonName: string;
  startDate: string;
  endDate: string;
  productIds: string[];
};

const statusConfig: Record<CampaignStatus, { label: string; icon: ReactNode; color: string; bg: string; bar: string }> = {
  running: { label: "Đang chạy", icon: <CheckCircle size={13} />, color: "text-green-700", bg: "bg-green-100", bar: "bg-green-400" },
  upcoming: { label: "Sắp diễn ra", icon: <Clock size={13} />, color: "text-blue-700", bg: "bg-blue-100", bar: "bg-blue-400" },
  ended: { label: "Đã kết thúc", icon: <XCircle size={13} />, color: "text-gray-500", bg: "bg-gray-100", bar: "bg-gray-400" },
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const todayValue = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const addDays = (dateValue: string, days: number) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const toSeasonOption = (dto: SeasonDto): SeasonOption => ({
  id: Number(dto.seasonId),
  name: dto.seasonName || `Mùa #${dto.seasonId}`,
  startDate: dto.startDate,
  endDate: dto.endDate,
  status: dto.status || "active",
});

const toProductOption = (dto: ProductDto): ProductOption => ({
  id: Number(dto.productId),
  name: dto.productName || `Sản phẩm #${dto.productId}`,
});

const getCampaignStatus = (season: SeasonOption): CampaignStatus => {
  const today = new Date(`${todayValue()}T00:00:00`).getTime();
  const start = new Date(`${season.startDate}T00:00:00`).getTime();
  const end = new Date(`${season.endDate}T23:59:59`).getTime();
  if (today < start) return "upcoming";
  if (today > end) return "ended";
  return "running";
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
};

export function SeasonalProducts() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [seasonalProducts, setSeasonalProducts] = useState<ProductOption[]>([]);
  const [links, setLinks] = useState<SeasonalProductDto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SeasonForm>({
    seasonName: "",
    startDate: todayValue(),
    endDate: addDays(todayValue(), 30),
    productIds: [""],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [seasonData, productData, linkData] = await Promise.all([
        api.get<PageResponse<SeasonDto> | SeasonDto[]>("/products/seasons?size=200&sort=seasonId,desc"),
        api.get<PageResponse<ProductDto> | ProductDto[]>("/products?size=500&sort=productId,desc"),
        api.get<SeasonalProductDto[]>("/products/seasonal-products"),
      ]);

      setSeasons(pageItems(seasonData).map(toSeasonOption).filter(item => item.id && item.name));
      setSeasonalProducts(
        pageItems(productData)
          .filter(product => String(product.status || "active") === "active")
          .map(toProductOption)
          .filter(item => item.id && item.name),
      );
      setLinks(pageItems(linkData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải sản phẩm mùa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const campaigns = useMemo<Campaign[]>(() => {
    return seasons
      .map(season => ({
        ...season,
        campaignStatus: getCampaignStatus(season),
        products: links
          .filter(link => Number(link.seasonId) === season.id)
          .map(link => seasonalProducts.find(product => product.id === Number(link.productId)))
          .filter((product): product is ProductOption => Boolean(product)),
      }))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [links, seasonalProducts, seasons]);

  const openModal = () => {
    const startDate = todayValue();
    setForm({
      seasonName: "",
      startDate,
      endDate: addDays(startDate, 30),
      productIds: [""],
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const updateForm = <K extends keyof SeasonForm>(field: K, value: SeasonForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addCampaignProduct = () => {
    setForm(prev => ({ ...prev, productIds: [...prev.productIds, ""] }));
  };

  const updateCampaignProduct = (index: number, value: string) => {
    setForm(prev => ({ ...prev, productIds: prev.productIds.map((product, i) => i === index ? value : product) }));
  };

  const removeCampaignProduct = (index: number) => {
    setForm(prev => ({ ...prev, productIds: prev.productIds.length === 1 ? prev.productIds : prev.productIds.filter((_, i) => i !== index) }));
  };

  const selectableProducts = (currentValue: string) => {
    const selected = new Set(form.productIds.filter(id => id && id !== currentValue));
    return seasonalProducts.filter(product => !selected.has(String(product.id)));
  };

  const getTimelineBarStyle = (from: string, to: string) => {
    const dates = campaigns.flatMap(campaign => [campaign.startDate, campaign.endDate]).map(value => new Date(value).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const total = Math.max(1, maxDate - minDate);
    const start = (new Date(from).getTime() - minDate) / total * 100;
    const width = Math.max(2, (new Date(to).getTime() - new Date(from).getTime()) / total * 100);
    return { left: `${start}%`, width: `${width}%` };
  };

  const handleCreateSeason = async () => {
    if (!form.seasonName.trim()) {
      toast.error("Tên mùa là bắt buộc");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Ngay bat dau va ngay ket thuc la bat buoc");
      return;
    }
    if (new Date(form.startDate).getTime() > new Date(form.endDate).getTime()) {
      toast.error("Ngay bat dau phai truoc ngay ket thuc");
      return;
    }

    const productIds = [...new Set(form.productIds.filter(Boolean).map(Number))];
    setSaving(true);
    try {
      const request: SeasonRequestDto = {
        seasonName: form.seasonName.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        status: "active",
      };
      const created = await api.post<SeasonDto>("/products/seasons", request);
      const seasonId = Number(created.seasonId);
      await Promise.all(productIds.map(productId => api.post<void>(`/products/seasons/${seasonId}/products/${productId}`)));

      toast.success("Đã tạo mùa sản phẩm");
      closeModal();
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo mùa sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Sản phẩm mùa vụ</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
            {seasonalProducts.length} sản phẩm mùa có thể chọn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadData()} className="p-2.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: "13.5px" }}>
            <Plus size={16} /> Thêm mùa
          </button>
        </div>
      </div>

      {loading && <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-gray-500">Đang tải sản phẩm mùa...</div>}

      {!loading && error && (
        <div className="bg-red-50 rounded-lg border border-red-100 p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => void loadData()} className="px-3 py-1.5 rounded-lg bg-white border border-red-100">Thử lại</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>
              <Calendar size={15} className="inline mr-2 text-[#0F4761]" />
              Timeline mùa vụ
            </h3>
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg" style={{ fontSize: "13px" }}>Chưa có mùa sản phẩm trong database.</div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(campaign => {
                  const st = statusConfig[campaign.campaignStatus];
                  const bar = getTimelineBarStyle(campaign.startDate, campaign.endDate);
                  return (
                    <div key={campaign.id} className="flex items-center gap-4">
                      <div className="w-40 text-right truncate" style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>{campaign.name}</div>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg relative overflow-hidden">
                        <div className={`absolute h-full rounded-lg flex items-center px-3 ${st.bar}`} style={bar}>
                          <span style={{ fontSize: "11px", color: "white", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center text-gray-500">Chưa có đợt mùa vụ.</div>
            ) : (
              campaigns.map(campaign => {
                const st = statusConfig[campaign.campaignStatus];
                return (
                  <div key={campaign.id} className={`bg-white rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow ${campaign.campaignStatus === "ended" ? "opacity-70 border-gray-100" : "border-gray-100"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>{campaign.name}</h3>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" style={{ fontSize: "12.5px", color: "#9CA3AF" }}>
                          <Calendar size={13} />
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {campaign.products.length === 0 ? (
                            <span className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full" style={{ fontSize: "12px" }}>Chưa chọn sản phẩm</span>
                          ) : (
                            campaign.products.map(product => (
                              <span key={product.id} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full" style={{ fontSize: "12px" }}>{product.name}</span>
                            ))
                          )}
                        </div>
                      </div>
                      <span className="text-gray-400" style={{ fontSize: "12px" }}>#{campaign.id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>Thêm mùa sản phẩm</h2>
                <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: 2 }}>{seasonalProducts.length} sản phẩm mùa có thể chọn</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <FieldLabel>Tên mùa *</FieldLabel>
                <input value={form.seasonName} onChange={event => updateForm("seasonName", event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Ngay bat dau</FieldLabel>
                  <input type="date" value={form.startDate} onChange={event => updateForm("startDate", event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
                </div>
                <div>
                  <FieldLabel>Ngay ket thuc</FieldLabel>
                  <input type="date" value={form.endDate} onChange={event => updateForm("endDate", event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
                </div>
              </div>

              <div>
                <FieldLabel>Sản phẩm tham gia</FieldLabel>
                <div className="space-y-2">
                  {form.productIds.map((productId, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={productId}
                        onChange={event => updateCampaignProduct(index, event.target.value)}
                        disabled={seasonalProducts.length === 0}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        style={{ fontSize: "13px" }}
                      >
                        <option value="">{seasonalProducts.length === 0 ? "Chưa có sản phẩm mùa" : "Chọn sản phẩm..."}</option>
                        {selectableProducts(productId).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </select>
                      <button
                        onClick={() => removeCampaignProduct(index)}
                        disabled={form.productIds.length === 1}
                        className={`p-2 rounded-lg border ${form.productIds.length === 1 ? "border-gray-100 text-gray-300" : "border-red-100 text-red-400 hover:bg-red-50"}`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addCampaignProduct}
                  disabled={seasonalProducts.length === 0 || form.productIds.length >= seasonalProducts.length}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#0F4761] text-[#0F4761] rounded-lg hover:bg-blue-50 disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white"
                  style={{ fontSize: "13px" }}
                >
                  <Plus size={14} /> Thêm sản phẩm
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Huy</button>
              <button disabled={saving} onClick={() => void handleCreateSeason()} className="flex-1 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{ fontSize: "13.5px" }}>
                {saving ? "Đang lưu..." : "Lưu mùa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>{children}</label>;
}
