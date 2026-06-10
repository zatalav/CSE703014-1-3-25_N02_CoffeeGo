import { Bell, Search, ChevronDown, LogOut, User, Edit2, Key, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../ui/utils";
import { EditProfileModal } from "./EditProfileModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useAuth } from "../../lib/auth";

interface TopbarProps {
  currentPage: string;
  sidebarCollapsed: boolean;
  onNavigate: (page: any) => void;
}

const breadcrumbMap: Record<string, string[]> = {
  dashboard: ["Dashboard"],
  employees: ["Quản lý người dùng", "Nhân viên"],
  "branch-managers": ["Quản lý người dùng", "Quản lý chi nhánh"],
  "customer-accounts": ["Quản lý người dùng", "Khách hàng"],
  schedule: ["Lịch làm việc"],
  branches: ["Quản lý chi nhánh"],
  "product-categories": ["Sản phẩm & Menu", "Danh mục"],
  products: ["Sản phẩm & Menu", "Sản phẩm"],
  toppings: ["Sản phẩm & Menu", "Topping"],
  combos: ["Sản phẩm & Menu", "Combo"],
  "seasonal-products": ["Sản phẩm & Menu", "Sản phẩm mùa vụ"],
  recipes: ["Sản phẩm & Menu", "Công thức pha chế"],
  suppliers: ["Nguyên liệu & NCC", "Nhà cung cấp"],
  "ingredient-categories": ["Nguyên liệu & NCC", "Danh mục nguyên liệu"],
  "warehouse-io": ["Quản lý kho", "Lịch sử kho"],
  orders: ["Đơn hàng"],
  "personal-info": ["Cá nhân", "Thông tin cá nhân"],
  "membership-tiers": ["Khách hàng & Thành viên", "Hạng thành viên"],
  vouchers: ["Khách hàng & Thành viên", "Mã giảm giá"],
  reviews: ["Khách hàng & Thành viên", "Đánh giá & Phản hồi"],
  "revenue-report": ["Báo cáo", "Doanh thu"],
  "inventory-report": ["Báo cáo", "Nhập xuất tồn"],
  "order-report": ["Báo cáo", "Đơn hàng"],
  "customer-report": ["Báo cáo", "Khách hàng"],
  "ai-demand": ["AI & Thông minh", "Dự báo nhu cầu"],
  "ai-anomaly": ["AI & Thông minh", "Phát hiện bất thường"],
  "ai-menu-trends": ["AI & Thông minh", "Phân tích xu hướng menu"],
  "ai-customer-behavior": ["AI & Thông minh", "Hành vi khách hàng"],
  "ai-revenue-item": ["AI & Thông minh", "Doanh thu theo món"],
  "ai-bcg": ["AI & Thông minh", "Bán chạy/chậm"],
  settings: ["Cài đặt hệ thống"],
  notifications: ["Thông báo"],
};

export function Topbar({ currentPage, sidebarCollapsed, onNavigate }: TopbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const breadcrumbs = breadcrumbMap[currentPage] || [currentPage];
  const { logout } = useAuth();

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const handleNav = (page: string) => {
    setShowDropdown(false);
    onNavigate(page);
  };

  const openEditProfile = () => { setShowDropdown(false); setShowEditProfile(true); };
  const openChangePassword = () => { setShowDropdown(false); setShowChangePassword(true); };
  const openLogout = () => { setShowDropdown(false); setShowLogoutConfirm(true); };

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-3 sm:gap-4 z-40 transition-all duration-300",
          sidebarCollapsed ? "left-0 md:left-16" : "left-0 md:left-60"
        )}
      >
        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5 flex-1 overflow-hidden">
          <span className="hidden sm:inline" style={{ fontSize: "13px", color: "#6B7280" }}>Trang chủ</span>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1.5">
              <span style={{ fontSize: "13px", color: "#9CA3AF" }}>/</span>
              <span
                className="truncate"
                style={{
                  fontSize: "13px",
                  color: i === breadcrumbs.length - 1 ? "#0F4761" : "#6B7280",
                  fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="pl-9 pr-4 py-1.5 bg-gray-100 rounded-lg outline-none w-52"
            style={{ fontSize: "13px" }}
          />
        </div>

        {/* Notifications */}
        <button
          onClick={() => onNavigate("notifications")}
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell size={18} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white" style={{ fontSize: "10px" }}>
            5
          </span>
        </button>

        {/* Admin Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
              showDropdown ? "bg-gray-100" : "hover:bg-gray-100"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-[#0F4761] flex items-center justify-center text-white" style={{ fontSize: "12px", fontWeight: 700 }}>
              A
            </div>
            <div className="hidden sm:block text-left">
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1F2937" }}>Admin Nguyễn</div>
              <div style={{ fontSize: "11px", color: "#6B7280" }}>Super Admin</div>
            </div>
            <ChevronDown
              size={14}
              className={cn("text-gray-400 transition-transform duration-200", showDropdown && "rotate-180")}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0F4761] flex items-center justify-center text-white shrink-0" style={{ fontSize: "12px", fontWeight: 700 }}>A</div>
                  <div className="min-w-0">
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>Admin Nguyễn</p>
                    <p style={{ fontSize: "11px", color: "#9CA3AF" }}>Super Admin</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => handleNav("personal-info")}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                  style={{ fontSize: "13.5px", color: "#374151" }}
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                    <User size={13} className="text-blue-600" />
                  </div>
                  Trang cá nhân
                </button>

                <button
                  onClick={openEditProfile}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                  style={{ fontSize: "13.5px", color: "#374151" }}
                >
                  <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                    <Edit2 size={13} className="text-green-600" />
                  </div>
                  Chỉnh sửa thông tin
                </button>

                <button
                  onClick={openChangePassword}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                  style={{ fontSize: "13.5px", color: "#374151" }}
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Key size={13} className="text-amber-500" />
                  </div>
                  Đổi mật khẩu
                </button>
              </div>

              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={openLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 text-left transition-colors"
                  style={{ fontSize: "13.5px", color: "#EF4444" }}
                >
                  <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                    <LogOut size={13} className="text-red-400" />
                  </div>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Đăng xuất?</h2>
            <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "6px", marginBottom: "24px" }}>
              Bạn sẽ thoát khỏi hệ thống và cần đăng nhập lại để tiếp tục.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ fontSize: "13.5px", fontWeight: 500, color: "#374151" }}
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  void logout();
                }}
                className="flex-1 py-2.5 rounded-xl transition-colors"
                style={{ background: "#EF4444", color: "white", fontSize: "13.5px", fontWeight: 600 }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
