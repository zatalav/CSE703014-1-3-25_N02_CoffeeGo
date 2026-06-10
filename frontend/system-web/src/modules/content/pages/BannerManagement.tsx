import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Plus, Eye, Search, RotateCcw, Edit2, Trash2, Upload, Smartphone, Monitor, Tablet, GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "../../../shared/figma/ImageWithFallback";
import { api } from "../../../lib/api";
import type { FileUploadDto, PageResponse } from "../../../lib/types";

type BannerPosition = {
  id: number;
  name: string;
  active: number;
  total: number;
  status: "active" | "inactive";
  image: string;
};

type BannerItem = {
  bannerId?: number;
  id: number;
  title: string;
  subtitle: string;
  link: string;
  from: string;
  to: string;
  priority: number;
  status: keyof typeof statusConfig;
  thumb: string;
};

type BannerDto = {
  bannerId: number;
  title?: string | null;
  subtitle?: string | null;
  imgUrl?: string | null;
  linkUrl?: string | null;
  position?: number | null;
  status?: string | null;
  createdAt?: string | null;
};

type BannerForm = {
  bannerId?: number;
  title: string;
  subtitle: string;
  imgUrl: string;
  linkUrl: string;
  position: number;
  status: "active" | "inactive";
};

const positions: BannerPosition[] = [];
const initialBanners: BannerItem[] = [];

const emptyBannerForm = (): BannerForm => ({
  title: "",
  subtitle: "",
  imgUrl: "",
  linkUrl: "/",
  position: 1,
  status: "active",
});

const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";

const statusConfig: Record<string, { label: string; class: string }> = {
  visible: { label: "Hiển thị", class: "bg-green-100 text-green-700" },
  hidden: { label: "Ẩn", class: "bg-gray-100 text-gray-600" },
  expired: { label: "Hết hạn", class: "bg-red-100 text-red-600" },
  scheduled: { label: "Chờ hiển thị", class: "bg-amber-100 text-amber-700" },
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const toBannerItem = (dto: BannerDto): BannerItem => ({
  bannerId: dto.bannerId,
  id: dto.bannerId,
  title: dto.title || `Banner #${dto.bannerId}`,
  subtitle: dto.subtitle || "",
  link: dto.linkUrl || "/",
  from: (dto.createdAt || "").split("T")[0],
  to: "",
  priority: dto.position || 1,
  status: String(dto.status || "active").toLowerCase() === "inactive" ? "hidden" : "visible",
  thumb: dto.imgUrl || "",
});

export function BannerManagement() {
  const [view, setView] = useState<"grid" | "manage">("grid");
  const [activePosition, setActivePosition] = useState<BannerPosition | null>(positions[0] ?? null);
  const [banners, setBanners] = useState(initialBanners);
  const [selectedBanner, setSelectedBanner] = useState<BannerItem | null>(initialBanners[0] ?? null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [bannerForm, setBannerForm] = useState<BannerForm>(() => emptyBannerForm());
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  const currentPositions = useMemo<BannerPosition[]>(() => {
    if (positions.length) return positions;
    return [{
      id: 1,
      name: "Tat ca banner",
      active: banners.filter(banner => banner.status === "visible").length,
      total: banners.length,
      status: "active",
      image: banners[0]?.thumb || "",
    }];
  }, [banners]);

  const loadBanners = async () => {
    try {
      const data = await api.get<PageResponse<BannerDto> | BannerDto[]>("/admin/content/banners?size=100&sort=position,asc");
      const next = pageItems(data).map(toBannerItem);
      setBanners(next);
      setSelectedBanner(current => current ? next.find(item => item.id === current.id) ?? next[0] ?? null : next[0] ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai banner");
    }
  };

  useEffect(() => {
    void loadBanners();
  }, []);

  const openAddDrawer = () => {
    setBannerForm(emptyBannerForm());
    setShowDrawer(true);
  };

  const openEditDrawer = (banner: BannerItem) => {
    setBannerForm({
      bannerId: banner.bannerId,
      title: banner.title,
      subtitle: banner.subtitle,
      imgUrl: banner.thumb,
      linkUrl: banner.link || "/",
      position: banner.priority || 1,
      status: banner.status === "hidden" ? "inactive" : "active",
    });
    setShowDrawer(true);
  };

  const updateBannerForm = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) => {
    setBannerForm(prev => ({ ...prev, [key]: value }));
  };

  const handleBannerImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const uploaded = await api.upload<FileUploadDto>("/upload/image", file);
      const imgUrl = uploadResultUrl(uploaded);
      if (!imgUrl) throw new Error("Upload khong tra ve URL anh");
      updateBannerForm("imgUrl", imgUrl);
      toast.success("Da tai anh len Cloudinary");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai anh");
    } finally {
      setUploadingBanner(false);
      event.target.value = "";
    }
  };

  const saveBanner = async (status: "active" | "inactive" = bannerForm.status) => {
    const title = bannerForm.title.trim();
    const imgUrl = bannerForm.imgUrl.trim();
    if (!imgUrl) {
      toast.error("Vui long chon anh banner");
      return;
    }
    setSavingBanner(true);
    try {
      const payload = {
        title: title || "Banner",
        subtitle: bannerForm.subtitle.trim() || null,
        imgUrl,
        linkUrl: bannerForm.linkUrl.trim() || "/",
        position: Number.isFinite(bannerForm.position) && bannerForm.position > 0 ? bannerForm.position : 1,
        status,
        createdAt: null,
      };
      if (bannerForm.bannerId) {
        await api.put<BannerDto>(`/admin/content/banners/${bannerForm.bannerId}`, payload);
      } else {
        await api.post<BannerDto>("/admin/content/banners", payload);
      }
      await loadBanners();
      setShowDrawer(false);
      toast.success(status === "active" ? "Da xuat ban banner" : "Da luu nhap banner");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the luu banner");
    } finally {
      setSavingBanner(false);
    }
  };

  const toggleVisible = async (id: number) => {
    const banner = banners.find(item => item.id === id);
    if (!banner) return;
    try {
      if (banner.bannerId) {
        const action = banner.status === "visible" ? "inactive" : "active";
        await api.patch<BannerDto>(`/admin/content/banners/${banner.bannerId}/${action}`);
        await loadBanners();
      } else {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, status: b.status === "visible" ? "hidden" : "visible" } : b));
      }
      toast.success("Da cap nhat trang thai banner");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the cap nhat banner");
    }
    return;

    setBanners(prev => prev.map(b => b.id === id ? { ...b, status: b.status === "visible" ? "hidden" : "visible" } : b));
    toast.success("Đã cập nhật trạng thái");
  };

  const deleteBanner = async (id: number) => {
    const banner = banners.find(item => item.id === id);
    if (!banner) return;
    try {
      if (banner.bannerId) await api.del<void>(`/admin/content/banners/${banner.bannerId}`);
      setShowDelete(null);
      setSelectedBanner(current => current?.id === id ? null : current);
      await loadBanners();
      setBanners(prev => prev.filter(item => item.id !== id));
      toast.success("Da xoa banner");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa banner");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F4761' }}>Quản lý Ảnh & Banner</h1>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
            {view === "grid" ? "Quản lý các vị trí banner trong hệ thống" : `Đang quản lý: ${activePosition?.name ?? "Chưa có vị trí"}`}
          </p>
        </div>
        <div className="flex gap-2">
          {view === "manage" && (
            <button onClick={() => setView("grid")} className="px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{ fontSize: '13.5px' }}>
              ← Tất cả vị trí
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{ fontSize: '13.5px' }}>
            <Eye size={15} /> Xem trước giao diện khách
          </button>
          <button onClick={openAddDrawer} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: '13.5px' }}>
            <Plus size={16} /> Thêm ảnh mới
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Tìm theo tên ảnh, tiêu đề, đường dẫn..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
        </div>
        <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
          <option>Tất cả vị trí</option>
          {currentPositions.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
          <option>Tất cả trạng thái</option><option>Hiển thị</option><option>Ẩn</option><option>Hết hạn</option><option>Chờ hiển thị</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
          <option>Tất cả loại</option><option>Slideshow</option><option>Tĩnh</option><option>Popup</option>
        </select>
        <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" style={{ fontSize: '13px' }}>
          <RotateCcw size={13} /> Đặt lại
        </button>
      </div>

      {view === "grid" ? (
        /* Position grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {currentPositions.map(p => (
            <div key={p.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
              <div className="relative h-40 overflow-hidden">
                <ImageWithFallback src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-4">
                  <button onClick={() => { setActivePosition(p); setView("manage"); }} className="px-3 py-1.5 bg-white text-[#0F4761] rounded-lg" style={{ fontSize: '12.5px', fontWeight: 600 }}>Quản lý</button>
                  <button className="px-3 py-1.5 bg-white/90 text-gray-700 rounded-lg" style={{ fontSize: '12.5px' }}>Xem trước</button>
                </div>
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2 py-0.5 bg-white/95 text-[#0F4761] rounded-full" style={{ fontSize: '11px', fontWeight: 600 }}>{p.active} đang chạy</span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-green-500 text-white" : "bg-gray-400 text-white"}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                    {p.status === "active" ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#111827' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Tổng: {p.total} banner</div>
                </div>
                <button onClick={() => { setActivePosition(p); setView("manage"); }} className="px-3 py-1.5 border border-[#0F4761] text-[#0F4761] rounded-lg hover:bg-[#0F4761] hover:text-white transition" style={{ fontSize: '12.5px' }}>
                  Quản lý
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Manage layout: list + preview */
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Danh sách banner ({banners.length})</div>
              <div className="flex gap-2">
                <button className="px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: '12px' }}>Chọn nhiều</button>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Banner</th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Link</th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Hiển thị</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Ưu tiên</th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Trạng thái</th>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {banners.map(b => {
                  const st = statusConfig[b.status];
                  return (
                    <tr key={b.id} onClick={() => setSelectedBanner(b)} className={`cursor-pointer hover:bg-gray-50 ${selectedBanner?.id === b.id ? "bg-[#0F4761]/5" : ""}`}>
                      <td className="px-3 py-2.5"><GripVertical size={14} className="text-gray-300" /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <ImageWithFallback src={b.thumb} alt={b.title} className="w-12 h-9 rounded object-cover" />
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{b.title}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><code className="px-1.5 py-0.5 bg-gray-100 rounded" style={{ fontSize: '11.5px', color: '#0F4761' }}>{b.link}</code></td>
                      <td className="px-3 py-2.5" style={{ fontSize: '12px', color: '#6B7280' }}>{b.from} → {b.to}</td>
                      <td className="px-3 py-2.5 text-center" style={{ fontSize: '13px', fontWeight: 600 }}>#{b.priority}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full ${st.class}`} style={{ fontSize: '11.5px', fontWeight: 500 }}>{st.label}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); void toggleVisible(b.id); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Eye size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); openEditDrawer(b); }} className="p-1.5 hover:bg-gray-100 rounded text-blue-500"><Edit2 size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setShowDelete(b.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Xem trước</div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setPreviewMode("desktop")} className={`p-1.5 rounded ${previewMode === "desktop" ? "bg-white shadow-sm text-[#0F4761]" : "text-gray-400"}`}><Monitor size={14} /></button>
                <button onClick={() => setPreviewMode("tablet")} className={`p-1.5 rounded ${previewMode === "tablet" ? "bg-white shadow-sm text-[#0F4761]" : "text-gray-400"}`}><Tablet size={14} /></button>
                <button onClick={() => setPreviewMode("mobile")} className={`p-1.5 rounded ${previewMode === "mobile" ? "bg-white shadow-sm text-[#0F4761]" : "text-gray-400"}`}><Smartphone size={14} /></button>
              </div>
            </div>
            {selectedBanner ? (
              <div className={`mx-auto bg-gray-50 rounded-lg overflow-hidden border border-gray-200 transition-all ${previewMode === "mobile" ? "max-w-[180px]" : previewMode === "tablet" ? "max-w-[280px]" : "max-w-full"}`}>
                <ImageWithFallback src={selectedBanner.thumb.replace("w=400", "w=800")} alt={selectedBanner.title} className="w-full h-40 object-cover" />
                <div className="p-3">
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{selectedBanner.title}</div>
                  <button className="mt-2 px-3 py-1 bg-[#0F4761] text-white rounded" style={{ fontSize: '11px' }}>Xem ngay</button>
                </div>
              </div>
            ) : (
              <div className={`mx-auto bg-gray-50 rounded-lg border border-gray-200 transition-all ${previewMode === "mobile" ? "max-w-[180px]" : previewMode === "tablet" ? "max-w-[280px]" : "max-w-full"} p-6 text-center text-gray-400`} style={{ fontSize: '13px' }}>
                Chưa có banner
              </div>
            )}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between" style={{ fontSize: '12px' }}><span className="text-gray-500">Kích thước</span><span className="text-gray-800 font-medium">1920 × 720 px</span></div>
              <div className="flex justify-between" style={{ fontSize: '12px' }}><span className="text-gray-500">Dung lượng</span><span className="text-gray-800 font-medium">348 KB</span></div>
              <div className="flex justify-between" style={{ fontSize: '12px' }}><span className="text-gray-500">Định dạng</span><span className="text-gray-800 font-medium">JPG</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer add/edit */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setShowDrawer(false)}>
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F4761' }}>Thêm / Chỉnh sửa banner</h2>
              <button onClick={() => setShowDrawer(false)} className="p-1.5 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              <section>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>1. Upload ảnh</div>
                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#0F4761] transition cursor-pointer">
                  {bannerForm.imgUrl ? (
                    <ImageWithFallback src={bannerForm.imgUrl} alt={bannerForm.title || "Banner"} className="mx-auto mb-3 h-36 w-full rounded-lg object-cover" />
                  ) : (
                    <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                  )}
                  <div style={{ fontSize: '13px', color: '#374151' }}>{uploadingBanner ? "Dang tai anh..." : "Click de chon anh"}</div>
                  <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '4px' }}>JPG, PNG, WebP - toi da 5MB</div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} disabled={uploadingBanner || savingBanner} />
                </label>
              </section>

              <section className="space-y-3">
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>2. Thông tin banner</div>
                <input value={bannerForm.title} onChange={event => updateBannerForm("title", event.target.value)} placeholder="Tieu de banner" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
                <textarea value={bannerForm.subtitle} onChange={event => updateBannerForm("subtitle", event.target.value)} placeholder="Mo ta ngan" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none" style={{ fontSize: '13px' }} />
                <input value={bannerForm.linkUrl} onChange={event => updateBannerForm("linkUrl", event.target.value)} placeholder="Link redirect (VD: /promo/summer)" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
                  {currentPositions.map(p => <option key={p.id}>{p.name}</option>)}
                </select>
                <input value={bannerForm.imgUrl} onChange={event => updateBannerForm("imgUrl", event.target.value)} placeholder="URL anh banner" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
              </section>

              <section className="space-y-3">
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>3. Sắp xếp hiển thị</div>
                <input type="number" min={1} value={bannerForm.position} onChange={event => updateBannerForm("position", Number(event.target.value) || 1)} placeholder="Thu tu uu tien" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
                <select value={bannerForm.status} onChange={event => updateBannerForm("status", event.target.value as BannerForm["status"])} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
                  <option value="active">Hien thi</option>
                  <option value="inactive">An</option>
                </select>
              </section>

            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setShowDrawer(false)} disabled={savingBanner || uploadingBanner} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-60" style={{ fontSize: '13.5px' }}>Huy</button>
              <button onClick={() => void saveBanner("inactive")} disabled={savingBanner || uploadingBanner} className="px-4 py-2 border border-[#0F4761] text-[#0F4761] rounded-lg disabled:opacity-60" style={{ fontSize: '13.5px' }}>{savingBanner ? "Dang luu..." : "Luu nhap"}</button>
              <button onClick={() => void saveBanner("active")} disabled={savingBanner || uploadingBanner} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{ fontSize: '13.5px' }}>{savingBanner ? "Dang luu..." : "Xuat ban"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDelete !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><Trash2 size={18} className="text-red-500" /></div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>Xóa banner?</h3>
              </div>
              <ImageWithFallback src={banners.find(b => b.id === showDelete)?.thumb || ""} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
              <p style={{ fontSize: '13.5px', color: '#6B7280' }}>Banner sẽ bị xóa khỏi toàn bộ giao diện khách hàng. Hành động này không thể hoàn tác.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: '13.5px' }}>Hủy</button>
              <button onClick={() => void deleteBanner(showDelete)} className="px-4 py-2 bg-red-500 text-white rounded-lg" style={{ fontSize: '13.5px' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
