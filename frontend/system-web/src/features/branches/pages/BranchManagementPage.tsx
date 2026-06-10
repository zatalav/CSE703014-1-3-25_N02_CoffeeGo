import { useState } from "react";
import {
  Plus, Search, Filter, MapPin, Phone, Clock,
  Edit, Eye, Power, Store, CheckCircle, XCircle,
  AlertTriangle, RotateCcw, MoreVertical, X, AlertCircle,
} from "lucide-react";
import { mockBranches, Branch } from "../api/mockData";
import { AddBranchModal } from "../components/AddBranchModal";

interface BranchManagementPageProps {
  onViewDetail: (id: number) => void;
}

const mapPins: { id: number; x: number; y: number; color: string }[] = [
  { id: 1, x: 62, y: 66, color: "#10B981" },
  { id: 2, x: 48, y: 60, color: "#10B981" },
  { id: 3, x: 58, y: 34, color: "#10B981" },
  { id: 4, x: 78, y: 22, color: "#10B981" },
  { id: 5, x: 32, y: 28, color: "#EF4444" },
  { id: 6, x: 38, y: 52, color: "#10B981" },
];

export function BranchManagementPage({ onViewDetail }: BranchManagementPageProps) {
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [disableTarget, setDisableTarget] = useState<Branch | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);

  const filtered = branches.filter(b => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase()) ||
      (b.manager ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive = branches.filter(b => b.status === "active").length;
  const totalInactive = branches.filter(b => b.status === "inactive").length;
  const noManager = branches.filter(b => !b.manager).length;

  const stats = [
    { label: "Tổng chi nhánh", value: branches.length, icon: Store, color: "#0F4761", bg: "#EBF2F7" },
    { label: "Đang hoạt động", value: totalActive, icon: CheckCircle, color: "#10B981", bg: "#D1FAE5" },
    { label: "Tạm đóng cửa", value: totalInactive, icon: XCircle, color: "#EF4444", bg: "#FEE2E2" },
    { label: "Chưa có quản lý", value: noManager, icon: AlertTriangle, color: "#F59E0B", bg: "#FEF3C7" },
  ];

  const confirmDisable = () => {
    if (!disableTarget || !disableReason.trim()) return;
    setBranches(prev =>
      prev.map(b => b.id === disableTarget.id ? { ...b, status: "inactive" } : b)
    );
    setDisableTarget(null);
    setDisableReason("");
  };

  return (
    <div className="p-6 min-h-full">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 style={{ color: "#111827" }}>Quản lý chi nhánh</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý và theo dõi tất cả chi nhánh trong hệ thống chuỗi trà sữa
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all shadow-sm"
          style={{ backgroundColor: "#0F4761" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
        >
          <Plus size={16} />
          Thêm chi nhánh mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-xl p-4 border border-gray-100"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 leading-tight">{s.label}</p>
                  <p className="text-3xl font-semibold mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                  <Icon size={22} style={{ color: s.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, địa chỉ, quản lý..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 cursor-pointer text-gray-700"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm đóng</option>
        </select>
        <button
          className="flex items-center gap-2 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 transition-colors"
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
        >
          <Filter size={14} />
          Bộ lọc thêm
        </button>
        {(search || statusFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw size={14} />
            Đặt lại
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">
        Hiển thị <span className="font-medium text-gray-800">{filtered.length}</span> / {branches.length} chi nhánh
      </p>

      {/* Branch Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {filtered.map(branch => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onView={() => onViewDetail(branch.id)}
              onDisable={() => { setDisableTarget(branch); setDisableReason(""); }}
              onEnable={() => setBranches(prev => prev.map(b => b.id === branch.id ? { ...b, status: "active" } : b))}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Store size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">Không tìm thấy chi nhánh</p>
          <p className="text-sm text-gray-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      )}

      {/* Map section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 style={{ color: "#111827" }}>Bản đồ chi nhánh</h3>
            <p className="text-sm text-gray-500 mt-0.5">Vị trí {branches.length} chi nhánh tại TP.HCM</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-500">Hoạt động ({totalActive})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-500">Tạm đóng ({totalInactive})</span>
            </div>
          </div>
        </div>
        <div className="relative" style={{ height: 320, backgroundColor: "#EBF2F7" }}>
          {/* Stylized map background */}
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ opacity: 0.15 }}>
            {/* Grid lines */}
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => (
              <g key={v}>
                <line x1={v} y1={0} x2={v} y2={100} stroke="#0F4761" strokeWidth="0.3" />
                <line x1={0} y1={v} x2={100} y2={v} stroke="#0F4761" strokeWidth="0.3" />
              </g>
            ))}
            {/* Stylized roads */}
            <path d="M 10,50 Q 30,45 50,50 Q 70,55 90,50" stroke="#0F4761" strokeWidth="1.5" fill="none" />
            <path d="M 50,10 Q 48,30 50,50 Q 52,70 50,90" stroke="#0F4761" strokeWidth="1.5" fill="none" />
            <path d="M 20,80 Q 40,70 60,75 Q 80,80 90,70" stroke="#0F4761" strokeWidth="1" fill="none" />
            <path d="M 10,30 Q 30,25 50,30 Q 65,35 80,25" stroke="#0F4761" strokeWidth="1" fill="none" />
            <path d="M 15,10 Q 20,30 25,50 Q 30,70 20,90" stroke="#0F4761" strokeWidth="0.8" fill="none" />
            <path d="M 75,5 Q 72,25 75,50 Q 78,70 72,90" stroke="#0F4761" strokeWidth="0.8" fill="none" />
          </svg>

          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm font-medium" style={{ color: "#0F4761", opacity: 0.2 }}>TP. Hồ Chí Minh</p>
          </div>

          {/* Map pins */}
          {mapPins.map(pin => {
            const branch = branches.find(b => b.id === pin.id);
            if (!branch) return null;
            const isHovered = hoveredPin === pin.id;
            return (
              <div
                key={pin.id}
                className="absolute cursor-pointer transition-transform"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: `translate(-50%, -100%) scale(${isHovered ? 1.2 : 1})`,
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredPin(pin.id)}
                onMouseLeave={() => setHoveredPin(null)}
              >
                <div
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: branch.status === "active" ? "#10B981" : "#EF4444" }}
                >
                  <MapPin size={13} className="text-white" />
                </div>
                {isHovered && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl px-3 py-2 text-xs whitespace-nowrap shadow-xl border border-gray-100"
                    style={{ minWidth: 160 }}
                  >
                    <p className="font-semibold text-gray-800">{branch.name}</p>
                    <p className="text-gray-500 mt-0.5">{branch.address.split(",")[0]}</p>
                    <p className="mt-1 font-medium" style={{ color: branch.status === "active" ? "#10B981" : "#EF4444" }}>
                      {branch.status === "active" ? "Đang hoạt động" : "Tạm đóng"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Legend overlay */}
          <div
            className="absolute bottom-3 right-3 bg-white rounded-xl px-3 py-2 text-xs border border-gray-100"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <p className="font-medium text-gray-700 mb-1">Chú thích</p>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-gray-500">Đang hoạt động</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-500">Tạm đóng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disable confirmation dialog */}
      {disableTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDisableTarget(null)} />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-gray-900">Vô hiệu hóa chi nhánh</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Bạn đang vô hiệu hóa <strong>{disableTarget.name}</strong>. Chi nhánh sẽ không thể nhận đơn hàng mới.
                  </p>
                </div>
                <button onClick={() => setDisableTarget(null)} className="ml-auto p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lý do vô hiệu hóa <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={disableReason}
                  onChange={e => setDisableReason(e.target.value)}
                  placeholder="Nhập lý do vô hiệu hóa chi nhánh này..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-red-400 resize-none"
                />
              </div>
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={() => setDisableTarget(null)}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDisable}
                  disabled={!disableReason.trim()}
                  className="flex-1 px-4 py-2.5 text-sm text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#EF4444" }}
                  onMouseEnter={e => { if (disableReason.trim()) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                >
                  Xác nhận vô hiệu hóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddBranchModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

interface BranchCardProps {
  branch: Branch;
  onView: () => void;
  onDisable: () => void;
  onEnable: () => void;
}

function BranchCard({ branch, onView, onDisable, onEnable }: BranchCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isActive = branch.status === "active";

  const formatRevenue = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
    return v.toLocaleString("vi-VN");
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all group"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        opacity: isActive ? 1 : 0.85,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"}
    >
      {/* Card header */}
      <div
        className="px-5 py-4 flex items-start justify-between"
        style={{ backgroundColor: isActive ? "#0F4761" : "#6B7280" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <Store size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate leading-tight">{branch.name}</p>
            <span
              className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: isActive ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                color: isActive ? "#6EE7B7" : "#FCA5A5",
              }}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"}`} />
              {isActive ? "Đang hoạt động" : "Tạm đóng"}
            </span>
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.1)"}
          >
            <MoreVertical size={16} className="text-white" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-100 py-1 z-20"
                style={{ width: 168, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
              >
                <button
                  onClick={() => { setShowMenu(false); onView(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 text-left transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                >
                  <Eye size={14} className="text-gray-400" />
                  Xem chi tiết
                </button>
                <button
                  onClick={() => { setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 text-left transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                >
                  <Edit size={14} className="text-gray-400" />
                  Chỉnh sửa
                </button>
                <div className="my-1 border-t border-gray-100" />
                {isActive ? (
                  <button
                    onClick={() => { setShowMenu(false); onDisable(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FEF2F2"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <Power size={14} />
                    Vô hiệu hóa
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowMenu(false); onEnable(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-green-600 text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F0FDF4"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <Power size={14} />
                    Kích hoạt lại
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 space-y-2.5">
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 leading-snug line-clamp-2">{branch.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600">{branch.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600">{branch.openTime} — {branch.closeTime}</p>
        </div>

        {/* Manager */}
        <div className="pt-1 border-t border-gray-100">
          {branch.manager ? (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: "#0F4761" }}
              >
                {branch.manager.split(" ").pop()?.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-gray-400">Quản lý</p>
                <p className="text-sm text-gray-700 font-medium leading-tight">{branch.manager}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={12} className="text-amber-600" />
              </div>
              <p className="text-sm font-medium" style={{ color: "#F59E0B" }}>Chưa có quản lý</p>
            </div>
          )}
        </div>
      </div>

      {/* Card footer - stats */}
      {isActive && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-gray-400">Doanh thu/tháng</p>
            <p className="text-sm font-semibold" style={{ color: "#0F4761" }}>
              {formatRevenue(branch.monthlyRevenue)}đ
            </p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-xs text-gray-400">Đơn TB/ngày</p>
            <p className="text-sm font-semibold" style={{ color: "#10B981" }}>{branch.avgOrdersPerDay}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-xs text-gray-400">Nhân viên</p>
            <p className="text-sm font-semibold text-gray-700">{branch.staffCount}</p>
          </div>
        </div>
      )}

      {!isActive && (
        <div
          className="px-5 py-3 border-t border-gray-100 flex items-center gap-2"
          style={{ backgroundColor: "#FEF2F2" }}
        >
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">Chi nhánh đang tạm đóng cửa</p>
        </div>
      )}

      {/* View detail button */}
      <div className="px-5 pb-4">
        <button
          onClick={onView}
          className="w-full py-2.5 text-sm rounded-xl border transition-all font-medium"
          style={{ borderColor: "#0F4761", color: "#0F4761" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#0F4761";
            (e.currentTarget as HTMLElement).style.color = "#fff";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#0F4761";
          }}
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  );
}
