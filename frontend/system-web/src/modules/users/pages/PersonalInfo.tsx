import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, MapPin, Calendar, Shield, User, Building2, Briefcase, Clock, BadgeCheck } from "lucide-react";
import { api } from "../../../lib/api";
import { normalizeRole, useAuth } from "../../../lib/auth";
import type { BranchDto } from "../../../lib/types";

const emptyValue = "Chưa có dữ liệu";

const roleLabel = (roleName?: string | null) => {
  const normalized = normalizeRole(roleName);
  if (normalized === "admin" || normalized.includes("quan_tri")) return "Quản trị viên";
  if (normalized.includes("warehouse_manager") || normalized.includes("quan_ly_kho")) return "Quản lý kho";
  if (normalized.includes("branch_manager") || normalized.includes("quan_ly_chi_nhanh")) return "Quản lý chi nhánh";
  return roleName || emptyValue;
};

const departmentLabel = (roleName?: string | null) => {
  const normalized = normalizeRole(roleName);
  if (normalized.includes("warehouse_manager") || normalized.includes("quan_ly_kho")) return "Kho trung tâm";
  if (normalized.includes("branch_manager") || normalized.includes("quan_ly_chi_nhanh")) return "Vận hành chi nhánh";
  if (normalized === "admin" || normalized.includes("quan_tri")) return "Quản trị hệ thống";
  return emptyValue;
};

const permissionsFor = (roleName?: string | null) => {
  const normalized = normalizeRole(roleName);
  if (normalized === "admin" || normalized.includes("quan_tri")) {
    return ["Quản lý người dùng", "Quản lý chi nhánh", "Quản lý sản phẩm", "Xem báo cáo hệ thống"];
  }
  if (normalized.includes("warehouse_manager") || normalized.includes("quan_ly_kho")) {
    return ["Quản lý nhập / xuất kho", "Quản lý nguyên liệu", "Quản lý nhà cung cấp", "Xem báo cáo kho"];
  }
  if (normalized.includes("branch_manager") || normalized.includes("quan_ly_chi_nhanh")) {
    return ["Quản lý đơn hàng chi nhánh", "Quản lý nhân viên và lịch", "Theo dõi tồn kho chi nhánh", "Xem báo cáo chi nhánh"];
  }
  return ["Xem thông tin cá nhân"];
};

const initialsOf = (name?: string | null, fallback = "U") => {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  return words.slice(-2).map(word => word[0]).join("").toUpperCase();
};

export function PersonalInfo() {
  const { session } = useAuth();
  const user = session?.userInfo;
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadBranch = async () => {
      if (!user?.branchId) {
        setBranchName("");
        return;
      }

      try {
        const branch = await api.get<BranchDto>(`/branches/${user.branchId}`);
        if (!ignore) setBranchName(branch.branchName || `Chi nhánh #${user.branchId}`);
      } catch {
        if (!ignore) setBranchName(`Chi nhánh #${user.branchId}`);
      }
    };

    void loadBranch();
    return () => {
      ignore = true;
    };
  }, [user?.branchId]);

  const profile = useMemo(() => {
    const role = roleLabel(user?.roleName || session?.role);
    return {
      name: user?.name || "Người dùng",
      email: user?.email || emptyValue,
      phone: user?.phoneNumber || emptyValue,
      role,
      department: departmentLabel(user?.roleName || session?.role),
      branch: branchName || (user?.branchId ? `Chi nhánh #${user.branchId}` : emptyValue),
      address: emptyValue,
      birthday: emptyValue,
      joinedAt: emptyValue,
      lastLogin: "Phiên hiện tại",
      employeeId: user?.id ? `NV-${user.id}` : emptyValue,
      status: user?.status || "active",
      avatarInitials: initialsOf(user?.name, role === "Quản lý kho" ? "QK" : role === "Quản lý chi nhánh" ? "QC" : "AD"),
    };
  }, [branchName, session?.role, user]);

  const permissions = useMemo(() => permissionsFor(user?.roleName || session?.role), [session?.role, user?.roleName]);
  const infoRows = [
    { icon: <Mail size={16} className="text-[#0F4761]" />, label: "Email", value: profile.email },
    { icon: <Phone size={16} className="text-[#0F4761]" />, label: "Số điện thoại", value: profile.phone },
    { icon: <Shield size={16} className="text-[#0F4761]" />, label: "Vai trò", value: profile.role },
    { icon: <Briefcase size={16} className="text-[#0F4761]" />, label: "Bộ phận", value: profile.department },
    { icon: <Building2 size={16} className="text-[#0F4761]" />, label: "Chi nhánh / kho", value: profile.branch },
    { icon: <MapPin size={16} className="text-[#0F4761]" />, label: "Địa chỉ", value: profile.address },
    { icon: <Calendar size={16} className="text-[#0F4761]" />, label: "Ngày sinh", value: profile.birthday },
    { icon: <Calendar size={16} className="text-[#0F4761]" />, label: "Ngày tham gia", value: profile.joinedAt },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Trang cá nhân</h1>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Thông tin tài khoản của người đang đăng nhập</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#0F4761] to-[#1a6b8a]" />
        <div className="px-8 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-5">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-gradient-to-br from-[#0F4761] to-[#1a6b8a] flex items-center justify-center shadow-md">
              <span className="text-white" style={{ fontSize: "26px", fontWeight: 700 }}>{profile.avatarInitials}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 flex items-center gap-1.5" style={{ fontSize: "12px", fontWeight: 500 }}>
                <BadgeCheck size={13} /> Đã xác minh
              </span>
              <span className="px-3 py-1 rounded-full bg-[#EBF4FA] text-[#0F4761]" style={{ fontSize: "12px", fontWeight: 500 }}>
                {profile.employeeId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{profile.name}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700" style={{ fontSize: "11.5px", fontWeight: 500 }}>
              {profile.status === "active" ? "Đang hoạt động" : profile.status}
            </span>
          </div>
          <p style={{ fontSize: "13.5px", color: "#6B7280" }}>{profile.role} · {profile.department}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Clock size={18} className="text-[#0F4761]" />, label: "Đăng nhập gần nhất", value: profile.lastLogin },
          { icon: <Calendar size={18} className="text-amber-500" />, label: "Khu vực phụ trách", value: profile.branch },
          { icon: <Shield size={18} className="text-green-500" />, label: "Cấp quyền", value: profile.role },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">{item.icon}</div>
            <div className="min-w-0">
              <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{item.label}</p>
              <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#111827" }} className="truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-[#0F4761]" />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>Thông tin chi tiết</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {infoRows.map(row => (
              <div key={row.label} className="flex items-center gap-3 py-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl bg-[#EBF4FA] flex items-center justify-center shrink-0">
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{row.label}</p>
                  <p style={{ fontSize: "13.5px", color: "#1F2937", fontWeight: 500 }} className="truncate">{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-[#0F4761]" />
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>Quyền hạn</h3>
          </div>
          <ul className="space-y-2.5">
            {permissions.map(permission => (
              <li key={permission} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-0.5 shrink-0">
                  <BadgeCheck size={12} className="text-green-600" />
                </div>
                <span style={{ fontSize: "13px", color: "#374151" }}>{permission}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
