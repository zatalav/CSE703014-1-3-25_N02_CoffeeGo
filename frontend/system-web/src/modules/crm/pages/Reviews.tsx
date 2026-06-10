import { useEffect, useState } from "react";
import { Star, MessageSquare, EyeOff, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import type { PageResponse } from "../../../lib/types";

type ReviewItem = { id: number; customer: string; avatar: string; rating: number; content: string; product: string; branch: string; time: string; reply: string | null };

type ProductReviewDto = {
  reviewId: number;
  productId?: number | null;
  customerId?: number | null;
  orderId?: number | null;
  rating?: number | null;
  createdAt?: string | null;
};

const reviewsSeed: ReviewItem[] = [];

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const toReviewItem = (dto: ProductReviewDto): ReviewItem => ({
  id: dto.reviewId,
  customer: dto.customerId ? `Khach #${dto.customerId}` : "Khach hang",
  avatar: dto.customerId ? `#${dto.customerId}` : "KH",
  rating: Number(dto.rating || 0),
  content: `Danh gia don hang #${dto.orderId ?? "-"}`,
  product: dto.productId ? `San pham #${dto.productId}` : "San pham",
  branch: "Coffee Shop",
  time: (dto.createdAt || "").replace("T", " "),
  reply: null,
});

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={13} className={s <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
      ))}
    </div>
  );
}

export function Reviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>(reviewsSeed);
  const [replyId, setReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [starFilter, setStarFilter] = useState(0);
  const [replyFilter, setReplyFilter] = useState("all");

  const loadReviews = async () => {
    try {
      const data = await api.get<PageResponse<ProductReviewDto> | ProductReviewDto[]>("/admin/customers/reviews?size=100&sort=createdAt,desc");
      setReviews(pageItems(data).map(toReviewItem));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai danh gia");
    }
  };

  useEffect(() => {
    void loadReviews();
  }, []);

  const hideReview = async (id: number) => {
    try {
      await api.patch<ProductReviewDto>(`/admin/customers/reviews/${id}/hide`);
      setReviews(prev => prev.filter(review => review.id !== id));
      toast.success("Da an danh gia");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the an danh gia");
    }
  };

  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    star: r,
    count: reviews.filter(rev => rev.rating === r).length,
  }));
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  const filtered = reviews.filter(r => {
    const matchStar = starFilter === 0 || r.rating === starFilter;
    const matchReply = replyFilter === "all" || (replyFilter === "replied" ? r.reply : !r.reply);
    return matchStar && matchReply;
  });

  const unReplied = reviews.filter(r => !r.reply).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Đánh giá & Phản hồi</h1>
        <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>Quản lý phản hồi của khách hàng</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Average rating */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="text-center">
            <div style={{fontSize: '40px', fontWeight: 800, color: '#0F4761'}}>{avgRating}</div>
            <StarRating rating={Math.round(Number(avgRating))} />
            <div style={{fontSize: '12px', color: '#9CA3AF', marginTop: '4px'}}>{reviews.length} đánh giá</div>
          </div>
          <div className="flex-1 space-y-1">
            {ratingCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span style={{fontSize: '11px', color: '#6B7280', width: '24px'}}>{star}⭐</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`}} />
                </div>
                <span style={{fontSize: '11px', color: '#9CA3AF', width: '16px'}}>{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><MessageSquare size={20} className="text-blue-600" /></div>
          <div>
            <div style={{fontSize: '12px', color: '#6B7280'}}>Tổng lượt đánh giá</div>
            <div style={{fontSize: '22px', fontWeight: 700, color: '#111827'}}>{reviews.length}</div>
          </div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm flex items-center gap-3 ${unReplied > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unReplied > 0 ? "bg-orange-100" : "bg-green-50"}`}>
            <MessageSquare size={20} className={unReplied > 0 ? "text-orange-500" : "text-green-600"} />
          </div>
          <div>
            <div style={{fontSize: '12px', color: '#9CA3AF'}}>Chưa phản hồi</div>
            <div style={{fontSize: '22px', fontWeight: 700, color: unReplied > 0 ? '#F59E0B' : '#10B981'}}>{unReplied}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="flex gap-1.5">
          <button onClick={() => setStarFilter(0)} className={`px-3 py-1.5 rounded-lg text-xs ${starFilter === 0 ? "bg-[#0F4761] text-white" : "border border-gray-200 text-gray-500"}`}>Tất cả sao</button>
          {[5,4,3,2,1].map(s => (
            <button key={s} onClick={() => setStarFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs ${starFilter === s ? "bg-yellow-400 text-white" : "border border-gray-200 text-gray-500"}`}>{s}⭐</button>
          ))}
        </div>
        <select value={replyFilter} onChange={e => setReplyFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none ml-auto" style={{fontSize: '13px'}}>
          <option value="all">Tất cả</option>
          <option value="replied">Đã phản hồi</option>
          <option value="unreplied">Chưa phản hồi</option>
        </select>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-5 ${r.rating <= 2 ? "border-red-200" : "border-gray-100"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0F4761] to-[#1a6b8a] text-white flex items-center justify-center shrink-0" style={{fontSize: '12px', fontWeight: 700}}>{r.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{fontSize: '13.5px', fontWeight: 600, color: '#111827'}}>{r.customer}</span>
                    <StarRating rating={r.rating} />
                    {r.rating <= 2 && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">Cần xử lý</span>}
                  </div>
                  <div style={{fontSize: '12px', color: '#9CA3AF', marginTop: '2px'}}>
                    {r.product} · {r.branch} · {r.time}
                  </div>
                  <p style={{fontSize: '13.5px', color: '#374151', marginTop: '8px', lineHeight: 1.6}}>{r.content}</p>

                  {/* Reply */}
                  {r.reply && (
                    <div className="mt-3 ml-2 p-3 bg-blue-50 rounded-xl border-l-4 border-blue-400">
                      <div style={{fontSize: '12px', color: '#0F4761', fontWeight: 600, marginBottom: '2px'}}>Phản hồi từ cửa hàng:</div>
                      <p style={{fontSize: '13px', color: '#374151'}}>{r.reply}</p>
                    </div>
                  )}

                  {/* Reply form */}
                  {replyId === r.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none resize-none"
                        rows={3}
                        style={{fontSize: '13px'}}
                        placeholder="Nhập nội dung phản hồi..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setReplyId(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500" style={{fontSize: '12.5px'}}>Hủy</button>
                        <button
                          onClick={() => { toast.success("Đã gửi phản hồi!"); setReplyId(null); setReplyText(""); }}
                          className="px-4 py-1.5 bg-[#0F4761] text-white rounded-lg"
                          style={{fontSize: '12.5px'}}
                        >
                          Gửi phản hồi
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!r.reply && replyId !== r.id && (
                  <button
                    onClick={() => setReplyId(r.id)}
                    className="px-3 py-1.5 bg-[#0F4761] text-white rounded-lg flex items-center gap-1.5"
                    style={{fontSize: '12.5px'}}
                  >
                    <MessageSquare size={13} /> Phản hồi
                  </button>
                )}
                <button onClick={() => void hideReview(r.id)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50">
                  <EyeOff size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
