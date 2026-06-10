import { useState } from "react";
import {
  Home, Users, Calendar, Store, Coffee, Package, Warehouse,
  ShoppingCart, UserCheck, BarChart2, Brain, Settings,
  ChevronDown, ChevronRight, ChevronLeft, CupSoda,
  UserCog, Users2, BookOpen, Layers, FlaskConical,
  Truck, Box, ArrowLeftRight, Tag, Star,
  TrendingUp, ClipboardList, UserCircle, Zap, Eye, Target, Award,
  FileText, Image as ImageIcon, Newspaper
} from "lucide-react";
import { cn } from "../ui/utils";

type Page =
  | "dashboard"
  | "employees" | "branch-managers" | "customer-accounts"
  | "schedule"
  | "branches"
  | "product-categories" | "products" | "toppings" | "combos" | "seasonal-products" | "recipes"
  | "suppliers" | "ingredient-categories"
  | "warehouse-io"
  | "orders"
  | "customer-profiles" | "membership-tiers" | "vouchers" | "reviews"
  | "revenue-report" | "inventory-report" | "order-report" | "customer-report"
  | "ai-demand" | "ai-anomaly" | "ai-menu-trends" | "ai-customer-behavior" | "ai-revenue-item" | "ai-bcg"
  | "settings"
  | "notifications"
  | "banner-management" | "news-management";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  page?: Page;
  href?: string;
  children?: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  { id: "dashboard", label: "Dashboard", icon: <Home size={18} />, page: "dashboard" },
  {
    id: "users", label: "Quản lý người dùng", icon: <Users size={18} />,
    children: [
      { id: "employees", label: "Nhân viên", icon: <UserCog size={16} /> },
      { id: "branch-managers", label: "Quản lý chi nhánh", icon: <Users2 size={16} /> },
      { id: "customer-accounts", label: "Khách hàng", icon: <UserCircle size={16} /> },
    ]
  },
  { id: "schedule", label: "Lịch làm việc", icon: <Calendar size={18} />, page: "schedule" },
  { id: "branches", label: "Quản lý chi nhánh", icon: <Store size={18} />, page: "branches" },
  {
    id: "products", label: "Sản phẩm & Menu", icon: <Coffee size={18} />,
    children: [
      { id: "product-categories", label: "Danh mục", icon: <Layers size={16} /> },
      { id: "products", label: "Sản phẩm", icon: <CupSoda size={16} /> },
      { id: "toppings", label: "Topping", icon: <Box size={16} /> },
      { id: "combos", label: "Combo", icon: <Tag size={16} /> },
      { id: "seasonal-products", label: "Sản phẩm mùa vụ", icon: <Star size={16} /> },
      { id: "recipes", label: "Công thức pha chế", icon: <FlaskConical size={16} /> },
    ]
  },
  {
    id: "ingredients", label: "Nguyên liệu & NCC", icon: <Package size={18} />,
    children: [
      { id: "suppliers", label: "Nhà cung cấp", icon: <Truck size={16} /> },
      { id: "ingredient-categories", label: "Danh mục nguyên liệu", icon: <BookOpen size={16} /> },
    ]
  },
  {
    id: "warehouse", label: "Quản lý kho", icon: <Warehouse size={18} />,
    children: [
      { id: "warehouse-io", label: "Lịch sử kho", icon: <ArrowLeftRight size={16} /> },
    ]
  },
  { id: "orders", label: "Đơn hàng", icon: <ShoppingCart size={18} />, page: "orders" },
  {
    id: "crm", label: "Khách hàng & Thành viên", icon: <UserCheck size={18} />,
    children: [
      { id: "membership-tiers", label: "Hạng thành viên", icon: <Award size={16} /> },
      { id: "vouchers", label: "Mã giảm giá", icon: <Tag size={16} /> },
      { id: "reviews", label: "Đánh giá & Phản hồi", icon: <Star size={16} /> },
    ]
  },
  {
    id: "reports", label: "Báo cáo & Thống kê", icon: <BarChart2 size={18} />,
    children: [
      { id: "revenue-report", label: "Doanh thu", icon: <TrendingUp size={16} /> },
      { id: "inventory-report", label: "Nhập xuất tồn", icon: <ClipboardList size={16} /> },
      { id: "order-report", label: "Đơn hàng", icon: <ShoppingCart size={16} /> },
      { id: "customer-report", label: "Khách hàng", icon: <Users size={16} /> },
    ]
  },
  {
    id: "ai", label: "AI & Thông minh", icon: <Brain size={18} />,
    children: [
      { id: "ai-demand", label: "Dự báo nhu cầu", icon: <Zap size={16} /> },
      { id: "ai-anomaly", label: "Phát hiện bất thường", icon: <Eye size={16} /> },
      { id: "ai-menu-trends", label: "Phân tích menu", icon: <TrendingUp size={16} /> },
      { id: "ai-customer-behavior", label: "Hành vi khách hàng", icon: <UserCheck size={16} /> },
      { id: "ai-revenue-item", label: "Doanh thu theo món", icon: <BarChart2 size={16} /> },
      { id: "ai-bcg", label: "Bán chạy/chậm", icon: <Target size={16} /> },
    ]
  },
  {
    id: "content", label: "Quản lý nội dung", icon: <FileText size={18} />,
    children: [
      { id: "banner-management", label: "Ảnh & Banner", icon: <ImageIcon size={16} /> },
      { id: "news-management", label: "Tin tức", icon: <Newspaper size={16} /> },
    ]
  },
  { id: "settings", label: "Cài đặt hệ thống", icon: <Settings size={18} />, page: "settings" },
];

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["users", "products"]));

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const isActiveChild = (group: MenuGroup) => {
    return group.children?.some(c => c.id === currentPage);
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full flex flex-col transition-all duration-300 z-50",
        "bg-[#0F4761] text-white",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center shrink-0">
          <CupSoda size={18} className="text-[#0F4761]" />
        </div>
        {!collapsed && (
          <div>
            <div style={{fontSize: '15px', fontWeight: 700, lineHeight: 1.2}}>CoffeeGo</div>
            <div style={{fontSize: '11px', opacity: 0.6}}>Operations Console</div>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {menuGroups.map(group => {
          if (group.href) {
            return (
              <a
                key={group.id}
                href={group.href}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left text-white/75 hover:bg-white/10 hover:text-white"
              >
                <span className="shrink-0">{group.icon}</span>
                {!collapsed && <span style={{fontSize: '13.5px'}}>{group.label}</span>}
              </a>
            );
          }

          if (group.page) {
            const isActive = currentPage === group.page;
            return (
              <button
                key={group.id}
                onClick={() => onNavigate(group.page!)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className={cn("shrink-0", isActive && "text-[#F59E0B]")}>{group.icon}</span>
                {!collapsed && <span style={{fontSize: '13.5px'}}>{group.label}</span>}
              </button>
            );
          }

          const isOpen = openGroups.has(group.id);
          const hasActiveChild = isActiveChild(group);

          return (
            <div key={group.id}>
              <button
                onClick={() => !collapsed && toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                  hasActiveChild
                    ? "bg-white/10 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className={cn("shrink-0", hasActiveChild && "text-[#F59E0B]")}>{group.icon}</span>
                {!collapsed && (
                  <>
                    <span style={{fontSize: '13.5px'}} className="flex-1">{group.label}</span>
                    <span className="opacity-60">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </>
                )}
              </button>
              {!collapsed && isOpen && (
                <div className="ml-6 border-l border-white/15 pl-2">
                  {group.children?.map(child => {
                    const isActive = currentPage === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id as Page)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left rounded-md",
                          isActive
                            ? "bg-white/15 text-white"
                            : "text-white/65 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span className={cn("shrink-0", isActive && "text-[#F59E0B]")}>{child.icon}</span>
                        <span style={{fontSize: '13px'}}>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin Avatar */}
      {!collapsed && (
        <div className="border-t border-white/10 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center shrink-0 text-[#0F4761] font-semibold" style={{fontSize: '13px'}}>
            A
          </div>
          <div className="flex-1 min-w-0">
            <div style={{fontSize: '13px', fontWeight: 600}}>Admin Nguyễn</div>
            <div style={{fontSize: '11px', opacity: 0.6}}>Super Admin</div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#0F4761] border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-[#0d3e54] transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );
}
