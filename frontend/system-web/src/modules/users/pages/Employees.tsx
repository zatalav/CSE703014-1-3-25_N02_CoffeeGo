import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Briefcase,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Unlock,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";
import { Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";
import type { EmployeeDto, EmployeeRequestDto, FileUploadDto, LookupOptionDto, PageResponse } from "../../../lib/types";
import { AddressValue, createAddressFromText, VietnamAddressPicker } from "../../../shared/address/VietnamAddressPicker";

type EmployeeStatus = "active" | "locked";
type EmployeeGender = "Nam" | "Nữ" | "Khác";

type Employee = {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  branchId: number | null;
  roleId: number | null;
  branch: string;
  role: string;
  date: string;
  startDate: string;
  status: EmployeeStatus;
  avatar: string;
  gender: EmployeeGender;
  birthday: string;
  address: string;
  photo?: string;
  photoName?: string;
  note: string;
};

type EmployeeForm = Omit<Employee, "id" | "date" | "avatar">;

const genders: EmployeeGender[] = ["Nam", "Nữ", "Khác"];
const steps = ["Thông tin cá nhân", "Thông tin công việc", "Thêm ảnh", "Xác nhận"];

const initialEmployees: Employee[] = [];

const roleColors: Record<string, string> = {
  "Nhân viên pha chế": "bg-blue-100 text-blue-700",
  "Thu ngân": "bg-purple-100 text-purple-700",
  "Nhân viên phục vụ": "bg-teal-100 text-teal-700",
  "Nhân viên bán hàng": "bg-purple-100 text-purple-700",
  "Nhân viên kho": "bg-teal-100 text-teal-700",
  "Nhân viên vận chuyển": "bg-orange-100 text-orange-700",
};

const statusLabel: Record<EmployeeStatus, string> = {
  active: "Hoạt động",
  locked: "Bị khóa",
};

const statusColors: Record<EmployeeStatus, string> = {
  active: "bg-green-100 text-green-700",
  locked: "bg-red-100 text-red-600",
};

const getInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(word => word[0])
    .join("")
    .toUpperCase();

  return initials || "NV";
};

const formatDisplayDate = (date: string) => {
  if (!date) return "Chưa cập nhật";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const datePart = (value?: string | null) => value ? value.slice(0, 10) : "";
const localDateTimeNow = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19);
};

const getNextEmployeeId = (items: Employee[]) => Math.max(0, ...items.map(item => item.id)) + 1;
const randomEmployeeCode = () => `NV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const pageItems = <T,>(data: PageResponse<T> | T[]) => Array.isArray(data) ? data : data.items;
const optionPairs = (items: LookupOptionDto[]) => items.map(item => [String(item.id), item.name] as [string, string]);
const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";
const roleBadgeClass = (role: string) => roleColors[role] || "bg-gray-100 text-gray-700";
const statusFromApi = (status?: string | null): EmployeeStatus => status === "inactive" || status === "locked" ? "locked" : "active";
const statusToApi = (status: EmployeeStatus) => status === "locked" ? "inactive" : "active";
const normalizeRoleName = (value?: string | null) => (value || "").toLowerCase().replace(/_/g, " ").trim();
const employeeRoleKey = (value?: string | null) => {
  const normalized = normalizeRoleName(value);
  return normalized === "sales staff" ? "sale staff" : normalized;
};
const employeeRoleLabels: Record<string, string> = {
  "branch staff": "Nhân viên bán hàng",
  "sale staff": "Nhân viên bán hàng",
  "warehouse staff": "Nhân viên kho",
  "delivery staff": "Nhân viên vận chuyển",
  "shipper": "Nhân viên vận chuyển",
  "nhan vien van chuyen": "Nhân viên vận chuyển",
  "nhan vien giao hang": "Nhân viên vận chuyển",
};
const requiredEmployeeRoles = [
  { roleName: "Sale Staff", roleGroup: "employee", department: "sales" },
  { roleName: "Warehouse Staff", roleGroup: "employee", department: "warehouse" },
  { roleName: "Delivery Staff", roleGroup: "employee", department: "sales" },
];
const displayEmployeeRole = (value?: string | null) => employeeRoleLabels[employeeRoleKey(value)] || value || "";
const isEmployeeRole = (role?: LookupOptionDto | null) => Object.prototype.hasOwnProperty.call(employeeRoleLabels, employeeRoleKey(role?.name));
const normalizeEmployeeRoleOption = (role: LookupOptionDto): LookupOptionDto => ({
  ...role,
  name: displayEmployeeRole(role.name),
});
const uniqueRoleOptionPairs = (items: LookupOptionDto[]) => {
  const seen = new Set<string>();
  return items.reduce<Array<[string, string]>>((options, item) => {
    const key = employeeRoleKey(item.name);
    if (seen.has(key)) return options;
    seen.add(key);
    options.push([String(item.id), item.name]);
    return options;
  }, []);
};

async function ensureEmployeeRoles(items: LookupOptionDto[]) {
  const existingKeys = new Set(items.map(item => employeeRoleKey(item.name)));
  const missingRoles = requiredEmployeeRoles.filter(role => !existingKeys.has(employeeRoleKey(role.roleName)));
  if (missingRoles.length === 0) return items;

  await Promise.allSettled(
    missingRoles.map(role => api.post("/admin/users/roles", { ...role, status: "active" })),
  );
  return api.get<LookupOptionDto[]>("/lookups/roles?scope=employee");
}

const createEmptyForm = (nextId: number): EmployeeForm => ({
  code: randomEmployeeCode(),
  name: "",
  email: "",
  phone: "",
  branchId: null,
  roleId: null,
  branch: "",
  role: "",
  startDate: new Date().toISOString().slice(0, 10),
  status: "active",
  gender: "Nam",
  birthday: "",
  address: "",
  photo: "",
  photoName: "",
  note: "",
});

export function Employees() {
  const [items, setItems] = useState<Employee[]>(initialEmployees);
  const [branchOptions, setBranchOptions] = useState<LookupOptionDto[]>([]);
  const [roleOptions, setRoleOptions] = useState<LookupOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(0);
  const [addForm, setAddForm] = useState<EmployeeForm>(() => createEmptyForm(getNextEmployeeId(initialEmployees)));
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [showLockDialog, setShowLockDialog] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const branchSelectOptions: Array<string | [string, string]> = [["", "Chon chi nhanh"], ...optionPairs(branchOptions)];
  const roleSelectOptions: Array<string | [string, string]> = [["", "Chon chuc danh"], ...uniqueRoleOptionPairs(roleOptions)];
  const roleFilterOptions = Array.from(new Set(roleOptions.map(role => role.name)));

  const hydrateEmployee = (dto: EmployeeDto, branchesLookup = branchOptions, rolesLookup = roleOptions): Employee => {
    const branch = branchesLookup.find(item => item.id === dto.branchId);
    const role = rolesLookup.find(item => item.id === dto.roleId);

    return {
      id: dto.id,
      code: `NV-${String(dto.id).padStart(4, "0")}`,
      name: dto.name || "",
      email: dto.email || "",
      phone: dto.phoneNumber || "",
      branchId: dto.branchId ?? null,
      roleId: dto.roleId ?? null,
      branch: branch?.name || "",
      role: role?.name || "",
      date: formatDisplayDate(datePart(dto.createdAt)),
      startDate: datePart(dto.createdAt),
      status: statusFromApi(dto.status),
      avatar: getInitials(dto.name || ""),
      gender: "Khác",
      birthday: "",
      address: "",
      photo: dto.imgUrl || "",
      photoName: dto.imgUrl ? "Cloudinary" : "",
      note: "",
    };
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const [branchesData, rolesData, employeesData] = await Promise.all([
        api.get<LookupOptionDto[]>("/lookups/branches"),
        api.get<LookupOptionDto[]>("/lookups/roles?scope=employee"),
        api.get<PageResponse<EmployeeDto> | EmployeeDto[]>("/employees?size=100&sort=id,desc"),
      ]);
      const loadedBranches = branchesData || [];
      const ensuredRoles = await ensureEmployeeRoles(rolesData || []);
      const loadedRoles = (ensuredRoles || []).filter(isEmployeeRole).map(normalizeEmployeeRoleOption);
      const allowedRoleIds = new Set(loadedRoles.map(role => Number(role.id)));
      setBranchOptions(loadedBranches);
      setRoleOptions(loadedRoles);
      setItems(
        pageItems(employeesData)
          .filter(dto => dto.roleId != null && allowedRoleIds.has(Number(dto.roleId)))
          .map(dto => hydrateEmployee(dto, loadedBranches, loadedRoles)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai danh sach nhan vien");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter(employee => {
      const matchSearch = !keyword || [employee.code, employee.name, employee.email, employee.phone]
        .some(value => value.toLowerCase().includes(keyword));
      const matchBranch = branchFilter === "all" || employee.branch === branchFilter;
      const matchRole = roleFilter === "all" || employee.role === roleFilter;
      const matchStatus = statusFilter === "all" || employee.status === statusFilter;
      return matchSearch && matchBranch && matchRole && matchStatus;
    });
  }, [branchFilter, items, roleFilter, search, statusFilter]);
  const pagedEmployees = useMemo(() => getPagedItems(filtered, page), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, roleFilter, search, statusFilter]);

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(filtered.length)));
  }, [filtered.length]);

  const openAddModal = () => {
    const branch = branchOptions[0];
    const role = roleOptions[0];
    setAddForm({
      ...createEmptyForm(getNextEmployeeId(items)),
      branchId: branch?.id ?? null,
      branch: branch?.name ?? "",
      roleId: role?.id ?? null,
      role: role?.name ?? "",
    });
    setStep(0);
    setShowModal(true);
  };

  const closeAddModal = () => {
    setShowModal(false);
    setStep(0);
  };

  const updateAddForm = <K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) => {
    setAddForm(prev => ({ ...prev, [key]: value }));
  };

  const updateAddBranch = (value: string) => {
    const branch = branchOptions.find(item => String(item.id) === value);
    setAddForm(prev => ({ ...prev, branchId: branch?.id ?? null, branch: branch?.name ?? "" }));
  };

  const updateAddRole = (value: string) => {
    const role = roleOptions.find(item => String(item.id) === value);
    setAddForm(prev => ({ ...prev, roleId: role?.id ?? null, role: role?.name ?? "" }));
  };

  const updateEditBranch = (value: string) => {
    const branch = branchOptions.find(item => String(item.id) === value);
    setEditing(prev => prev ? ({ ...prev, branchId: branch?.id ?? null, branch: branch?.name ?? "" }) : prev);
  };

  const updateEditRole = (value: string) => {
    const role = roleOptions.find(item => String(item.id) === value);
    setEditing(prev => prev ? ({ ...prev, roleId: role?.id ?? null, role: role?.name ?? "" }) : prev);
  };

  const uploadPhoto = async (file: File) => {
    const uploaded = await api.upload<FileUploadDto>("/upload/image", file);
    return uploadResultUrl(uploaded);
  };

  const handleAddPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const photo = await uploadPhoto(file);
      setAddForm(prev => ({ ...prev, photo, photoName: file.name }));
      toast.success("Da tai anh len Cloudinary");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai anh");
    } finally {
      event.target.value = "";
    }
  };

  const handleEditPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;

    try {
      const photo = await uploadPhoto(file);
      setEditing(prev => prev ? { ...prev, photo, photoName: file.name } : prev);
      toast.success("Da tai anh len Cloudinary");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai anh");
    } finally {
      event.target.value = "";
    }
  };

  const validateAddStep = () => {
    if (step === 0 && !addForm.name.trim()) {
      toast.error("Vui long nhap ho ten nhan vien.");
      return false;
    }
    if (step === 0 && !addForm.email.trim()) {
      toast.error("Vui long nhap email de gui mat khau dang nhap.");
      return false;
    }
    if (step === 1 && (!addForm.branchId || !addForm.roleId)) {
      toast.error("Vui lòng chọn chi nhánh và vai trò.");
      return false;
    }
    return true;
  };

  const toEmployeeRequest = (employee: EmployeeForm | Employee): EmployeeRequestDto => ({
    name: employee.name.trim(),
    branchId: employee.branchId ?? null,
    roleId: employee.roleId || 0,
    status: statusToApi(employee.status),
    email: employee.email.trim() || null,
    phoneNumber: employee.phone.trim() || null,
    imgUrl: employee.photo || null,
    createdAt: localDateTimeNow(),
  });

  const saveNewEmployee = async () => {
    if (!addForm.name.trim()) {
      setStep(0);
      toast.error("Vui long nhap ho ten nhan vien.");
      return;
    }

    if (!addForm.email.trim()) {
      setStep(0);
      toast.error("Vui long nhap email de gui mat khau dang nhap.");
      return;
    }

    if (!addForm.branchId || !addForm.roleId) {
      setStep(1);
      toast.error("Vui long chon chi nhanh va vai tro.");
      return;
    }

    setSaving(true);
    try {
      await api.post<EmployeeDto>("/employees", toEmployeeRequest(addForm));
      toast.success("Them nhan vien thanh cong. Mat khau tam thoi da duoc gui den email nhan vien.");
      closeAddModal();
      await loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the them nhan vien");
    } finally {
      setSaving(false);
    }
  };

  const goNextStep = async () => {
    if (!validateAddStep()) return;

    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
      return;
    }

    await saveNewEmployee();
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Vui lòng nhập họ tên và email nhân viên.");
      return;
    }

    if (!editing.branchId || !editing.roleId) {
      toast.error("Vui long chon chi nhanh va vai tro.");
      return;
    }

    setSaving(true);
    try {
      await api.put<EmployeeDto>(`/employees/${editing.id}`, toEmployeeRequest(editing));
      toast.success("Da cap nhat nhan vien");
      setEditing(null);
      await loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the cap nhat nhan vien");
    } finally {
      setSaving(false);
    }
  };

  const lockEmployee = async () => {
    if (!showLockDialog || !lockReason.trim()) return;

    try {
      await api.patch<EmployeeDto>(`/employees/${showLockDialog}/lock`);
      toast.success("Da khoa tai khoan");
      setShowLockDialog(null);
      setLockReason("");
      await loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the khoa tai khoan");
    }
  };

  const unlockEmployee = async (employee: Employee) => {
    try {
      await api.patch<EmployeeDto>(`/employees/${employee.id}/unlock`);
      toast.success("Da mo khoa tai khoan");
      await loadEmployees();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the mo khoa tai khoan");
    }
  };

  const deleteEmployee = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);
    try {
      await api.del<void>(`/employees/${target.id}`);
      toast.success("Da xoa nhan vien");
      await loadEmployees();
      setItems(prev => prev.filter(item => item.id !== target.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa nhan vien");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Quản lý nhân viên</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Quản lý tài khoản và thông tin nhân viên toàn chuỗi</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54] transition-colors"
          style={{ fontSize: "13.5px" }}
        >
          <Plus size={16} />
          Thêm nhân viên mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã, tên, email, SĐT..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
            style={{ fontSize: "13px" }}
          />
        </div>
        <select value={branchFilter} onChange={event => setBranchFilter(event.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả chi nhánh</option>
          {branchOptions.map(branch => <option key={branch.id} value={branch.name}>{branch.name}</option>)}
        </select>
        <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả vai trò</option>
          {roleFilterOptions.map(roleName => <option key={roleName} value={roleName}>{roleName}</option>)}
        </select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Bị khóa</option>
        </select>
        <button onClick={() => { setSearch(""); setBranchFilter("all"); setRoleFilter("all"); setStatusFilter("all"); }} className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg" style={{ fontSize: "13px" }}>
          Đặt lại
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-gray-500" style={{ fontSize: "13px" }}>
          Dang tai nhan vien tu database...
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Nhân viên</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Liên hệ</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Chi nhánh</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Vai trò</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Ngày tạo</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Trạng thái</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedEmployees.map(employee => (
              <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" className="rounded" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar employee={employee} size="sm" />
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>{employee.name}</span>
                      <div style={{ fontSize: "11.5px", color: "#9CA3AF", fontFamily: "monospace" }}>{employee.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div style={{ fontSize: "12.5px", color: "#374151" }}>{employee.email || "Chưa cập nhật"}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{employee.phone || "Chưa cập nhật"}</div>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151" }}>{employee.branch}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs ${roleBadgeClass(employee.role)}`}>{employee.role}</span>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{employee.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[employee.status]}`}>
                    {statusLabel[employee.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewing(employee)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Xem chi tiết"><Eye size={15} /></button>
                    <button onClick={() => setEditing({ ...employee })} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500 transition-colors" title="Sửa nhân viên"><Edit size={15} /></button>
                    <button
                      className={`p-1.5 rounded-lg transition-colors ${employee.status === "locked" ? "hover:bg-green-50 text-green-600" : "hover:bg-orange-50 text-orange-500"}`}
                      onClick={() => employee.status === "locked" ? void unlockEmployee(employee) : setShowLockDialog(employee.id)}
                      title={employee.status === "locked" ? "Mo khoa tai khoan" : "Khóa tài khoản"}
                    >
                      {employee.status === "locked" ? <Unlock size={15} /> : <Lock size={15} />}
                    </button>
                    <button
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                      onClick={() => setDeleting(employee)}
                      title="Xóa nhân viên"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400" style={{ fontSize: "13px" }}>
                  Không tìm thấy nhân viên phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination */}
        <Pagination page={page} total={filtered.length} onPageChange={setPage} itemLabel="nhan vien" />
        <div className="hidden">
          <span style={{ fontSize: "13px", color: "#6B7280" }}>Hiện {filtered.length} / Tổng {items.length} nhân viên</span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={15} /></button>
            <button className="w-7 h-7 rounded-lg bg-[#0F4761] text-white flex items-center justify-center" style={{ fontSize: "13px" }}>1</button>
            <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center" style={{ fontSize: "13px", color: "#374151" }}>2</button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeAddModal}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>Thêm nhân viên mới</h2>
              <button onClick={closeAddModal} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>

            <div className="p-6">
              {/* Step indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {steps.map((label, index) => (
                  <div key={label} className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${index <= step ? "bg-[#0F4761] text-white" : "bg-gray-200 text-gray-400"}`}>
                        {index + 1}
                      </div>
                      {index < steps.length - 1 && <div className={`h-px flex-1 ${index < step ? "bg-[#0F4761]" : "bg-gray-200"}`} />}
                    </div>
                    <span className="block mt-2 leading-snug" style={{ fontSize: "11.5px", color: index <= step ? "#0F4761" : "#9CA3AF", fontWeight: index === step ? 600 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="Mã nhân viên" value={addForm.code} onChange={value => updateAddForm("code", value)} mono readOnly />
                    <TextField label="Họ và tên *" value={addForm.name} onChange={value => updateAddForm("name", value)} placeholder="Nhập họ tên" />
                    <TextField label="Email" value={addForm.email} onChange={value => updateAddForm("email", value)} type="email" placeholder="email@trà.vn" />
                    <TextField label="Số điện thoại" value={addForm.phone} onChange={value => updateAddForm("phone", value)} placeholder="09xx..." />
                    <TextField label="Ngày sinh" value={addForm.birthday} onChange={value => updateAddForm("birthday", value)} type="date" />
                    <SelectField label="Giới tính" value={addForm.gender} onChange={value => updateAddForm("gender", value as EmployeeGender)} options={genders} />
                  </div>
                  <AddressEditor address={addForm.address} onChange={value => updateAddForm("address", value)} />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Chi nhánh *" value={String(addForm.branchId ?? "")} onChange={updateAddBranch} options={branchSelectOptions} />
                    <SelectField label="Chức danh *" value={String(addForm.roleId ?? "")} onChange={updateAddRole} options={roleSelectOptions} />
                    <TextField label="Ngày bắt đầu" value={addForm.startDate} onChange={value => updateAddForm("startDate", value)} type="date" />
                    <SelectField label="Trạng thái" value={addForm.status} onChange={value => updateAddForm("status", value as EmployeeStatus)} options={[["active", "Hoạt động"], ["locked", "Bị khóa"]]} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px", fontWeight: 500 }}>Ghi chú</label>
                    <textarea
                      value={addForm.note}
                      onChange={event => updateAddForm("note", event.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none focus:border-[#0F4761]"
                      style={{ fontSize: "13px" }}
                      placeholder="Ghi chú nội bộ về nhân viên..."
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 items-start">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <div className="mx-auto mb-3">
                      <EmployeeAvatar employee={{ ...addForm, id: 0, date: "", avatar: getInitials(addForm.name) }} size="lg" />
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{addForm.name || "Nhân viên mới"}</p>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>{addForm.code}</p>
                  </div>
                  <div>
                    <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#0F4761] transition-colors cursor-pointer bg-white">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAddPhotoChange} />
                      <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                      <p style={{ fontSize: "13.5px", color: "#374151", fontWeight: 600 }}>Tải ảnh nhân viên</p>
                      <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>JPG, PNG hoặc WEBP, dùng để hiển thị trong hồ sơ</p>
                    </label>
                    {addForm.photoName && (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Camera size={15} className="text-[#0F4761] shrink-0" />
                          <span className="truncate" style={{ fontSize: "13px", color: "#374151" }}>{addForm.photoName}</span>
                        </div>
                        <button onClick={() => setAddForm(prev => ({ ...prev, photo: "", photoName: "" }))} className="p-1 hover:bg-gray-200 rounded-lg text-gray-500">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <EmployeeConfirmPanel employee={{ ...addForm, id: 0, date: formatDisplayDate(new Date().toISOString().slice(0, 10)), avatar: getInitials(addForm.name) }} />
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-between sticky bottom-0 bg-white">
              <button onClick={closeAddModal} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50" style={{ fontSize: "13.5px" }}>
                Hủy
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button onClick={() => setStep(prev => prev - 1)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>
                    Quay lại
                  </button>
                )}
                <button
                  onClick={goNextStep}
                  disabled={saving}
                  className="px-4 py-2 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54] disabled:opacity-60"
                  style={{ fontSize: "13.5px" }}
                >
                  {saving ? "Dang luu..." : step < steps.length - 1 ? "Tiếp theo" : "Xác nhận & Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Chi tiết nhân viên</h2>
              <button onClick={() => setViewing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <EmployeeAvatar employee={viewing} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{viewing.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full ${roleBadgeClass(viewing.role)}`} style={{ fontSize: "11.5px", fontWeight: 600 }}>{viewing.role}</span>
                    <span className={`px-2.5 py-0.5 rounded-full ${statusColors[viewing.status]}`} style={{ fontSize: "11.5px" }}>{statusLabel[viewing.status]}</span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "#9CA3AF", marginTop: "2px", fontFamily: "monospace" }}>{viewing.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoCard icon={<Briefcase size={13} />} label="Vai trò" value={viewing.role} tone="blue" />
                <InfoCard icon={<MapPin size={13} />} label="Chi nhánh" value={viewing.branch} tone="green" />
                <InfoCard icon={<Calendar size={13} />} label="Ngày bắt đầu" value={formatDisplayDate(viewing.startDate)} tone="amber" />
              </div>

              <div className="grid grid-cols-1 gap-0 divide-y divide-gray-50 border border-gray-100 rounded-xl px-4">
                <DetailRow icon={<Mail size={15} className="text-[#0F4761]" />} label="Email" value={viewing.email} />
                <DetailRow icon={<Phone size={15} className="text-[#0F4761]" />} label="Số điện thoại" value={viewing.phone || "Chưa cập nhật"} />
                <DetailRow icon={<UserRound size={15} className="text-[#0F4761]" />} label="Giới tính / Ngày sinh" value={`${viewing.gender} / ${formatDisplayDate(viewing.birthday)}`} />
                <DetailRow icon={<MapPin size={15} className="text-[#0F4761]" />} label="Địa chỉ" value={viewing.address || "Chưa cập nhật"} />
                <DetailRow icon={<Calendar size={15} className="text-[#0F4761]" />} label="Ngày tạo hồ sơ" value={viewing.date} />
              </div>

              {viewing.note && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                  <p style={{ fontSize: "12px", color: "#B45309", fontWeight: 600, marginBottom: "4px" }}>Ghi chú</p>
                  <p style={{ fontSize: "13px", color: "#78350F" }}>{viewing.note}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setViewing(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>Đóng</button>
              <button onClick={() => { setEditing({ ...viewing }); setViewing(null); }} className="px-4 py-2 bg-[#0F4761] text-white rounded-xl hover:bg-[#0d3d54]" style={{ fontSize: "13.5px" }}>Chỉnh sửa</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Sửa thông tin nhân viên</h2>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <div className="mx-auto mb-3">
                    <EmployeeAvatar employee={editing} size="lg" />
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{editing.name || "Nhân viên"}</p>
                  <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>{editing.code}</p>
                </div>
                <label className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer" style={{ fontSize: "13px" }}>
                  <Upload size={15} />
                  Đổi ảnh
                  <input type="file" accept="image/*" className="hidden" onChange={handleEditPhotoChange} />
                </label>
                {editing.photoName && (
                  <button onClick={() => setEditing(prev => prev ? { ...prev, photo: "", photoName: "" } : prev)} className="w-full px-3 py-2 border border-red-100 text-red-500 rounded-xl hover:bg-red-50" style={{ fontSize: "13px" }}>
                    Xóa ảnh hiện tại
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Mã nhân viên" value={editing.code} onChange={value => setEditing({ ...editing, code: value })} mono readOnly />
                <TextField label="Họ và tên *" value={editing.name} onChange={value => setEditing({ ...editing, name: value })} />
                <TextField label="Email" value={editing.email} onChange={value => setEditing({ ...editing, email: value })} type="email" />
                <TextField label="Số điện thoại" value={editing.phone} onChange={value => setEditing({ ...editing, phone: value })} />
                <TextField label="Ngày sinh" value={editing.birthday} onChange={value => setEditing({ ...editing, birthday: value })} type="date" />
                <SelectField label="Giới tính" value={editing.gender} onChange={value => setEditing({ ...editing, gender: value as EmployeeGender })} options={genders} />
                <SelectField label="Chi nhánh" value={String(editing.branchId ?? "")} onChange={updateEditBranch} options={branchSelectOptions} />
                <SelectField label="Chức danh" value={String(editing.roleId ?? "")} onChange={updateEditRole} options={roleSelectOptions} />
                <TextField label="Ngày bắt đầu" value={editing.startDate} onChange={value => setEditing({ ...editing, startDate: value })} type="date" />
                <SelectField label="Trạng thái" value={editing.status} onChange={value => setEditing({ ...editing, status: value as EmployeeStatus })} options={[["active", "Hoạt động"], ["locked", "Bị khóa"]]} />
                <div className="col-span-2">
                  <AddressEditor address={editing.address} onChange={value => setEditing({ ...editing, address: value })} />
                </div>
                <div className="col-span-2">
                  <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px", fontWeight: 500 }}>Ghi chú</label>
                  <textarea
                    value={editing.note}
                    onChange={event => setEditing({ ...editing, note: event.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none focus:border-[#0F4761]"
                    style={{ fontSize: "13px" }}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>Hủy</button>
              <button onClick={saveEdit} disabled={saving} className="px-5 py-2 bg-[#0F4761] text-white rounded-xl hover:bg-[#0d3d54] disabled:opacity-60" style={{ fontSize: "13.5px" }}>{saving ? "Dang luu..." : "Lưu thay đổi"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Dialog */}
      {showLockDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowLockDialog(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#EF4444", marginBottom: "8px" }}>Khóa tài khoản</h3>
            <p style={{ fontSize: "13.5px", color: "#6B7280", marginBottom: "16px" }}>Tài khoản sẽ bị khóa và nhân viên không thể đăng nhập.</p>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "6px" }}>Lý do khóa *</label>
            <textarea
              value={lockReason}
              onChange={event => setLockReason(event.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none"
              rows={3}
              style={{ fontSize: "13px" }}
              placeholder="Nhập lý do khóa tài khoản..."
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowLockDialog(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Hủy</button>
              <button
                onClick={lockEmployee}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                style={{ fontSize: "13.5px" }}
                disabled={!lockReason.trim()}
              >
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteConfirmModal
          title="Xoa nhan vien?"
          description={<>Nhan vien <strong style={{ color: "#111827" }}>{deleting.name}</strong> se bi xoa khoi danh sach.</>}
          busy={deleteBusy}
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteEmployee()}
        />
      )}
    </div>
  );
}

function EmployeeAvatar({ employee, size }: { employee: Pick<Employee, "avatar" | "name" | "photo">; size: "sm" | "lg" }) {
  const classes = size === "sm" ? "w-8 h-8 rounded-full" : "w-20 h-20 rounded-2xl";
  const fontSize = size === "sm" ? "12px" : "22px";

  if (employee.photo) {
    return <img src={employee.photo} alt={employee.name} className={`${classes} object-cover border border-gray-100`} />;
  }

  return (
    <div className={`${classes} bg-[#0F4761] text-white flex items-center justify-center`} style={{ fontSize, fontWeight: 700 }}>
      {employee.avatar || getInitials(employee.name)}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  mono = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px", fontWeight: 500 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        readOnly={readOnly}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] read-only:bg-gray-50 read-only:text-gray-500"
        style={{ fontSize: "13px", fontFamily: mono ? "monospace" : undefined }}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | [string, string]>;
}) {
  return (
    <div>
      <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px", fontWeight: 500 }}>{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
        style={{ fontSize: "13px" }}
      >
        {options.map(option => {
          const optionValue = Array.isArray(option) ? option[0] : option;
          const optionLabel = Array.isArray(option) ? option[1] : option;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    </div>
  );
}

function AddressEditor({ address, onChange }: { address: string; onChange: (value: string) => void }) {
  const [value, setValue] = useState<AddressValue>(() => createAddressFromText(address));

  return (
    <VietnamAddressPicker
      value={value}
      onChange={next => {
        setValue(next);
        onChange(next.fullAddress);
      }}
      label="Địa chỉ liên hệ"
    />
  );
}

function EmployeeConfirmPanel({ employee }: { employee: Employee }) {
  const rows = [
    ["Mã nhân viên", employee.code],
    ["Họ và tên", employee.name || "Chưa nhập"],
    ["Email", employee.email || "Chưa nhập"],
    ["Số điện thoại", employee.phone || "Chưa cập nhật"],
    ["Chi nhánh", employee.branch],
    ["Vai trò", employee.role],
    ["Ngày bắt đầu", formatDisplayDate(employee.startDate)],
    ["Trạng thái", statusLabel[employee.status]],
    ["Giới tính", employee.gender],
    ["Ngày sinh", formatDisplayDate(employee.birthday)],
    ["Địa chỉ", employee.address || "Chưa cập nhật"],
    ["Ảnh nhân viên", employee.photoName || "Chưa thêm ảnh"],
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 border border-gray-100">
        <EmployeeAvatar employee={employee} size="lg" />
        <div>
          <p style={{ fontSize: "15px", color: "#111827", fontWeight: 700 }}>{employee.name || "Nhân viên mới"}</p>
          <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: "2px" }}>{employee.role} · {employee.branch}</p>
          <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full ${statusColors[employee.status]}`} style={{ fontSize: "11.5px" }}>{statusLabel[employee.status]}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="border border-gray-100 rounded-xl px-3 py-2.5">
            <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{label}</p>
            <p style={{ fontSize: "13px", color: "#1F2937", fontWeight: 500, marginTop: "2px" }}>{value}</p>
          </div>
        ))}
      </div>
      {employee.note && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p style={{ fontSize: "12px", color: "#B45309", fontWeight: 600 }}>Ghi chú</p>
          <p style={{ fontSize: "13px", color: "#78350F", marginTop: "4px" }}>{employee.note}</p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue" | "green" | "amber" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className={`${toneClass} rounded-xl p-3.5`}>
      <div className="flex items-center gap-1.5" style={{ fontSize: "11.5px" }}>{icon}{label}</div>
      <p style={{ fontSize: "15px", fontWeight: 700, marginTop: "4px" }}>{value}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-8 h-8 rounded-lg bg-[#EBF4FA] flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{label}</p>
        <p className="break-words" style={{ fontSize: "13.5px", color: "#1F2937", fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  );
}
