import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Edit, Plus, Search, Users, X } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { EmployeeLookupDto, PageResponse, WorkScheduleDto, WorkScheduleRequestDto } from "../../../lib/types";
import { pageItems } from "../../inventory-data";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  status: "active" | "inactive" | "leave";
  joinDate: string;
  initials: string;
}

type ShiftKey = "morning" | "afternoon" | "evening";
type ScheduleData = Record<ShiftKey, Record<number, number[]>>;

const shifts: { key: ShiftKey; label: string; dbValue: string; time: string; startTime: string; endTime: string; minStaff: number }[] = [
  { key: "morning", label: "Ca sáng", dbValue: "morning", time: "07:00-14:00", startTime: "07:00", endTime: "14:00", minStaff: 3 },
  { key: "afternoon", label: "Ca chiều", dbValue: "afternoon", time: "14:00-21:00", startTime: "14:00", endTime: "21:00", minStaff: 2 },
  { key: "evening", label: "Ca tối", dbValue: "evening", time: "21:00-23:00", startTime: "21:00", endTime: "23:00", minStaff: 1 },
];

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const emptySchedule = (): ScheduleData => ({
  morning: {},
  afternoon: {},
  evening: {},
});

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase() || "NV";
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

function startOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function normalizeShift(value?: string | null): ShiftKey {
  const text = (value || "").toLowerCase();
  if (text.includes("afternoon") || text.includes("chiều") || text.includes("chieu")) return "afternoon";
  if (text.includes("evening") || text.includes("tối") || text.includes("toi")) return "evening";
  return "morning";
}

export function BMStaffSchedulePage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [activeTab, setActiveTab] = useState<"staff" | "schedule">("schedule");
  const [search, setSearch] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleDto[]>([]);
  const [schedule, setSchedule] = useState<ScheduleData>(emptySchedule);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddShift, setShowAddShift] = useState(false);
  const [addTarget, setAddTarget] = useState<{ dayIdx: number; shift: ShiftKey } | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  }), [weekStart]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const branchQuery = branchId ? `&branchId=${branchId}` : "";
      const [employeesData, scheduleData] = await Promise.all([
        api.get<EmployeeLookupDto[]>(`/lookups/employees?scope=employee${branchQuery}`),
        api.get<PageResponse<WorkScheduleDto> | WorkScheduleDto[]>(`/work-schedules?size=500&sort=workDate,asc${branchQuery}`),
      ]);
      const employees = employeesData
        .filter(employee => !branchId || employee.branchId === branchId)
        .map(employee => ({
          id: employee.id,
          name: employee.name || `NV-${employee.id}`,
          role: employee.roleName || "Nhân viên",
          phone: "",
          status: employee.status === "inactive" ? "inactive" as const : "active" as const,
          joinDate: "",
          initials: initials(employee.name || `NV-${employee.id}`),
        }));
      const branchSchedules = pageItems(scheduleData).filter(item => !branchId || item.branchId === branchId);
      const nextSchedule = emptySchedule();
      branchSchedules.forEach(item => {
          const dayIdx = weekDates.findIndex(date => toDateInput(date) === item.workDate);
          if (dayIdx < 0) return;
          const shiftKey = normalizeShift(item.shift);
          nextSchedule[shiftKey][dayIdx] = [...(nextSchedule[shiftKey][dayIdx] || []), item.employeeId];
        });
      setStaffList(employees);
      setSchedules(branchSchedules);
      setSchedule(nextSchedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nhân viên/lịch làm việc.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [branchId, weekStart]);

  const filteredStaff = staffList.filter(staff =>
    staff.name.toLowerCase().includes(search.toLowerCase()) ||
    staff.role.toLowerCase().includes(search.toLowerCase()),
  );

  const openAddShift = (dayIdx: number, shift: ShiftKey) => {
    setAddTarget({ dayIdx, shift });
    setSelectedStaff([...(schedule[shift][dayIdx] || [])]);
    setShowAddShift(true);
  };

  const saveShift = async () => {
    if (!addTarget || !branchId) return;
    const shift = shifts.find(item => item.key === addTarget.shift)!;
    const workDate = toDateInput(weekDates[addTarget.dayIdx]);
    const activeStaffIds = new Set(staffList.filter(staff => staff.status !== "inactive").map(staff => staff.id));
    const selectedIds = new Set(selectedStaff.filter(employeeId => activeStaffIds.has(employeeId)));
    if (selectedStaff.length !== selectedIds.size) {
      setError("Nhan vien duoc chon khong thuoc chi nhanh hien tai hoac da ngung lam.");
      return;
    }

    const existing = schedules.filter(item =>
      item.branchId === branchId &&
      item.workDate === workDate &&
      normalizeShift(item.shift) === addTarget.shift
    );
    const existingByEmployee = new Map<number, WorkScheduleDto>();
    const duplicateSchedules: WorkScheduleDto[] = [];
    existing.forEach(item => {
      if (!selectedIds.has(item.employeeId)) {
        return;
      }
      if (!existingByEmployee.has(item.employeeId)) {
        existingByEmployee.set(item.employeeId, item);
      } else {
        duplicateSchedules.push(item);
      }
    });

    try {
      const deleteRequests = [
        ...existing.filter(item => !selectedIds.has(item.employeeId)),
        ...duplicateSchedules,
      ].map(item => api.del<void>(`/work-schedules/${item.scheduleId}`));
      const saveRequests = Array.from(selectedIds).map(employeeId => {
        const payload: WorkScheduleRequestDto = {
          employeeId,
          branchId,
          workDate,
          shift: shift.dbValue,
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: "confirmed",
        };
        const existingSchedule = existingByEmployee.get(employeeId);
        return existingSchedule
          ? api.put<WorkScheduleDto>(`/work-schedules/${existingSchedule.scheduleId}`, payload)
          : api.post<WorkScheduleDto>("/work-schedules", payload);
      });
      await Promise.all([...deleteRequests, ...saveRequests]);
      setShowAddShift(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được ca làm việc.");
    }
  };

  const totalCasInWeek = Object.values(schedule).reduce((sum, shiftMap) => sum + Object.values(shiftMap).reduce((inner, arr) => inner + arr.length, 0), 0);
  const missingShifts = shifts.filter(shift => Object.values(schedule[shift.key]).some(arr => arr.length < shift.minStaff)).length;

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ color: "#111827" }}>Nhân viên & Lịch làm việc</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dữ liệu nhân viên và lịch làm được tải từ database</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-white rounded-xl font-medium" style={{ backgroundColor: "#1a5276" }}>
          <Plus size={15} /> Thêm ca làm việc
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm text-gray-400">Đang tải dữ liệu...</div>}

      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 w-fit" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {[
          { key: "schedule" as const, icon: Calendar, label: "Lịch làm việc" },
          { key: "staff" as const, icon: Users, label: "Danh sách nhân viên" },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: active ? "#1a5276" : "transparent", color: active ? "#fff" : "#6B7280" }}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tổng nhân viên", value: staffList.filter(staff => staff.status === "active").length, color: "#1a5276" },
          { label: "Ngừng làm", value: staffList.filter(staff => staff.status === "inactive").length, color: "#F59E0B" },
          { label: "Ca/tuần này", value: totalCasInWeek, color: "#10B981" },
          { label: "Ca thiếu người", value: missingShifts, color: "#EF4444" },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl p-3.5 border border-gray-100" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {activeTab === "schedule" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekStart(prev => { const date = new Date(prev); date.setDate(prev.getDate() - 7); return date; })} className="p-1.5 rounded-lg border border-gray-200 bg-white"><ChevronLeft size={16} className="text-gray-600" /></button>
            <span className="text-sm font-semibold text-gray-700">Tuần {weekDates[0].toLocaleDateString("vi-VN")} - {weekDates[6].toLocaleDateString("vi-VN")}</span>
            <button onClick={() => setWeekStart(prev => { const date = new Date(prev); date.setDate(prev.getDate() + 7); return date; })} className="p-1.5 rounded-lg border border-gray-200 bg-white"><ChevronRight size={16} className="text-gray-600" /></button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: "140px repeat(7, 1fr)" }}>
              <div className="px-3 py-3 bg-gray-50 text-xs font-semibold text-gray-500">Ca làm việc</div>
              {DAYS.map((day, i) => (
                <div key={day} className="px-2 py-3 text-center border-l border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700">{day}</p>
                  <p className="text-xs mt-0.5 text-gray-400">{weekDates[i].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</p>
                </div>
              ))}
            </div>

            {shifts.map(shift => (
              <div key={shift.key} className="grid border-b border-gray-50 last:border-0" style={{ gridTemplateColumns: "140px repeat(7, 1fr)" }}>
                <div className="px-3 py-3 bg-gray-50 border-r border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">{shift.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={10} /> {shift.time}</p>
                  <p className="text-xs mt-1 text-gray-400">Tối thiểu: {shift.minStaff} NV</p>
                </div>
                {DAYS.map((_, dayIdx) => {
                  const staffIds = schedule[shift.key][dayIdx] || [];
                  const isUnder = staffIds.length < shift.minStaff;
                  return (
                    <div key={dayIdx} className="px-2 py-2 border-l border-gray-50 min-h-[80px]">
                      {isUnder && staffIds.length === 0 && <div className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg mb-1.5 bg-red-100 text-red-800"><AlertTriangle size={10} /> Thiếu</div>}
                      <div className="flex flex-col gap-1">
                        {staffIds.map(id => {
                          const staff = staffList.find(item => item.id === id);
                          if (!staff) return null;
                          return (
                            <div key={id} className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-gray-100">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: "#1a5276", fontSize: 8 }}>{staff.initials.charAt(0)}</div>
                              <span className="text-xs truncate text-gray-700" style={{ fontSize: 11 }}>{staff.name.split(" ").pop()}</span>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => openAddShift(dayIdx, shift.key)} className="mt-1 w-full flex items-center justify-center gap-0.5 py-1 rounded-lg border border-dashed text-xs text-gray-400 hover:text-blue-700 hover:border-blue-700"><Plus size={10} /> Ca</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "staff" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50" />
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredStaff.map(staff => (
              <div key={staff.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ backgroundColor: staff.status === "active" ? "#1a5276" : "#9CA3AF" }}>{staff.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{staff.name}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{staff.role}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: staff.status === "active" ? "#D1FAE5" : "#FEE2E2", color: staff.status === "active" ? "#10B981" : "#EF4444" }}>{staff.status === "active" ? "Đang làm" : "Ngừng làm"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{staff.phone || "Chưa cập nhật SĐT"}</p>
                </div>
                <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Edit size={15} /></button>
              </div>
            ))}
            {!loading && filteredStaff.length === 0 && <div className="py-10 text-center text-sm text-gray-400">Không có nhân viên trong database</div>}
          </div>
        </div>
      )}

      {showAddShift && addTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddShift(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "#1a5276" }}>
              <div>
                <p className="text-white font-semibold">{shifts.find(item => item.key === addTarget.shift)?.label} - {DAYS[addTarget.dayIdx]}</p>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{weekDates[addTarget.dayIdx].toLocaleDateString("vi-VN")}</p>
              </div>
              <button onClick={() => setShowAddShift(false)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}><X size={14} className="text-white" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Chọn nhân viên cho ca này:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {staffList.filter(staff => staff.status !== "inactive").map(staff => {
                  const isSelected = selectedStaff.includes(staff.id);
                  return (
                    <button key={staff.id} onClick={() => setSelectedStaff(prev => isSelected ? prev.filter(id => id !== staff.id) : [...prev, staff.id])} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left" style={{ borderColor: isSelected ? "#1a5276" : "#E5E7EB", backgroundColor: isSelected ? "#EBF2F7" : "#fff" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: isSelected ? "#1a5276" : "#9CA3AF" }}>{staff.initials}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{staff.name}</p><p className="text-xs text-gray-500">{staff.role}</p></div>
                      {isSelected && <Check size={16} style={{ color: "#1a5276", flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowAddShift(false)} className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl bg-white">Hủy</button>
                <button onClick={saveShift} className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium" style={{ backgroundColor: "#1a5276" }}>Lưu ca ({selectedStaff.length} NV)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
