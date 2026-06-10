import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { User, useApp } from "../store";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { API_BASE_URL, apiUrl } from "../api";

type GoogleCredentialResponse = {
  credential?: string;
};

type AuthApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: string;
  userInfo: {
    id?: number | string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    roleName?: string;
    expPoints?: number | string;
    dripPoints?: number | string;
    tier?: string;
  };
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

const SYSTEM_WEB_URL = (((import.meta as any).env?.VITE_SYSTEM_WEB_URL as string | undefined) || "http://localhost:5180").replace(/\/+$/, "");
const GOOGLE_CLIENT_ID = (((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined) || "").trim();
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_SCRIPT_TIMEOUT_MS = 10000;
const AUTH_SUCCESS_PATH = "/products";

function normalizeRole(role?: string | null) {
  return (role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isCustomerRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "customer" || normalized === "khach_hang";
}

function systemPathForRole(role?: string | null) {
  const normalized = normalizeRole(role);
  if (normalized === "admin" || normalized.endsWith("_admin")) return "/dashboard";
  if (normalized.includes("branch_manager") || normalized.includes("sale_manager") || normalized.includes("sales_manager")) return "/branches";
  if (normalized.includes("warehouse_manager") || normalized.includes("warehouse_staff")) return "/inventory";
  if (normalized.includes("delivery_staff") || normalized === "shipper") return "/delivery";
  return "/staff";
}

function encodeTransferredSession(session: LoginResponse) {
  return encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(session))));
}

function redirectToSystemWeb(session: LoginResponse) {
  const roleName = session.userInfo?.roleName || session.role;
  window.location.assign(`${SYSTEM_WEB_URL}${systemPathForRole(roleName)}#auth=${encodeTransferredSession(session)}`);
}

async function readAuthApiResponse<T>(response: Response): Promise<AuthApiResponse<T>> {
  const text = await response.text();
  if (!text) {
    return {
      success: false,
      message: response.ok ? "Máy chủ không trả về dữ liệu đăng nhập." : "Máy chủ không trả về lỗi đăng nhập.",
    };
  }

  try {
    return JSON.parse(text) as AuthApiResponse<T>;
  } catch {
    return {
      success: false,
      message: response.ok ? "Không đọc được phản hồi đăng nhập từ máy chủ." : text,
    };
  }
}

function errorMessageFromPayload<T>(payload: AuthApiResponse<T>, fallback: string) {
  if (payload.message) return payload.message;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const firstError = payload.errors[0] as { field?: string; message?: string };
    if (firstError?.message) return firstError.message;
  }
  return fallback;
}

function apiConnectionError(error: unknown) {
  if (error instanceof TypeError) {
    return `Không kết nối được API tại ${API_BASE_URL}. Hãy khởi động api-gateway ở cổng 8080 và auth-service ở cổng 8081, hoặc cập nhật VITE_API_BASE_URL trong frontend/customer-web/.env.`;
  }
  return "";
}

function toOptionalNumber(value: number | string | undefined) {
  if (typeof value === "number") return value;
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeTier(value?: string): User["tier"] {
  const normalized = (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("black")) return "Black";
  if (normalized.includes("platinum")) return "Platinum";
  return "Gold";
}

function userFromLoginResponse(data: LoginResponse, provider: User["authProvider"], fallbackIdentifier = ""): User {
  const userInfo = data.userInfo || {};
  const id = toOptionalNumber(userInfo.id);
  const email = userInfo.email || (fallbackIdentifier.includes("@") ? fallbackIdentifier : "");
  const phone = userInfo.phoneNumber || (!fallbackIdentifier.includes("@") ? fallbackIdentifier : "");
  return {
    id,
    name: userInfo.name || email || phone || "Khách CoffeeGo",
    phone,
    email,
    dripPoints: toOptionalNumber(userInfo.dripPoints) ?? 0,
    tier: normalizeTier(userInfo.tier),
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    authProvider: provider,
    role: userInfo.roleName || data.role,
  };
}

function waitForGoogleIdentity(timeoutMs = GOOGLE_SCRIPT_TIMEOUT_MS) {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("Không tải được Google Identity Services"));
      }
    }, 100);
  });
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
  if (existing) return waitForGoogleIdentity();

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForGoogleIdentity().then(resolve, reject);
    script.onerror = () => reject(new Error("Không tải được Google Identity Services"));
    document.head.appendChild(script);
  });
}

function GoogleMark() {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sm font-bold"
      style={{
        color: "#4285F4",
        background: "white",
        border: "1px solid #E5E7EB",
        fontFamily: "Arial, sans-serif",
      }}
    >
      G
    </span>
  );
}

function AuthLayout({ children, sideText }: { children: ReactNode; sideText: string }) {
  return (
    <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden p-12 lg:flex">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80"
          alt="CoffeeGo"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.7 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(92,51,23,0.5) 0%, rgba(250,246,240,0.3) 100%)" }} />
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-5xl" style={{ background: "var(--bg-primary)" }}>☕</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "white", fontWeight: 700 }}>CoffeeGo</div>
          <p className="mt-2 italic" style={{ color: "var(--bg-primary)" }}>"Một ly cà phê - Một khoảnh khắc Việt"</p>
          <p className="mx-auto mt-8 max-w-sm" style={{ color: "var(--bg-primary)" }}>{sideText}</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ phone: "", password: "" });
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleSigningInRef = useRef(false);
  const [googleLoading, setGoogleLoading] = useState(Boolean(GOOGLE_CLIENT_ID));
  const [googleError, setGoogleError] = useState("");
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.phone || !form.password) {
      toast.error("Vui lòng nhập đầy đủ");
      return;
    }
    setSubmitting(true);
    try {
      const identifier = form.phone.trim();
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: form.password }),
      });
      const payload = await readAuthApiResponse<LoginResponse>(response);
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(errorMessageFromPayload(payload, "Đăng nhập thất bại."));
      }
      const roleName = payload.data.userInfo?.roleName || payload.data.role;
      if (!isCustomerRole(roleName)) {
        redirectToSystemWeb(payload.data);
        return;
      }
      login(userFromLoginResponse(payload.data, "password", identifier));
      toast.success("Đăng nhập thành công!");
      navigate(AUTH_SUCCESS_PATH);
    } catch (error) {
      toast.error(apiConnectionError(error) || (error instanceof Error ? error.message : "Đăng nhập thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credentialResponse: GoogleCredentialResponse) => {
    if (!credentialResponse.credential) {
      const message = "Google không trả về mã xác thực.";
      setGoogleError(message);
      toast.error(message);
      return;
    }

    if (googleSigningInRef.current) return;

    googleSigningInRef.current = true;
    setGoogleError("");
    setGoogleSigningIn(true);
    try {
      const response = await fetch(apiUrl("/auth/customer/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const payload = await readAuthApiResponse<LoginResponse>(response);
      if (!response.ok || !payload.success || !payload.data) {
        const apiError = errorMessageFromPayload(payload, "");
        if (apiError) {
          throw new Error(apiError === "Invalid Google token"
            ? "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."
            : apiError);
        }
        throw new Error(payload.message || "Đăng nhập Google thất bại.");
      }

      login(userFromLoginResponse(payload.data, "google"));
      toast.success("Đăng nhập Google thành công!");
      navigate(AUTH_SUCCESS_PATH);
    } catch (error) {
      googleSigningInRef.current = false;
      setGoogleSigningIn(false);
      const message = apiConnectionError(error) || (error instanceof Error ? error.message : "Đăng nhập Google thất bại.");
      setGoogleError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    setGoogleError("");

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "continue_with",
          locale: "vi",
          logo_alignment: "left",
          width: googleButtonRef.current.offsetWidth || 360,
        });
        setGoogleLoading(false);
      })
      .catch((error) => {
        setGoogleLoading(false);
        const message = error instanceof Error ? error.message : "Không tải được Google.";
        setGoogleError(message);
        toast.error(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthLayout sideText="Chào mừng trở lại. Ly cà phê yêu thích của bạn chỉ còn cách một lần đăng nhập.">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem" }}>
        Chào mừng <em style={{ color: "var(--brand-brown)" }}>trở lại</em>
      </h1>
      <p className="mb-8 mt-2" style={{ color: "var(--text-secondary)" }}>Đăng nhập để tích điểm DRIP và đổi ưu đãi.</p>

      <div className="mb-6">
        {GOOGLE_CLIENT_ID ? (
          <>
            <div ref={googleButtonRef} className={`min-h-[44px] w-full ${googleLoading || googleSigningIn ? "pointer-events-none opacity-60" : ""}`} />
            {(googleLoading || googleSigningIn) && (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-3 rounded-lg py-2.5 text-sm ui-text"
                style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}
              >
                <GoogleMark />
                Đang tải Google...
              </button>
            )}
            {googleError && (
              <div role="alert" className="mt-3 rounded-lg px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" }}>
                {googleError}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--bg-section)", color: "var(--text-secondary)", border: "1px solid var(--border-line)" }}>
            Chưa cấu hình Google Client ID cho trang khách hàng.
          </div>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        <div className="h-px flex-1" style={{ background: "var(--border-line)" }} />
        hoặc
        <div className="h-px flex-1" style={{ background: "var(--border-line)" }} />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Số điện thoại / Email</label>
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="mt-1 w-full rounded-lg px-3 py-2.5 outline-none"
            style={{ background: "white", border: "1px solid var(--border-line)" }}
          />
        </div>
        <div>
          <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Mật khẩu</label>
          <div className="relative mt-1">
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full rounded-lg px-3 py-2.5 pr-10 outline-none"
              style={{ background: "white", border: "1px solid var(--border-line)" }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" /> Ghi nhớ</label>
          <Link to="/forgot-password" style={{ color: "var(--brand-brown)" }}>Quên mật khẩu?</Link>
        </div>
        <button type="submit" disabled={submitting} className="w-full rounded-lg py-3 font-semibold transition ui-text hover:scale-[1.01]" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)", opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: "var(--brand-brown)" }} className="font-semibold">Đăng ký ngay</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "", dob: "", gender: "Nam" });
  const [submitting, setSubmitting] = useState(false);

  const next = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
        toast.error("Vui lòng nhập đầy đủ thông tin đăng ký.");
        return;
      }
      if (form.password.length < 6) {
        toast.error("Mật khẩu tối thiểu 6 ký tự.");
        return;
      }
      if (form.password !== form.confirm) {
        toast.error("Mật khẩu xác nhận không khớp.");
        return;
      }
    }
    setStep((value) => value + 1);
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phoneNumber: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
          dateOfBirth: form.dob || undefined,
          gender: form.gender,
        }),
      });
      const payload = await readAuthApiResponse<LoginResponse>(response);
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(errorMessageFromPayload(payload, "Đăng ký thất bại."));
      }
      login(userFromLoginResponse(payload.data, "password", form.email.trim()));
      toast.success(`Chào mừng đến CoffeeGo, ${form.name}!`);
      navigate(AUTH_SUCCESS_PATH);
    } catch (error) {
      toast.error(apiConnectionError(error) || (error instanceof Error ? error.message : "Đăng ký thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout sideText="Tham gia gia đình CoffeeGo: tích điểm DRIP, đổi ưu đãi và nhận quà sinh nhật mỗi năm.">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem" }}>
        Tạo <em style={{ color: "var(--brand-brown)" }}>tài khoản</em>
      </h1>
      <div className="mb-8 mt-4 flex items-center gap-2 text-xs ui-text">
        {[1, 2].map((item) => (
          <div key={item} className="flex flex-1 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: item <= step ? "var(--brand-brown)" : "var(--border-line)", color: "var(--bg-primary)" }}>{item}</div>
            {item < 2 && <div className="h-px flex-1" style={{ background: item < step ? "var(--brand-brown)" : "var(--border-line)" }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {[
            { key: "name", label: "Họ và tên" },
            { key: "phone", label: "Số điện thoại" },
            { key: "email", label: "Email" },
            { key: "password", label: "Mật khẩu", type: "password" },
            { key: "confirm", label: "Xác nhận mật khẩu", type: "password" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>{field.label}</label>
              <input
                type={field.type || "text"}
                value={(form as any)[field.key]}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2.5 outline-none"
                style={{ background: "white", border: "1px solid var(--border-line)" }}
              />
            </div>
          ))}
          <button onClick={next} className="w-full rounded-lg py-3 font-semibold ui-text" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Tiếp tục</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Ngày sinh</label>
            <input type="date" value={form.dob} onChange={(event) => setForm({ ...form, dob: event.target.value })} className="mt-1 w-full rounded-lg px-3 py-2.5 outline-none" style={{ background: "white", border: "1px solid var(--border-line)" }} />
          </div>
          <div>
            <label className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>Giới tính</label>
            <div className="mt-1 flex gap-2">
              {["Nam", "Nữ", "Khác"].map((gender) => (
                <button key={gender} onClick={() => setForm({ ...form, gender })} className="flex-1 rounded-lg py-2.5 text-sm ui-text" style={{ background: form.gender === gender ? "var(--bg-section)" : "white", border: "1.5px solid " + (form.gender === gender ? "var(--brand-brown)" : "var(--border-line)") }}>{gender}</button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" defaultChecked /> Đồng ý <a className="underline" style={{ color: "var(--brand-brown)" }}>Điều khoản dịch vụ</a></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" /> Nhận thông báo ưu đãi qua SMS/Email</label>
          <button onClick={finish} disabled={submitting} className="w-full rounded-lg py-3 font-semibold ui-text" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}</button>
        </div>
      )}

    </AuthLayout>
  );
}

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [sending, setSending] = useState(false);

  const sendOtp = async () => {
    if (!identifier.trim()) {
      toast.error("Vui lòng nhập số điện thoại hoặc email.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const payload = await readAuthApiResponse<void>(response);
      if (!response.ok || payload.success === false) {
        throw new Error(errorMessageFromPayload(payload, "Không gửi được mã xác nhận."));
      }
      toast.success("Đã gửi mã xác nhận.");
      setStep(2);
    } catch (error) {
      toast.error(apiConnectionError(error) || (error instanceof Error ? error.message : "Không gửi được mã xác nhận."));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout sideText="Đừng lo lắng, chỉ vài bước nhỏ là bạn có thể lấy lại mật khẩu.">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem" }}>
        Quên <em style={{ color: "var(--brand-brown)" }}>mật khẩu?</em>
      </h1>
      <p className="mb-6 mt-2" style={{ color: "var(--text-secondary)" }}>Bước {step}/3</p>
      {step === 1 && (
        <div className="space-y-4">
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Số điện thoại hoặc Email"
            className="w-full rounded-lg px-3 py-2.5 outline-none"
            style={{ background: "white", border: "1px solid var(--border-line)" }}
          />
          <button
            onClick={sendOtp}
            disabled={sending}
            className="w-full rounded-lg py-3 font-semibold ui-text"
            style={{ background: "var(--brand-brown)", color: "var(--bg-primary)", opacity: sending ? 0.7 : 1 }}
          >
            {sending ? "Đang gửi..." : "Gửi mã xác nhận"}
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <input maxLength={6} placeholder="• • • • • •" className="w-full rounded-lg py-3 text-center text-2xl tracking-[0.5em] outline-none" style={{ background: "white", border: "1px solid var(--border-line)" }} />
          <button onClick={() => setStep(3)} className="w-full rounded-lg py-3 font-semibold ui-text" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Xác nhận OTP</button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <input type="password" placeholder="Mật khẩu mới" className="w-full rounded-lg px-3 py-2.5 outline-none" style={{ background: "white", border: "1px solid var(--border-line)" }} />
          <input type="password" placeholder="Xác nhận mật khẩu" className="w-full rounded-lg px-3 py-2.5 outline-none" style={{ background: "white", border: "1px solid var(--border-line)" }} />
          <button onClick={() => { toast.success("Đổi mật khẩu thành công!"); setTimeout(() => navigate("/login"), 1500); }} className="w-full rounded-lg py-3 font-semibold ui-text" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>Đặt lại mật khẩu</button>
        </div>
      )}
    </AuthLayout>
  );
}
