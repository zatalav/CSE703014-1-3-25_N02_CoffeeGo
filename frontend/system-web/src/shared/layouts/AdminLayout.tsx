import { useState } from "react";
import {
  Home, Users, Calendar, Store, Coffee, Package,
  Warehouse, ShoppingCart, UserCheck, BarChart2,
  Brain, Settings, ChevronDown, ChevronRight, ChevronLeft,
  Bell, Search, LogOut, KeyRound, Menu, User,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  path?: string;
  children?: { id: string; label: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "dashboard" },
  {
    id: "users", label: "Quản lý người dùng", icon: Users,
    children: [
      { id: "staff", label: "Nhân viên", path: "staff" },
      { id: "branch-managers", label: "Quản lý chi nhánh", path: "branch-managers" },
      { id: "customers-mgmt", label: "Khách hàng", path: "customers-mgmt" },
    ],
  },
  { id: "schedule", label: "Lịch làm việc", icon: Calendar, path: "schedule" },
  { id: "branches", label: "Quản lý chi nhánh", icon: Store, path: "branches" },
  {
    id: "products", label: "Sản phẩm & Menu", icon: Coffee,
    children: [
      { id: "categories", label: "Danh mục", path: "categories" },
      { id: "products-list", label: "Sản phẩm", path: "products-list" },
      { id: "toppings", label: "Topping", path: "toppings" },
      { id: "combos", label: "Combo", path: "combos" },
      { id: "seasonal", label: "Sản phẩm mùa vụ", path: "seasonal" },
      { id: "recipes", label: "Công thức pha chế", path: "recipes" },
    ],
  },
  {
    id: "supply", label: "Nguyên liệu & NCC", icon: Package,
    children: [
      { id: "suppliers", label: "Nhà cung cấp", path: "suppliers" },
      { id: "ingredients", label: "Danh mục nguyên liệu", path: "ingredients" },
    ],
  },
  {
    id: "warehouse", label: "Quản lý kho", icon: Warehouse,
    children: [
      { id: "stock-in-out", label: "Nhập/Xuất kho", path: "stock-in-out" },
      { id: "stock-locations", label: "Vị trí kho", path: "stock-locations" },
    ],
  },
  { id: "orders", label: "Đơn hàng", icon: ShoppingCart, path: "orders" },
  {
    id: "members", label: "Khách hàng & Thành viên", icon: UserCheck,
    children: [
      { id: "customer-profiles", label: "Hồ sơ khách hàng", path: "customer-profiles" },
      { id: "member-tiers", label: "Hạng thành viên", path: "member-tiers" },
      { id: "vouchers", label: "Mã giảm giá", path: "vouchers" },
      { id: "reviews", label: "Đánh giá & Phản hồi", path: "reviews" },
    ],
  },
  {
    id: "reports", label: "Báo cáo & Thống kê", icon: BarChart2,
    children: [
      { id: "revenue-report", label: "Doanh thu", path: "revenue-report" },
      { id: "stock-report", label: "Nhập xuất tồn", path: "stock-report" },
      { id: "order-report", label: "Đơn hàng", path: "order-report" },
      { id: "customer-report", label: "Khách hàng", path: "customer-report" },
    ],
  },
  {
    id: "ai", label: "AI & Thông minh", icon: Brain,
    children: [
      { id: "ai-forecast", label: "Dự báo nhu cầu", path: "ai-forecast" },
      { id: "ai-anomaly", label: "Phát hiện bất thường", path: "ai-anomaly" },
      { id: "ai-menu", label: "Phân tích menu", path: "ai-menu" },
      { id: "ai-behavior", label: "Hành vi khách hàng", path: "ai-behavior" },
      { id: "ai-revenue-detail", label: "Doanh thu theo món", path: "ai-revenue-detail" },
      { id: "ai-bestseller", label: "Bán chạy/chậm", path: "ai-bestseller" },
    ],
  },
  { id: "settings", label: "Cài đặt hệ thống", icon: Settings, path: "settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  breadcrumb: { label: string }[];
}

export function AdminLayout({ children, activePage, onNavigate, breadcrumb }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["branches"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const isActive = (path?: string) => activePage === path;

  const isGroupActive = (item: MenuItem) => {
    if (item.path && isActive(item.path)) return true;
    if (item.children) return item.children.some(c => isActive(c.path));
    return false;
  };

  const SidebarContent = () => (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "#0F4761", width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-4 border-b border-white/10 min-h-[64px] flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#F59E0B" }}
        >
          <span className="font-bold text-sm" style={{ color: "#0F4761" }}>TS</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <p className="text-white font-semibold text-sm leading-tight truncate">Trà Sữa Admin</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>Hệ thống quản lý</p>
          </div>
        )}
      </div>

      {/* Scrollable menu */}
      <div className="flex-1 overflow-y-auto py-3 px-2" style={{ scrollbarWidth: "none" }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          const groupActive = isGroupActive(item);
          const expanded = expandedGroups.includes(item.id);

          if (item.children) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => !collapsed && toggleGroup(item.id)}
                  className="w-full flex items-center rounded-lg py-2.5 px-2 mb-0.5 transition-all group"
                  style={{
                    backgroundColor: groupActive ? "rgba(255,255,255,0.15)" : "transparent",
                    justifyContent: collapsed ? "center" : "space-between",
                  }}
                  onMouseEnter={e => {
                    if (!groupActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={e => {
                    if (!groupActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={18}
                      style={{ color: groupActive ? "#F59E0B" : "rgba(255,255,255,0.65)", flexShrink: 0 }}
                    />
                    {!collapsed && (
                      <span
                        className="text-sm truncate"
                        style={{ color: groupActive ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: groupActive ? 500 : 400 }}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        flexShrink: 0,
                        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  )}
                </button>
                {!collapsed && expanded && (
                  <div className="ml-3 mb-1 pl-5 border-l border-white/10">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.path)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-all"
                        style={{
                          color: isActive(child.path) ? "#fff" : "rgba(255,255,255,0.55)",
                          backgroundColor: isActive(child.path) ? "rgba(255,255,255,0.15)" : "transparent",
                          fontWeight: isActive(child.path) ? 500 : 400,
                        }}
                        onMouseEnter={e => {
                          if (!isActive(child.path)) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)";
                        }}
                        onMouseLeave={e => {
                          if (!isActive(child.path)) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path!)}
              className="w-full flex items-center gap-2.5 rounded-lg py-2.5 px-2 mb-0.5 transition-all"
              style={{
                backgroundColor: isActive(item.path) ? "rgba(255,255,255,0.15)" : "transparent",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              onMouseEnter={e => {
                if (!isActive(item.path)) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={e => {
                if (!isActive(item.path)) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              <Icon
                size={18}
                style={{ color: isActive(item.path) ? "#F59E0B" : "rgba(255,255,255,0.65)", flexShrink: 0 }}
              />
              {!collapsed && (
                <span
                  className="text-sm"
                  style={{ color: isActive(item.path) ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: isActive(item.path) ? 500 : 400 }}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Admin info bottom */}
      <div className="flex-shrink-0 border-t border-white/10 p-3">
        <div
          className="flex items-center gap-2.5 rounded-lg p-2"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#F59E0B" }}
          >
            <span className="font-semibold text-xs" style={{ color: "#0F4761" }}>AD</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight text-white truncate">Admin Hệ thống</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>Quản trị viên</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F5F7FA" }}>
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 relative transition-all duration-300"
        style={{ width: collapsed ? 64 : 240 }}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center z-10 transition-colors"
          style={{ cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
        >
          <ChevronLeft
            size={12}
            className="text-gray-500"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex flex-col" style={{ width: 240 }}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            onClick={() => setMobileOpen(true)}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#f3f4f6"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
          >
            <Menu size={20} className="text-gray-600" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 min-w-0">
            {breadcrumb.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight size={13} className="text-gray-400" />}
                <span
                  className="text-sm"
                  style={{ color: idx === breadcrumb.length - 1 ? "#111827" : "#6B7280", fontWeight: idx === breadcrumb.length - 1 ? 500 : 400 }}
                >
                  {item.label}
                </span>
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm toàn hệ thống..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none transition-all"
              style={{ width: 200 }}
            />
          </div>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg transition-colors"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#f3f4f6"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
          >
            <Bell size={20} className="text-gray-600" />
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#EF4444" }}
            >
              <span className="text-white font-bold" style={{ fontSize: 10 }}>5</span>
            </span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#f3f4f6"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#0F4761" }}
              >
                <span className="text-white font-semibold" style={{ fontSize: 12 }}>AD</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-tight">Admin</p>
                <p className="text-xs text-gray-500 leading-tight">Quản trị viên</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-100 py-1 z-20"
                  style={{ width: 192, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                >
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors text-left"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <KeyRound size={15} className="text-gray-400" />
                    Đổi mật khẩu
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors text-left"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fef2f2"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <LogOut size={15} />
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
