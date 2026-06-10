import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Download, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import type { EmployeeLookupDto, LookupOptionDto, PageResponse, WorkScheduleDto, WorkScheduleRequestDto } from "../../../lib/types";

type ShiftId = "morning" | "afternoon" | "evening";
type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type SelectedCell = { day: DayKey; shift: ShiftId };
type ScheduledStaff = { scheduleId: number; employeeId: number; name: string; color: string; note?: string | null };

const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const dayKeys: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const shifts: Array<{ id: ShiftId; dbValue: string; label: string; startTime: string; endTime: string }> = [
  { id: "morning", dbValue: "Sáng", label: "Ca Sáng", startTime: "06:00:00", endTime: "12:00:00" },
  { id: "afternoon", dbValue: "Chiều", label: "Ca Chiều", startTime: "12:00:00", endTime: "18:00:00" },
  { id: "evening", dbValue: "Tối", label: "Ca Tối", startTime: "18:00:00", endTime: "22:00:00" },
];
const minStaff = 2;
const WORK_SCHEDULES_API = "/admin/work-schedules";
const staffColors = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function pageItems<T>(data: PageResponse<T> | T[] | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items || [];
}

function activeStatus(status?: string | null) {
  return !status || status.toLowerCase() === "active";
}

function scheduleVisibleStatus(status?: string | null) {
  return !status || !["cancelled", "inactive"].includes(status.toLowerCase());
}

function startOfWeek(offset = 0) {
  const now = new Date();
  const monday = new Date(now);
  const diffToMonday = (now.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday + offset * 7);
  return monday;
}

function addDays(date: Date, daysToAdd: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + daysToAdd);
  return next;
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function localDateTimeNow() {
  const now = new Date();
  return `${isoDate(now)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function shiftTime(shiftId: ShiftId) {
  return shifts.find(shift => shift.id === shiftId) || shifts[0];
}

function shiftFromDatabase(value?: string | null) {
  return shifts.find(shift => shift.dbValue === value || shift.id === value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể lưu lịch làm việc vào CSDL.";
}

export function Schedule() {
  const [branch, setBranch] = useState("");
  const [branchOptions, setBranchOptions] = useState<LookupOptionDto[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeLookupDto[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleDto[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduledStaff | null>(null);

  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const weekDates = useMemo(() => dayKeys.map((_, index) => addDays(weekStart, index)), [weekStart]);
  const weekIsoDates = useMemo(() => weekDates.map(isoDate), [weekDates]);
  const employeeById = useMemo(() => new Map(employeeOptions.map(employee => [employee.id, employee])), [employeeOptions]);
  const branchId = Number(branch) || 0;

  const branchEmployees = useMemo(() => {
    return employeeOptions.filter(employee =>
      activeStatus(employee.status) && (!branchId || employee.branchId === branchId)
    );
  }, [branchId, employeeOptions]);

  const scheduleData = useMemo(() => {
    const data: Record<DayKey, Record<ShiftId, ScheduledStaff[]>> = {
      monday: { morning: [], afternoon: [], evening: [] },
      tuesday: { morning: [], afternoon: [], evening: [] },
      wednesday: { morning: [], afternoon: [], evening: [] },
      thursday: { morning: [], afternoon: [], evening: [] },
      friday: { morning: [], afternoon: [], evening: [] },
      saturday: { morning: [], afternoon: [], evening: [] },
      sunday: { morning: [], afternoon: [], evening: [] },
    };

    schedules.filter(item => scheduleVisibleStatus(item.status)).forEach(item => {
      const dayIndex = weekIsoDates.indexOf(item.workDate);
      const shift = shiftFromDatabase(item.shift);
      if (dayIndex < 0 || !shift) return;
      const employee = employeeById.get(item.employeeId);
      const dayKey = dayKeys[dayIndex];
      data[dayKey][shift.id].push({
        scheduleId: item.scheduleId,
        employeeId: item.employeeId,
        name: employee?.name || `NV #${item.employeeId}`,
        color: staffColors[item.employeeId % staffColors.length],
        note: item.note,
      });
    });

    return data;
  }, [employeeById, schedules, weekIsoDates]);

  const assignedEmployeeIds = useMemo(() => new Set(schedules.filter(item => scheduleVisibleStatus(item.status)).map(item => item.employeeId)), [schedules]);
  const unassigned = branchEmployees.filter(employee => !assignedEmployeeIds.has(employee.id));
  const totalShifts = dayKeys.reduce((sum, day) =>
    sum + shifts.reduce((shiftSum, shift) => shiftSum + (scheduleData[day][shift.id].length > 0 ? 1 : 0), 0), 0);
  const underStaffedCount = dayKeys.reduce((sum, day) =>
    sum + shifts.reduce((shiftSum, shift) => shiftSum + (scheduleData[day][shift.id].length < minStaff ? 1 : 0), 0), 0);

  const loadSchedules = async (nextBranch = branch) => {
    const nextBranchId = Number(nextBranch) || 0;
    if (!nextBranchId) {
      setSchedules([]);
      setScheduleLoading(false);
      return;
    }

    try {
      setScheduleLoading(true);
      setError("");
      const data = await api.get<PageResponse<WorkScheduleDto> | WorkScheduleDto[]>(
        `${WORK_SCHEDULES_API}?branchId=${nextBranchId}&fromDate=${weekIsoDates[0]}&toDate=${weekIsoDates[6]}&size=500&sort=workDate,asc`
      );
      setSchedules(pageItems(data));
    } catch (err) {
      setError(getErrorMessage(err));
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    const loadBranches = async () => {
      try {
        setLoading(true);
        const branches = await api.get<LookupOptionDto[]>("/lookups/branches");
        const activeBranches = (branches || []).filter(item => activeStatus(item.status));
        setBranchOptions(activeBranches);
        const firstBranch = activeBranches[0];
        if (firstBranch) {
          setBranch(String(firstBranch.id));
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void loadBranches();
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      const selectedBranchId = Number(branch) || 0;
      if (!selectedBranchId) {
        setEmployeeOptions([]);
        setSelectedEmployeeIds([]);
        return;
      }

      try {
        const employees = await api.get<EmployeeLookupDto[]>(`/lookups/employees?scope=employee&branchId=${selectedBranchId}`);
        setEmployeeOptions((employees || []).filter(item => activeStatus(item.status) && item.branchId === selectedBranchId));
        setSelectedEmployeeIds([]);
      } catch (err) {
        setEmployeeOptions([]);
        toast.error(getErrorMessage(err));
      }
    };
    void loadEmployees();
  }, [branch]);

  useEffect(() => {
    void loadSchedules();
  }, [branch, weekIsoDates[0], weekIsoDates[6]]);

  const toggleEmployee = (id: number) => {
    setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const cellSchedules = (cell: SelectedCell, includeHidden = false) => {
    const dayIndex = dayKeys.indexOf(cell.day);
    const workDate = weekIsoDates[dayIndex];
    const shift = shiftTime(cell.shift);
    return schedules.filter(item =>
      (includeHidden || scheduleVisibleStatus(item.status)) &&
      item.workDate === workDate &&
      (item.shift === shift.dbValue || item.shift === cell.shift) &&
      item.branchId === branchId
    );
  };

  const openShiftModal = (cell: SelectedCell) => {
    const existing = cellSchedules(cell);
    setSelectedCell(cell);
    setSelectedEmployeeIds(existing.map(item => item.employeeId));
    setNote(existing.find(item => item.note)?.note || "");
    setShowModal(true);
  };

  const toRequest = (employeeId: number, cell: SelectedCell): WorkScheduleRequestDto => {
    const dayIndex = dayKeys.indexOf(cell.day);
    const shift = shiftTime(cell.shift);
    return {
      employeeId,
      branchId,
      workDate: weekIsoDates[dayIndex],
      shift: shift.dbValue,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: "confirmed",
      note: note.trim() || null,
      createdAt: localDateTimeNow(),
    };
  };

  const saveShift = async () => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh.");
      return;
    }
    if (!selectedCell) return;
    if (!selectedEmployeeIds.length) {
      toast.error("Vui lòng chọn nhân viên cho ca làm việc.");
      return;
    }

    const branchEmployeeIds = new Set(branchEmployees.map(employee => employee.id));
    if (selectedEmployeeIds.some(employeeId => !branchEmployeeIds.has(employeeId))) {
      toast.error("Nhan vien duoc chon khong thuoc chi nhanh hien tai.");
      return;
    }

    const selectedIds = new Set(selectedEmployeeIds);
    const existing = cellSchedules(selectedCell, true);
    const existingByEmployee = new Map(existing.map(item => [item.employeeId, item]));

    try {
      setSaving(true);
      const deleteRequests = existing
        .filter(item => scheduleVisibleStatus(item.status) && !selectedIds.has(item.employeeId))
        .map(item => api.del<void>(`${WORK_SCHEDULES_API}/${item.scheduleId}`));
      const saveRequests = selectedEmployeeIds.map(employeeId => {
        const request = toRequest(employeeId, selectedCell);
        const existingSchedule = existingByEmployee.get(employeeId);
        return existingSchedule
          ? api.put<WorkScheduleDto>(`${WORK_SCHEDULES_API}/${existingSchedule.scheduleId}`, request)
          : api.post<WorkScheduleDto>(WORK_SCHEDULES_API, request);
      });

      await Promise.all([...deleteRequests, ...saveRequests]);
      await loadSchedules();
      setShowModal(false);
      toast.success("Đã lưu lịch làm việc vào CSDL");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async () => {
    if (!deletingSchedule) return;
    const target = deletingSchedule;
    try {
      setSaving(true);
      await api.del<void>(`${WORK_SCHEDULES_API}/${target.scheduleId}`);
      setSchedules(prev => prev.filter(item => item.scheduleId !== target.scheduleId));
      setDeletingSchedule(null);
      toast.success("Đã xóa nhân viên khỏi ca");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: "22px", fontWeight: 700, color: "#0F4761"}}>Lịch làm việc</h1>
          <p style={{fontSize: "13px", color: "#6B7280", marginTop: "2px"}}>Phân ca làm việc cho nhân viên theo tuần</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={branch} onChange={event => setBranch(event.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: "13px"}}>
            <option value="">Chưa có chi nhánh</option>
            {branchOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50" style={{fontSize: "13px"}}>
            <Download size={15} /> Xuất PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <span style={{fontSize: "13px", color: "#B91C1C"}}>{error}</span>
          <button onClick={() => void loadSchedules()} className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-red-600" style={{fontSize: "12.5px"}}>Thử lại</button>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
        <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-4">
          <span style={{fontSize: "14px", fontWeight: 600, color: "#0F4761"}}>Tuần: {displayDate(weekDates[0])} - {displayDate(weekDates[6])}</span>
          <div className="flex gap-1.5">
            {[
              { label: "Tuần trước", value: -1 },
              { label: "Tuần này", value: 0 },
              { label: "Tuần tới", value: 1 },
            ].map(item => (
              <button key={item.label} onClick={() => setWeekOffset(item.value)} className={`px-3 py-1 rounded-lg text-xs ${weekOffset === item.value ? "bg-[#0F4761] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left w-32" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>Ca làm việc</th>
                {days.map((day, index) => (
                  <th key={day} className="px-2 py-3 text-center" style={{fontSize: "12px", color: "#6B7280", fontWeight: 500}}>
                    <div>{day}</div>
                    <div style={{color: "#9CA3AF", fontWeight: 400}}>{displayDate(weekDates[index])}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => (
                <tr key={shift.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 bg-gray-50">
                    <div style={{fontSize: "12.5px", fontWeight: 600, color: "#374151"}}>{shift.label}</div>
                    <div style={{fontSize: "11px", color: "#9CA3AF"}}>{shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}</div>
                  </td>
                  {dayKeys.map(dayKey => {
                    const staff = scheduleData[dayKey][shift.id];
                    const underStaffed = staff.length < minStaff;
                    return (
                      <td key={dayKey} className={`px-2 py-2 align-top ${underStaffed && staff.length === 0 ? "bg-red-50" : ""}`}>
                        <div className="min-h-20 space-y-1">
                          {staff.map(member => (
                            <div key={member.scheduleId} className={`group px-2 py-1 rounded-md text-xs flex items-center justify-between gap-1 ${member.color}`}>
                              <span className="truncate">{member.name}</span>
                              <button onClick={() => setDeletingSchedule(member)} disabled={saving} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                          {underStaffed && (
                            <div className="text-center">
                              <span style={{fontSize: "10px", color: "#EF4444"}} className="flex items-center gap-0.5 justify-center">
                                <AlertTriangle size={10} />
                                {staff.length === 0 ? "Thiếu" : "Thiếu NV"}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => openShiftModal({ day: dayKey, shift: shift.id })}
                            disabled={loading || scheduleLoading || !branchId}
                            className="w-full flex items-center justify-center gap-1 py-1 text-gray-400 hover:text-[#0F4761] hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                            style={{fontSize: "11px"}}
                          >
                            <Plus size={12} /> {staff.length ? "Sửa" : "Thêm"}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {(loading || scheduleLoading) && (
            <div className="px-4 py-3 border-t border-gray-100" style={{fontSize: "12.5px", color: "#6B7280"}}>
              Đang tải dữ liệu lịch làm việc từ CSDL...
            </div>
          )}
        </div>

        <div className="w-52 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-gray-500" />
            <span style={{fontSize: "13px", fontWeight: 600, color: "#374151"}}>Chưa phân ca</span>
          </div>
          <div className="space-y-2">
            {unassigned.map(employee => (
              <div key={employee.id} className={`px-3 py-2 rounded-lg text-sm ${staffColors[employee.id % staffColors.length]}`}>
                {employee.name}
              </div>
            ))}
            {unassigned.length === 0 && <div style={{fontSize: "12px", color: "#9CA3AF"}}>Không còn nhân viên chưa phân ca trong tuần.</div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-8">
        <div>
          <span style={{fontSize: "12px", color: "#6B7280"}}>Tổng ca trong tuần: </span>
          <span style={{fontSize: "14px", fontWeight: 700, color: "#0F4761"}}>{totalShifts}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          <span style={{fontSize: "12px", color: "#EF4444"}}>{underStaffedCount} ca thiếu nhân viên dưới {minStaff} người</span>
        </div>
        <div>
          <span style={{fontSize: "12px", color: "#6B7280"}}>NV chưa phân ca: </span>
          <span style={{fontSize: "14px", fontWeight: 700, color: "#F59E0B"}}>{unassigned.length}</span>
        </div>
      </div>

      {showModal && selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 style={{fontSize: "17px", fontWeight: 700, color: "#0F4761", marginBottom: "16px"}}>Thêm ca làm việc</h3>
            <div className="space-y-3">
              <div>
                <label style={{fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px"}}>Ngày</label>
                <select value={selectedCell.day} onChange={event => openShiftModal({ day: event.target.value as DayKey, shift: selectedCell.shift })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: "13px"}}>
                  {days.map((day, index) => <option key={day} value={dayKeys[index]}>{day} ({displayDate(weekDates[index])})</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px"}}>Ca làm việc</label>
                <select value={selectedCell.shift} onChange={event => openShiftModal({ day: selectedCell.day, shift: event.target.value as ShiftId })} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: "13px"}}>
                  {shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.label} ({shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)})</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px"}}>Nhân viên</label>
                <div className="space-y-2 max-h-44 overflow-y-auto border border-gray-100 rounded-lg p-2">
                  {branchEmployees.map(employee => (
                    <label key={employee.id} className="flex items-center gap-2 cursor-pointer py-1">
                      <input type="checkbox" className="rounded" checked={selectedEmployeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
                      <span style={{fontSize: "13px"}}>{employee.name}</span>
                    </label>
                  ))}
                  {branchEmployees.length === 0 && <div style={{fontSize: "12.5px", color: "#9CA3AF"}}>Chưa có nhân viên phù hợp trong database.</div>}
                </div>
              </div>
              <div>
                <label style={{fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px"}}>Ghi chú</label>
                <textarea value={note} onChange={event => setNote(event.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none" rows={2} style={{fontSize: "13px"}} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-60" style={{fontSize: "13.5px"}}>Hủy</button>
              <button onClick={() => void saveShift()} disabled={saving} className="flex-1 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{fontSize: "13.5px"}}>
                {saving ? "Đang lưu..." : "Lưu ca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingSchedule && (
        <DeleteConfirmModal
          title="Xoa nhan vien khoi ca?"
          description={<>Nhan vien <strong style={{ color: "#111827" }}>{deletingSchedule.name}</strong> se duoc xoa khoi ca lam viec nay.</>}
          busy={saving}
          onClose={() => setDeletingSchedule(null)}
          onConfirm={() => void removeSchedule()}
        />
      )}
    </div>
  );
}
