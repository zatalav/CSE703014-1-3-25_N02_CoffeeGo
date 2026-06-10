import { useState } from "react";
import { X, Lock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

interface ChangePasswordModalProps {
  onClose: () => void;
}

function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score === 0) return { score: 0, label: "", color: "" };
  if (score === 1) return { score: 1, label: "Rất yếu", color: "#EF4444" };
  if (score === 2) return { score: 2, label: "Yếu", color: "#F97316" };
  if (score === 3) return { score: 3, label: "Trung bình", color: "#EAB308" };
  return { score: 4, label: "Mạnh", color: "#10B981" };
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [fields, setFields] = useState({ current: "", newPwd: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const strength = getStrength(fields.newPwd);
  const requirements = [
    { label: "Ít nhất 8 ký tự", ok: fields.newPwd.length >= 8 },
    { label: "Chứa chữ hoa", ok: /[A-Z]/.test(fields.newPwd) },
    { label: "Chứa số", ok: /[0-9]/.test(fields.newPwd) },
    { label: "Chứa ký tự đặc biệt", ok: /[^A-Za-z0-9]/.test(fields.newPwd) },
  ];

  const handleSave = () => {
    if (!fields.current) { setError("Vui lòng nhập mật khẩu hiện tại."); return; }
    if (strength.score < 2) { setError("Mật khẩu mới quá yếu."); return; }
    if (fields.newPwd !== fields.confirm) { setError("Xác nhận mật khẩu không khớp."); return; }
    setError("");
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1400);
  };

  const toggleField = (key: "current" | "newPwd" | "confirm") =>
    setShow(s => ({ ...s, [key]: !s[key] }));

  const PasswordInput = ({
    fieldKey, label, placeholder,
  }: { fieldKey: "current" | "newPwd" | "confirm"; label: string; placeholder: string }) => (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }} className="block mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Lock size={15} className="text-[#0F4761]" />
        </div>
        <input
          type={show[fieldKey] ? "text" : "password"}
          value={fields[fieldKey]}
          placeholder={placeholder}
          onChange={e => { setFields(f => ({ ...f, [fieldKey]: e.target.value })); setError(""); }}
          className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] focus:ring-2 focus:ring-[#0F4761]/10 transition-all bg-gray-50 focus:bg-white"
          style={{ fontSize: "13.5px", color: "#1F2937" }}
        />
        <button
          type="button"
          onClick={() => toggleField(fieldKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show[fieldKey] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#0F4761] to-[#1a6b8a]" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Đổi mật khẩu</h2>
            <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: "2px" }}>Cập nhật mật khẩu để bảo vệ tài khoản</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 pb-2 space-y-4">
          <PasswordInput fieldKey="current" label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại" />

          <div className="h-px bg-gray-100" />

          <PasswordInput fieldKey="newPwd" label="Mật khẩu mới" placeholder="Nhập mật khẩu mới" />

          {/* Strength bar */}
          {fields.newPwd && (
            <div>
              <div className="flex gap-1 mb-1.5">
                {[1, 2, 3, 4].map(n => (
                  <div
                    key={n}
                    className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: n <= strength.score ? strength.color : "#E5E7EB" }}
                  />
                ))}
              </div>
              <p style={{ fontSize: "11.5px", color: strength.color, fontWeight: 500 }}>{strength.label}</p>
            </div>
          )}

          {/* Requirements */}
          {fields.newPwd && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {requirements.map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  {r.ok
                    ? <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                    : <XCircle size={13} className="text-gray-300 shrink-0" />
                  }
                  <span style={{ fontSize: "12px", color: r.ok ? "#10B981" : "#9CA3AF" }}>{r.label}</span>
                </div>
              ))}
            </div>
          )}

          <PasswordInput fieldKey="confirm" label="Xác nhận mật khẩu mới" placeholder="Nhập lại mật khẩu mới" />

          {/* Match indicator */}
          {fields.confirm && fields.newPwd && (
            <p style={{ fontSize: "12px", color: fields.newPwd === fields.confirm ? "#10B981" : "#EF4444" }}>
              {fields.newPwd === fields.confirm ? "✓ Mật khẩu khớp" : "✗ Mật khẩu không khớp"}
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <p style={{ fontSize: "12.5px", color: "#EF4444" }}>{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ fontSize: "13.5px", fontWeight: 500, color: "#374151" }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl transition-all"
            style={{
              background: saved ? "#10B981" : "#0F4761",
              color: "white",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            {saved ? "Đã đổi mật khẩu!" : "Xác nhận đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
