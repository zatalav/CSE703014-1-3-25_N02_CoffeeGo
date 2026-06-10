import { useState } from "react";
import { X, User, Mail, Phone, MapPin, Calendar, Save } from "lucide-react";

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const [form, setForm] = useState({
    name: "Nguyễn Văn Admin",
    email: "admin@trasua.vn",
    phone: "0901 234 567",
    address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    birthday: "1990-08-15",
    department: "Ban Điều hành",
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const fields = [
    { key: "name", label: "Họ và tên", icon: <User size={15} className="text-[#0F4761]" />, type: "text", placeholder: "Nhập họ và tên" },
    { key: "email", label: "Email", icon: <Mail size={15} className="text-[#0F4761]" />, type: "email", placeholder: "Nhập email" },
    { key: "phone", label: "Số điện thoại", icon: <Phone size={15} className="text-[#0F4761]" />, type: "text", placeholder: "Nhập số điện thoại" },
    { key: "birthday", label: "Ngày sinh", icon: <Calendar size={15} className="text-[#0F4761]" />, type: "date", placeholder: "" },
    { key: "address", label: "Địa chỉ", icon: <MapPin size={15} className="text-[#0F4761]" />, type: "text", placeholder: "Nhập địa chỉ" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="h-1.5 bg-gradient-to-r from-[#0F4761] to-[#1a6b8a]" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Chỉnh sửa thông tin</h2>
            <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: "2px" }}>Cập nhật thông tin tài khoản cá nhân</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center pb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F4761] to-[#1a6b8a] flex items-center justify-center shadow-md">
              <span className="text-white" style={{ fontSize: "20px", fontWeight: 700 }}>NA</span>
            </div>
            <button
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              title="Đổi ảnh đại diện"
            >
              <User size={11} className="text-[#0F4761]" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-2 space-y-3.5">
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }} className="block mb-1.5">
                {f.label}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">{f.icon}</div>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  placeholder={f.placeholder}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] focus:ring-2 focus:ring-[#0F4761]/10 transition-all bg-gray-50 focus:bg-white"
                  style={{ fontSize: "13.5px", color: "#1F2937" }}
                />
              </div>
            </div>
          ))}

          {/* Read-only field */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "#374151" }} className="block mb-1.5">
              Phòng ban <span style={{ fontSize: "11px", color: "#9CA3AF" }}>(không thể chỉnh sửa)</span>
            </label>
            <div className="w-full px-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50 cursor-not-allowed"
              style={{ fontSize: "13.5px", color: "#9CA3AF" }}>
              {form.department}
            </div>
          </div>
        </div>

        {/* Footer */}
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
            className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
            style={{
              background: saved ? "#10B981" : "#0F4761",
              color: "white",
              fontSize: "13.5px",
              fontWeight: 600,
            }}
          >
            <Save size={14} />
            {saved ? "Đã lưu!" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
