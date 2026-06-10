import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Camera,
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
import type { EmployeeDto, EmployeeRequestDto, FileUploadDto, LookupOptionDto, PageResponse } from "../../../lib/types";
import { AddressValue, createAddressFromText, VietnamAddressPicker } from "../../../shared/address/VietnamAddressPicker";

type ManagerStatus = "active" | "locked";
type ManagerGender = "Nam" | "Nữ" | "Khác";
type ManagerRole = string;

type BranchManager = {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  branchId: number | null;
  roleId: number | null;
  branches: string[];
  role: ManagerRole;
  date: string;
  startDate: string;
  status: ManagerStatus;
  avatar: string;
  gender: ManagerGender;
  birthday: string;
  address: string;
  photo?: string;
  photoName?: string;
  note: string;
};

type ManagerForm = Omit<BranchManager, "id" | "date" | "avatar">;

const genders: ManagerGender[] = ["Nam", "Nữ", "Khác"];
const steps = ["Thông tin cá nhân", "Thông tin công việc", "Thêm ảnh", "Xác nhận"];

const initialManagers: BranchManager[] = [];

const roleColors: Record<string, string> = {
  "Quản lý chi nhánh": "bg-blue-100 text-blue-700",
  "Quản lý kho": "bg-teal-100 text-teal-700",
  "Sales Manager": "bg-blue-100 text-blue-700",
  "Warehouse Manager": "bg-teal-100 text-teal-700",
};

const statusLabel: Record<ManagerStatus, string> = {
  active: "Hoạt động",
  locked: "Bị khóa",
};

const statusColors: Record<ManagerStatus, string> = {
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

  return initials || "QL";
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

const getNextManagerId = (items: BranchManager[]) => Math.max(0, ...items.map(item => item.id)) + 1;
const randomManagerCode = () => `QL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const pageItems = <T,>(data: PageResponse<T> | T[]) => Array.isArray(data) ? data : data.items;
const optionPairs = (items: LookupOptionDto[]) => items.map(item => [String(item.id), item.name] as [string, string]);
const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";
const roleBadgeClass = (role: string) => roleColors[role] || "bg-gray-100 text-gray-700";
const statusFromApi = (status?: string | null): ManagerStatus => status === "inactive" || status === "locked" ? "locked" : "active";
const statusToApi = (status: ManagerStatus) => status === "locked" ? "inactive" : "active";
const normalizeRoleName = (value?: string | null) => (value || "").toLowerCase().replace(/_/g, " ").trim();
const managerRoleLabels: Record<string, string> = {
  "sales manager": "Sales Manager",
  "quan ly ban hang": "Sales Manager",
  "warehouse manager": "Warehouse Manager",
};
const managerRoleKey = (value?: string | null) => {
  const normalized = normalizeRoleName(value);
  return normalized === "sale manager" ? "sales manager" : normalized;
};
const displayManagerRole = (value?: string | null) => managerRoleLabels[managerRoleKey(value)] || value || "";
const isManagerRole = (role?: LookupOptionDto | null) => Object.prototype.hasOwnProperty.call(managerRoleLabels, managerRoleKey(role?.name));
const uniqueManagerRoles = (roles: LookupOptionDto[]) => {
  const seen = new Set<string>();
  const result: LookupOptionDto[] = [];

  for (const role of roles) {
    const key = managerRoleKey(role.name);
    if (!isManagerRole(role) || seen.has(key)) continue;
    seen.add(key);
    result.push({ ...role, name: displayManagerRole(role.name) });
  }

  return result;
};

const createEmptyForm = (nextId: number): ManagerForm => ({
  code: randomManagerCode(),
  name: "",
  email: "",
  phone: "",
  branchId: null,
  roleId: null,
  branches: [],
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

export function BranchManagers() {
  const [items, setItems] = useState<BranchManager[]>(initialManagers);
  const [branchOptions, setBranchOptions] = useState<LookupOptionDto[]>([]);
  const [roleOptions, setRoleOptions] = useState<LookupOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ManagerStatus>("all");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(0);
  const [addForm, setAddForm] = useState<ManagerForm>(() => createEmptyForm(getNextManagerId(initialManagers)));
  const [viewing, setViewing] = useState<BranchManager | null>(null);
  const [editing, setEditing] = useState<BranchManager | null>(null);
  const [deleting, setDeleting] = useState<BranchManager | null>(null);
  const [locking, setLocking] = useState<BranchManager | null>(null);
  const [lockReason, setLockReason] = useState("");
  const branchSelectOptions: Array<string | [string, string]> = [["", "Chon chi nhanh/kho"], ...optionPairs(branchOptions)];
  const roleSelectOptions: Array<string | [string, string]> = [["", "Chon vai tro"], ...optionPairs(roleOptions)];

  const hydrateManager = (dto: EmployeeDto, branchesLookup = branchOptions, rolesLookup = roleOptions): BranchManager => {
    const branch = branchesLookup.find(item => item.id === dto.branchId);
    const role = rolesLookup.find(item => item.id === dto.roleId);

    return {
      id: dto.id,
      code: `QL-${String(dto.id).padStart(4, "0")}`,
      name: dto.name || "",
      email: dto.email || "",
      phone: dto.phoneNumber || "",
      branchId: dto.branchId ?? null,
      roleId: dto.roleId ?? null,
      branches: branch?.name ? [branch.name] : [],
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

  const loadManagers = async () => {
    setLoading(true);
    try {
      const [branchesData, rolesData, managersData] = await Promise.all([
        api.get<LookupOptionDto[]>("/lookups/branches"),
        api.get<LookupOptionDto[]>("/lookups/roles?scope=manager"),
        api.get<PageResponse<EmployeeDto> | EmployeeDto[]>("/managers?size=100&sort=id,desc"),
      ]);
      const loadedBranches = branchesData || [];
      const displayRoles = (rolesData || [])
        .filter(isManagerRole)
        .map(role => ({ ...role, name: displayManagerRole(role.name) }));
      const loadedRoles = uniqueManagerRoles(displayRoles);
      const allowedRoleIds = new Set(displayRoles.map(role => Number(role.id)));
      setBranchOptions(loadedBranches);
      setRoleOptions(loadedRoles);
      setItems(
        pageItems(managersData)
          .filter(dto => dto.roleId != null && allowedRoleIds.has(Number(dto.roleId)))
          .map(dto => hydrateManager(dto, loadedBranches, displayRoles)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai danh sach quan ly");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadManagers();
  }, []);

  const managedBranches = useMemo(() => new Set(items.flatMap(manager => manager.branches)), [items]);
  const unmanagedCount = branchOptions.filter(branch => !managedBranches.has(branch.name)).length;

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter(manager => {
      const matchSearch = !keyword || [manager.code, manager.name, manager.email, manager.phone, manager.role, manager.branches.join(" ")]
        .some(value => value.toLowerCase().includes(keyword));
      const matchStatus = statusFilter === "all" || manager.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  const openAddModal = () => {
    const branch = branchOptions[0];
    setAddForm({
      ...createEmptyForm(getNextManagerId(items)),
      branchId: branch?.id ?? null,
      branches: branch?.name ? [branch.name] : [],
      roleId: null,
      role: "",
    });
    setStep(0);
    setShowModal(true);
  };

  const closeAddModal = () => {
    setShowModal(false);
    setStep(0);
  };

  const updateAddForm = <K extends keyof ManagerForm>(key: K, value: ManagerForm[K]) => {
    setAddForm(prev => ({ ...prev, [key]: value }));
  };

  const updateAddRole = (value: string) => {
    const role = roleOptions.find(item => String(item.id) === value);
    setAddForm(prev => ({ ...prev, roleId: role?.id ?? null, role: role?.name ?? "" }));
  };

  const updateEditRole = (value: string) => {
    const role = roleOptions.find(item => String(item.id) === value);
    setEditing(prev => prev ? ({ ...prev, roleId: role?.id ?? null, role: role?.name ?? "" }) : prev);
  };

  const updateAddBranch = (index: number, branch: string) => {
    setAddForm(prev => {
      const branches = [...prev.branches];
      if (!branch) {
        return { ...prev, branches: branches.filter((_, branchIndex) => branchIndex !== index) };
      }

      if (index >= branches.length) {
        branches.push(branch);
      } else {
        branches[index] = branch;
      }

      const uniqueBranches = Array.from(new Set(branches));
      const firstBranch = branchOptions.find(item => item.name === uniqueBranches[0]);
      return { ...prev, branches: uniqueBranches, branchId: firstBranch?.id ?? null };
    });
  };

  const removeAddBranch = (index: number) => {
    setAddForm(prev => ({
      ...prev,
      branches: prev.branches.filter((_, branchIndex) => branchIndex !== index),
      branchId: branchOptions.find(item => item.name === prev.branches.filter((_, branchIndex) => branchIndex !== index)[0])?.id ?? null,
    }));
  };

  const updateEditBranch = (index: number, branch: string) => {
    setEditing(prev => {
      if (!prev) return prev;

      const branches = [...prev.branches];
      if (!branch) {
        return { ...prev, branches: branches.filter((_, branchIndex) => branchIndex !== index) };
      }

      if (index >= branches.length) {
        branches.push(branch);
      } else {
        branches[index] = branch;
      }

      const uniqueBranches = Array.from(new Set(branches));
      const firstBranch = branchOptions.find(item => item.name === uniqueBranches[0]);
      return { ...prev, branches: uniqueBranches, branchId: firstBranch?.id ?? null };
    });
  };

  const removeEditBranch = (index: number) => {
    setEditing(prev => prev ? {
      ...prev,
      branches: prev.branches.filter((_, branchIndex) => branchIndex !== index),
      branchId: branchOptions.find(item => item.name === prev.branches.filter((_, branchIndex) => branchIndex !== index)[0])?.id ?? null,
    } : prev);
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
    if (!file) return;

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
      toast.error("Vui long nhap ho ten quan ly.");
      return false;
    }
    if (step === 1 && (!addForm.role || addForm.branches.length === 0)) {
      toast.error("Vui lòng chọn vai trò và chi nhánh phụ trách.");
      return false;
    }
    return true;
  };

  const toManagerRequest = (manager: ManagerForm | BranchManager): EmployeeRequestDto => ({
    name: manager.name.trim(),
    branchId: manager.branchId ?? null,
    roleId: manager.roleId || 0,
    status: statusToApi(manager.status),
    email: manager.email.trim() || null,
    phoneNumber: manager.phone.trim() || null,
    imgUrl: manager.photo || null,
    createdAt: localDateTimeNow(),
  });

  const saveNewManager = async () => {
    if (!addForm.name.trim()) {
      setStep(0);
      toast.error("Vui long nhap ho ten quan ly.");
      return;
    }

    if (addForm.branches.length === 0) {
      setStep(1);
      toast.error("Vui lòng chọn ít nhất một chi nhánh phụ trách.");
      return;
    }

    if (!addForm.branchId || !addForm.roleId) {
      setStep(1);
      toast.error("Vui long chon chi nhanh va vai tro.");
      return;
    }

    setSaving(true);
    try {
      await api.post<EmployeeDto>("/managers", toManagerRequest(addForm));
      toast.success("Them quan ly thanh cong");
      closeAddModal();
      await loadManagers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the them quan ly");
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

    await saveNewManager();
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Vui lòng nhập họ tên và email quản lý.");
      return;
    }
    if (editing.branches.length === 0) {
      toast.error("Vui lòng chọn ít nhất một chi nhánh phụ trách.");
      return;
    }

    if (!editing.branchId || !editing.roleId) {
      toast.error("Vui long chon chi nhanh va vai tro.");
      return;
    }

    setSaving(true);
    try {
      await api.put<EmployeeDto>(`/managers/${editing.id}`, toManagerRequest(editing));
      toast.success("Da cap nhat quan ly");
      setEditing(null);
      await loadManagers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the cap nhat quan ly");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await api.del<void>(`/managers/${target.id}`);
      setDeleting(null);
      toast.success("Da xoa quan ly");
      await loadManagers();
      setItems(prev => prev.filter(manager => manager.id !== target.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa quan ly");
    }
  };

  const confirmLock = async () => {
    if (!locking || !lockReason.trim()) return;

    try {
      await api.patch<EmployeeDto>(`/managers/${locking.id}/lock`);
      setLocking(null);
      setLockReason("");
      toast.success("Da khoa tai khoan quan ly");
      await loadManagers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the khoa tai khoan");
    }
  };

  const unlockManager = async (manager: BranchManager) => {
    try {
      await api.patch<EmployeeDto>(`/managers/${manager.id}/unlock`);
      toast.success("Da mo khoa tai khoan quan ly");
      await loadManagers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the mo khoa tai khoan");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Quản lý chi nhánh</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Tài khoản quản lý phụ trách chi nhánh và kho</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]"
          style={{ fontSize: "13.5px" }}
        >
          <Plus size={16} /> Thêm quản lý
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div style={{ fontSize: "12px", color: "#6B7280" }}>Tổng quản lý</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F4761" }}>{items.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div style={{ fontSize: "12px", color: "#6B7280" }}>Đang hoạt động</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#10B981" }}>{items.filter(manager => manager.status === "active").length}</div>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm ${unmanagedCount > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-2">
            {unmanagedCount > 0 && <AlertTriangle size={14} className="text-orange-500" />}
            <span style={{ fontSize: "12px", color: unmanagedCount > 0 ? "#F59E0B" : "#6B7280" }}>Chi nhánh/kho chưa có QL</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: unmanagedCount > 0 ? "#F59E0B" : "#10B981" }}>{unmanagedCount}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm quản lý..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
            style={{ fontSize: "13px" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as "all" | ManagerStatus)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
          style={{ fontSize: "13px" }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Bị khóa</option>
        </select>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-gray-500" style={{ fontSize: "13px" }}>
          Dang tai quan ly tu database...
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Quản lý</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Liên hệ</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Vai trò</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Chi nhánh phụ trách</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Ngày tạo</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Trạng thái</th>
              <th className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(manager => (
              <tr key={manager.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ManagerAvatar manager={manager} size="sm" />
                    <div>
                      <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>{manager.name}</span>
                      <div style={{ fontSize: "11.5px", color: "#9CA3AF", fontFamily: "monospace" }}>{manager.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div style={{ fontSize: "12.5px", color: "#374151" }}>{manager.email || "Chưa cập nhật"}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF" }}>{manager.phone || "Chưa cập nhật"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs ${roleBadgeClass(manager.role)}`}>{manager.role}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {manager.branches.map(branch => (
                      <span key={branch} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full" style={{ fontSize: "11.5px" }}>{branch}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#6B7280" }}>{manager.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[manager.status]}`}>
                    {statusLabel[manager.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewing(manager)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Xem chi tiết"><Eye size={15} /></button>
                    <button onClick={() => setEditing({ ...manager })} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500" title="Sửa"><Edit size={15} /></button>
                    <button onClick={() => manager.status === "locked" ? void unlockManager(manager) : (setLocking(manager), setLockReason(""))} className={`p-1.5 rounded-lg ${manager.status === "locked" ? "hover:bg-green-50 text-green-600" : "hover:bg-orange-50 text-orange-500"}`} title={manager.status === "locked" ? "Mo khoa" : "Khóa"}>{manager.status === "locked" ? <Unlock size={15} /> : <Lock size={15} />}</button>
                    <button onClick={() => setDeleting(manager)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Xóa"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400" style={{ fontSize: "13px" }}>
                  Không tìm thấy quản lý phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Manager Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeAddModal}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F4761" }}>Thêm quản lý</h2>
              <button onClick={closeAddModal} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>

            <div className="p-6">
              <StepIndicator step={step} />

              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField label="Mã quản lý" value={addForm.code} onChange={value => updateAddForm("code", value)} mono readOnly />
                    <TextField label="Họ và tên *" value={addForm.name} onChange={value => updateAddForm("name", value)} placeholder="Nhập họ tên" />
                    <TextField label="Email" value={addForm.email} onChange={value => updateAddForm("email", value)} type="email" placeholder="email@trà.vn" />
                    <TextField label="Số điện thoại" value={addForm.phone} onChange={value => updateAddForm("phone", value)} placeholder="09xx..." />
                    <TextField label="Ngày sinh" value={addForm.birthday} onChange={value => updateAddForm("birthday", value)} type="date" />
                    <SelectField label="Giới tính" value={addForm.gender} onChange={value => updateAddForm("gender", value as ManagerGender)} options={genders} />
                  </div>
                  <AddressEditor address={addForm.address} onChange={value => updateAddForm("address", value)} />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label="Vai trò *" value={String(addForm.roleId ?? "")} onChange={updateAddRole} options={roleSelectOptions} />
                    <TextField label="Ngày bắt đầu" value={addForm.startDate} onChange={value => updateAddForm("startDate", value)} type="date" />
                    <SelectField label="Trạng thái" value={addForm.status} onChange={value => updateAddForm("status", value as ManagerStatus)} options={[["active", "Hoạt động"], ["locked", "Bị khóa"]]} />
                  </div>
                  <BranchSelectRows selected={addForm.branches} options={branchOptions.map(item => item.name)} onChange={updateAddBranch} onRemove={removeAddBranch} />
                  <div>
                    <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px", fontWeight: 500 }}>Ghi chú</label>
                    <textarea
                      value={addForm.note}
                      onChange={event => updateAddForm("note", event.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none focus:border-[#0F4761]"
                      style={{ fontSize: "13px" }}
                      placeholder="Ghi chú nội bộ về quản lý..."
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 items-start">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <div className="mx-auto mb-3">
                      <ManagerAvatar manager={{ ...addForm, id: 0, date: "", avatar: getInitials(addForm.name) }} size="lg" />
                    </div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{addForm.name || "Quản lý mới"}</p>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>{addForm.code}</p>
                  </div>
                  <div>
                    <label className="block border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#0F4761] transition-colors cursor-pointer bg-white">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAddPhotoChange} />
                      <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                      <p style={{ fontSize: "13.5px", color: "#374151", fontWeight: 600 }}>Tải ảnh quản lý</p>
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
                <ManagerConfirmPanel manager={{ ...addForm, id: 0, date: formatDisplayDate(new Date().toISOString().slice(0, 10)), avatar: getInitials(addForm.name) }} />
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
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Chi tiết quản lý</h2>
              <button onClick={() => setViewing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <ManagerAvatar manager={viewing} size="lg" />
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
                <InfoCard icon={<MapPin size={13} />} label="Phụ trách" value={`${viewing.branches.length} khu vực`} tone="green" />
                <InfoCard icon={<Calendar size={13} />} label="Ngày bắt đầu" value={formatDisplayDate(viewing.startDate)} tone="amber" />
              </div>

              <div className="grid grid-cols-1 gap-0 divide-y divide-gray-50 border border-gray-100 rounded-xl px-4">
                <DetailRow icon={<Mail size={15} className="text-[#0F4761]" />} label="Email" value={viewing.email} />
                <DetailRow icon={<Phone size={15} className="text-[#0F4761]" />} label="Số điện thoại" value={viewing.phone || "Chưa cập nhật"} />
                <DetailRow icon={<UserRound size={15} className="text-[#0F4761]" />} label="Giới tính / Ngày sinh" value={`${viewing.gender} / ${formatDisplayDate(viewing.birthday)}`} />
                <DetailRow icon={<MapPin size={15} className="text-[#0F4761]" />} label="Địa chỉ" value={viewing.address || "Chưa cập nhật"} />
                <DetailRow icon={<Briefcase size={15} className="text-[#0F4761]" />} label="Chi nhánh/kho phụ trách" value={viewing.branches.join(", ")} />
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

      {/* Edit Manager Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Sửa thông tin quản lý</h2>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <div className="mx-auto mb-3">
                    <ManagerAvatar manager={editing} size="lg" />
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{editing.name || "Quản lý"}</p>
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

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label="Mã quản lý" value={editing.code} onChange={value => setEditing({ ...editing, code: value })} mono readOnly />
                  <TextField label="Họ và tên *" value={editing.name} onChange={value => setEditing({ ...editing, name: value })} />
                  <TextField label="Email" value={editing.email} onChange={value => setEditing({ ...editing, email: value })} type="email" />
                  <TextField label="Số điện thoại" value={editing.phone} onChange={value => setEditing({ ...editing, phone: value })} />
                  <TextField label="Ngày sinh" value={editing.birthday} onChange={value => setEditing({ ...editing, birthday: value })} type="date" />
                  <SelectField label="Giới tính" value={editing.gender} onChange={value => setEditing({ ...editing, gender: value as ManagerGender })} options={genders} />
                  <SelectField label="Vai trò" value={String(editing.roleId ?? "")} onChange={updateEditRole} options={roleSelectOptions} />
                  <TextField label="Ngày bắt đầu" value={editing.startDate} onChange={value => setEditing({ ...editing, startDate: value })} type="date" />
                  <SelectField label="Trạng thái" value={editing.status} onChange={value => setEditing({ ...editing, status: value as ManagerStatus })} options={[["active", "Hoạt động"], ["locked", "Bị khóa"]]} />
                </div>
                <AddressEditor address={editing.address} onChange={value => setEditing({ ...editing, address: value })} />
                <BranchSelectRows selected={editing.branches} options={branchOptions.map(item => item.name)} onChange={updateEditBranch} onRemove={removeEditBranch} />
                <div>
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

      {/* Delete Confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleting(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Xóa quản lý?</h2>
              <p style={{ fontSize: "13.5px", color: "#6B7280", marginTop: "6px" }}>
                Bạn có chắc muốn xóa <strong style={{ color: "#111827" }}>{deleting.name}</strong> ({deleting.code})? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>Hủy</button>
              <button onClick={confirmDelete} className="px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600" style={{ fontSize: "13.5px" }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Dialog */}
      {locking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setLocking(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#EF4444", marginBottom: "8px" }}>Khóa tài khoản</h3>
            <p style={{ fontSize: "13.5px", color: "#6B7280", marginBottom: "16px" }}>
              Tài khoản của <strong style={{ color: "#111827" }}>{locking.name}</strong> sẽ bị khóa và không thể đăng nhập.
            </p>
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
              <button onClick={() => setLocking(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Hủy</button>
              <button
                onClick={confirmLock}
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
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
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
  );
}

function ManagerAvatar({ manager, size }: { manager: Pick<BranchManager, "avatar" | "name" | "photo">; size: "sm" | "lg" }) {
  const classes = size === "sm" ? "w-9 h-9 rounded-full" : "w-20 h-20 rounded-2xl";
  const fontSize = size === "sm" ? "13px" : "22px";

  if (manager.photo) {
    return <img src={manager.photo} alt={manager.name} className={`${classes} object-cover border border-gray-100`} />;
  }

  return (
    <div className={`${classes} bg-[#0F4761] text-white flex items-center justify-center`} style={{ fontSize, fontWeight: 700 }}>
      {manager.avatar || getInitials(manager.name)}
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

function BranchSelectRows({
  selected,
  options,
  onChange,
  onRemove,
}: {
  selected: string[];
  options: string[];
  onChange: (index: number, branch: string) => void;
  onRemove: (index: number) => void;
}) {
  const rows = selected.length ? selected : [""];

  return (
    <div>
      <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "8px", fontWeight: 500 }}>Chi nhánh/kho phụ trách *</label>
      <div className="space-y-2">
        {rows.map((branch, index) => (
          <div key={`${branch || "empty"}-${index}`} className="flex items-center gap-2">
            <select
              value={branch}
              onChange={event => onChange(index, event.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#0F4761]"
              style={{ fontSize: "13px" }}
            >
              <option value="">Chọn chi nhánh/kho</option>
              {options.map(option => (
                <option key={option} value={option} disabled={selected.includes(option) && option !== branch}>{option}</option>
              ))}
            </select>
            {(selected.length > 1 || branch) && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                title="Xóa chi nhánh/kho"
              >
                <X size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
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

function ManagerConfirmPanel({ manager }: { manager: BranchManager }) {
  const rows = [
    ["Mã quản lý", manager.code],
    ["Họ và tên", manager.name || "Chưa nhập"],
    ["Email", manager.email || "Chưa nhập"],
    ["Số điện thoại", manager.phone || "Chưa cập nhật"],
    ["Vai trò", manager.role],
    ["Chi nhánh/kho", manager.branches.length ? manager.branches.join(", ") : "Chưa chọn"],
    ["Ngày bắt đầu", formatDisplayDate(manager.startDate)],
    ["Trạng thái", statusLabel[manager.status]],
    ["Giới tính", manager.gender],
    ["Ngày sinh", formatDisplayDate(manager.birthday)],
    ["Địa chỉ", manager.address || "Chưa cập nhật"],
    ["Ảnh quản lý", manager.photoName || "Chưa thêm ảnh"],
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 border border-gray-100">
        <ManagerAvatar manager={manager} size="lg" />
        <div>
          <p style={{ fontSize: "15px", color: "#111827", fontWeight: 700 }}>{manager.name || "Quản lý mới"}</p>
          <p style={{ fontSize: "12.5px", color: "#6B7280", marginTop: "2px" }}>{manager.role} · {manager.branches.join(", ") || "Chưa chọn khu vực"}</p>
          <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full ${statusColors[manager.status]}`} style={{ fontSize: "11.5px" }}>{statusLabel[manager.status]}</span>
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
      {manager.note && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p style={{ fontSize: "12px", color: "#B45309", fontWeight: 600 }}>Ghi chú</p>
          <p style={{ fontSize: "13px", color: "#78350F", marginTop: "4px" }}>{manager.note}</p>
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
