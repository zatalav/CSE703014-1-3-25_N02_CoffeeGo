import { useState } from "react";
import { X, Check, MapPin, Phone, Mail, Clock, Store, ChevronRight } from "lucide-react";
import { defaultSchedule, WeeklySchedule } from "../api/mockData";

interface AddBranchModalProps {
  onClose: () => void;
  onSave?: () => void;
}

const STEPS = ["Thông tin cơ bản", "Cấu hình giờ mở cửa"];

export function AddBranchModal({ onClose, onSave }: AddBranchModalProps) {
  const [step, setStep] = useState(0);
  const [schedule, setSchedule] = useState<WeeklySchedule[]>(defaultSchedule.map(d => ({ ...d })));

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập tên chi nhánh";
    if (!form.address.trim()) errs.address = "Vui lòng nhập địa chỉ";
    if (!form.phone.trim()) errs.phone = "Vui lòng nhập số điện thoại";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Email không hợp lệ";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && validateStep1()) setStep(1);
  };

  const handleSubmit = () => {
    onSave?.();
    onClose();
  };

  const updateSchedule = (idx: number, field: keyof WeeklySchedule, value: string | boolean) => {
    setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 620, maxHeight: "90vh" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ backgroundColor: "#0F4761" }}
        >
          <div>
            <h2 className="text-white">Thêm chi nhánh mới</h2>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              Bước {step + 1} / {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.1)"}
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {STEPS.map((label, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: idx < step ? "#10B981" : idx === step ? "#0F4761" : "#E5E7EB",
                    color: idx <= step ? "#fff" : "#9CA3AF",
                  }}
                >
                  {idx < step ? <Check size={14} /> : idx + 1}
                </div>
                <span
                  className="text-sm hidden sm:block"
                  style={{ color: idx === step ? "#0F4761" : idx < step ? "#10B981" : "#9CA3AF", fontWeight: idx === step ? 600 : 400 }}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-3"
                  style={{ backgroundColor: idx < step ? "#10B981" : "#E5E7EB" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-4">
              <FormField
                label="Tên chi nhánh"
                required
                error={errors.name}
                icon={<Store size={15} className="text-gray-400" />}
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }}
                  placeholder="VD: Chi nhánh Quận 7"
                  className={inputCls(!!errors.name)}
                />
              </FormField>

              <FormField
                label="Địa chỉ"
                required
                error={errors.address}
                icon={<MapPin size={15} className="text-gray-400" />}
              >
                <input
                  type="text"
                  value={form.address}
                  onChange={e => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: "" }); }}
                  placeholder="VD: 123 Nguyễn Văn Cừ, P.1, Quận 5"
                  className={inputCls(!!errors.address)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Số điện thoại"
                  required
                  error={errors.phone}
                  icon={<Phone size={15} className="text-gray-400" />}
                >
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: "" }); }}
                    placeholder="028 xxxx xxxx"
                    className={inputCls(!!errors.phone)}
                  />
                </FormField>

                <FormField
                  label="Email chi nhánh"
                  error={errors.email}
                  icon={<Mail size={15} className="text-gray-400" />}
                >
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }}
                    placeholder="tenbranch@trasua.vn"
                    className={inputCls(!!errors.email)}
                  />
                </FormField>
              </div>

              <FormField label="Mô tả chi nhánh">
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả vị trí, đặc điểm nổi bật của chi nhánh..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 resize-none"
                />
              </FormField>

              {/* Image upload placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hình ảnh chi nhánh</label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#0F4761"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB"}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: "#EBF2F7" }}
                  >
                    <Store size={20} style={{ color: "#0F4761" }} />
                  </div>
                  <p className="text-sm text-gray-500">Kéo thả hoặc <span style={{ color: "#0F4761" }} className="font-medium cursor-pointer">chọn ảnh</span></p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG tối đa 5MB</p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Thiết lập giờ mở/đóng cửa cho từng ngày trong tuần.</p>
              <div className="space-y-2">
                {schedule.map((day, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                    style={{ borderColor: day.isOpen ? "#E5E7EB" : "#F3F4F6", backgroundColor: day.isOpen ? "#fff" : "#F9FAFB" }}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => updateSchedule(idx, "isOpen", !day.isOpen)}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{ backgroundColor: day.isOpen ? "#0F4761" : "#D1D5DB" }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        style={{ left: day.isOpen ? "calc(100% - 18px)" : 2 }}
                      />
                    </button>

                    <span
                      className="text-sm w-20 flex-shrink-0"
                      style={{ color: day.isOpen ? "#111827" : "#9CA3AF", fontWeight: day.isOpen ? 500 : 400 }}
                    >
                      {day.day}
                    </span>

                    {day.isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Clock size={14} className="text-gray-400" />
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={e => updateSchedule(idx, "openTime", e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
                        />
                        <span className="text-gray-400 text-sm">—</span>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={e => updateSchedule(idx, "closeTime", e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Đóng cửa</span>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="mt-4 p-3 rounded-xl flex items-start gap-2"
                style={{ backgroundColor: "#FFF9E6", border: "1px solid #FDE68A" }}
              >
                <Clock size={15} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: "#92400E" }}>
                  Giờ mở cửa có thể được điều chỉnh sau trong phần Chi tiết chi nhánh. Bạn cũng có thể thêm ngày nghỉ lễ đặc biệt sau khi tạo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={step === 0 ? onClose : () => setStep(0)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white transition-colors"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
          >
            {step === 0 ? "Hủy" : "Quay lại"}
          </button>
          <button
            onClick={step < STEPS.length - 1 ? handleNext : handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-sm text-white rounded-lg transition-all"
            style={{ backgroundColor: step === STEPS.length - 1 ? "#10B981" : "#0F4761" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            {step < STEPS.length - 1 ? (
              <>Tiếp tục <ChevronRight size={15} /></>
            ) : (
              <>
                <Check size={15} />
                Tạo chi nhánh
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-all ${
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-400"
      : "border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
  }`;
}

function FormField({
  label,
  required,
  error,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        )}
        <div style={{ paddingLeft: icon ? undefined : 0 }}>
          {children}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
