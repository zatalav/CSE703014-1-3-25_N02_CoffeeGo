import { useState } from "react";
import { Phone, Lock, Eye, EyeOff, Coffee } from "lucide-react";
import { motion } from "motion/react";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [remember, setRemember] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleLogin = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);

    const rawPhone = phone.replace(/\s/g, "");
    if (rawPhone === "0912345678" && password === "123456") {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 600);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #18181B 0%, #232328 40%, #18181B 100%)" }}
    >
      {/* Background coffee rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ border: "40px solid #E8A020" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-8"
          style={{ border: "30px solid #2D2D33" }}
        />
        <div
          className="absolute top-1/3 -left-10 w-40 h-40 rounded-full opacity-5"
          style={{ border: "20px solid #E8A020" }}
        />
      </div>

      <motion.div
        className="w-full max-w-sm z-10"
        animate={error ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4 relative"
            style={{ background: "linear-gradient(135deg, #E8A020, #C47A10)" }}
          >
            <Coffee size={44} color="#18181B" strokeWidth={2} />
            {/* Speed lines */}
            <div className="absolute -right-1 top-6 flex flex-col gap-1">
              {[12, 8, 6].map((w, i) => (
                <div
                  key={i}
                  className="h-0.5 rounded-full"
                  style={{ width: w, background: "#FAFAFA", opacity: 0.6 }}
                />
              ))}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontFamily: "Syne, sans-serif", color: "#FAFAFA" }}
            className="mb-1"
          >
            CoffeeGo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ fontFamily: "DM Sans, sans-serif", color: "#A1A1AA" }}
            className="text-sm italic"
          >
            Giao nhanh – Uống ngon
          </motion.p>
        </div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl p-6 space-y-4"
          style={{ background: "rgba(61,28,2,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,160,32,0.15)" }}
        >
          {/* Phone input */}
          <div className="space-y-1.5">
            <label style={{ fontFamily: "DM Sans, sans-serif", color: "#A1A1AA", fontSize: 15 }}>
              Số điện thoại
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: "#A1A1AA" }}
              />
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="0912 345 678"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none transition-all"
                style={{
                  background: "rgba(28,10,0,0.6)",
                  color: "#FAFAFA",
                  border: "1px solid rgba(232,160,32,0.2)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 17,
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(232,160,32,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(232,160,32,0.2)")}
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label style={{ fontFamily: "DM Sans, sans-serif", color: "#A1A1AA", fontSize: 15 }}>
              Mật khẩu
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: "#A1A1AA" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl outline-none transition-all"
                style={{
                  background: "rgba(28,10,0,0.6)",
                  color: "#FAFAFA",
                  border: "1px solid rgba(232,160,32,0.2)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 17,
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(232,160,32,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(232,160,32,0.2)")}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "#A1A1AA" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setRemember(!remember)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer"
                style={{
                  background: remember ? "#E8A020" : "transparent",
                  border: `2px solid ${remember ? "#E8A020" : "#A1A1AA"}`,
                }}
              >
                {remember && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontFamily: "DM Sans, sans-serif", color: "#A1A1AA", fontSize: 15 }}>
                Ghi nhớ 30 ngày
              </span>
            </label>
            <button style={{ fontFamily: "DM Sans, sans-serif", color: "#A1A1AA", fontSize: 15 }}>
              Quên mật khẩu?
            </button>
          </div>

          {/* Login button */}
          <motion.button
            onClick={handleLogin}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #E8A020, #C47A10)",
              fontFamily: "Syne, sans-serif",
              color: "#18181B",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "0.02em",
              minHeight: 54,
            }}
          >
            {loading ? (
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#18181B" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 20" />
              </svg>
            ) : (
              "Đăng nhập"
            )}
          </motion.button>
        </motion.div>

        {/* Error hint */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-3 text-sm"
            style={{ color: "#E94545", fontFamily: "DM Sans, sans-serif" }}
          >
            Số điện thoại hoặc mật khẩu không đúng
          </motion.p>
        )}

        <p className="text-center mt-6 text-xs" style={{ color: "#A1A1AA", fontFamily: "DM Sans, sans-serif" }}>
          Demo: 0912 345 678 / 123456
        </p>
      </motion.div>
    </div>
  );
}
