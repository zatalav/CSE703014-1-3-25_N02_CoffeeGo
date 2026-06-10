import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Award,
  BadgeCheck,
  Coffee,
  Crown,
  Gem,
  Gift,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { useApp } from "../store";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { apiRequest, apiUrl } from "../api";

type MembershipRank = {
  rankId?: number;
  rankName: "Gold" | "Platinum" | "Black";
  rankOrder: number;
  minExp: number;
  minTotalMoney: number;
  minTotalOrders: number;
  discountPercent: number;
  expMultiplier: number;
  dripsMultiplier: number;
  description: string;
  status?: string;
  color?: string;
};

type CustomerCoupon = {
  couponId?: number;
  code?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  applyFor?: string;
  usageLimit?: number;
  usedCount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
};

type PageResponse<T> = {
  items: T[];
};

const fallbackRanks: MembershipRank[] = [
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
  },
];

const rankStyles = {
  Gold: {
    icon: Award,
    from: "#FFF7D6",
    to: "#E2B64C",
    textColor: "#4A3410",
  },
  Platinum: {
    icon: Gem,
    from: "#F4F7FA",
    to: "#B8C4D0",
    textColor: "#25323D",
  },
  Black: {
    icon: Crown,
    from: "#151515",
    to: "#4A2B17",
    textColor: "#FFF7E6",
  },
};

const couponImages = [
  "photo-1509042239860-f550ce710b93",
  "photo-1561882468-9110e03e0f78",
  "photo-1556679343-c7306c1976bc",
  "photo-1555507036-ab1f4038808a",
  "photo-1497935586351-b67a49e012bf",
  "photo-1517701604599-bb29b565090c",
];

const floatingDots = [
  { left: "12%", top: "22%", delay: "0s" },
  { left: "28%", top: "68%", delay: "0.8s" },
  { left: "46%", top: "26%", delay: "1.6s" },
  { left: "65%", top: "64%", delay: "2.4s" },
  { left: "82%", top: "28%", delay: "3.2s" },
];

function normalizeRankName(name?: string): MembershipRank["rankName"] {
  if (name === "Platinum") return "Platinum";
  if (name === "Black") return "Black";
  return "Gold";
}

function formatMultiplier(value: number) {
  return `x${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "đ";
}

function rankRequirement(rank: MembershipRank) {
  const parts = [`Từ ${rank.minExp.toLocaleString("vi-VN")} EXP`];
  if (rank.minTotalMoney > 0) parts.push(`Chi tiêu ${formatMoney(rank.minTotalMoney)}`);
  if (rank.minTotalOrders > 0) parts.push(`${rank.minTotalOrders} đơn`);
  return parts.join(" · ");
}

function normalizeCouponAmount(value?: number) {
  return Number(value ?? 0);
}

function isPercentCoupon(coupon: CustomerCoupon) {
  return (coupon.discountType || "").toLowerCase().includes("percent");
}

function formatCouponDiscount(coupon: CustomerCoupon) {
  const value = normalizeCouponAmount(coupon.discountValue);
  if (isPercentCoupon(coupon)) return `Giảm ${value.toLocaleString("vi-VN")}%`;
  if (value > 0) return `Giảm ${formatMoney(value)}`;
  return "Ưu đãi";
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function formatApplyFor(value?: string) {
  if (!value || value.toLowerCase() === "all") return "Tất cả sản phẩm";
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function couponConditions(coupon: CustomerCoupon) {
  const conditions: string[] = [];
  const minOrderValue = normalizeCouponAmount(coupon.minOrderValue);
  const maxDiscount = normalizeCouponAmount(coupon.maxDiscount);

  if (minOrderValue > 0) conditions.push(`Đơn từ ${formatMoney(minOrderValue)}`);
  if (maxDiscount > 0 && isPercentCoupon(coupon)) conditions.push(`Tối đa ${formatMoney(maxDiscount)}`);
  if (coupon.applyFor) conditions.push(`Áp dụng: ${formatApplyFor(coupon.applyFor)}`);
  if (coupon.endDate) conditions.push(`HSD ${formatDate(coupon.endDate)}`);
  if (coupon.usageLimit != null) {
    const remaining = Math.max(0, coupon.usageLimit - Number(coupon.usedCount ?? 0));
    conditions.push(`Còn ${remaining.toLocaleString("vi-VN")} lượt`);
  }

  return conditions;
}

function rankIndex(ranks: MembershipRank[], name?: string) {
  const rankName = normalizeRankName(name);
  return Math.max(0, ranks.findIndex((rank) => rank.rankName === rankName));
}

function nextRank(ranks: MembershipRank[], points: number) {
  const sorted = [...ranks].sort((a, b) => a.minExp - b.minExp);
  const next = sorted.find((rank) => points < rank.minExp);
  if (!next) return { label: sorted[sorted.length - 1]?.rankName ?? "Black", remain: 0, progress: 100 };

  const previousIndex = Math.max(0, sorted.findIndex((rank) => rank.rankName === next.rankName) - 1);
  const previous = sorted[previousIndex];
  const span = Math.max(1, next.minExp - previous.minExp);
  return {
    label: next.rankName,
    remain: next.minExp - points,
    progress: Math.min(Math.max(((points - previous.minExp) / span) * 100, 0), 100),
  };
}

function parseRanks(items: MembershipRank[]) {
  const allowed = new Set(["Gold", "Platinum", "Black"]);
  const parsed = items
    .filter((rank) => allowed.has(rank.rankName))
    .map((rank) => ({
      ...rank,
      rankName: normalizeRankName(rank.rankName),
      rankOrder: rank.rankOrder ?? 99,
      minExp: rank.minExp ?? 0,
      minTotalMoney: rank.minTotalMoney ?? 0,
      minTotalOrders: rank.minTotalOrders ?? 0,
      discountPercent: rank.discountPercent ?? 0,
      expMultiplier: rank.expMultiplier ?? 1,
      dripsMultiplier: rank.dripsMultiplier ?? 1,
      description: rank.description || "Chưa cập nhật mô tả ưu đãi.",
    }))
    .sort((a, b) => a.rankOrder - b.rankOrder);
  return parsed.length ? parsed : fallbackRanks;
}

export default function Rewards() {
  const { user } = useApp();
  const [tab, setTab] = useState<"redeem" | "mine">("redeem");
  const [ranks, setRanks] = useState<MembershipRank[]>(fallbackRanks);
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState("");
  const points = user?.dripPoints ?? 0;
  const currentTier = ranks[rankIndex(ranks, user?.tier)];
  const progress = useMemo(() => nextRank(ranks, points), [ranks, points]);
  const CurrentTierIcon = rankStyles[currentTier.rankName].icon;

  const earnRules = useMemo(
    () => [
      { icon: Coffee, title: "10.000đ = 1 DRIP", desc: "Điểm được tính từ tổng thanh toán của đơn hàng." },
      { icon: ReceiptText, title: "Đơn thành công", desc: "DRIP chỉ được cộng sau khi đơn hàng hoàn tất thanh toán." },
      {
        icon: BadgeCheck,
        title: "Hệ số theo hạng",
        desc: ranks.map((rank) => `${rank.rankName} ${formatMultiplier(rank.dripsMultiplier)}`).join(", "),
      },
      { icon: Gift, title: "Mã ưu đãi", desc: "Sao chép mã từ danh sách ưu đãi và nhập ở trang thanh toán." },
    ],
    [ranks]
  );

  useEffect(() => {
    let ignore = false;
    fetch(apiUrl("/customers/membership-ranks?size=20"))
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: ApiResponse<PageResponse<MembershipRank>>) => {
        if (!ignore && payload.success && payload.data?.items) {
          setRanks(parseRanks(payload.data.items));
        }
      })
      .catch(() => {
        if (!ignore) setRanks(fallbackRanks);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setCouponsLoading(true);
    setCouponsError("");

    apiRequest<CustomerCoupon[]>("/promotions/coupons")
      .then((items) => {
        if (!ignore) setCoupons(Array.isArray(items) ? items : []);
      })
      .catch((error: Error) => {
        if (!ignore) {
          setCoupons([]);
          setCouponsError(error.message || "Không thể tải ưu đãi.");
        }
      })
      .finally(() => {
        if (!ignore) setCouponsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCopyCoupon = async (code?: string) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã ${code}`);
    } catch {
      toast.info(`Mã ưu đãi: ${code}`);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden px-6 py-20 text-center" style={{ background: "linear-gradient(180deg, var(--bg-section) 0%, var(--bg-primary) 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          {floatingDots.map((dot) => (
            <span
              key={`${dot.left}-${dot.top}`}
              className="absolute h-2 w-2 rounded-full opacity-30"
              style={{
                left: dot.left,
                top: dot.top,
                background: "var(--brand-brown)",
                animation: `floatDrip 6s ease-in-out ${dot.delay} infinite`,
              }}
            />
          ))}
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "white", color: "var(--brand-brown)", border: "1px solid var(--border-line)" }}>
            <Sparkles size={34} />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
            Ưu đãi <em style={{ color: "var(--brand-brown)" }}>CoffeeGo</em>
          </h1>
          <p className="mx-auto mt-3 max-w-xl" style={{ color: "var(--text-secondary)" }}>
            DRIP là hệ điểm thành viên của CoffeeGo: tích điểm từ đơn hàng, nhận mã ưu đãi và lên hạng để có quyền lợi tốt hơn.
          </p>
          {user ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 ui-text" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
              <CurrentTierIcon size={18} />
              {points.toLocaleString()} điểm DRIP · Hạng {currentTier.rankName}
            </div>
          ) : (
            <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold ui-text" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
              <ReceiptText size={18} />
              Đăng nhập để xem điểm
            </Link>
          )}
        </div>
      </section>

      {user && (
        <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-6">
          <div className="grid gap-6 rounded-2xl p-6 md:grid-cols-3" style={{ background: "var(--bg-section)", border: "1px solid var(--border-line)" }}>
            <div>
              <div className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>ĐIỂM DRIP</div>
              <div className="mt-1 font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--brand-brown)" }}>{points.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>HẠNG HIỆN TẠI</div>
              <div className="mt-1 flex items-center gap-2 font-semibold" style={{ fontSize: "1.5rem" }}>
                <CurrentTierIcon size={24} style={{ color: "var(--brand-brown)" }} />
                {currentTier.rankName}
              </div>
              <div className="mt-3 h-2 rounded-full" style={{ background: "var(--border-line)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress.progress}%`, background: "var(--brand-brown)" }} />
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                {progress.remain > 0 ? `Còn ${progress.remain.toLocaleString()} EXP để lên ${progress.label}` : "Bạn đang ở hạng cao nhất"}
              </div>
            </div>
            <div className="flex items-center justify-start md:justify-end">
              <button className="rounded-lg px-5 py-2.5 text-sm ui-text" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>
                Xem lịch sử điểm
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex gap-3 border-b" style={{ borderColor: "var(--border-line)" }}>
          {[
            { key: "redeem", label: "Mã ưu đãi" },
            { key: "mine", label: "Voucher của tôi" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as "redeem" | "mine")}
              className="relative px-5 py-3 ui-text transition"
              style={{ color: tab === item.key ? "var(--brand-brown)" : "var(--text-secondary)" }}
            >
              {item.label}
              {tab === item.key && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "var(--brand-brown)" }} />}
            </button>
          ))}
        </div>

        {tab === "redeem" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {couponsLoading ? (
              <div className="rounded-2xl bg-white p-8 text-center sm:col-span-2 lg:col-span-3" style={{ border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
                Đang tải ưu đãi...
              </div>
            ) : couponsError ? (
              <div className="rounded-2xl bg-white p-8 text-center sm:col-span-2 lg:col-span-3" style={{ border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
                {couponsError}
              </div>
            ) : coupons.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center sm:col-span-2 lg:col-span-3" style={{ border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
                Chưa có ưu đãi đang hoạt động.
              </div>
            ) : (
              coupons.map((coupon, index) => {
                const code = coupon.code || `COUPON-${coupon.couponId ?? index + 1}`;
                const image = couponImages[index % couponImages.length];
                const conditions = couponConditions(coupon);

                return (
                  <article key={coupon.couponId ?? code} className="overflow-hidden rounded-2xl bg-white transition hover:-translate-y-1" style={{ border: "1px solid var(--border-line)" }}>
                    <div className="aspect-[16/9] overflow-hidden">
                      <ImageWithFallback
                        src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`}
                        alt={code}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <div className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ui-text" style={{ background: "var(--bg-section)", color: "var(--brand-brown)" }}>
                        {code}
                      </div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{formatCouponDiscount(coupon)}</h3>
                      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{coupon.description || "Ưu đãi từ CoffeeGo."}</p>
                      {conditions.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {conditions.map((condition) => (
                            <span key={condition} className="rounded-full px-3 py-1 text-xs" style={{ background: "var(--bg-section)", color: "var(--text-secondary)" }}>
                              {condition}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => handleCopyCoupon(code)}
                        className="mt-5 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm ui-text"
                        style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
                      >
                        <Gift size={14} />
                        Sao chép mã
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        ) : (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--bg-section)", color: "var(--text-secondary)" }}>
            <Gift className="mx-auto mb-3" size={42} style={{ color: "var(--brand-brown)" }} />
            <p>Bạn chưa có voucher nào. Hãy theo dõi danh sách mã ưu đãi đang hoạt động.</p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            Cách tích điểm <em style={{ color: "var(--brand-brown)" }}>DRIP</em>
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {earnRules.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-section)" }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "white", color: "var(--brand-brown)", border: "1px solid var(--border-line)" }}>
                <Icon size={27} />
              </div>
              <div className="font-semibold" style={{ color: "var(--brand-brown)" }}>{title}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            Hạng <em style={{ color: "var(--brand-brown)" }}>thành viên</em>
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {ranks.map((rank) => {
            const style = rankStyles[rank.rankName];
            const Icon = style.icon;
            return (
              <div key={rank.rankName} className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${style.from} 0%, ${style.to} 100%)`, color: style.textColor }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.24)", border: "1px solid rgba(255,255,255,0.32)" }}>
                    <Icon size={24} />
                  </div>
                  <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{rank.rankName}</div>
                </div>
                <div className="mt-4 text-sm opacity-85">{rankRequirement(rank)}</div>
                <div className="mt-2 text-sm opacity-90">
                  DRIP {formatMultiplier(rank.dripsMultiplier)} · {rank.description}
                </div>
                <Link to="/profile?tab=membership" className="mt-5 inline-block text-xs underline">Xem quyền lợi</Link>
              </div>
            );
          })}
        </div>
      </section>

      <style>{`@keyframes floatDrip { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }`}</style>
    </div>
  );
}
