import type { Product } from "../customerMenu";
import { productImg } from "../data";
import { formatVND } from "../store";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const badgeStyle: Record<string, { bg: string; label: string }> = {
  HOT: { bg: "#C0392B", label: "HOT" },
  "MỚI": { bg: "#2471A3", label: "MỚI" },
  "Mùa vụ": { bg: "#1E8449", label: "Mùa vụ" },
  "MÙA VỤ": { bg: "#1E8449", label: "MÙA VỤ" },
  "Bán chạy": { bg: "#C0392B", label: "Bán chạy" },
  Combo: { bg: "#6C3483", label: "Combo" },
  "TIẾT KIỆM": { bg: "#6C3483", label: "TIẾT KIỆM" },
  FLASH: { bg: "#B7770D", label: "FLASH" },
};

export function ProductCard({ product, onClick }: { product: Product; onClick?: () => void }) {
  const minPrice = product.prices.length ? Math.min(...product.prices.map((p) => p.price)) : 0;

  return (
    <div
      onClick={onClick}
      className={`group overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{
        background: "white",
        border: "1px solid var(--border-line)",
        boxShadow: "0 2px 8px rgba(44,26,14,0.06)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 12px 32px rgba(92,51,23,0.15)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(44,26,14,0.06)")}
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <ImageWithFallback
          src={productImg(product.image)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.badges && (
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.badges.map((badge) => {
              const style = badgeStyle[badge] || { bg: "var(--brand-brown)", label: badge };
              return (
                <span key={badge} className="rounded-full px-2 py-1 text-xs font-semibold" style={{ background: style.bg, color: "white" }}>
                  {style.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="mb-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--text-primary)" }}>{product.name}</h3>
        <p className="mb-3 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>{product.description}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="font-bold" style={{ color: "var(--brand-brown)" }}>
            {formatVND(minPrice)}
            {product.prices.length > 1 && <span className="text-xs font-normal"> +</span>}
          </div>
          <button type="button" className="rounded-full px-3 py-1.5 text-xs transition ui-text hover:bg-[--brand-hover]" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
            {product.kind === "combo" ? "Xem combo" : "Tùy chọn"}
          </button>
        </div>
      </div>
    </div>
  );
}
