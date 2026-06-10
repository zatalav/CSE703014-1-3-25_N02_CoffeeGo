import { Link, useNavigate } from "react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { formatVND, useApp } from "../store";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { productImg } from "../data";

export default function Cart() {
  const { cart, removeFromCart, updateQty } = useApp();
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--bg-section)", color: "var(--brand-brown)" }}>
          <ShoppingBag size={46} />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem" }}>Giỏ hàng đang trống</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Chọn món yêu thích trước khi thanh toán.</p>
        <Link
          to="/products"
          className="mt-6 rounded-xl px-6 py-3 font-semibold ui-text"
          style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
        >
          Xem sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <Link to="/products" className="text-sm hover:underline" style={{ color: "var(--brand-brown)" }}>Tiếp tục mua hàng</Link>
        <h1 className="mt-3" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Giỏ hàng</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {cart.map((item) => (
            <article key={item.id} className="flex gap-4 rounded-2xl bg-white p-4" style={{ border: "1px solid var(--border-line)" }}>
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl" style={{ background: "var(--bg-card)" }}>
                {item.image ? (
                  <ImageWithFallback src={productImg(item.image)} alt={item.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{item.name}</h2>
                {item.size && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Size: {item.size}</p>}
                {item.note && <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{item.note}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, item.qty - 1)} className="h-8 w-8 rounded-lg border" style={{ borderColor: "var(--border-line)" }}>-</button>
                  <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} className="h-8 w-8 rounded-lg border" style={{ borderColor: "var(--border-line)" }}>+</button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeFromCart(item.id)} className="rounded-lg p-2" style={{ color: "var(--error)" }} aria-label="Xóa sản phẩm">
                  <Trash2 size={16} />
                </button>
                <div className="font-bold" style={{ color: "var(--brand-brown)" }}>{formatVND(item.price * item.qty)}</div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-2xl bg-white p-6" style={{ border: "1px solid var(--border-line)" }}>
          <h2 className="mb-4 font-semibold">Tóm tắt đơn hàng</h2>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Tạm tính</span>
            <span>{formatVND(total)}</span>
          </div>
          <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold" style={{ borderColor: "var(--border-line)" }}>
            <span>Tổng cộng</span>
            <span style={{ color: "var(--brand-brown)" }}>{formatVND(total)}</span>
          </div>
          <button
            onClick={() => navigate("/checkout")}
            className="mt-6 w-full rounded-xl py-3 font-semibold ui-text"
            style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
          >
            Thanh toán
          </button>
        </aside>
      </div>
    </div>
  );
}
