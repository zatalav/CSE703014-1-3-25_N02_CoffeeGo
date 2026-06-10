import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, ArrowLeftRight, Map, Package, Truck,
  BarChart2, Settings, Bell, Search, LogOut, KeyRound,
  ChevronDown, ChevronRight, Menu, Warehouse, Clock,
  TrendingDown, X, User,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { loadInventoryData, type InventoryData } from "../../features/inventory-data";

const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";

const navItems = [
  { id: "wm-dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "wm-stock", label: "Nhập / Xuất kho", icon: ArrowLeftRight },
  { id: "wm-map", label: "Vị trí kho", icon: Map },
  { id: "wm-ingredients", label: "Danh mục nguyên liệu", icon: Package },
  { id: "wm-suppliers", label: "Nhà cung cấp", icon: Truck },
  { id: "wm-reports", label: "Báo cáo kho", icon: BarChart2 },
  { id: "wm-settings", label: "Cài đặt", icon: Settings },
];

const initialsOf = (name?: string | null) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "QL";
  return parts.slice(-2).map(part => part[0]).join("").toUpperCase();
};

const roleLabel = (roleName?: string | null) => {
  const normalized = (roleName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (normalized.includes("warehouse manager") || normalized.includes("quan ly kho")) return "Quản lý kho";
  if (normalized.includes("branch manager") || normalized.includes("quan ly chi nhanh") || normalized.includes("quan ly ban hang")) return "Quản lý chi nhánh";
  return roleName || "Nhân viên";
};

interface WarehouseManagerLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  breadcrumb: { label: string }[];
  onSwitchRole?: () => void;
}

export function WarehouseManagerLayout({
  children,
  activePage,
  onNavigate,
  breadcrumb,
  onSwitchRole,
}: WarehouseManagerLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const { logout, session } = useAuth();
  const user = session?.userInfo;
  const branchId = user?.branchId ?? null;
  const displayName = user?.name?.trim() || "Người dùng";
  const displayRole = roleLabel(user?.roleName || session?.role);
  const initials = initialsOf(displayName);
  const displayEmail = user?.email?.trim() || "";

  const loadInventorySummary = async () => {
    try {
      setInventoryData(await loadInventoryData(branchId));
    } catch {
      setInventoryData(null);
    }
  };

  useEffect(() => {
    void loadInventorySummary();
    const onInventoryChanged = () => void loadInventorySummary();
    window.addEventListener("coffee.inventory.changed", onInventoryChanged);
    return () => window.removeEventListener("coffee.inventory.changed", onInventoryChanged);
  }, [branchId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const ingredients = inventoryData?.ingredients || [];
  const lowStockItems = useMemo(
    () => ingredients.filter(item => item.minLevel > 0 && item.current <= item.minLevel),
    [ingredients],
  );
  const expiringItems = useMemo(() => ingredients.filter(item => Boolean(item.expiry)), [ingredients]);
  const pendingRestockRequests = useMemo(
    () => (inventoryData?.restockRequests || []).filter(item => (item.status || "pending").toLowerCase() === "pending"),
    [inventoryData?.restockRequests],
  );
  const notificationCount = lowStockItems.length + pendingRestockRequests.length;
  const alertNames = lowStockItems.slice(0, 3).map(item => item.name).join(", ");
  const branchName = useMemo(() => {
    const branch = inventoryData?.branches.find(item => item.id === branchId);
    return branch?.name || (branchId ? `Chi nhánh #${branchId}` : "Kho");
  }, [branchId, inventoryData?.branches]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: PRIMARY, width: 240 }}>
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT }}>
            <Warehouse size={20} style={{ color: PRIMARY }} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{branchName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Đang vận hành</span>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl p-3 flex items-center gap-2.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: ACCENT, color: PRIMARY }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{displayRole}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2" style={{ scrollbarWidth: "none" }}>
        <p className="text-xs font-semibold px-3 mb-2 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          Chức năng
        </p>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activePage === item.id;
          const badge = item.id === "wm-stock" ? pendingRestockRequests.length : 0;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 rounded-xl transition-all text-left"
              style={{ backgroundColor: active ? "rgba(255,255,255,0.15)" : "transparent" }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <Icon size={18} style={{ color: active ? ACCENT : "rgba(255,255,255,0.6)", flexShrink: 0 }} />
              <span className="text-sm flex-1" style={{ color: active ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: active ? 600 : 400 }}>
                {item.label}
              </span>
              {badge > 0 ? (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F59E0B", color: "#fff", fontSize: 10 }}>
                  {Math.min(badge, 99)}
                </span>
              ) : null}
            </button>
          );
        })}

        <div className="mt-4 mx-1">
          <p className="text-xs font-semibold px-2 mb-2 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Tồn kho hôm nay
          </p>
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {[
              { label: "Tổng mặt hàng", value: `${ingredients.length} SKU`, color: ACCENT },
              { label: "Cần đặt hàng", value: `${lowStockItems.length} mặt hàng`, color: "#F59E0B" },
              { label: "Yêu cầu nhập", value: `${pendingRestockRequests.length} phiếu`, color: "#60A5FA" },
              { label: "Sắp hết hạn", value: `${expiringItems.length} mặt hàng`, color: "#EF4444" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {onSwitchRole && (
          <div className="mt-4 mx-1">
            <button
              onClick={onSwitchRole}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)"}
            >
              <Settings size={13} />
              Chuyển đổi vai trò
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: "rgba(255,255,255,0.4)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{currentTime.toLocaleString("vi-VN", { weekday: "long", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F0F5F3" }}>
      <div className="hidden md:flex flex-col flex-shrink-0" style={{ width: 240 }}>
        <SidebarContent />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10"><SidebarContent /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {showAlert && (pendingRestockRequests.length > 0 || lowStockItems.length > 0) && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 text-sm" style={{ backgroundColor: "#FEF9E7", borderBottom: "1px solid #FCEBC7" }}>
            <div className="flex items-center gap-2">
              <TrendingDown size={14} style={{ color: "#D97706" }} />
              <span style={{ color: "#92400E" }}>
                {pendingRestockRequests.length > 0 ? (
                  <><strong>Yêu cầu nhập hàng:</strong> {pendingRestockRequests.length} phiếu mới từ chi nhánh đang chờ xử lý</>
                ) : (
                  <><strong>Cảnh báo tồn kho:</strong> {alertNames}{lowStockItems.length > 3 ? ` và ${lowStockItems.length - 3} mặt hàng khác` : ""} dưới mức tối thiểu</>
                )}
              </span>
            </div>
            <button onClick={() => setShowAlert(false)} className="p-1" style={{ color: "#D97706" }}>
              <X size={14} />
            </button>
          </div>
        )}

        <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <button className="md:hidden p-2 rounded-lg" onClick={() => setMobileOpen(true)}>
            <Menu size={18} className="text-gray-600" />
          </button>

          <nav className="flex items-center gap-1 min-w-0">
            {breadcrumb.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight size={12} className="text-gray-400" />}
                <span className="text-sm" style={{ color: idx === breadcrumb.length - 1 ? "#111827" : "#6B7280", fontWeight: idx === breadcrumb.length - 1 ? 600 : 400 }}>
                  {item.label}
                </span>
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: "#ECFDF5", color: "#065F46" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
            Ca sáng - 07:00 → 15:00
          </div>

          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm nguyên liệu..." className="pl-8 pr-3 py-1.5 text-sm bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-300" style={{ width: 180 }} />
          </div>

          <button className="relative p-2 rounded-lg" onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
            <Bell size={18} className="text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EF4444" }}>
                <span className="text-white font-bold" style={{ fontSize: 9 }}>{Math.min(notificationCount, 9)}</span>
              </span>
            )}
          </button>

          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: PRIMARY, color: ACCENT }}>{initials}</div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-tight">{displayName}</p>
                <p className="text-xs text-gray-400 leading-tight">{displayRole}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-100 py-1 z-20" style={{ width: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-700">{branchName}</p>
                    <p className="text-xs text-gray-400">{displayEmail || `NV #${user?.id || "-"}`}</p>
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onNavigate("wm-profile"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 text-left" onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                    <User size={14} className="text-gray-400" /> Trang cá nhân
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 text-left" onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                    <KeyRound size={14} className="text-gray-400" /> Đổi mật khẩu
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => void logout()} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 text-left" onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FEF2F2"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}


