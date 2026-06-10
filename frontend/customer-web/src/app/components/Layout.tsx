import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Coffee, ShoppingCart, User as UserIcon, Menu as MenuIcon, X, MessageCircle, Send } from "lucide-react";
import { useApp, formatVND } from "../store";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { productImg } from "../data";

const navItems = [
  { to: "/", label: "Trang chủ" },
  { to: "/products", label: "Menu" },
  { to: "/stores", label: "Cửa hàng" },
  { to: "/rewards", label: "Ưu đãi" },
  { to: "/news", label: "Tin tức" },
  { to: "/about", label: "Giới thiệu" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { cart, user, logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(250,246,240,0.95)" : "rgba(250,246,240,0.6)",
        backdropFilter: "blur(16px)",
        boxShadow: scrolled ? "0 2px 12px rgba(44,26,14,0.08)" : "none",
        borderBottom: "1px solid rgba(217,196,168,0.4)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
            <Coffee size={22} />
          </div>
          <div className="leading-tight">
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--brand-brown)", fontWeight: 700 }}>CoffeeGo</div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Cà phê Việt</div>
          </div>
        </NavLink>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                "relative ui-text text-sm transition-colors hover:text-[--brand-hover] " +
                (isActive ? "text-[--brand-brown] font-semibold" : "text-[--text-secondary]")
              }
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-2 left-0 right-0 h-0.5" style={{ background: "var(--brand-brown)" }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/cart")}
            aria-label="Giỏ hàng"
            className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-[--bg-section] transition"
          >
            <ShoppingCart size={20} style={{ color: "var(--brand-brown)" }} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ background: "var(--brand-hover)", color: "white" }}>
                {cartCount}
              </span>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => user ? setUserMenuOpen(!userMenuOpen) : navigate("/login")}
              aria-label="Tài khoản"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[--bg-section] transition overflow-hidden"
              style={{ border: "1.5px solid var(--border-line)" }}
            >
              {user ? (
                <div className="w-full h-full flex items-center justify-center text-sm font-semibold" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <UserIcon size={18} style={{ color: "var(--brand-brown)" }} />
              )}
            </button>
            {user && userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl py-2" style={{ background: "white", border: "1px solid var(--border-line)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-line)" }}>
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{user.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{user.dripPoints} điểm DRIP · {user.tier}</div>
                </div>
                {[
                  { l: "Thông tin", to: "/profile?tab=info" },
                  { l: "Đơn hàng", to: "/profile?tab=orders" },
                  { l: "Hạng thành viên", to: "/profile?tab=membership" },
                  { l: "Đánh giá", to: "/profile?tab=reviews" },
                ].map((m) => (
                  <button
                    key={m.to}
                    onClick={() => { navigate(m.to); setUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[--bg-section]"
                  >{m.l}</button>
                ))}
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-4 py-2 text-sm border-t hover:bg-[--bg-section]"
                  style={{ borderColor: "var(--border-line)", color: "var(--error)" }}
                >Đăng xuất</button>
              </div>
            )}
          </div>
          <button
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-20 z-40" style={{ background: "var(--bg-primary)" }}>
          <nav className="flex flex-col p-6 gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  "py-3 px-4 rounded-lg ui-text " +
                  (isActive ? "bg-[--brand-brown] text-[--bg-primary]" : "text-[--text-primary] hover:bg-[--bg-section]")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function CartSidebar() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty } = useApp();
  const navigate = useNavigate();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (!cartOpen) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] flex flex-col" style={{ background: "var(--bg-primary)" }}>
        <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: "var(--border-line)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>Giỏ hàng của bạn</h3>
          <button onClick={() => setCartOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[--bg-section]">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <Coffee className="mx-auto mb-4" size={58} style={{ color: "var(--brand-brown)" }} />
              <p style={{ color: "var(--text-secondary)" }}>Giỏ hàng đang trống</p>
              <button
                onClick={() => { setCartOpen(false); navigate("/products"); }}
                className="mt-4 px-6 py-2 rounded-lg ui-text"
                style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
              >Khám phá menu</button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 rounded-lg" style={{ background: "white", border: "1px solid var(--border-line)" }}>
                <div className="w-16 h-16 overflow-hidden rounded-lg flex-shrink-0" style={{ background: "var(--bg-card)" }}>
                  {item.image ? (
                    <ImageWithFallback src={productImg(item.image)} alt={item.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{item.name}</div>
                  {item.size && <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Size: {item.size}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded border" style={{ borderColor: "var(--border-line)" }}>−</button>
                      <span className="w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded border" style={{ borderColor: "var(--border-line)" }}>+</button>
                    </div>
                    <div className="font-semibold" style={{ color: "var(--brand-brown)" }}>{formatVND(item.price * item.qty)}</div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-xs self-start" style={{ color: "var(--error)" }}>✕</button>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-5 border-t" style={{ borderColor: "var(--border-line)" }}>
            <div className="flex justify-between mb-4">
              <span style={{ color: "var(--text-secondary)" }}>Tổng cộng</span>
              <span className="font-bold text-lg" style={{ color: "var(--brand-brown)" }}>{formatVND(total)}</span>
            </div>
            <button
              onClick={() => { setCartOpen(false); navigate("/checkout"); }}
              className="w-full py-3 rounded-lg ui-text font-semibold transition hover:scale-[1.02]"
              style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
            >Đặt hàng</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Chào bạn ơi! ☕ Mình là CoffeeGo Hỗ Trợ. Bạn cần giúp gì nhé?" },
  ]);
  const [input, setInput] = useState("");
  const quickReplies = ["Giờ mở cửa", "Địa chỉ", "Đặt hàng", "Đổi trả", "Khuyến mãi", "Liên hệ"];

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "user", text }, { from: "bot", text: "Cảm ơn bạn nhé! Mình sẽ giúp bạn ngay ơi 🌿" }]);
    setInput("");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[55]">
      {open ? (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col" style={{ background: "white", border: "1px solid var(--border-line)" }}>
          <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: "var(--border-line)", background: "var(--brand-brown)", color: "var(--bg-primary)", borderRadius: "1rem 1rem 0 0" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--bg-primary)", color: "var(--brand-brown)" }}>
              <Coffee size={22} />
            </div>
            <div className="flex-1">
              <div className="font-semibold ui-text">CoffeeGo Hỗ Trợ</div>
              <div className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" /> Đang online
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 hover:bg-white/10 rounded-full"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "var(--bg-primary)" }}>
            {messages.map((m, i) => (
              <div key={i} className={"flex " + (m.from === "user" ? "justify-end" : "justify-start")}>
                <div className="max-w-[80%] px-4 py-2 rounded-2xl text-sm" style={{ background: m.from === "user" ? "var(--brand-brown)" : "white", color: m.from === "user" ? "var(--bg-primary)" : "var(--text-primary)", border: m.from === "bot" ? "1px solid var(--border-line)" : "none" }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--border-line)" }}>
            {quickReplies.map((q) => (
              <button key={q} onClick={() => send(q)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--bg-section)", color: "var(--brand-brown)" }}>{q}</button>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border-line)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-line)" }}
            />
            <button onClick={() => send(input)} className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở chat"
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition"
          style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20" style={{ background: "#2C1A0E", color: "#F0E8DC" }}>
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--bg-primary)", color: "var(--brand-brown)" }}>
              <Coffee size={22} />
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>CoffeeGo</div>
          </div>
          <p className="text-sm opacity-80 italic">"Một ly cà phê — Một khoảnh khắc Việt."</p>
        </div>
        <div>
          <h4 className="mb-3" style={{ color: "#FAF6F0" }}>Khám phá</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Menu</li><li>Cửa hàng</li><li>Ưu đãi</li><li>Tin tức</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3" style={{ color: "#FAF6F0" }}>Liên hệ</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Hotline: 1900 6868</li>
            <li>Email: hello@coffeego.vn</li>
            <li>234 Lạc Long Quân, Hà Nội</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3" style={{ color: "#FAF6F0" }}>Theo dõi</h4>
          <div className="flex gap-3">
            {["FB", "IG", "TT", "YT"].map((s) => (
              <div key={s} className="w-10 h-10 rounded-full flex items-center justify-center text-xs cursor-pointer hover:scale-110 transition" style={{ background: "rgba(255,255,255,0.1)" }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t" style={{ borderColor: "rgba(217,196,168,0.2)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs opacity-70 flex flex-col md:flex-row justify-between gap-2">
          <div>© 2026 CoffeeGo. Mọi quyền được bảo lưu.</div>
          <div className="flex gap-4"><span>Điều khoản</span><span>Chính sách bảo mật</span></div>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartSidebar />
      <Chatbot />
    </div>
  );
}
