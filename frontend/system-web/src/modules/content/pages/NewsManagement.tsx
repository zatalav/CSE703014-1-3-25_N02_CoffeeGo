import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Plus, Eye, Search, RotateCcw, Download, Edit2, Trash2, Star, EyeOff, Bold, Italic, Underline, List, ListOrdered, Quote, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "../../../shared/figma/ImageWithFallback";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";
import type { FileUploadDto, PageResponse } from "../../../lib/types";

type NewsPost = {
  newsId?: number;
  id: number;
  title: string;
  summary: string;
  category: string;
  author: string;
  date: string;
  views: number;
  status: keyof typeof statusConfig;
  featured: boolean;
  cover: string;
};

type NewsDto = {
  newsId: number;
  employeeId?: number | null;
  category?: string | null;
  title?: string | null;
  slug?: string | null;
  thumbnail?: string | null;
  summary?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type NewsRequest = {
  employeeId: number;
  category: string;
  title: string;
  slug: string;
  thumbnail?: string | null;
  summary?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const emptyPost: NewsPost = {
  id: 0,
  title: "",
  summary: "",
  category: "Sản phẩm",
  author: "",
  date: "",
  views: 0,
  status: "draft",
  featured: false,
  cover: "",
};

const randomPostId = () => Math.floor(100000 + Math.random() * 900000);
const createEmptyPost = (): NewsPost => ({ ...emptyPost, id: randomPostId() });
const initialPosts: NewsPost[] = [];

const statusConfig: Record<string, { label: string; class: string }> = {
  published: { label: "Đã xuất bản", class: "bg-green-100 text-green-700" },
  draft: { label: "Bản nháp", class: "bg-gray-100 text-gray-600" },
  hidden: { label: "Đã ẩn", class: "bg-slate-100 text-slate-600" },
  scheduled: { label: "Chờ lịch đăng", class: "bg-amber-100 text-amber-700" },
};

const newsCategories = ["Sản phẩm", "Cẩm nang", "Thông báo", "Khuyến mãi"];
const categoryFilterOptions = ["Tất cả", ...newsCategories];
const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || `news-${Date.now()}`;

const localDateTimeNow = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19);
};

const toPostStatus = (status: string | null | undefined): NewsPost["status"] => {
  const normalized = String(status || "draft").toLowerCase();
  if (normalized === "archived" || normalized === "inactive" || normalized === "hidden") return "hidden";
  if (normalized === "published") return "published";
  if (normalized === "scheduled") return "scheduled";
  return "draft";
};

const toNewsPost = (dto: NewsDto): NewsPost => ({
  newsId: dto.newsId,
  id: dto.newsId,
  title: dto.title || `News #${dto.newsId}`,
  summary: dto.summary || "",
  category: dto.category || newsCategories[0],
  author: dto.employeeId ? `NV #${dto.employeeId}` : "Admin",
  date: (dto.createdAt || "").split("T")[0],
  views: 0,
  status: toPostStatus(dto.status),
  featured: false,
  cover: dto.thumbnail || "",
});

const toNewsRequest = (post: NewsPost, status: NewsPost["status"], employeeId: number): NewsRequest => ({
  employeeId,
  category: post.category || newsCategories[0],
  title: post.title.trim(),
  slug: slugify(post.title || `news-${post.id}`),
  thumbnail: post.cover || null,
  summary: post.summary.trim() || post.title || null,
  status: status === "hidden" ? "archived" : status,
  createdAt: localDateTimeNow(),
  updatedAt: localDateTimeNow(),
});

export function NewsManagement() {
  const { session } = useAuth();
  const [posts, setPosts] = useState(initialPosts);
  const [view, setView] = useState<"list" | "editor" | "preview">("list");
  const [editingPost, setEditingPost] = useState<NewsPost>(initialPosts[0] ?? createEmptyPost());
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await api.get<PageResponse<NewsDto> | NewsDto[]>("/admin/content/news?size=100&sort=createdAt,desc");
      setPosts(pageItems(data).map(toNewsPost));
    } catch (err) {
      setPosts([]);
      toast.error(err instanceof Error ? err.message : "Khong the tai danh sach tin tuc");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);
  const pagedPosts = useMemo(() => getPagedItems(posts, page), [page, posts]);
  const allPagedPostsSelected = pagedPosts.length > 0 && pagedPosts.every(post => selected.has(post.id));

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(posts.length)));
  }, [posts.length]);

  const openCreatePost = () => {
    setEditingPost(createEmptyPost());
    setView("editor");
  };

  const saveEditingPost = async (status: NewsPost["status"]) => {
    if (!editingPost.title.trim()) {
      toast.error("Vui long nhap tieu de bai viet");
      return;
    }
    const nextPost: NewsPost = {
      ...editingPost,
      status,
      date: editingPost.date || new Date().toLocaleDateString("vi-VN"),
    };
    try {
      const employeeId = session?.userInfo?.id;
      if (!employeeId) {
        toast.error("Khong xac dinh duoc tai khoan nhan vien dang dang nhap");
        return;
      }
      const request = toNewsRequest(nextPost, status, employeeId);
      const saved = nextPost.newsId
        ? await api.put<NewsDto>(`/admin/content/news/${nextPost.newsId}`, request)
        : await api.post<NewsDto>("/admin/content/news", request);
      const savedPost = toNewsPost(saved);
      setEditingPost(savedPost);
      await loadPosts();
      toast.success(status === "published" ? "Da xuat ban bai viet" : "Da luu bai viet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the luu bai viet");
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleFeatured = (id: number) => {
    setPosts(p => p.map(x => x.id === id ? { ...x, featured: !x.featured } : x));
    toast.success("Đã cập nhật");
  };

  const hidePost = async (post: NewsPost) => {
    if (!post.newsId) {
      setPosts(prev => prev.map(item => item.id === post.id ? { ...item, status: "hidden" } : item));
      toast.success("Da an bai viet");
      return;
    }
    try {
      await api.patch<NewsDto>(`/admin/content/news/${post.newsId}/archive`);
      await loadPosts();
      toast.success("Da an bai viet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the an bai viet");
    }
  };

  const deletePost = async (id: number) => {
    const post = posts.find(item => item.id === id);
    if (!post) return;
    try {
      if (post.newsId) await api.del<void>(`/admin/content/news/${post.newsId}`);
      setShowDelete(null);
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadPosts();
      setPosts(prev => prev.filter(item => item.id !== id));
      toast.success("Da xoa bai viet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa bai viet");
    }
  };

  const bulkDeleteSelected = async () => {
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map(id => {
        const post = posts.find(item => item.id === id);
        return post?.newsId ? api.del<void>(`/admin/content/news/${post.newsId}`) : Promise.resolve();
      }));
      setSelected(new Set());
      await loadPosts();
      setPosts(prev => prev.filter(item => !selected.has(item.id)));
      toast.success("Da xoa bai viet da chon");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa hang loat");
    }
  };

  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await api.upload<FileUploadDto>("/upload/image", file);
      const cover = uploadResultUrl(uploaded);
      setEditingPost(prev => ({ ...prev, cover }));
      toast.success("Da tai anh len Cloudinary");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai anh");
    } finally {
      event.target.value = "";
    }
  };

  if (view === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F4761' }}>Xem trước bài viết</h1>
          <div className="flex gap-2">
            <button onClick={() => setView("editor")} className="px-4 py-2.5 border border-gray-200 bg-white rounded-lg" style={{ fontSize: '13.5px' }}>← Quay lại chỉnh sửa</button>
            <button onClick={() => setShowPublish(true)} className="px-5 py-2.5 bg-[#0F4761] text-white rounded-lg" style={{ fontSize: '13.5px' }}>Xuất bản ngay</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-4xl mx-auto">
          <ImageWithFallback src={editingPost.cover.replace("w=400", "w=1200")} alt={editingPost.title} className="w-full h-72 object-cover" />
          <div className="p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-[#0F4761]/10 text-[#0F4761] rounded-full" style={{ fontSize: '12px', fontWeight: 600 }}>{editingPost.category}</span>
              {editingPost.featured && <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full" style={{ fontSize: '12px', fontWeight: 600 }}>Nổi bật</span>}
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{editingPost.title}</h2>
            <div className="flex items-center gap-4 mt-3 pb-4 border-b border-gray-100" style={{ fontSize: '13px', color: '#6B7280' }}>
              <span>Tác giả: <strong className="text-gray-800">{editingPost.author}</strong></span>
              <span>•</span><span>{editingPost.date}</span>
              <span>•</span><span>{editingPost.views.toLocaleString()} lượt xem</span>
            </div>
            <div className="prose mt-6 space-y-4" style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
              <p>{editingPost.summary || "Chưa có nội dung bài viết."}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "editor") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F4761' }}>Chỉnh sửa bài viết</h1>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Tự động lưu nháp mỗi 30 giây</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView("list")} className="px-4 py-2.5 border border-gray-200 bg-white rounded-lg" style={{ fontSize: '13.5px' }}>← Danh sách</button>
            <button onClick={() => setView("preview")} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg" style={{ fontSize: '13.5px' }}><Eye size={15} /> Xem trước</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          {/* Editor — structured form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3 bg-gray-50 sticky top-0 z-10 flex items-center justify-between">
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F4761' }}>Biểu mẫu bài viết</div>
              <span className="text-gray-400" style={{ fontSize: '11.5px' }}>Tự động lưu nháp</span>
            </div>

            <div className="px-8 py-6 space-y-5">
              {/* Field: Category */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>
                  Chuyên mục <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Chọn chuyên mục bài báo</p>
                <select value={editingPost.category} onChange={e => setEditingPost({ ...editingPost, category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] bg-white" style={{ fontSize: '13.5px' }}>
                  {newsCategories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Field: Title */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>
                  Tiêu đề bài báo <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Tối đa 120 ký tự, viết hoa chữ cái đầu</p>
                <input
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  placeholder="Nhập tiêu đề bài viết"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                  style={{ fontSize: '14px', fontWeight: 500 }}
                />
                <div className="text-right text-gray-400 mt-1" style={{ fontSize: '11px' }}>{editingPost.title.length}/120</div>
              </div>

              {/* Field: Sapo */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>
                  Sapo (đoạn mở đầu) <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Tóm tắt nội dung bài viết trong 1–3 câu, hiển thị in đậm đầu bài báo</p>
                <textarea
                  rows={3}
                  value={editingPost.summary}
                  onChange={(e) => setEditingPost({ ...editingPost, summary: e.target.value })}
                  placeholder="Nhập sapo bài báo..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none"
                  style={{ fontSize: '13.5px', lineHeight: 1.5 }}
                />
              </div>

              {/* Field: Author + date */}
              <div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>Tác giả <span className="text-red-500">*</span></label>
                  <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Người chịu trách nhiệm bài viết</p>
                  <input value={editingPost.author} onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] bg-white" style={{ fontSize: '13.5px' }} />
                </div>
              </div>

              {/* Field: Hero image */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>
                  Ảnh bìa <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Tỉ lệ 16:9, kích thước tối thiểu 1200×675px</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <ImageWithFallback src={editingPost.cover.replace("w=400", "w=1200")} alt="" className="w-full h-56 object-cover" />
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span className="text-gray-500" style={{ fontSize: '12px' }}>Chưa chọn ảnh bìa</span>
                    <div className="flex gap-1.5">
                      <label className="px-2.5 py-1 border border-gray-200 bg-white rounded text-gray-600 cursor-pointer" style={{ fontSize: '12px' }}>
                        Đổi ảnh
                        <input type="file" accept="image/*" className="hidden" onChange={uploadCover} />
                      </label>
                      <button className="px-2.5 py-1 border border-red-200 text-red-500 bg-white rounded" style={{ fontSize: '12px' }}>Xóa</button>
                    </div>
                  </div>
                </div>
                <input placeholder="Chú thích ảnh bìa (caption)..." defaultValue="Bộ sưu tập trà sữa mùa hè 2026 — Ảnh: Trà Sữa Pro" className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '12.5px' }} />
              </div>

              {/* Field: Đoạn mở */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>
                  Đoạn mở bài <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Đoạn văn đầu tiên dẫn dắt vào nội dung chính</p>
                <textarea
                  rows={4}
                  defaultValue="Sau hơn ba tháng nghiên cứu và thử nghiệm, đội ngũ R&D của Trà Sữa Pro đã chính thức giới thiệu thực đơn mùa hè 2026 với 12 món thức uống mới."
                  placeholder="Nhập đoạn mở bài..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none"
                  style={{ fontSize: '13.5px', lineHeight: 1.6 }}
                />
              </div>

              {/* Field: Tiêu đề phụ 1 */}
              <div className="border-l-4 border-[#0F4761]/30 pl-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#0F4761]/10 text-[#0F4761] rounded" style={{ fontSize: '11px', fontWeight: 700 }}>PHẦN 1</span>
                  <button className="text-red-400 hover:text-red-600" style={{ fontSize: '11.5px' }}>✕ Xóa phần</button>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Tiêu đề phụ</label>
                  <input defaultValue="Điểm nhấn của bộ sưu tập mới" placeholder="Tiêu đề mục..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '13.5px', fontWeight: 600 }} />
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Nội dung phần</label>
                  <textarea rows={4} defaultValue="Nổi bật trong thực đơn lần này là dòng trà sữa kem cheese phô mai Hokkaido, kết hợp cùng topping pudding xoài và trân châu hoàng kim." placeholder="Nội dung..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none" style={{ fontSize: '13.5px', lineHeight: 1.6 }} />
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Ảnh minh họa (tùy chọn)</label>
                  <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-[#0F4761] hover:text-[#0F4761]" style={{ fontSize: '12.5px' }}>+ Thêm ảnh minh họa</button>
                </div>
              </div>

              {/* Field: Tiêu đề phụ 2 + Quote */}
              <div className="border-l-4 border-[#0F4761]/30 pl-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#0F4761]/10 text-[#0F4761] rounded" style={{ fontSize: '11px', fontWeight: 700 }}>PHẦN 2</span>
                  <button className="text-red-400 hover:text-red-600" style={{ fontSize: '11.5px' }}>✕ Xóa phần</button>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Tiêu đề phụ</label>
                  <input defaultValue="Phát biểu của ban lãnh đạo" placeholder="Tiêu đề mục..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '13.5px', fontWeight: 600 }} />
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Trích dẫn (quote)</label>
                  <textarea rows={2} defaultValue="Chúng tôi muốn mỗi ly trà sữa không chỉ là thức uống, mà còn là một câu chuyện về văn hóa và sự tinh tế trong pha chế." placeholder="Câu trích dẫn..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none" style={{ fontSize: '13.5px', fontStyle: 'italic' }} />
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Người nói</label>
                  <input defaultValue="Bà Mai Anh — Giám đốc R&D Trà Sữa Pro" placeholder="Họ tên — chức vụ..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '13px' }} />
                </div>
              </div>

              {/* Field: Tiêu đề phụ 3 + List */}
              <div className="border-l-4 border-[#0F4761]/30 pl-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#0F4761]/10 text-[#0F4761] rounded" style={{ fontSize: '11px', fontWeight: 700 }}>PHẦN 3</span>
                  <button className="text-red-400 hover:text-red-600" style={{ fontSize: '11.5px' }}>✕ Xóa phần</button>
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Tiêu đề phụ</label>
                  <input defaultValue="Top 3 món được yêu thích nhất" placeholder="Tiêu đề mục..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '13.5px', fontWeight: 600 }} />
                </div>
                <div>
                  <label className="block mb-1.5" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Danh sách (mỗi dòng 1 mục)</label>
                  <textarea rows={4} defaultValue="" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none font-mono" style={{ fontSize: '12.5px', lineHeight: 1.6 }} />
                </div>
              </div>

              {/* Add new section */}
              <button className="w-full py-3 border-2 border-dashed border-[#0F4761]/30 text-[#0F4761] rounded-xl hover:bg-[#0F4761]/5 flex items-center justify-center gap-2" style={{ fontSize: '13px', fontWeight: 600 }}>
                <Plus size={16} /> Thêm phần mới
              </button>

              {/* Field: Đoạn kết */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>Đoạn kết bài</label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Đoạn văn tổng kết, chốt thông điệp</p>
                <textarea rows={3} defaultValue="Bộ sưu tập sẽ chính thức có mặt tại toàn bộ 42 chi nhánh trên cả nước từ ngày 20/05/2026. Khách hàng thành viên được ưu đãi 20% lần đầu dùng thử." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] resize-none" style={{ fontSize: '13.5px', lineHeight: 1.6 }} />
              </div>

              {/* Field: Tags */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>Tags / Từ khóa</label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Cách nhau bằng dấu phẩy. Tối đa 8 thẻ</p>
                <input defaultValue="muahe2026, trasua, menumoi, kemcheese" placeholder="VD: trà sữa, mùa hè, menu mới..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '13.5px' }} />
              </div>

              {/* Field: Source */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>Nguồn / Ghi chú tòa soạn</label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Hiển thị cuối bài báo</p>
                <input defaultValue="Nguồn: Phòng Marketing Trà Sữa Pro — Phát hành: 15/05/2026" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{ fontSize: '13px', fontStyle: 'italic' }} />
              </div>

              {/* Field: Media */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F4761' }}>Thư viện ảnh & video</label>
                <p className="mb-2 text-gray-400" style={{ fontSize: '11.5px' }}>Ảnh đính kèm bài viết (không tính ảnh bìa)</p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 hover:border-[#0F4761] cursor-pointer" style={{ fontSize: '13px' }}>
                  <ImageIcon size={28} className="mx-auto mb-2 text-gray-300" />
                  Kéo thả ảnh / video vào đây hoặc click để chọn
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>Xuất bản</div>
              <div className="space-y-2">
                <button onClick={() => { void saveEditingPost("draft"); }} className="w-full py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50" style={{ fontSize: '13px' }}>Lưu nháp</button>
                <button onClick={() => setShowPublish(true)} className="w-full py-2 bg-[#0F4761] text-white rounded-lg" style={{ fontSize: '13px' }}>Xuất bản ngay</button>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
                  <option>Trạng thái: Bản nháp</option><option>Đã xuất bản</option><option>Chờ lịch đăng</option><option>Đã ẩn</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>SEO</div>
              <input placeholder="Slug URL" defaultValue="kham-pha-menu-mua-he-2026" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '12.5px' }} />
              <input placeholder="SEO title" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '12.5px' }} />
              <textarea placeholder="Meta description" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none" style={{ fontSize: '12.5px' }} />
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-blue-600 truncate" style={{ fontSize: '13px' }}>{editingPost.title}</div>
                <div className="text-green-700" style={{ fontSize: '11.5px' }}>trasuapro.vn › tin-tuc › kham-pha-menu...</div>
                <div className="text-gray-500" style={{ fontSize: '11.5px' }}>Xem trước hiển thị trên Google Search...</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Danh mục & Tags</div>
              <select value={editingPost.category} onChange={e => setEditingPost({ ...editingPost, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
                {newsCategories.map(c => <option key={c}>{c}</option>)}
              </select>
              <div className="px-3 py-2 border border-gray-200 rounded-lg flex flex-wrap gap-1.5">
                {["mùa hè", "trà sữa", "menu mới"].map(t => (
                  <span key={t} className="px-2 py-0.5 bg-[#0F4761]/10 text-[#0F4761] rounded-full flex items-center gap-1" style={{ fontSize: '11.5px' }}>
                    {t} <X size={10} className="cursor-pointer" />
                  </span>
                ))}
                <input placeholder="Thêm tag..." className="flex-1 outline-none min-w-[80px]" style={{ fontSize: '12px' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Ảnh bìa</div>
              <ImageWithFallback src={editingPost.cover} alt="cover" className="w-full h-32 object-cover rounded-lg" />
              <label className="block w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 text-center cursor-pointer" style={{ fontSize: '12.5px' }}>
                Đổi ảnh bìa (1200×630)
                <input type="file" accept="image/*" className="hidden" onChange={uploadCover} />
              </label>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5">
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Cài đặt hiển thị</div>
              {[
                { label: "Tin nổi bật", checked: editingPost.featured },
                { label: "Hiển thị trang chủ", checked: true },
                { label: "Cho phép bình luận", checked: true },
              ].map(opt => (
                <label key={opt.label} className="flex items-center justify-between cursor-pointer">
                  <span style={{ fontSize: '12.5px', color: '#374151' }}>{opt.label}</span>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${opt.checked ? "bg-[#0F4761]" : "bg-gray-300"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${opt.checked ? "left-[18px]" : "left-0.5"}`}></div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Publish confirm */}
        {showPublish && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="p-6">
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F4761', marginBottom: '12px' }}>Xác nhận xuất bản</h3>
                <div className="space-y-2 bg-gray-50 rounded-lg p-3" style={{ fontSize: '13px' }}>
                  <div><strong>Tiêu đề:</strong> {editingPost.title}</div>
                  <div><strong>Thời gian:</strong> Ngay bây giờ — 15/05/2026</div>
                  <div><strong>Link:</strong> <span className="text-blue-600">trasuapro.vn/tin-tuc/...</span></div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setShowPublish(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: '13.5px' }}>Hủy</button>
                <button onClick={() => { void saveEditingPost("published").then(() => { setShowPublish(false); setView("list"); }); }} className="px-5 py-2 bg-[#0F4761] text-white rounded-lg" style={{ fontSize: '13.5px' }}>Xác nhận xuất bản</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F4761' }}>Quản lý Tin tức</h1>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{posts.length} tin tức lấy từ database</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{ fontSize: '13.5px' }}>
            <Eye size={15} /> Xem giao diện khách
          </button>
          <button onClick={openCreatePost} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{ fontSize: '13.5px' }}>
            <Plus size={16} /> Viết bài mới
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Tìm theo tiêu đề, slug, nội dung..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
        </div>
        <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
          {categoryFilterOptions.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
          <option>Tất cả trạng thái</option><option>Đã xuất bản</option><option>Bản nháp</option><option>Đã ẩn</option><option>Chờ lịch đăng</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{ fontSize: '13px' }}>
          <option>Tất cả tác giả</option><option>Mai Anh</option><option>Quốc Hưng</option><option>Thảo Vy</option><option>Admin</option>
        </select>
        <input type="date" className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: '13px' }} />
        <label className="flex items-center gap-1.5 px-2 py-2" style={{ fontSize: '12.5px' }}><input type="checkbox" /> Tin nổi bật</label>
        <label className="flex items-center gap-1.5 px-2 py-2" style={{ fontSize: '12.5px' }}><input type="checkbox" /> Đã lên lịch</label>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" style={{ fontSize: '13px' }}>
          <RotateCcw size={13} /> Đặt lại
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50" style={{ fontSize: '13px' }}>
          <Download size={13} /> Xuất Excel
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-[#0F4761]/5 border border-[#0F4761]/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span style={{ fontSize: '13px', color: '#0F4761', fontWeight: 600 }}>Đã chọn {selected.size} bài viết</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 bg-white rounded-lg" style={{ fontSize: '12.5px' }}>Ẩn hàng loạt</button>
            <button onClick={() => void bulkDeleteSelected()} className="px-3 py-1 border border-red-300 text-red-600 bg-white rounded-lg" style={{ fontSize: '12.5px' }}>Xóa</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allPagedPostsSelected}
                  onChange={(event) => {
                    setSelected(prev => {
                      const next = new Set(prev);
                      pagedPosts.forEach(post => event.target.checked ? next.add(post.id) : next.delete(post.id));
                      return next;
                    });
                  }}
                />
              </th>
              <th className="px-3 py-3 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Bài viết</th>
              <th className="px-3 py-3 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Danh mục</th>
              <th className="px-3 py-3 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Tác giả</th>
              <th className="px-3 py-3 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Ngày đăng ↓</th>
              <th className="px-3 py-3 text-center" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Lượt xem</th>
              <th className="px-3 py-3 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Trạng thái</th>
              <th className="px-3 py-3 text-center" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Nổi bật</th>
              <th className="px-3 py-3 text-left" style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>
                  Đang tải tin tức từ database...
                </td>
              </tr>
            )}
            {!loading && pagedPosts.map(p => {
              const st = statusConfig[p.status];
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <ImageWithFallback src={p.cover} alt={p.title} className="w-14 h-10 rounded object-cover shrink-0" />
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', maxWidth: '320px' }} className="line-clamp-2">{p.title}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full" style={{ fontSize: '11.5px' }}>{p.category}</span></td>
                  <td className="px-3 py-3" style={{ fontSize: '13px', color: '#374151' }}>{p.author}</td>
                  <td className="px-3 py-3" style={{ fontSize: '12.5px', color: '#6B7280' }}>{p.date}</td>
                  <td className="px-3 py-3 text-center" style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{p.views.toLocaleString()}</td>
                  <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full ${st.class}`} style={{ fontSize: '11.5px', fontWeight: 500 }}>{st.label}</span></td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => toggleFeatured(p.id)}>
                      <Star size={16} className={p.featured ? "text-amber-400 fill-amber-400" : "text-gray-300"} />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingPost(p); setView("preview"); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Eye size={14} /></button>
                      <button onClick={() => { setEditingPost(p); setView("editor"); }} className="p-1.5 hover:bg-gray-100 rounded text-blue-500"><Edit2 size={14} /></button>
                      <button onClick={() => void hidePost(p)} className="p-1.5 hover:bg-gray-100 rounded text-amber-500"><EyeOff size={14} /></button>
                      <button onClick={() => setShowDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && posts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>
                  Chưa có tin tức trong database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={posts.length} onPageChange={setPage} itemLabel="bai viet" />
        <div className="hidden">
          <div>Hiển thị 1–{posts.length} của {posts.length} bài viết</div>
          <div className="flex gap-1">
            <button className="px-2.5 py-1 border border-gray-200 rounded">‹</button>
            <button className="px-2.5 py-1 bg-[#0F4761] text-white rounded">1</button>
            <button className="px-2.5 py-1 border border-gray-200 rounded">2</button>
            <button className="px-2.5 py-1 border border-gray-200 rounded">3</button>
            <button className="px-2.5 py-1 border border-gray-200 rounded">›</button>
          </div>
        </div>
      </div>

      {/* Delete */}
      {showDelete !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><Trash2 size={18} className="text-red-500" /></div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>Xác nhận xóa</h3>
              </div>
              <p style={{ fontSize: '13.5px', color: '#6B7280' }}>Bài viết <strong className="text-gray-800">"{posts.find(p => p.id === showDelete)?.title}"</strong> sẽ bị xóa và không thể khôi phục.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: '13.5px' }}>Hủy</button>
              <button onClick={() => void deletePost(showDelete)} className="px-4 py-2 bg-red-500 text-white rounded-lg" style={{ fontSize: '13.5px' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
