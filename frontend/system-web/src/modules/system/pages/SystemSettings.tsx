import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Save, Upload, Eye, EyeOff, ShieldCheck, Bell, Cpu, Lock, RotateCcw, Globe, Palette, CreditCard, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";

const tabs = [
  { key: "brand", label: "Thương hiệu", icon: Palette },
  { key: "orders", label: "Đặt hàng", icon: Globe },
  { key: "payments", label: "Thanh toán", icon: CreditCard },
  { key: "membership", label: "Hội viên", icon: ShieldCheck },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "ai", label: "AI & Dữ liệu", icon: Cpu },
  { key: "security", label: "Bảo mật", icon: Lock },
  { key: "logs", label: "Nhật ký hệ thống", icon: RotateCcw },
];

const logData: Array<{ id: number; time: string; user: string; action: string; module: string; level: string }> = [];

type VnpayConfig = {
  provider: string;
  enabled: boolean;
  payUrl: string;
  tmnCode: string;
  maskedHashSecret: string;
  returnUrl: string;
  sandbox: boolean;
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[#0F4761]" : "bg-gray-300"}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

export function SystemSettings() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "vnpay" ? "payments" : "brand");
  const [showPass, setShowPass] = useState(false);
  const [vnpayConfig, setVnpayConfig] = useState<VnpayConfig | null>(null);
  const [loadingVnpayConfig, setLoadingVnpayConfig] = useState(false);
  const [vnpayConfigError, setVnpayConfigError] = useState("");

  // Brand state
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0F4761");
  const [accentColor, setAccentColor] = useState("#F59E0B");
  const [timezone, setTimezone] = useState("");
  const [currency, setCurrency] = useState("");

  // Order state
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [maxCancel, setMaxCancel] = useState(0);
  const [orderTimeout, setOrderTimeout] = useState(0);
  const [allowNote, setAllowNote] = useState(false);
  const [minOrder, setMinOrder] = useState(0);

  // Membership state
  const [pointRate, setPointRate] = useState(0);
  const [goldMin, setGoldMin] = useState(0);
  const [platinumMin, setPlatinumMin] = useState(0);
  const [blackMin, setBlackMin] = useState(0);
  const [birthdayBonus, setBirthdayBonus] = useState(false);
  const [expirePoints, setExpirePoints] = useState(false);

  // Notification state
  const [notifOrder, setNotifOrder] = useState(false);
  const [notifStock, setNotifStock] = useState(false);
  const [notifAI, setNotifAI] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifPush, setNotifPush] = useState(false);
  const [stockThreshold, setStockThreshold] = useState(0);

  // AI state
  const [autoForecast, setAutoForecast] = useState(false);
  const [forecastTime, setForecastTime] = useState("");
  const [anomalyEnabled, setAnomalyEnabled] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState(0);
  const [retentionDays, setRetentionDays] = useState(0);

  const loadVnpayConfig = async () => {
    setLoadingVnpayConfig(true);
    setVnpayConfigError("");
    try {
      const config = await api.get<VnpayConfig>("/payments/sandbox/config");
      setVnpayConfig(config);
    } catch (error) {
      setVnpayConfig(null);
      setVnpayConfigError(error instanceof Error ? error.message : "Khong tai duoc cau hinh VNPAY.");
    } finally {
      setLoadingVnpayConfig(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("tab") === "vnpay") {
      setActiveTab("payments");
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "payments") {
      void loadVnpayConfig();
    }
  }, [activeTab]);

  const save = () => toast.success("Đã lưu cài đặt thành công!");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Cài đặt hệ thống</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Quản lý cấu hình toàn hệ thống</p>
        </div>
        {activeTab !== "logs" && activeTab !== "payments" && (
          <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 bg-[#0F4761] text-white rounded-lg" style={{ fontSize: "13.5px", fontWeight: 600 }}>
            <Save size={15} /> Lưu thay đổi
          </button>
        )}
      </div>

      <div className="flex gap-5">
        {/* Tab list */}
        <div className="w-52 shrink-0 space-y-1">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === t.key ? "bg-[#0F4761] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                style={{ fontSize: "13.5px" }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {/* Brand */}
          {activeTab === "brand" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Thông tin thương hiệu</h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Tên thương hiệu</label>
                  <input value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Tagline</label>
                  <input value={tagline} onChange={e => setTagline(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-[#0F4761] flex items-center justify-center">
                      <span style={{ fontSize: "20px", fontWeight: 800, color: "white" }}>T</span>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50" style={{ fontSize: "13px" }}>
                      <Upload size={14} /> Tải lên logo
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Màu chủ đạo</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-10 cursor-pointer rounded-lg border border-gray-200" />
                    <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-12 h-10 cursor-pointer rounded-lg border border-gray-200" />
                    <input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Múi giờ</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }}>
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Đơn vị tiền tệ</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }}>
                    <option value="VND">VND — Việt Nam Đồng</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === "orders" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Cài đặt đặt hàng</h3>
              <div className="space-y-4">
                {[
                  { label: "Tự động xác nhận đơn hàng", desc: "Tự động chuyển đơn sang trạng thái Đang pha chế", val: autoConfirm, set: setAutoConfirm },
                  { label: "Cho phép ghi chú đơn hàng", desc: "Khách hàng có thể thêm ghi chú tùy chỉnh", val: allowNote, set: setAllowNote },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#111827" }}>{r.label}</div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{r.desc}</div>
                    </div>
                    <Toggle checked={r.val} onChange={r.set} />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Số lần hủy tối đa/ngày</label>
                    <input type="number" value={maxCancel} onChange={e => setMaxCancel(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Thời gian hết hạn đơn (phút)</label>
                    <input type="number" value={orderTimeout} onChange={e => setOrderTimeout(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Giá trị đơn tối thiểu (đ)</label>
                    <input type="number" value={minOrder} onChange={e => setMinOrder(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Cấu hình VNPAY Sandbox</h3>
                    <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: "4px" }}>Nguồn runtime: order-service /api/payments/sandbox/config</p>
                  </div>
                  <button
                    onClick={() => void loadVnpayConfig()}
                    disabled={loadingVnpayConfig}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                    style={{ fontSize: "13px", fontWeight: 600, color: "#0F4761" }}
                  >
                    <RefreshCw size={14} className={loadingVnpayConfig ? "animate-spin" : ""} />
                    Làm mới
                  </button>
                </div>

                {vnpayConfigError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <AlertTriangle size={18} style={{ color: "#DC2626", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#991B1B" }}>Không tải được cấu hình VNPAY</div>
                      <div style={{ fontSize: "12.5px", color: "#B91C1C", marginTop: "2px" }}>{vnpayConfigError}</div>
                    </div>
                  </div>
                )}

                {!vnpayConfigError && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>Trạng thái</div>
                      <div className="mt-2 flex items-center gap-2" style={{ color: vnpayConfig?.enabled ? "#047857" : "#B91C1C", fontSize: "14px", fontWeight: 700 }}>
                        <CheckCircle2 size={16} />
                        {loadingVnpayConfig ? "Đang kiểm tra..." : vnpayConfig?.enabled ? "Đang bật" : "Chưa bật"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>Môi trường</div>
                      <div className="mt-2" style={{ color: vnpayConfig?.sandbox ? "#92400E" : "#047857", fontSize: "14px", fontWeight: 700 }}>
                        {loadingVnpayConfig ? "Đang tải..." : vnpayConfig?.sandbox ? "Sandbox" : "Production"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Terminal ID / TMN Code</label>
                      <input readOnly value={vnpayConfig?.tmnCode || ""} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50" style={{ fontSize: "13.5px" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Hash Secret</label>
                      <input readOnly value={vnpayConfig?.maskedHashSecret || ""} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50" style={{ fontSize: "13.5px" }} />
                    </div>
                    <div className="col-span-2">
                      <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Pay URL</label>
                      <div className="flex gap-2">
                        <input readOnly value={vnpayConfig?.payUrl || ""} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50" style={{ fontSize: "13.5px" }} />
                        {vnpayConfig?.payUrl && (
                          <a href={vnpayConfig.payUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center px-3 rounded-lg border border-gray-200 hover:bg-gray-50" style={{ color: "#0F4761" }}>
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Return URL mặc định</label>
                      <input readOnly value={vnpayConfig?.returnUrl || ""} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-gray-50" style={{ fontSize: "13.5px" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Membership */}
          {activeTab === "membership" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Cài đặt hội viên & điểm tích lũy</h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Tỷ lệ tích điểm (đ / 1 điểm)</label>
                  <input type="number" value={pointRate} onChange={e => setPointRate(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  <p style={{ fontSize: "11.5px", color: "#9CA3AF", marginTop: "4px" }}>Ví dụ: 1.000đ = 1 điểm</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Gold (đ)", val: goldMin, set: setGoldMin },
                    { label: "Platinum (đ)", val: platinumMin, set: setPlatinumMin },
                    { label: "Black (đ)", val: blackMin, set: setBlackMin },
                  ].map(t => (
                    <div key={t.label}>
                      <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "4px" }}>{t.label}</label>
                      <input type="number" value={t.val} onChange={e => t.set(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Tặng điểm sinh nhật", desc: "Tự động tặng 200 điểm vào ngày sinh nhật hội viên", val: birthdayBonus, set: setBirthdayBonus },
                  { label: "Điểm có thời hạn", desc: "Điểm hết hạn sau 365 ngày kể từ ngày tích", val: expirePoints, set: setExpirePoints },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#111827" }}>{r.label}</div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{r.desc}</div>
                    </div>
                    <Toggle checked={r.val} onChange={r.set} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Cài đặt thông báo</h3>
              <div className="space-y-3">
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Kênh thông báo</p>
                {[
                  { label: "Push notification (App/Web)", val: notifPush, set: setNotifPush },
                  { label: "Email", val: notifEmail, set: setNotifEmail },
                  { label: "SMS", val: notifSMS, set: setNotifSMS },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#111827" }}>{r.label}</span>
                    <Toggle checked={r.val} onChange={r.set} />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Loại sự kiện thông báo</p>
                {[
                  { label: "Đơn hàng mới / thay đổi trạng thái", val: notifOrder, set: setNotifOrder },
                  { label: "Cảnh báo tồn kho thấp", val: notifStock, set: setNotifStock },
                  { label: "Phát hiện bất thường từ AI", val: notifAI, set: setNotifAI },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#111827" }}>{r.label}</span>
                    <Toggle checked={r.val} onChange={r.set} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Ngưỡng tồn kho cảnh báo (%)</label>
                  <input type="number" value={stockThreshold} onChange={e => setStockThreshold(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} max={100} min={1} />
                </div>
              </div>
            </div>
          )}

          {/* AI */}
          {activeTab === "ai" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Cài đặt AI & Dữ liệu</h3>
              <div className="space-y-3">
                {[
                  { label: "Tự động chạy dự báo hàng ngày", desc: "Dự báo nhu cầu được tự động cập nhật mỗi sáng", val: autoForecast, set: setAutoForecast },
                  { label: "Kích hoạt phát hiện bất thường", desc: "AI theo dõi liên tục và cảnh báo ngay khi có bất thường", val: anomalyEnabled, set: setAnomalyEnabled },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#111827" }}>{r.label}</div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{r.desc}</div>
                    </div>
                    <Toggle checked={r.val} onChange={r.set} />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Giờ chạy dự báo tự động</label>
                    <input type="time" value={forecastTime} onChange={e => setForecastTime(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Ngưỡng bất thường (%)</label>
                    <input type="number" value={anomalyThreshold} onChange={e => setAnomalyThreshold(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Lưu trữ dữ liệu (ngày)</label>
                    <input type="number" value={retentionDays} onChange={e => setRetentionDays(+e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#7C3AED" }}>Thống kê AI tháng này</p>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[["Dự báo đã chạy", "31"], ["Bất thường phát hiện", "12"], ["Độ chính xác TB", "87%"]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{k}</div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: "#7C3AED" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Cài đặt mật khẩu & phiên đăng nhập</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Mật khẩu Admin hiện tại</label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} defaultValue="••••••••••" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none pr-10" style={{ fontSize: "13.5px" }} />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-gray-400">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Mật khẩu mới</label>
                    <input type="password" placeholder="Nhập mật khẩu mới..." className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Thời gian hết phiên (phút)</label>
                    <input type="number" defaultValue={60} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Số lần đăng nhập sai tối đa</label>
                    <input type="number" defaultValue={5} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "12.5px", color: "#6B7280", display: "block", marginBottom: "6px" }}>Thời gian khóa (phút)</label>
                    <input type="number" defaultValue={15} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13.5px" }} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>Phiên đăng nhập đang hoạt động</h3>
                {[
                  { device: "Chrome / MacOS", ip: "203.162.xx.xx", time: "Hiện tại", current: true },
                  { device: "Safari / iPhone 15", ip: "117.4.xx.xx", time: "2 giờ trước", current: false },
                  { device: "Firefox / Windows 11", ip: "42.118.xx.xx", time: "Hôm qua", current: false },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#111827" }}>{s.device}</div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{s.ip} · {s.time}</div>
                    </div>
                    {s.current ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full" style={{ fontSize: "12px", fontWeight: 600 }}>Thiết bị này</span>
                    ) : (
                      <button className="px-3 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50" style={{ fontSize: "12.5px" }}>Đăng xuất</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          {activeTab === "logs" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Nhật ký hoạt động hệ thống</h3>
                <div className="flex gap-2">
                  <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "12.5px" }}>
                    <option>Tất cả module</option>
                    <option>Bảo mật</option>
                    <option>AI</option>
                    <option>Sản phẩm</option>
                  </select>
                  <select className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "12.5px" }}>
                    <option>7 ngày gần nhất</option>
                    <option>30 ngày</option>
                  </select>
                </div>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["Thời gian", "Người dùng", "Hành động", "Module", "Mức độ"].map(h => (
                      <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logData.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3" style={{ fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{l.time}</td>
                      <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151" }}>{l.user}</td>
                      <td className="px-4 py-3" style={{ fontSize: "13px", color: "#1F2937" }}>{l.action}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full" style={{ fontSize: "11.5px" }}>{l.module}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.level === "danger" ? "bg-red-100 text-red-700"
                          : l.level === "warning" ? "bg-yellow-100 text-yellow-700"
                          : l.level === "success" ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                        }`}>{l.level}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
