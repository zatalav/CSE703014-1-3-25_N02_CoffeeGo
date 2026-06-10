import { useState } from "react";
import { Eye, EyeOff, Coffee, Mail, Lock, Chrome } from "lucide-react";

interface LoginScreenProps {
  onLogin: (name: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    if (
      (email === "nhanvien@coffeego.vn" || email === "0901234567") &&
      password === "Coffee@123"
    ) {
      onLogin("Trần Minh Tú");
    } else {
      setError("Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: "linear-gradient(135deg, #2C1A0E 0%, #4A2C17 40%, #7B4A2D 100%)" }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-amber-300"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${Math.sin(i) * 30 + 50}%`,
                left: `${Math.cos(i) * 30 + 50}%`,
                transform: "translate(-50%, -50%)",
                opacity: 0.3 - i * 0.02,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center w-24 h-24 rounded-3xl mb-6 mx-auto" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
            <Coffee size={48} color="#F5C97A" />
          </div>
          <h1 className="text-white mb-3" style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Coffee<span style={{ color: "#F5C97A" }}>Go</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.1rem" }}>
            Hệ thống quản lý bán hàng thông minh
          </p>
          <div className="mt-12 space-y-4">
            {[
              { icon: "☕", text: "Tiếp nhận đơn hàng nhanh chóng" },
              { icon: "💳", text: "Thanh toán đa phương thức" },
              { icon: "⭐", text: "Quản lý điểm tích lũy khách hàng" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-left" style={{ color: "rgba(255,255,255,0.85)" }}>
                <span className="text-xl">{item.icon}</span>
                <span style={{ fontSize: "0.95rem" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl p-8 shadow-2xl" style={{ background: "#FEFAF6" }}>
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
              <Coffee size={28} style={{ color: "#7B4A2D" }} />
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2C1A0E" }}>
                Coffee<span style={{ color: "#D4A054" }}>Go</span>
              </span>
            </div>

            <h2 className="mb-1" style={{ color: "#2C1A0E", fontSize: "1.6rem", fontWeight: 700 }}>
              Đăng nhập
            </h2>
            <p className="mb-6" style={{ color: "#8B7355", fontSize: "0.9rem" }}>
              Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email/Phone */}
              <div>
                <label style={{ color: "#4A2C17", fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Email hoặc Số điện thoại
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A0856A" }} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nhanvien@coffeego.vn"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all"
                    style={{
                      background: "#F5EDE3",
                      border: "1.5px solid #E8D5C0",
                      color: "#2C1A0E",
                      fontSize: "0.9rem",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#D4A054"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E8D5C0"; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ color: "#4A2C17", fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A0856A" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border outline-none transition-all"
                    style={{
                      background: "#F5EDE3",
                      border: "1.5px solid #E8D5C0",
                      color: "#2C1A0E",
                      fontSize: "0.9rem",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#D4A054"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E8D5C0"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#A0856A", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: "#D4A054", width: "16px", height: "16px" }}
                  />
                  <span style={{ color: "#6B5344", fontSize: "0.85rem" }}>Nhớ mật khẩu</span>
                </label>
                <button
                  type="button"
                  style={{ color: "#C4813A", fontSize: "0.85rem", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                  <span style={{ color: "#DC2626", fontSize: "0.85rem" }}>⚠️ {error}</span>
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{
                  background: loading ? "#C4A882" : "linear-gradient(135deg, #7B4A2D, #C4813A)",
                  color: "#FEFAF6",
                  fontSize: "1rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 15px rgba(123,74,45,0.35)",
                }}
              >
                {loading ? "Đang xác thực..." : "Đăng nhập"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: "#E8D5C0" }} />
                <span style={{ color: "#A0856A", fontSize: "0.8rem" }}>hoặc</span>
                <div className="flex-1 h-px" style={{ background: "#E8D5C0" }} />
              </div>

              {/* Google login */}
              <button
                type="button"
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background: "#FFF",
                  border: "1.5px solid #E8D5C0",
                  color: "#4A2C17",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Chrome size={18} style={{ color: "#4285F4" }} />
                Đăng nhập bằng Google
              </button>
            </form>

            {/* Demo hint */}
            <div className="mt-5 p-3 rounded-xl" style={{ background: "#F0E8DC", border: "1px dashed #C4A882" }}>
              <p style={{ color: "#7B4A2D", fontSize: "0.78rem", textAlign: "center" }}>
                <strong>Demo:</strong> nhanvien@coffeego.vn · Coffee@123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
