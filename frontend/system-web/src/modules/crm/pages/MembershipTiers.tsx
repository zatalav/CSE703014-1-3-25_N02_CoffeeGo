import { useEffect, useMemo, useState } from "react";
import { Award, Plus, Edit2, Trash2, Users, TrendingUp, Gift, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { api } from "../../../lib/api";
import type { MembershipRankDto, MembershipRankRequestDto, PageResponse } from "../../../lib/types";

type TierStatus = "active" | "inactive";

type Tier = {
  id: number;
  name: string;
  rankOrder: number;
  minExp: number;
  discount: number;
  expMultiplier: number;
  dripsMultiplier: number;
  description: string;
  status: TierStatus;
  color: string;
  icon: string;
  benefits: string[];
  members: number;
};

type CustomerAccountDto = {
  id: number;
  status?: string | null;
  rankName?: string | null;
  rank?: string | null;
  createdAt?: string | null;
};

const DEFAULT_RANK_NAME = "Gold";
const VIP_RANK_KEYS = new Set(["platinum", "black"]);
const tierColors = ["#0F4761", "#2563EB", "#7C3AED", "#D97706", "#059669", "#DC2626"];
const tierIcons = ["*", "◆", "★", "♛", "●", "▲"];

function pageItems<T>(data: PageResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items;
}

function activeStatus(status?: string | null) {
  return !status || status.toLowerCase() === "active";
}

function normalizeRankName(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function rankKeyForCustomer(customer: CustomerAccountDto) {
  return normalizeRankName(customer.rankName || customer.rank || DEFAULT_RANK_NAME);
}

function monthIndex(date: Date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function createdMonthIndex(customer: CustomerAccountDto) {
  if (!customer.createdAt) return null;
  const createdAt = new Date(customer.createdAt);
  return Number.isNaN(createdAt.getTime()) ? null : monthIndex(createdAt);
}

function calculateMonthlyGrowth(customers: CustomerAccountDto[]) {
  const currentMonth = monthIndex(new Date());
  const previousMonth = currentMonth - 1;
  const currentCount = customers.filter(customer => createdMonthIndex(customer) === currentMonth).length;
  const previousCount = customers.filter(customer => createdMonthIndex(customer) === previousMonth).length;
  if (previousCount === 0) return currentCount > 0 ? 100 : 0;
  return Math.round(((currentCount - previousCount) / previousCount) * 100);
}

async function loadAllCustomers() {
  const size = 500;
  const firstPage = await api.get<PageResponse<CustomerAccountDto> | CustomerAccountDto[]>(
    `/admin/users/customers?page=0&size=${size}&sort=id,desc`,
  );
  if (Array.isArray(firstPage)) return firstPage;

  const items = [...(firstPage.items || [])];
  const totalPages = firstPage.totalPages || 1;
  for (let page = 1; page < totalPages; page += 1) {
    const nextPage = await api.get<PageResponse<CustomerAccountDto> | CustomerAccountDto[]>(
      `/admin/users/customers?page=${page}&size=${size}&sort=id,desc`,
    );
    items.push(...pageItems(nextPage));
  }
  return items;
}

function applyMemberCounts(tiers: Tier[], customers: CustomerAccountDto[]) {
  const countsByRank = new Map<string, number>();
  customers
    .filter(customer => activeStatus(customer.status))
    .forEach(customer => {
      const rankKey = rankKeyForCustomer(customer);
      countsByRank.set(rankKey, (countsByRank.get(rankKey) || 0) + 1);
    });

  return tiers.map(tier => ({
    ...tier,
    members: countsByRank.get(normalizeRankName(tier.name)) || 0,
  }));
}

function benefitsFromDescription(description?: string | null) {
  const items = (description || "")
    .split(/\r?\n|;/)
    .map(item => item.trim())
    .filter(Boolean);
  return items.length ? items : [""];
}

function descriptionFromBenefits(benefits: string[]) {
  const cleaned = benefits.map(item => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join("; ") : null;
}

function toTier(dto: MembershipRankDto, index: number): Tier {
  const description = dto.description || "";
  return {
    id: dto.rankId,
    name: dto.rankName || "",
    rankOrder: dto.rankOrder || index + 1,
    minExp: dto.minExp || 0,
    discount: dto.discountPercent || 0,
    expMultiplier: dto.expMultiplier || 1,
    dripsMultiplier: dto.dripsMultiplier || 1,
    description,
    status: activeStatus(dto.status) ? "active" : "inactive",
    color: dto.color || tierColors[index % tierColors.length],
    icon: dto.icon || tierIcons[index % tierIcons.length],
    benefits: benefitsFromDescription(description),
    members: 0,
  };
}

function toRequest(tier: Tier): MembershipRankRequestDto {
  return {
    rankName: tier.name.trim(),
    rankOrder: tier.rankOrder,
    minExp: tier.minExp,
    discountPercent: tier.discount,
    expMultiplier: tier.expMultiplier,
    dripsMultiplier: tier.dripsMultiplier,
    description: descriptionFromBenefits(tier.benefits),
    status: tier.status,
    color: tier.color,
    icon: tier.icon.trim() || null,
  };
}

function emptyTier(rankOrder: number): Tier {
  return {
    id: 0,
    name: "",
    rankOrder,
    minExp: 0,
    discount: 0,
    expMultiplier: 1,
    dripsMultiplier: 1,
    description: "",
    status: "active",
    color: tierColors[(rankOrder - 1) % tierColors.length],
    icon: tierIcons[(rankOrder - 1) % tierIcons.length],
    benefits: [""],
    members: 0,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Không thể kết nối database hạng thành viên.";
}

export function MembershipTiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [customers, setCustomers] = useState<CustomerAccountDto[]>([]);
  const [nextRankOrder, setNextRankOrder] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Tier | null>(null);

  const activeCustomers = useMemo(() => customers.filter(customer => activeStatus(customer.status)), [customers]);
  const totalMembers = activeCustomers.length;
  const activeCount = useMemo(() => tiers.filter(tier => tier.status === "active").length, [tiers]);
  const vipMembers = useMemo(
    () => activeCustomers.filter(customer => VIP_RANK_KEYS.has(rankKeyForCustomer(customer))).length,
    [activeCustomers],
  );
  const monthlyGrowth = useMemo(() => calculateMonthlyGrowth(activeCustomers), [activeCustomers]);
  const tierData = tiers.map(tier => ({
    name: tier.name,
    value: totalMembers ? Math.round((tier.members / totalMembers) * 100) : 0,
    color: tier.color,
  }));

  const loadTiers = async () => {
    try {
      setLoading(true);
      setError("");
      const [data, customers] = await Promise.all([
        api.get<PageResponse<MembershipRankDto> | MembershipRankDto[]>("/customers/membership-ranks?size=100&sort=rankOrder,asc"),
        loadAllCustomers(),
      ]);
      const mapped = pageItems(data).map(toTier);
      setCustomers(customers);
      setNextRankOrder(mapped.reduce((max, tier) => Math.max(max, tier.rankOrder), 0) + 1);
      setTiers(applyMemberCounts(mapped, customers).filter(tier => tier.status === "active"));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTiers();
  }, []);

  const openAdd = () => {
    setEditing(emptyTier(nextRankOrder));
    setShowForm(true);
  };

  const openEdit = (tier: Tier) => {
    setEditing({ ...tier, benefits: tier.benefits.length ? [...tier.benefits] : [""] });
    setShowForm(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Vui lòng nhập tên hạng thành viên.");
      return;
    }
    if (editing.rankOrder < 1) {
      toast.error("Thứ tự hạng phải lớn hơn 0.");
      return;
    }
    if (editing.minExp < 0) {
      toast.error("Điều kiện xét hạng không được âm.");
      return;
    }
    if (editing.discount < 0 || editing.discount > 100) {
      toast.error("Giảm giá phải nằm trong khoảng 0 đến 100%.");
      return;
    }
    if (editing.expMultiplier <= 0 || editing.dripsMultiplier <= 0) {
      toast.error("Hệ số tích lũy phải lớn hơn 0.");
      return;
    }

    try {
      setSaving(true);
      const request = toRequest(editing);
      const isExisting = editing.id > 0 && tiers.some(tier => tier.id === editing.id);
      const saved = isExisting
        ? await api.put<MembershipRankDto>(`/customers/membership-ranks/${editing.id}`, request)
        : await api.post<MembershipRankDto>("/customers/membership-ranks", request);
      const mapped = toTier(saved, Math.max(0, editing.rankOrder - 1));
      setNextRankOrder(prev => Math.max(prev, mapped.rankOrder + 1));
      setShowForm(false);
      setEditing(null);
      await loadTiers();
      toast.success(isExisting ? "Đã cập nhật hạng thành viên" : "Đã thêm hạng thành viên");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDel) return;
    try {
      setSaving(true);
      await api.del<void>(`/customers/membership-ranks/${confirmDel.id}`);
      setTiers(prev => prev.filter(tier => tier.id !== confirmDel.id));
      setConfirmDel(null);
      toast.success("Đã xóa hạng thành viên");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{fontSize: "22px", fontWeight: 700, color: "#0F4761"}}>Hạng thành viên</h1>
          <p style={{fontSize: "13px", color: "#6B7280", marginTop: "2px"}}>Cấu hình các hạng thành viên từ bảng Membership_rank</p>
        </div>
        <button onClick={openAdd} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3d54] disabled:opacity-60" style={{fontSize: "13.5px"}}>
          <Plus size={15} /> Thêm hạng
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <span style={{fontSize: "13px", color: "#B91C1C"}}>{error}</span>
          <button onClick={() => void loadTiers()} className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-red-600" style={{fontSize: "12.5px"}}>Thử lại</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tổng thành viên", value: totalMembers.toLocaleString(), icon: Users, color: "text-blue-600" },
          { label: "Số hạng đang hoạt động", value: activeCount, icon: Award, color: "text-purple-600" },
          { label: "Thành viên VIP", value: vipMembers.toLocaleString(), icon: Crown, color: "text-amber-600" },
          { label: "Tăng trưởng tháng", value: `${monthlyGrowth}%`, icon: TrendingUp, color: "text-emerald-600" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span style={{fontSize: "12.5px", color: "#6B7280"}}>{kpi.label}</span>
                <Icon size={16} className={kpi.color} />
              </div>
              <p style={{fontSize: "22px", fontWeight: 700, color: "#111827"}}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center" style={{fontSize: "13px", color: "#6B7280"}}>
          Đang tải hạng thành viên từ database...
        </div>
      ) : tiers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 shadow-sm p-8 text-center">
          <p style={{fontSize: "14px", fontWeight: 600, color: "#111827"}}>Chưa có hạng thành viên trong CSDL</p>
          <p style={{fontSize: "13px", color: "#6B7280", marginTop: "4px"}}>Nhấn Thêm hạng để tạo dữ liệu vào bảng Membership_rank.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {tiers.map(tier => (
            <div key={tier.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4" style={{background: `linear-gradient(135deg, ${tier.color}22, ${tier.color}11)`, borderBottom: `2px solid ${tier.color}`}}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{fontSize: "22px"}}>{tier.icon}</span>
                    <span className="truncate" style={{fontSize: "15px", fontWeight: 700, color: tier.color}}>{tier.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(tier)} className="p-1.5 hover:bg-white rounded-lg text-gray-500" title="Sửa">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setConfirmDel(tier)} className="p-1.5 hover:bg-white rounded-lg text-red-500" title="Xóa">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p style={{fontSize: "11.5px", color: "#6B7280"}}>Từ {tier.minExp.toLocaleString()} điểm</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span style={{fontSize: "12px", color: "#6B7280"}}>Giảm giá</span>
                  <span style={{fontSize: "14px", fontWeight: 700, color: "#0F4761"}}>{tier.discount}%</span>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Gift size={12} className="text-gray-400" />
                    <span style={{fontSize: "11.5px", color: "#9CA3AF", fontWeight: 500}}>Quyền lợi</span>
                  </div>
                  <ul className="space-y-1">
                    {tier.benefits.filter(Boolean).length ? tier.benefits.filter(Boolean).map((benefit, index) => (
                      <li key={index} className="flex items-start gap-1.5" style={{fontSize: "12px", color: "#374151"}}>
                        <span className="text-green-500 mt-0.5">✓</span> {benefit}
                      </li>
                    )) : (
                      <li style={{fontSize: "12px", color: "#9CA3AF"}}>Chưa có mô tả quyền lợi</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "12px"}}>Phân bổ thành viên theo hạng</h3>
          {totalMembers > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(entry: any) => `${entry.name}: ${entry.value}%`}>
                  {tierData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: any) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center" style={{fontSize: "13px", color: "#9CA3AF"}}>Chưa có dữ liệu thành viên</div>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 style={{fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "12px"}}>Số lượng thành viên</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tiers.map(tier => ({name: tier.name, members: tier.members, fill: tier.color}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" style={{fontSize: "11px"}} />
              <YAxis style={{fontSize: "11px"}} />
              <Tooltip />
              <Bar dataKey="members" radius={[6, 6, 0, 0]}>
                {tiers.map((tier, index) => <Cell key={index} fill={tier.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 style={{fontSize: "17px", fontWeight: 700, color: "#111827"}}>
                {editing.id > 0 ? "Sửa hạng" : "Thêm hạng mới"}
              </h2>
              <button onClick={() => setShowForm(false)} disabled={saving} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-60">×</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Tên hạng *</label>
                  <input value={editing.name} onChange={event => setEditing({...editing, name: event.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Thứ tự *</label>
                  <input type="number" min={1} value={editing.rankOrder} onFocus={event => event.currentTarget.select()} onChange={event => setEditing({...editing, rankOrder: parseInt(event.target.value, 10) || 1})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Trạng thái</label>
                  <select value={editing.status} onChange={event => setEditing({...editing, status: event.target.value as TierStatus})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761] bg-white" style={{fontSize: "13.5px"}}>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Điểm tối thiểu</label>
                  <input type="number" min={0} value={editing.minExp} onFocus={event => event.currentTarget.select()} onChange={event => setEditing({...editing, minExp: parseInt(event.target.value, 10) || 0})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Giảm giá (%)</label>
                  <input type="number" min={0} max={100} value={editing.discount} onFocus={event => event.currentTarget.select()} onChange={event => setEditing({...editing, discount: parseInt(event.target.value, 10) || 0})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Nhân EXP</label>
                  <input type="number" min={0.1} step={0.1} value={editing.expMultiplier} onFocus={event => event.currentTarget.select()} onChange={event => setEditing({...editing, expMultiplier: Number(event.target.value) || 1})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Nhân Drips</label>
                  <input type="number" min={0.1} step={0.1} value={editing.dripsMultiplier} onFocus={event => event.currentTarget.select()} onChange={event => setEditing({...editing, dripsMultiplier: Number(event.target.value) || 1})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Màu hạng</label>
                  <input type="color" value={editing.color} onChange={event => setEditing({...editing, color: event.target.value})}
                    className="w-full mt-1 h-[38px] border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Ký hiệu</label>
                  <input value={editing.icon} onChange={event => setEditing({...editing, icon: event.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13.5px"}} />
                </div>
              </div>
              <div>
                <label style={{fontSize: "12.5px", color: "#374151", fontWeight: 500}}>Quyền lợi</label>
                <div className="space-y-2 mt-1">
                  {editing.benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-2">
                      <input value={benefit} onChange={event => {
                        const nextBenefits = [...editing.benefits];
                        nextBenefits[index] = event.target.value;
                        setEditing({...editing, benefits: nextBenefits});
                      }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]" style={{fontSize: "13px"}} placeholder="Mô tả quyền lợi" />
                      <button onClick={() => setEditing({...editing, benefits: editing.benefits.filter((_, itemIndex) => itemIndex !== index)})}
                        className="px-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setEditing({...editing, benefits: [...editing.benefits, ""]})}
                    className="flex items-center gap-1 px-3 py-1.5 text-[#0F4761] hover:bg-blue-50 rounded-lg" style={{fontSize: "12.5px"}}>
                    <Plus size={13} /> Thêm quyền lợi
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-60" style={{fontSize: "13.5px"}}>Hủy</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-[#0F4761] text-white rounded-lg disabled:opacity-60" style={{fontSize: "13.5px"}}>{saving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setConfirmDel(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={event => event.stopPropagation()}>
            <h3 style={{fontSize: "16px", fontWeight: 700, color: "#111827"}}>Xóa hạng "{confirmDel.name}"?</h3>
            <p style={{fontSize: "13px", color: "#6B7280", marginTop: "8px"}}>
              Hạng này sẽ được chuyển sang trạng thái ngừng hoạt động trong database.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDel(null)} disabled={saving} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 disabled:opacity-60" style={{fontSize: "13.5px"}}>Hủy</button>
              <button onClick={remove} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60" style={{fontSize: "13.5px"}}>{saving ? "Đang xóa..." : "Xóa"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
