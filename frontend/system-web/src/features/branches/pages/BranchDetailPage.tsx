import { useState } from "react";
import {
  ArrowLeft, Store, MapPin, Phone, Mail, Clock,
  User, Edit, Save, X, Plus, TrendingUp,
  Users, CheckCircle, XCircle, Calendar, AlertTriangle,
  Info, Camera,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  mockBranches, Branch, defaultSchedule, WeeklySchedule,
  mockStaff, StaffMember, revenueChartData, orderChartData,
} from "../api/mockData";

interface BranchDetailPageProps {
  branchId: number;
  onBack: () => void;
}

const TABS = [
  { id: "info", label: "Thông tin chung", icon: Info },
  { id: "hours", label: "Giờ mở/đóng cửa", icon: Clock },
  { id: "staff", label: "Nhân sự", icon: Users },
  { id: "stats", label: "Thống kê nhanh", icon: TrendingUp },
];

export function BranchDetailPage({ branchId, onBack }: BranchDetailPageProps) {
  const branch = mockBranches.find(b => b.id === branchId)!;
  const [activeTab, setActiveTab] = useState("info");

  if (!branch) {
    return (
      <div className="p-6 text-center text-gray-500">
        Chi nhánh không tồn tại.{" "}
        <button onClick={onBack} className="text-blue-600 underline">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 transition-all mt-0.5"
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
        >
          <ArrowLeft size={17} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 style={{ color: "#111827" }}>{branch.name}</h1>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: branch.status === "active" ? "#D1FAE5" : "#FEE2E2",
                color: branch.status === "active" ? "#065F46" : "#991B1B",
              }}
            >
              {branch.status === "active" ? <CheckCircle size={12} /> : <XCircle size={12} />}
              {branch.status === "active" ? "Đang hoạt động" : "Tạm đóng"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <MapPin size={13} />
            {branch.address}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 mb-6 w-fit" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: active ? "#0F4761" : "transparent",
                color: active ? "#fff" : "#6B7280",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "info" && <InfoTab branch={branch} />}
      {activeTab === "hours" && <HoursTab branch={branch} />}
      {activeTab === "staff" && <StaffTab branchId={branchId} />}
      {activeTab === "stats" && <StatsTab branch={branch} />}
    </div>
  );
}

// ─── Tab 1: General Info ──────────────────────────────────────────
function InfoTab({ branch }: { branch: Branch }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    description: branch.description,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main info form */}
      <div
        className="lg:col-span-2 bg-white rounded-2xl border border-gray-100"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 style={{ color: "#111827" }}>Thông tin chi nhánh</h3>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: editing ? "#EBF2F7" : "transparent",
              color: editing ? "#0F4761" : "#6B7280",
              border: "1px solid",
              borderColor: editing ? "#0F4761" : "#E5E7EB",
            }}
          >
            {editing ? <X size={14} /> : <Edit size={14} />}
            {editing ? "Hủy" : "Chỉnh sửa"}
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Tên chi nhánh" icon={<Store size={14} className="text-gray-400" />}>
              {editing ? (
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              ) : (
                <p className="text-sm font-medium text-gray-800">{form.name}</p>
              )}
            </Field>

            <Field label="Quận/Huyện" icon={<MapPin size={14} className="text-gray-400" />}>
              <p className="text-sm font-medium text-gray-800">{branch.district}</p>
            </Field>
          </div>

          <Field label="Địa chỉ đầy đủ" icon={<MapPin size={14} className="text-gray-400" />}>
            {editing ? (
              <input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
            ) : (
              <p className="text-sm font-medium text-gray-800">{form.address}</p>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Số điện thoại" icon={<Phone size={14} className="text-gray-400" />}>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              ) : (
                <p className="text-sm font-medium text-gray-800">{form.phone}</p>
              )}
            </Field>

            <Field label="Email chi nhánh" icon={<Mail size={14} className="text-gray-400" />}>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              ) : (
                <p className="text-sm font-medium text-gray-800">{form.email}</p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Giờ mở cửa" icon={<Clock size={14} className="text-gray-400" />}>
              <p className="text-sm font-medium text-gray-800">{branch.openTime}</p>
            </Field>
            <Field label="Giờ đóng cửa" icon={<Clock size={14} className="text-gray-400" />}>
              <p className="text-sm font-medium text-gray-800">{branch.closeTime}</p>
            </Field>
          </div>

          <Field label="Mô tả" icon={<Info size={14} className="text-gray-400" />}>
            {editing ? (
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{form.description}</p>
            )}
          </Field>

          {editing && (
            <div className="flex justify-end pt-2">
              <button
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-white rounded-xl font-medium transition-all"
                style={{ backgroundColor: "#0F4761" }}
                onClick={() => setEditing(false)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
              >
                <Save size={15} />
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Branch image */}
        <div
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
        >
          <div
            className="h-40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            style={{ backgroundColor: "#EBF2F7" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#DCE8F0"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#EBF2F7"}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#0F4761" }}
            >
              <Store size={24} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "#0F4761" }}>Ảnh chi nhánh</p>
              <p className="text-xs text-gray-400">Nhấn để thay đổi</p>
            </div>
          </div>
          <div className="p-3 flex justify-center">
            <button
              className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
            >
              <Camera size={13} />
              Tải ảnh lên
            </button>
          </div>
        </div>

        {/* Manager info */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
        >
          <h4 className="text-gray-800 mb-4">Quản lý phụ trách</h4>
          {branch.manager ? (
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                style={{ backgroundColor: "#0F4761" }}
              >
                {branch.manager.split(" ").pop()?.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{branch.manager}</p>
                <p className="text-xs text-gray-500 mt-0.5">{branch.managerPhone || "N/A"}</p>
              </div>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <Edit size={14} />
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <p className="text-sm font-medium text-amber-700">Chưa phân công</p>
              <button
                className="mt-2 px-3 py-1.5 text-xs rounded-lg text-white font-medium"
                style={{ backgroundColor: "#0F4761" }}
              >
                Phân công quản lý
              </button>
            </div>
          )}
        </div>

        {/* Quick numbers */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
        >
          <h4 className="text-gray-800 mb-4">Số liệu tóm tắt</h4>
          <div className="space-y-3">
            {[
              { label: "Nhân viên", value: `${branch.staffCount} người`, color: "#0F4761" },
              { label: "Đơn TB/ngày", value: `${branch.avgOrdersPerDay} đơn`, color: "#10B981" },
              { label: "DT tháng này", value: branch.monthlyRevenue > 0 ? `${(branch.monthlyRevenue / 1_000_000).toFixed(0)} triệu đồng` : "Tạm đóng", color: "#F59E0B" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Hours ─────────────────────────────────────────────────
function HoursTab({ branch }: { branch: Branch }) {
  const [schedule, setSchedule] = useState<WeeklySchedule[]>(
    defaultSchedule.map((d, i) => ({
      ...d,
      openTime: i === 5 || i === 4 ? "07:00" : branch.openTime,
      closeTime: i === 5 || i === 4 ? "23:00" : branch.closeTime,
    }))
  );
  const [saved, setSaved] = useState(false);

  const updateDay = (idx: number, field: keyof WeeklySchedule, value: string | boolean) => {
    setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
    setSaved(false);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <div className="max-w-2xl">
      <div
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 style={{ color: "#111827" }}>Cấu hình giờ mở/đóng cửa</h3>
            <p className="text-sm text-gray-500 mt-0.5">Thiết lập lịch hoạt động theo ngày trong tuần</p>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={15} />
              Đã lưu
            </div>
          )}
        </div>

        <div className="p-5 space-y-2">
          {schedule.map((day, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3.5 rounded-xl border transition-all"
              style={{
                borderColor: day.isOpen ? "#E5E7EB" : "#F3F4F6",
                backgroundColor: day.isOpen ? "#fff" : "#F9FAFB",
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => updateDay(idx, "isOpen", !day.isOpen)}
                className="relative flex-shrink-0 rounded-full transition-colors"
                style={{
                  width: 40, height: 22,
                  backgroundColor: day.isOpen ? "#0F4761" : "#D1D5DB",
                }}
              >
                <div
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: day.isOpen ? 20 : 2 }}
                />
              </button>

              {/* Day label */}
              <div className="flex items-center gap-2 w-28 flex-shrink-0">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    backgroundColor: day.isOpen ? "#EBF2F7" : "#F3F4F6",
                    color: day.isOpen ? "#0F4761" : "#9CA3AF",
                  }}
                >
                  {day.shortDay}
                </span>
                <span
                  className="text-sm"
                  style={{ color: day.isOpen ? "#374151" : "#9CA3AF", fontWeight: day.isOpen ? 500 : 400 }}
                >
                  {day.day}
                </span>
              </div>

              {/* Time inputs */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <Clock size={14} className="text-gray-400" />
                  <input
                    type="time"
                    value={day.openTime}
                    onChange={e => updateDay(idx, "openTime", e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                  <span className="text-gray-400 font-medium">—</span>
                  <input
                    type="time"
                    value={day.closeTime}
                    onChange={e => updateDay(idx, "closeTime", e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic flex-1">Đóng cửa cả ngày</span>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 rounded-lg border border-gray-200 bg-white transition-colors"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#fff"}
          >
            <Calendar size={14} />
            Thêm ngày nghỉ lễ
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm text-white rounded-xl font-medium transition-all"
            style={{ backgroundColor: "#0F4761" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            <Save size={14} />
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Staff ─────────────────────────────────────────────────
function StaffTab({ branchId }: { branchId: number }) {
  const staffList: StaffMember[] = mockStaff[branchId] || [];
  const [search, setSearch] = useState("");

  const filtered = staffList.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge: Record<string, { bg: string; text: string }> = {
    "Quản lý chi nhánh": { bg: "#EBF2F7", text: "#0F4761" },
    "Nhân viên pha chế": { bg: "#FEF3C7", text: "#92400E" },
    "Nhân viên thu ngân": { bg: "#D1FAE5", text: "#065F46" },
    "Nhân viên phục vụ": { bg: "#EDE9FE", text: "#5B21B6" },
  };

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
        <div>
          <h3 style={{ color: "#111827" }}>Danh sách nhân sự</h3>
          <p className="text-sm text-gray-500 mt-0.5">{staffList.length} nhân viên thuộc chi nhánh</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm nhân viên..."
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
              style={{ width: 200 }}
            />
            <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-lg font-medium transition-all"
            style={{ backgroundColor: "#0F4761" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
          >
            <Plus size={14} />
            Thêm nhân viên
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {filtered.map(staff => {
            const badge = roleBadge[staff.role] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <div
                key={staff.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFAFA"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: staff.status === "active" ? "#0F4761" : "#9CA3AF" }}
                >
                  {staff.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{staff.name}</p>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {staff.role}
                    </span>
                    {staff.status === "inactive" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Đã nghỉ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-0.5">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone size={11} />
                      {staff.phone}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={11} />
                      Từ {staff.joinDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    className="p-1.5 rounded-lg transition-colors text-gray-400"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <Edit size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Chưa có nhân viên nào{search ? ` khớp với "${search}"` : ""}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Quick Stats ────────────────────────────────────────────
function StatsTab({ branch }: { branch: Branch }) {
  const kpis = [
    {
      label: "Doanh thu 30 ngày",
      value: branch.monthlyRevenue > 0 ? `${(branch.monthlyRevenue / 1_000_000).toFixed(0)} triệu đ` : "—",
      delta: branch.monthlyRevenue > 0 ? "+12.5%" : "—",
      positive: true,
      color: "#0F4761",
      bg: "#EBF2F7",
    },
    {
      label: "Đơn trung bình/ngày",
      value: branch.avgOrdersPerDay > 0 ? `${branch.avgOrdersPerDay} đơn` : "—",
      delta: branch.avgOrdersPerDay > 0 ? "+8.2%" : "—",
      positive: true,
      color: "#10B981",
      bg: "#D1FAE5",
    },
    {
      label: "Giá trị đơn TB",
      value: branch.avgOrdersPerDay > 0
        ? `${Math.round(branch.monthlyRevenue / branch.avgOrdersPerDay / 30 / 1000)}k đ`
        : "—",
      delta: branch.avgOrdersPerDay > 0 ? "+4.1%" : "—",
      positive: true,
      color: "#F59E0B",
      bg: "#FEF3C7",
    },
    {
      label: "Tỷ lệ hoàn thành",
      value: branch.status === "active" ? "94.6%" : "—",
      delta: branch.status === "active" ? "-1.2%" : "—",
      positive: false,
      color: "#EF4444",
      bg: "#FEE2E2",
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-lg text-xs">
          <p className="text-gray-500 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-semibold">
              {p.name === "revenue" ? `${(p.value / 1_000_000).toFixed(1)} triệu đ` : `${p.value} đơn`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (branch.status === "inactive") {
    return (
      <div
        className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <XCircle size={28} className="text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">Chi nhánh đang tạm đóng</p>
        <p className="text-sm text-gray-400 mt-2">Thống kê sẽ hiển thị khi chi nhánh hoạt động trở lại</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
            {k.delta !== "—" && (
              <span
                className="inline-flex items-center gap-0.5 text-xs font-medium mt-1 px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: k.positive ? "#D1FAE5" : "#FEE2E2",
                  color: k.positive ? "#065F46" : "#991B1B",
                }}
              >
                {k.positive ? "↑" : "↓"} {k.delta}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: "#111827" }}>Doanh thu 14 ngày gần nhất</h3>
          <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">14 ngày qua</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}tr`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="revenue" name="revenue" stroke="#0F4761" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Orders Chart */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: "#111827" }}>Số đơn hàng theo ngày</h3>
          <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg text-gray-500">14 ngày qua</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={orderChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="orders" name="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

