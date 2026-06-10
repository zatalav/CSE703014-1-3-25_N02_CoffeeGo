import { useState, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AdminLayout } from "../shared/layout";
import {
  AuthProvider,
  CUSTOMER_WEB_URL,
  encodeTransferredSession,
  type AppRole,
  hasAppRole,
  isExternalUrl,
  roleHomePath,
  useAuth,
} from "../lib/auth";
import Login from "./auth-components/Login";
import ForgotPassword from "./auth-components/ForgotPassword";
import { Dashboard } from "../modules/dashboard";
import { Employees, BranchManagers, CustomerAccounts, PersonalInfo } from "../modules/users";
import { Schedule } from "../modules/schedule";
import { Branches } from "../modules/branches";
import { ProductCategories, Products, Toppings, Combos, SeasonalProducts, Recipes } from "../modules/products";
import { Suppliers, IngredientCategories, WarehouseIO } from "../modules/inventory";
import { Orders } from "../modules/orders";
import { MembershipTiers, Vouchers, Reviews } from "../modules/crm";
import { RevenueReport, InventoryReport, OrderReport, CustomerReport } from "../modules/reports";
import { AIDemandForecast, AIAnomalyDetection, AIMenuTrends, AICustomerBehavior, AIRevenueByItem, AIBCGMatrix } from "../modules/ai";
import { BannerManagement, NewsManagement } from "../modules/content";
import { SystemSettings, Notifications } from "../modules/system";
import { ApiDocs } from "../modules/api-docs";
import { BranchManagerLayout } from "../shared/layouts/BranchManagerLayout";
import { WarehouseManagerLayout } from "../shared/layouts/WarehouseManagerLayout";
import { BranchDashboardPage } from "../features/branch-dashboard";
import { OrdersPage } from "../features/orders";
import { StaffSchedulePage } from "../features/staff";
import { BranchInventoryPage } from "../features/branch-inventory";
import { BranchReportsPage } from "../features/branch-reports";
import { WarehouseDashboardPage } from "../features/warehouse-dashboard";
import { StockMovementsPage } from "../features/stock-movements";
import { WarehouseMapPage } from "../features/warehouse-map";
import { IngredientsPage } from "../features/ingredients";
import { SuppliersPage } from "../features/suppliers";
import { WarehouseReportsPage } from "../features/warehouse-reports";
import { RoleAssistantWidget } from "../features/assistant/RoleAssistantWidget";
import "../roles/sales-staff/styles/index.css";
import SalesStaffApp from "../roles/sales-staff/app/App";
import DeliveryStaffApp from "../roles/delivery-staff/App";

type Page =
  | "dashboard"
  | "employees" | "branch-managers" | "customer-accounts"
  | "schedule"
  | "branches"
  | "product-categories" | "products" | "toppings" | "combos" | "seasonal-products" | "recipes"
  | "suppliers" | "ingredient-categories"
  | "warehouse-io"
  | "orders"
  | "personal-info" | "membership-tiers" | "vouchers" | "reviews"
  | "revenue-report" | "inventory-report" | "order-report" | "customer-report"
  | "ai-demand" | "ai-anomaly" | "ai-menu-trends" | "ai-customer-behavior" | "ai-revenue-item" | "ai-bcg"
  | "settings"
  | "notifications"
  | "banner-management" | "news-management";

function renderAdminPage(page: Page) {
  switch (page) {
    case "dashboard": return <Dashboard />;
    case "employees": return <Employees />;
    case "branch-managers": return <BranchManagers />;
    case "customer-accounts": return <CustomerAccounts />;
    case "personal-info": return <PersonalInfo />;
    case "schedule": return <Schedule />;
    case "branches": return <Branches />;
    case "product-categories": return <ProductCategories />;
    case "products": return <Products />;
    case "recipes": return <Recipes />;
    case "toppings": return <Toppings />;
    case "combos": return <Combos />;
    case "seasonal-products": return <SeasonalProducts />;
    case "suppliers": return <Suppliers />;
    case "ingredient-categories": return <IngredientCategories />;
    case "warehouse-io": return <WarehouseIO />;
    case "orders": return <Orders />;
    case "vouchers": return <Vouchers />;
    case "reviews": return <Reviews />;
    case "revenue-report": return <RevenueReport />;
    case "inventory-report": return <InventoryReport />;
    case "order-report": return <OrderReport />;
    case "customer-report": return <CustomerReport />;
    case "membership-tiers": return <MembershipTiers />;
    case "ai-demand": return <AIDemandForecast />;
    case "ai-anomaly": return <AIAnomalyDetection />;
    case "ai-menu-trends": return <AIMenuTrends />;
    case "ai-customer-behavior": return <AICustomerBehavior />;
    case "ai-revenue-item": return <AIRevenueByItem />;
    case "ai-bcg": return <AIBCGMatrix />;
    case "settings": return <SystemSettings />;
    case "notifications": return <Notifications />;
    case "banner-management": return <BannerManagement />;
    case "news-management": return <NewsManagement />;
    default: return <Dashboard />;
  }
}

function ProtectedRoute({ roles, children }: { roles: AppRole[]; children: ReactElement }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const roleName = session.userInfo?.roleName || session.role;
  if (!roles.some(role => hasAppRole(roleName, role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function PublicOnly({ children }: { children: ReactElement }) {
  const { session } = useAuth();
  if (session) {
    return <RoleRedirect roleName={session.userInfo?.roleName || session.role} session={session} />;
  }
  return children;
}

function RootRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <RoleRedirect roleName={session.userInfo?.roleName || session.role} session={session} />;
}

function RoleRedirect({ roleName, session }: { roleName?: string | null; session: ReturnType<typeof useAuth>["session"] }) {
  const target = roleHomePath(roleName);
  if (isExternalUrl(target)) {
    if (session) {
      window.location.replace(`${CUSTOMER_WEB_URL}/#auth=${encodeTransferredSession(session)}`);
    } else {
      window.location.replace(target);
    }
    return null;
  }
  return <Navigate to={target} replace />;
}

function UnauthorizedPage() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="max-w-md w-full rounded-xl bg-white border border-gray-100 shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-gray-500">Tài khoản này không được gán vào trang quản trị phù hợp.</p>
        <button
          onClick={() => void logout()}
          className="mt-5 px-4 py-2 rounded-lg bg-[#0F4761] text-white text-sm font-semibold"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

function AdminShell({ initialPage = "dashboard" }: { initialPage?: Page }) {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);
  return (
    <>
      <AdminLayout currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as Page)}>
        {renderAdminPage(currentPage)}
      </AdminLayout>
      <RoleAssistantWidget />
    </>
  );
}

function BranchManagerShell() {
  const [activePage, setActivePage] = useState("bm-dashboard");
  const breadcrumbMap: Record<string, { label: string }[]> = {
    "bm-dashboard": [{ label: "Chi nhánh" }, { label: "Tổng quan" }],
    "bm-orders": [{ label: "Chi nhánh" }, { label: "Đơn hàng" }],
    "bm-staff": [{ label: "Chi nhánh" }, { label: "Nhân viên & lịch" }],
    "bm-inventory": [{ label: "Chi nhánh" }, { label: "Kho nguyên liệu" }],
    "bm-reports": [{ label: "Chi nhánh" }, { label: "Báo cáo" }],
    "bm-profile": [{ label: "Chi nhánh" }, { label: "Trang cá nhân" }],
    "bm-settings": [{ label: "Chi nhánh" }, { label: "Cài đặt" }],
  };

  const page = (() => {
    switch (activePage) {
      case "bm-dashboard": return <BranchDashboardPage onNavigate={setActivePage} />;
      case "bm-orders": return <OrdersPage />;
      case "bm-staff": return <StaffSchedulePage />;
      case "bm-inventory": return <BranchInventoryPage />;
      case "bm-reports": return <BranchReportsPage />;
      case "bm-profile": return <PersonalInfo />;
      default: return <BranchDashboardPage onNavigate={setActivePage} />;
    }
  })();

  return (
    <>
      <BranchManagerLayout
        activePage={activePage}
        onNavigate={setActivePage}
        breadcrumb={breadcrumbMap[activePage] || [{ label: "Chi nhánh" }]}
      >
        {page}
      </BranchManagerLayout>
      <RoleAssistantWidget />
    </>
  );
}

function WarehouseManagerShell() {
  const [activePage, setActivePage] = useState("wm-dashboard");
  const breadcrumbMap: Record<string, { label: string }[]> = {
    "wm-dashboard": [{ label: "Kho trung tâm" }, { label: "Tổng quan" }],
    "wm-stock": [{ label: "Kho trung tâm" }, { label: "Nhập / xuất kho" }],
    "wm-map": [{ label: "Kho trung tâm" }, { label: "Vị trí kho" }],
    "wm-ingredients": [{ label: "Kho trung tâm" }, { label: "Nguyên liệu" }],
    "wm-suppliers": [{ label: "Kho trung tâm" }, { label: "Nhà cung cấp" }],
    "wm-reports": [{ label: "Kho trung tâm" }, { label: "Báo cáo kho" }],
    "wm-profile": [{ label: "Kho trung tâm" }, { label: "Trang cá nhân" }],
    "wm-settings": [{ label: "Kho trung tâm" }, { label: "Cài đặt" }],
  };

  const page = (() => {
    switch (activePage) {
      case "wm-dashboard": return <WarehouseDashboardPage onNavigate={setActivePage} />;
      case "wm-stock": return <StockMovementsPage />;
      case "wm-map": return <WarehouseMapPage />;
      case "wm-ingredients": return <IngredientsPage />;
      case "wm-suppliers": return <SuppliersPage />;
      case "wm-reports": return <WarehouseReportsPage />;
      case "wm-profile": return <PersonalInfo />;
      default: return <WarehouseDashboardPage onNavigate={setActivePage} />;
    }
  })();

  return (
    <>
      <WarehouseManagerLayout
        activePage={activePage}
        onNavigate={setActivePage}
        breadcrumb={breadcrumbMap[activePage] || [{ label: "Kho trung tâm" }]}
      >
        {page}
      </WarehouseManagerLayout>
      <RoleAssistantWidget />
    </>
  );
}

function DeliveryStaffShell() {
  return (
    <>
      <DeliveryStaffApp />
      <RoleAssistantWidget />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/dashboard" element={<ProtectedRoute roles={["admin"]}><AdminShell initialPage="dashboard" /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminShell initialPage="dashboard" /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute roles={["admin"]}><AdminShell initialPage="orders" /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute roles={["admin"]}><AdminShell initialPage="products" /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={["admin"]}><AdminShell initialPage="revenue-report" /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={["admin"]}><AdminShell initialPage="settings" /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute roles={["branch_manager"]}><BranchManagerShell /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={["warehouse_manager", "warehouse_staff"]}><WarehouseManagerShell /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute roles={["branch_staff"]}><SalesStaffApp /></ProtectedRoute>} />
      <Route path="/delivery" element={<ProtectedRoute roles={["delivery_staff"]}><DeliveryStaffShell /></ProtectedRoute>} />
      <Route path="/branch-manager" element={<Navigate to="/branches" replace />} />
      <Route path="/warehouse-manager" element={<Navigate to="/inventory" replace />} />
      <Route path="/sales-staff" element={<Navigate to="/staff" replace />} />
      <Route path="/delivery-staff" element={<Navigate to="/delivery" replace />} />
      <Route path="/api-docs" element={<ProtectedRoute roles={["admin"]}><div className="min-h-screen bg-[#F5F7FA] p-6"><ApiDocs /></div></ProtectedRoute>} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
