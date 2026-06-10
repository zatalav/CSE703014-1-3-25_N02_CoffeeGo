import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Plus, MapPin, Phone, Clock, Eye, Edit, PowerOff, CheckCircle, XCircle, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import type { BranchDto, BranchHoursDto, BranchHoursRequest, BranchRequest, FileUploadDto, PageResponse } from "../../../lib/types";
import { OpenStreetMapLocationPanel } from "../../../shared/address/OpenStreetMapLocationPanel";
import { AddressValue, createAddressFromText, VietnamAddressPicker } from "../../../shared/address/VietnamAddressPicker";

type BranchType = "Chi nhánh bán hàng" | "Chi nhánh kho";
type BranchStatus = "active" | "locked";

type Branch = {
  id: number;
  name: string;
  type: BranchType;
  address: string;
  addressDetail: string;
  imgUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl: string;
  phone: string;
  email: string;
  open: string;
  close: string;
  status: BranchStatus;
  revenue: string;
  lockReason?: string;
};

type BranchForm = {
  name: string;
  type: BranchType;
  address: string;
  addressDetail: string;
  imgUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl: string;
  phone: string;
  email: string;
  open: string;
  close: string;
};

const branchTypes: BranchType[] = ["Chi nhánh bán hàng", "Chi nhánh kho"];
const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const emptyForm = (): BranchForm => ({
  name: "",
  type: "Chi nhánh bán hàng",
  address: "",
  addressDetail: "",
  imgUrl: "",
  latitude: undefined,
  longitude: undefined,
  mapUrl: "",
  phone: "",
  email: "",
  open: "07:00",
  close: "22:00",
});

const toBranchType = (value?: string | null): BranchType => value === "warehouse" ? "Chi nhánh kho" : "Chi nhánh bán hàng";
const toApiBranchType = (value: BranchType): "sales" | "warehouse" => value === "Chi nhánh kho" ? "warehouse" : "sales";
const toBranchStatus = (value?: string | null): BranchStatus => value === "inactive" ? "locked" : "active";
const toApiStatus = (value: BranchStatus): "active" | "inactive" => value === "locked" ? "inactive" : "active";
const toTime = (value?: string | null) => value ? value.slice(0, 5) : "";
const uploadResultUrl = (result: FileUploadDto) => result.secureUrl || result.imgUrl || result.url || "";
const parseCoordinate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

async function uploadBranchImage(file: File) {
  const uploaded = await api.upload<FileUploadDto>("/upload/image", file);
  const url = uploadResultUrl(uploaded);
  if (!url) throw new Error("Upload không trả về URL ảnh.");
  return url;
}

function pageItems<T>(data: PageResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items;
}

function deriveHours(hours: BranchHoursDto[]) {
  const firstOpen = hours.find(hour => !hour.isClosed && hour.openTime && hour.closeTime);
  return {
    open: toTime(firstOpen?.openTime) || "—",
    close: toTime(firstOpen?.closeTime) || "—",
  };
}

function toBranch(dto: BranchDto, hours: BranchHoursDto[] = []): Branch {
  const derived = deriveHours(hours);
  return {
    id: dto.branchId,
    name: dto.branchName,
    type: toBranchType(dto.branchType),
    address: dto.address,
    addressDetail: dto.addressDetail || "",
    imgUrl: dto.imgUrl || "",
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
    mapUrl: dto.mapUrl || "",
    phone: dto.phone || "",
    email: dto.email,
    open: derived.open,
    close: derived.close,
    status: toBranchStatus(dto.status),
    revenue: "Chưa có dữ liệu",
  };
}

function toRequest(branch: Pick<Branch, "name" | "type" | "address" | "addressDetail" | "imgUrl" | "latitude" | "longitude" | "mapUrl" | "phone" | "email" | "status">): BranchRequest {
  return {
    branchName: branch.name.trim(),
    address: branch.address.trim(),
    addressDetail: branch.addressDetail.trim() || null,
    imgUrl: branch.imgUrl.trim() || null,
    latitude: branch.latitude ?? null,
    longitude: branch.longitude ?? null,
    mapUrl: branch.mapUrl.trim() || null,
    phone: branch.phone.trim(),
    email: branch.email.trim(),
    branchType: toApiBranchType(branch.type),
    status: toApiStatus(branch.status),
  };
}

function formToRequest(form: BranchForm): BranchRequest {
  return {
    branchName: form.name.trim(),
    address: form.address.trim(),
    addressDetail: form.addressDetail.trim() || null,
    imgUrl: form.imgUrl.trim() || null,
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    mapUrl: form.mapUrl.trim() || null,
    phone: form.phone.trim(),
    email: form.email.trim(),
    branchType: toApiBranchType(form.type),
    status: "active",
  };
}

function defaultHours(open: string, close: string): BranchHoursRequest[] {
  return weekdays.map(day => ({
    dayOfWeek: day,
    openTime: day === "Chủ nhật" ? null : open,
    closeTime: day === "Chủ nhật" ? null : close,
    isClosed: day === "Chủ nhật",
  }));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể kết nối backend.";
}

export function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedHours, setSelectedHours] = useState<BranchHoursDto[]>([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [lockingBranch, setLockingBranch] = useState<Branch | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(0);
  const [addForm, setAddForm] = useState<BranchForm>(() => emptyForm());
  const [addAddress, setAddAddress] = useState<AddressValue>(() => createAddressFromText());
  const [addHours, setAddHours] = useState<BranchHoursRequest[]>(() => defaultHours("07:00", "22:00"));
  const [uploadingImage, setUploadingImage] = useState(false);

  const activeCount = useMemo(() => branches.filter(branch => branch.status === "active").length, [branches]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.get<PageResponse<BranchDto> | BranchDto[]>("/branches?size=100&sort=branchId,asc");
      const items = pageItems(data);
      const mapped = await Promise.all(items.map(async item => {
        try {
          const hours = await api.get<BranchHoursDto[]>(`/branches/${item.branchId}/hours`);
          return toBranch(item, hours);
        } catch {
          return toBranch(item);
        }
      }));
      setBranches(mapped);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    if (!selectedBranch) {
      setSelectedHours([]);
      return;
    }

    let ignore = false;
    const loadHours = async () => {
      try {
        setHoursLoading(true);
        const data = await api.get<BranchHoursDto[]>(`/branches/${selectedBranch.id}/hours`);
        if (!ignore) setSelectedHours(data);
      } catch {
        if (!ignore) setSelectedHours([]);
      } finally {
        if (!ignore) setHoursLoading(false);
      }
    };
    void loadHours();
    return () => {
      ignore = true;
    };
  }, [selectedBranch?.id]);

  const openCreateModal = () => {
    const form = emptyForm();
    setAddForm(form);
    setAddAddress(createAddressFromText());
    setAddHours(defaultHours(form.open, form.close));
    setStep(0);
    setShowModal(true);
  };

  const saveEdit = async () => {
    if (!editingBranch?.name.trim() || !editingBranch.address.trim() || !editingBranch.email.trim()) {
      toast.error("Vui lòng nhập tên, email và địa chỉ chi nhánh.");
      return;
    }

    try {
      setSaving(true);
      const updated = await api.put<BranchDto>(`/branches/${editingBranch.id}`, toRequest(editingBranch));
      const hoursPayload = defaultHours(
        editingBranch.open === "—" ? "07:00" : editingBranch.open,
        editingBranch.close === "—" ? "22:00" : editingBranch.close,
      );
      const hours = await api.put<BranchHoursDto[]>(`/branches/${editingBranch.id}/hours`, hoursPayload);
      const mapped = toBranch(updated, hours);
      setBranches(prev => prev.map(branch => branch.id === mapped.id ? mapped : branch));
      if (selectedBranch?.id === mapped.id) setSelectedBranch(mapped);
      setEditingBranch(null);
      toast.success("Đã cập nhật chi nhánh!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmLock = async () => {
    if (!lockingBranch || !lockReason.trim()) return;

    try {
      setSaving(true);
      const response = await api.patch<BranchDto>(`/admin/branches/${lockingBranch.id}/inactive`);
      const updated = { ...lockingBranch, status: "locked" as BranchStatus, lockReason: lockReason.trim() };
      const mapped = toBranch(response);
      updated.name = mapped.name;
      updated.type = mapped.type;
      updated.address = mapped.address;
      updated.phone = mapped.phone;
      updated.email = mapped.email;
      setBranches(prev => prev.map(branch => branch.id === lockingBranch.id ? updated : branch));
      if (selectedBranch?.id === lockingBranch.id) setSelectedBranch(updated);
      setLockingBranch(null);
      setLockReason("");
      toast.error("Đã khóa chi nhánh!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unlockBranch = async (branch: Branch) => {
    try {
      setSaving(true);
      const response = await api.patch<BranchDto>(`/admin/branches/${branch.id}/active`);
      const updated = { ...branch, ...toBranch(response), open: branch.open, close: branch.close, status: "active" as BranchStatus };
      setBranches(prev => prev.map(item => item.id === branch.id ? updated : item));
      if (selectedBranch?.id === branch.id) setSelectedBranch(updated);
      toast.success("Đã mở khóa chi nhánh");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveNewBranch = async () => {
    if (!addForm.name.trim() || !addForm.address.trim() || !addForm.email.trim()) {
      toast.error("Vui lòng nhập tên, email và địa chỉ chi nhánh.");
      setStep(0);
      return;
    }

    try {
      setSaving(true);
      const created = await api.post<BranchDto>("/branches", formToRequest(addForm));
      const hours = await api.put<BranchHoursDto[]>(`/branches/${created.branchId}/hours`, addHours);
      const mapped = toBranch(created, hours);
      setBranches(prev => [mapped, ...prev]);
      setShowModal(false);
      setStep(0);
      toast.success("Thêm chi nhánh thành công!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const updateAddHour = (index: number, patch: Partial<BranchHoursRequest>) => {
    setAddHours(prev => prev.map((hour, i) => i === index ? { ...hour, ...patch } : hour));
  };

  const uploadAddImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const imgUrl = await uploadBranchImage(file);
      setAddForm(prev => ({ ...prev, imgUrl }));
      toast.success("Đã tải ảnh chi nhánh.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  if (selectedBranch) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedBranch(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">←</button>
          <div>
            <h1 style={{fontSize: '20px', fontWeight: 700, color: '#0F4761'}}>{selectedBranch.name}</h1>
            <p style={{fontSize: '13px', color: '#6B7280'}}>{selectedBranch.address}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setEditingBranch({ ...selectedBranch })} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5" style={{fontSize: '13px'}}>
              <Edit size={14} /> Sửa
            </button>
            {selectedBranch.status === "locked" ? (
              <button onClick={() => void unlockBranch(selectedBranch)} disabled={saving} className="px-3 py-1.5 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1.5 disabled:opacity-50" style={{fontSize: '13px'}}>
                <CheckCircle size={14} /> Mở khóa
              </button>
            ) : (
              <button onClick={() => { setLockingBranch(selectedBranch); setLockReason(""); }} className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 flex items-center gap-1.5" style={{fontSize: '13px'}}>
                <PowerOff size={14} /> Khóa
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[["info","Thông tin chung"],["hours","Giờ hoạt động"],["staff","Nhân sự"],["stats","Thống kê"]].map(([k,v]) => (
            <button key={k} onClick={() => setActiveTab(k)} className={`px-4 py-2 rounded-lg transition-all ${activeTab === k ? "bg-white shadow-sm text-[#0F4761] font-semibold" : "text-gray-500 hover:text-gray-700"}`} style={{fontSize: '13px'}}>
              {v}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {activeTab === "info" && (
            <div className="space-y-4">
              {selectedBranch.imgUrl && (
                <img
                  src={selectedBranch.imgUrl}
                  alt={selectedBranch.name}
                  className="h-56 w-full rounded-2xl object-cover"
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Tên chi nhánh", selectedBranch.name],
                  ["Địa chỉ", selectedBranch.address],
                  ["Địa chỉ cụ thể", selectedBranch.addressDetail || "Chưa cập nhật"],
                  ["Số điện thoại", selectedBranch.phone || "Chưa cập nhật"],
                  ["Email", selectedBranch.email],
                  ["Loại chi nhánh", selectedBranch.type],
                  ["Trạng thái", selectedBranch.status === "active" ? "Đang hoạt động" : "Đã khóa"],
                  ["Giờ mở cửa", selectedBranch.open],
                  ["Giờ đóng cửa", selectedBranch.close],
                ].map(([k, v]) => (
                  <div key={k} className="p-4 bg-gray-50 rounded-xl">
                    <div style={{fontSize: '12px', color: '#9CA3AF'}}>{k}</div>
                    <div style={{fontSize: '14px', fontWeight: 500, color: '#1F2937', marginTop: '4px'}}>{v}</div>
                  </div>
                ))}
              </div>
              <OpenStreetMapLocationPanel
                address={selectedBranch.address || selectedBranch.name}
                title="Vị trí chính xác của chi nhánh"
                latitude={selectedBranch.latitude}
                longitude={selectedBranch.longitude}
                mapUrl={selectedBranch.mapUrl}
              />
            </div>
          )}
          {activeTab === "hours" && (
            <div className="space-y-3">
              {hoursLoading && <div style={{fontSize: '13px', color: '#6B7280'}}>Đang tải giờ hoạt động...</div>}
              {!hoursLoading && weekdays.map(day => {
                const hour = selectedHours.find(item => item.dayOfWeek === day);
                const isOpen = !hour?.isClosed;
                return (
                  <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <span style={{fontSize: '13.5px', color: '#374151', width: '80px'}}>{day}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isOpen} readOnly className="rounded" />
                      <span style={{fontSize: '12.5px', color: '#6B7280'}}>Mở cửa</span>
                    </label>
                    <input type="time" value={toTime(hour?.openTime)} readOnly className="px-2 py-1 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: '13px'}} />
                    <span style={{fontSize: '13px', color: '#9CA3AF'}}>–</span>
                    <input type="time" value={toTime(hour?.closeTime)} readOnly className="px-2 py-1 border border-gray-200 rounded-lg outline-none bg-white" style={{fontSize: '13px'}} />
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === "staff" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <span style={{fontSize: '14px', fontWeight: 600, color: '#111827'}}>Nhân viên tại chi nhánh này</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full" style={{fontSize: '12px'}}>Sẽ nối API ở Phase 5</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl" style={{fontSize: '13px', color: '#6B7280'}}>Dữ liệu nhân sự sẽ được lấy từ Employee API trong phase sau.</div>
            </div>
          )}
          {activeTab === "stats" && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Doanh thu 30 ngày", selectedBranch.revenue, "₫"],
                ["Đơn trung bình/ngày", "Chưa có dữ liệu", "∑"],
                ["Nhân viên", "Phase 5", "👥"],
                ["Tỷ lệ hoàn thành", "Chưa có dữ liệu", "✓"],
              ].map(([k, v, icon]) => (
                <div key={k} className="p-5 bg-gray-50 rounded-xl flex items-center gap-4">
                  <span style={{fontSize: '28px'}}>{icon}</span>
                  <div>
                    <div style={{fontSize: '12px', color: '#9CA3AF'}}>{k}</div>
                    <div style={{fontSize: '20px', fontWeight: 700, color: '#0F4761'}}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editingBranch && (
          <BranchEditModal
            branch={editingBranch}
            saving={saving}
            onChange={setEditingBranch}
            onClose={() => setEditingBranch(null)}
            onSave={saveEdit}
          />
        )}
        {lockingBranch && (
          <BranchLockModal
            branch={lockingBranch}
            reason={lockReason}
            saving={saving}
            onReasonChange={setLockReason}
            onClose={() => setLockingBranch(null)}
            onConfirm={confirmLock}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: '22px', fontWeight: 700, color: '#0F4761'}}>Quản lý chi nhánh</h1>
          <p style={{fontSize: '13px', color: '#6B7280', marginTop: '2px'}}>{branches.length} chi nhánh trên toàn hệ thống, {activeCount} đang hoạt động</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3e54]" style={{fontSize: '13.5px'}}>
          <Plus size={16} /> Thêm chi nhánh mới
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center" style={{fontSize: '13.5px', color: '#6B7280'}}>
          Đang tải dữ liệu chi nhánh từ CSDL...
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-red-600 flex items-center justify-between" style={{fontSize: '13.5px'}}>
          <span>{error}</span>
          <button onClick={() => void loadBranches()} className="px-3 py-1.5 rounded-lg bg-white border border-red-100">Thử lại</button>
        </div>
      )}

      {!loading && !error && branches.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center" style={{fontSize: '13.5px', color: '#6B7280'}}>
          Chưa có chi nhánh trong CSDL.
        </div>
      )}

      {!loading && !error && branches.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {branch.imgUrl ? (
                    <img src={branch.imgUrl} alt={branch.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#0F4761] flex items-center justify-center text-white" style={{fontSize: '18px', fontWeight: 700}}>
                      {branch.name.trim()[0] || "C"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 style={{fontSize: '15px', fontWeight: 700, color: '#111827'}}>{branch.name}</h3>
                      {branch.status === "active" ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full" style={{fontSize: '11.5px'}}><CheckCircle size={11} /> Đang hoạt động</span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full" style={{fontSize: '11.5px'}}><XCircle size={11} /> Đã khóa</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1" style={{fontSize: '13px', color: '#6B7280'}}>
                      <MapPin size={13} /> {branch.address}
                    </div>
                    <div className="flex items-center gap-5 mt-2 flex-wrap">
                      <span className="flex items-center gap-1" style={{fontSize: '12.5px', color: '#9CA3AF'}}><Phone size={12} /> {branch.phone || "Chưa cập nhật"}</span>
                      <span className="flex items-center gap-1" style={{fontSize: '12.5px', color: '#9CA3AF'}}><Clock size={12} /> {branch.open} – {branch.close}</span>
                      <span style={{fontSize: '12.5px', color: '#9CA3AF'}}>Loại: {branch.type}</span>
                      <span style={{fontSize: '12.5px', color: '#10B981', fontWeight: 600}}>Doanh thu: {branch.revenue}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedBranch(branch)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5" style={{fontSize: '13px'}}>
                    <Eye size={14} /> Xem chi tiết
                  </button>
                  <button onClick={() => setEditingBranch({ ...branch })} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5" style={{fontSize: '13px'}}>
                    <Edit size={14} /> Sửa
                  </button>
                  {branch.status === "locked" ? (
                    <button onClick={() => void unlockBranch(branch)} disabled={saving} className="px-3 py-1.5 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1.5 disabled:opacity-50" style={{fontSize: '13px'}}>
                      <CheckCircle size={14} /> Mở khóa
                    </button>
                  ) : (
                    <button onClick={() => { setLockingBranch(branch); setLockReason(""); }} className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 flex items-center gap-1.5" style={{fontSize: '13px'}}>
                      <PowerOff size={14} /> Khóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {false && (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-blue-50 h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={36} className="text-[#0F4761] mx-auto mb-2" />
            <p style={{fontSize: '14px', color: '#0F4761', fontWeight: 500}}>Bản đồ vị trí các chi nhánh</p>
            <p style={{fontSize: '12px', color: '#9CA3AF', marginTop: '4px'}}>OpenStreetMap + Leaflet — {branches.length} chi nhánh</p>
          </div>
        </div>
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 style={{fontSize: '18px', fontWeight: 700, color: '#0F4761', marginBottom: '8px'}}>Thêm chi nhánh mới</h2>
            <div className="flex gap-4 mb-5">
              {["Thông tin cơ bản", "Cấu hình giờ mở cửa"].map((label, index) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${index <= step ? "bg-[#0F4761] text-white" : "bg-gray-200 text-gray-400"}`}>{index + 1}</div>
                  <span style={{fontSize: '13px', color: index <= step ? '#0F4761' : '#9CA3AF'}}>{label}</span>
                </div>
              ))}
            </div>
            {step === 0 ? (
              <div className="space-y-3">
                <input value={addForm.name} onChange={event => setAddForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Tên chi nhánh *" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}} />
                <BranchImageField
                  value={addForm.imgUrl}
                  uploading={uploadingImage}
                  onFileChange={uploadAddImage}
                  onUrlChange={value => setAddForm(prev => ({ ...prev, imgUrl: value }))}
                />
                <VietnamAddressPicker
                  value={addAddress}
                  onChange={value => {
                    setAddAddress(value);
                    setAddForm(prev => ({ ...prev, address: value.fullAddress }));
                  }}
                  label="Địa chỉ chi nhánh"
                  required
                />
                <textarea
                  value={addForm.addressDetail}
                  onChange={event => setAddForm(prev => ({ ...prev, addressDetail: event.target.value }))}
                  rows={2}
                  placeholder="Địa chỉ cụ thể: tầng, mặt bằng, landmark, hướng dẫn vào cửa..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none resize-none"
                  style={{fontSize: '13px'}}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={addForm.latitude ?? ""}
                    onChange={event => setAddForm(prev => ({ ...prev, latitude: parseCoordinate(event.target.value) }))}
                    placeholder="Vĩ độ OpenStreetMap"
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none"
                    style={{fontSize: '13px'}}
                  />
                  <input
                    value={addForm.longitude ?? ""}
                    onChange={event => setAddForm(prev => ({ ...prev, longitude: parseCoordinate(event.target.value) }))}
                    placeholder="Kinh độ OpenStreetMap"
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none"
                    style={{fontSize: '13px'}}
                  />
                </div>
                <input
                  value={addForm.mapUrl}
                  onChange={event => setAddForm(prev => ({ ...prev, mapUrl: event.target.value }))}
                  placeholder="Link OpenStreetMap cụ thể"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none"
                  style={{fontSize: '13px'}}
                />
                <OpenStreetMapLocationPanel
                  address={addAddress.fullAddress || addForm.name}
                  title="Kiểm tra vị trí chi nhánh"
                  latitude={addForm.latitude}
                  longitude={addForm.longitude}
                  mapUrl={addForm.mapUrl}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input value={addForm.phone} onChange={event => setAddForm(prev => ({ ...prev, phone: event.target.value }))} placeholder="Số điện thoại" className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}} />
                  <input value={addForm.email} onChange={event => setAddForm(prev => ({ ...prev, email: event.target.value }))} placeholder="Email chi nhánh" className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}} />
                </div>
                <select value={addForm.type} onChange={event => setAddForm(prev => ({ ...prev, type: event.target.value as BranchType }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{fontSize: '13px'}}>
                  {branchTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                {addHours.map((hour, index) => (
                  <div key={hour.dayOfWeek} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <input type="checkbox" checked={!hour.isClosed} onChange={event => updateAddHour(index, { isClosed: !event.target.checked })} className="rounded" />
                    <span style={{fontSize: '13px', width: '70px', color: '#374151'}}>{hour.dayOfWeek}</span>
                    <input type="time" value={hour.openTime || ""} onChange={event => updateAddHour(index, { openTime: event.target.value })} disabled={hour.isClosed} className="px-2 py-1 border border-gray-200 rounded-lg outline-none disabled:bg-gray-100" style={{fontSize: '12px'}} />
                    <span style={{fontSize: '12px', color: '#9CA3AF'}}>–</span>
                    <input type="time" value={hour.closeTime || ""} onChange={event => updateAddHour(index, { closeTime: event.target.value })} disabled={hour.isClosed} className="px-2 py-1 border border-gray-200 rounded-lg outline-none disabled:bg-gray-100" style={{fontSize: '12px'}} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
              <div className="flex gap-2">
                {step > 0 && <button onClick={() => setStep(0)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{fontSize: '13.5px'}}>Quay lại</button>}
                <button
                  disabled={saving}
                  onClick={() => { if (step === 0) setStep(1); else void saveNewBranch(); }}
                  className="px-4 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60"
                  style={{fontSize: '13.5px'}}
                >
                  {step === 0 ? "Tiếp theo" : saving ? "Đang lưu..." : "Lưu chi nhánh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingBranch && (
        <BranchEditModal
          branch={editingBranch}
          saving={saving}
          onChange={setEditingBranch}
          onClose={() => setEditingBranch(null)}
          onSave={saveEdit}
        />
      )}
      {lockingBranch && (
        <BranchLockModal
          branch={lockingBranch}
          reason={lockReason}
          saving={saving}
          onReasonChange={setLockReason}
          onClose={() => setLockingBranch(null)}
          onConfirm={confirmLock}
        />
      )}
    </div>
  );
}

function BranchEditModal({
  branch,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  branch: Branch;
  saving: boolean;
  onChange: (branch: Branch) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [addressValue, setAddressValue] = useState<AddressValue>(() => createAddressFromText(branch.address));
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadEditImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const imgUrl = await uploadBranchImage(file);
      onChange({ ...branch, imgUrl });
      toast.success("Đã tải ảnh chi nhánh.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 style={{fontSize: '17px', fontWeight: 700, color: '#111827'}}>Sửa chi nhánh</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Tên chi nhánh *" value={branch.name} onChange={value => onChange({ ...branch, name: value })} />
          <SelectField label="Loại chi nhánh" value={branch.type} onChange={value => onChange({ ...branch, type: value as BranchType })} options={branchTypes} />
          <div className="col-span-2">
            <BranchImageField
              value={branch.imgUrl}
              uploading={uploadingImage}
              onFileChange={uploadEditImage}
              onUrlChange={value => onChange({ ...branch, imgUrl: value })}
            />
          </div>
          <Field label="Số điện thoại" value={branch.phone} onChange={value => onChange({ ...branch, phone: value })} />
          <Field label="Email chi nhánh" value={branch.email} onChange={value => onChange({ ...branch, email: value })} type="email" />
          <Field label="Giờ mở cửa" value={branch.open === "—" ? "" : branch.open} onChange={value => onChange({ ...branch, open: value })} type="time" />
          <Field label="Giờ đóng cửa" value={branch.close === "—" ? "" : branch.close} onChange={value => onChange({ ...branch, close: value })} type="time" />
          <SelectField label="Trạng thái" value={branch.status} onChange={value => onChange({ ...branch, status: value as BranchStatus })} options={[["active", "Đang hoạt động"], ["locked", "Đã khóa"]]} />
          <div className="col-span-2">
            <VietnamAddressPicker
              value={addressValue}
              onChange={value => {
                setAddressValue(value);
                onChange({ ...branch, address: value.fullAddress });
              }}
              label="Địa chỉ chi nhánh"
              required
            />
          </div>
          <div className="col-span-2">
            <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 500}}>Địa chỉ cụ thể</label>
            <textarea
              value={branch.addressDetail}
              onChange={event => onChange({ ...branch, addressDetail: event.target.value })}
              rows={2}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] resize-none"
              style={{fontSize: '13.5px'}}
              placeholder="Tầng, mặt bằng, landmark, hướng dẫn vào cửa..."
            />
          </div>
          <Field label="Vĩ độ OpenStreetMap" value={String(branch.latitude ?? "")} onChange={value => onChange({ ...branch, latitude: parseCoordinate(value) })} />
          <Field label="Kinh độ OpenStreetMap" value={String(branch.longitude ?? "")} onChange={value => onChange({ ...branch, longitude: parseCoordinate(value) })} />
          <div className="col-span-2">
            <Field label="Link OpenStreetMap cụ thể" value={branch.mapUrl} onChange={value => onChange({ ...branch, mapUrl: value })} />
          </div>
          <div className="col-span-2">
            <OpenStreetMapLocationPanel
              address={addressValue.fullAddress || branch.address || branch.name}
              title="Kiểm tra vị trí chi nhánh"
              latitude={branch.latitude}
              longitude={branch.longitude}
              mapUrl={branch.mapUrl}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 bg-[#0F4761] text-white rounded-xl hover:bg-[#0d3d54] disabled:opacity-60" style={{fontSize: '13.5px'}}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchLockModal({
  branch,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  branch: Branch;
  reason: string;
  saving: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <PowerOff size={20} className="text-red-500" />
          </div>
          <h2 style={{fontSize: '17px', fontWeight: 700, color: '#111827'}}>Khóa chi nhánh?</h2>
          <p style={{fontSize: '13.5px', color: '#6B7280', marginTop: '6px'}}>
            Chi nhánh <strong style={{color: '#111827'}}>{branch.name}</strong> sẽ chuyển sang trạng thái inactive và có thể mở khóa lại.
          </p>
          <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 500, display: 'block', marginTop: '16px'}}>Lý do khóa *</label>
          <textarea
            value={reason}
            onChange={event => onReasonChange(event.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] resize-none"
            style={{fontSize: '13.5px'}}
            placeholder="Nhập lý do khóa chi nhánh..."
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{fontSize: '13.5px'}}>Hủy</button>
          <button onClick={onConfirm} disabled={!reason.trim() || saving} className="px-5 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50" style={{fontSize: '13.5px'}}>
            {saving ? "Đang khóa..." : "Khóa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchImageField({
  value,
  uploading,
  onFileChange,
  onUrlChange,
}: {
  value: string;
  uploading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUrlChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 600}}>Ảnh chi nhánh</label>
      <div className="mt-1 grid gap-3 md:grid-cols-[160px_1fr]">
        <div className="h-28 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
          {value ? (
            <img src={value} alt="Ảnh chi nhánh" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-gray-400" style={{fontSize: '12px'}}>
              <Upload size={24} className="mx-auto mb-1" />
              Chưa có ảnh
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0F4761] px-3 py-2 text-white disabled:opacity-60" style={{fontSize: '13px', fontWeight: 600}}>
            <Upload size={15} />
            {uploading ? "Đang tải..." : "Chọn ảnh"}
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploading} />
          </label>
          <input
            value={value}
            onChange={event => onUrlChange(event.target.value)}
            placeholder="Hoặc nhập URL ảnh chi nhánh"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761]"
            style={{fontSize: '13px'}}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 500}}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761]"
        style={{fontSize: '13.5px'}}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<string | [string, string]> }) {
  return (
    <div>
      <label style={{fontSize: '12.5px', color: '#374151', fontWeight: 500}}>{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] bg-white"
        style={{fontSize: '13.5px'}}
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
