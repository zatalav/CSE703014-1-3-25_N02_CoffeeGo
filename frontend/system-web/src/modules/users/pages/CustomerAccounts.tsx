import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Calendar,
  Download,
  Eye,
  Filter,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import type { PageResponse } from "../../../lib/types";

type Tier = "Gold" | "Platinum" | "Black";
type Status = "active" | "inactive" | "blocked";

type CustomerAccountDto = {
  id: number;
  name?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  status?: string | null;
  createdAt?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  rankName?: string | null;
  rank?: string | null;
  expPoint?: number | null;
  dripsPoint?: number | null;
  totalMoney?: number | null;
  totalOrders?: number | null;
  lastOrderAt?: string | null;
};

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: Tier;
  status: Status;
  points: number;
  totalOrders: number;
  totalSpent: number;
  joinedAt: string;
  lastOrderAt: string;
  birthday: string;
  gender: "Nam" | "Nu" | "Khac";
  note: string;
};

const tierColors: Record<Tier, string> = {
  Gold: "bg-amber-100 text-amber-700",
  Platinum: "bg-purple-100 text-purple-700",
  Black: "bg-gray-900 text-white",
};

const statusLabel: Record<Status, string> = {
  active: "Dang hoat dong",
  inactive: "Khong hoat dong",
  blocked: "Da khoa",
};

const statusColors: Record<Status, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  blocked: "bg-red-100 text-red-700",
};

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const fmtCurrency = (value: number) => `${value.toLocaleString("vi-VN")}d`;

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = value.slice(0, 10);
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
};

const statusFromApi = (status?: string | null): Status => {
  const normalized = String(status || "active").toLowerCase();
  return normalized === "inactive" || normalized === "locked" || normalized === "blocked" ? "blocked" : "active";
};

const genderFromApi = (gender?: string | null): Customer["gender"] => {
  const normalized = String(gender || "").toLowerCase();
  if (normalized === "male" || normalized === "nam") return "Nam";
  if (normalized === "female" || normalized === "nu") return "Nu";
  return "Khac";
};

const tierFromApi = (rank?: string | null, spent = 0, orders = 0, points = 0): Tier => {
  const normalized = String(rank || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("black")) return "Black";
  if (normalized.includes("platinum")) return "Platinum";
  if (normalized.includes("gold") || normalized.includes("vang")) return "Gold";
  if (spent >= 3_000_000 || orders >= 30 || points >= 3000) return "Black";
  if (spent >= 1_500_000 || orders >= 16 || points >= 1500) return "Platinum";
  return "Gold";
};

const toCustomer = (dto: CustomerAccountDto): Customer => ({
  id: Number(dto.id),
  name: dto.name || `Khach hang #${dto.id}`,
  email: dto.email || "",
  phone: dto.phoneNumber || dto.phone || "",
  address: dto.address || "",
  tier: tierFromApi(dto.rankName || dto.rank, Number(dto.totalMoney ?? 0), Number(dto.totalOrders ?? 0), Number(dto.dripsPoint ?? dto.expPoint ?? 0)),
  status: statusFromApi(dto.status),
  points: Number(dto.dripsPoint ?? dto.expPoint ?? 0),
  totalOrders: Number(dto.totalOrders ?? 0),
  totalSpent: Number(dto.totalMoney ?? 0),
  joinedAt: formatDate(dto.createdAt) || "Chua cap nhat",
  lastOrderAt: formatDate(dto.lastOrderAt),
  birthday: formatDate(dto.dateOfBirth),
  gender: genderFromApi(dto.gender),
  note: "",
});

export function CustomerAccounts() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"" | Tier>("");
  const [status, setStatus] = useState<"" | Status>("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [locking, setLocking] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [lockReason, setLockReason] = useState("");
  const pageSize = 8;

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.get<PageResponse<CustomerAccountDto> | CustomerAccountDto[]>(
        "/admin/users/customers?size=100&sort=id,desc",
      );
      setItems(pageItems(data).map(toCustomer));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai danh sach khach hang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter(customer => {
      const code = `KH-${String(customer.id).padStart(4, "0")}`.toLowerCase();
      const matchQuery = !keyword || [code, customer.name, customer.email, customer.phone]
        .some(value => value.toLowerCase().includes(keyword));
      return matchQuery && (!tier || customer.tier === tier) && (!status || customer.status === status);
    });
  }, [items, query, status, tier]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(item => item.status === "active").length,
    vip: items.filter(item => item.tier === "Platinum" || item.tier === "Black").length,
    revenue: items.reduce((sum, item) => sum + item.totalSpent, 0),
  }), [items]);

  const lockCustomer = async () => {
    if (!locking || !lockReason.trim()) return;
    try {
      await api.patch<CustomerAccountDto>(`/admin/users/customers/${locking.id}/lock`);
      setLocking(null);
      setLockReason("");
      toast.success("Da khoa tai khoan khach hang");
      await loadCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the khoa tai khoan khach hang");
    }
  };

  const unlockCustomer = async (customer: Customer) => {
    try {
      await api.patch<CustomerAccountDto>(`/admin/users/customers/${customer.id}/unlock`);
      toast.success("Da mo khoa tai khoan khach hang");
      await loadCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the mo khoa tai khoan khach hang");
    }
  };

  const deleteCustomer = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await api.del<void>(`/admin/users/customers/${target.id}`);
      setDeleting(null);
      toast.success("Da xoa tai khoan khach hang");
      await loadCustomers();
      setItems(prev => prev.filter(item => item.id !== target.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa tai khoan khach hang");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Quan ly khach hang</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Tai khoan khach hang doc truc tiep tu database</p>
        </div>
        <button className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl hover:bg-gray-50" style={{ fontSize: "13px" }}>
          <Download size={14} /> Xuat Excel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tong khach hang", value: stats.total.toLocaleString("vi-VN"), color: "bg-blue-50 text-blue-600" },
          { label: "Dang hoat dong", value: stats.active.toLocaleString("vi-VN"), color: "bg-green-50 text-green-600" },
          { label: "Khach VIP", value: stats.vip.toLocaleString("vi-VN"), color: "bg-amber-50 text-amber-600" },
          { label: "Tong chi tieu", value: fmtCurrency(stats.revenue), color: "bg-purple-50 text-purple-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p style={{ fontSize: "12.5px", color: "#6B7280" }}>{stat.label}</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "#0F4761", marginTop: "6px" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={event => { setQuery(event.target.value); setPage(1); }}
            placeholder="Tim theo ten hoac ma khach hang..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761]"
            style={{ fontSize: "13.5px" }}
          />
        </div>
        <div className="flex items-center gap-2 text-gray-500" style={{ fontSize: "13px" }}>
          <Filter size={14} /> Loc:
        </div>
        <select value={tier} onChange={event => { setTier(event.target.value as Tier | ""); setPage(1); }} className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none bg-white" style={{ fontSize: "13.5px" }}>
          <option value="">Tat ca hang</option>
          <option>Gold</option><option>Platinum</option><option>Black</option>
        </select>
        <select value={status} onChange={event => { setStatus(event.target.value as Status | ""); setPage(1); }} className="px-3 py-2.5 border border-gray-200 rounded-xl outline-none bg-white" style={{ fontSize: "13.5px" }}>
          <option value="">Tat ca trang thai</option>
          <option value="active">Dang hoat dong</option>
          <option value="inactive">Khong hoat dong</option>
          <option value="blocked">Da khoa</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Ma KH", "Khach hang", "Lien he", "Hang", "Diem", "Don hang", "Chi tieu", "Trang thai", ""].map(label => (
                <th key={label} className="text-left px-4 py-3" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(customer => (
              <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3" style={{ fontSize: "12.5px", color: "#6B7280", fontFamily: "monospace" }}>KH-{String(customer.id).padStart(4, "0")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0F4761] flex items-center justify-center text-white" style={{ fontSize: "12px", fontWeight: 700 }}>
                      {customer.name.split(" ").slice(-2).map(word => word[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#1F2937" }}>{customer.name}</div>
                      <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>Tham gia {customer.joinedAt}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div style={{ fontSize: "12.5px", color: "#374151" }}>{customer.phone || "Chua cap nhat"}</div>
                  <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{customer.email || "Chua cap nhat"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full ${tierColors[customer.tier]}`} style={{ fontSize: "11.5px", fontWeight: 600 }}>{customer.tier}</span>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#0F4761", fontWeight: 600 }}>{customer.points.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151" }}>{customer.totalOrders}</td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{fmtCurrency(customer.totalSpent)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full ${statusColors[customer.status]}`} style={{ fontSize: "11.5px" }}>{statusLabel[customer.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewing(customer)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="Xem"><Eye size={15} /></button>
                    {customer.status === "blocked" ? (
                      <button onClick={() => void unlockCustomer(customer)} className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title="Mo khoa"><Unlock size={15} /></button>
                    ) : (
                      <button onClick={() => { setLocking(customer); setLockReason(""); }} className="p-1.5 hover:bg-orange-50 text-orange-600 rounded-lg" title="Khoa"><Lock size={15} /></button>
                    )}
                    <button onClick={() => setDeleting(customer)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg" title="Xoa"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400" style={{ fontSize: "13px" }}>Khong tim thay khach hang phu hop.</td></tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-8 text-center text-gray-400" style={{ fontSize: "13px" }}>Dang tai khach hang tu database...</div>}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p style={{ fontSize: "12.5px", color: "#6B7280" }}>
            Hien thi {rows.length ? (page - 1) * pageSize + 1 : 0}-{(page - 1) * pageSize + rows.length} trong {filtered.length} khach hang
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40" style={{ fontSize: "12.5px" }}>{"<"}</button>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button key={index} onClick={() => setPage(index + 1)} className={`px-3 py-1.5 border rounded-lg ${page === index + 1 ? "bg-[#0F4761] text-white border-[#0F4761]" : "border-gray-200 text-gray-600"}`} style={{ fontSize: "12.5px" }}>{index + 1}</button>
            ))}
            <button onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40" style={{ fontSize: "12.5px" }}>{">"}</button>
          </div>
        </div>
      </div>

      {viewing && (
        <CustomerDetailModal
          customer={viewing}
          onClose={() => setViewing(null)}
          onLock={() => { setLocking(viewing); setLockReason(""); setViewing(null); }}
          onUnlock={() => { void unlockCustomer(viewing); setViewing(null); }}
        />
      )}

      {locking && (
        <ConfirmActionModal
          icon={<Lock size={20} className="text-red-500" />}
          title="Khoa tai khoan khach hang?"
          description={`Tai khoan cua ${locking.name} se chuyen sang trang thai da khoa.`}
          confirmLabel="Khoa"
          confirmClass="bg-red-500 hover:bg-red-600"
          disabled={!lockReason.trim()}
          onClose={() => setLocking(null)}
          onConfirm={() => void lockCustomer()}
        >
          <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500, display: "block", marginTop: "16px" }}>Ly do khoa *</label>
          <textarea
            value={lockReason}
            onChange={event => setLockReason(event.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#0F4761] resize-none"
            style={{ fontSize: "13.5px" }}
            placeholder="Nhap ly do khoa tai khoan..."
          />
        </ConfirmActionModal>
      )}

      {deleting && (
        <ConfirmActionModal
          icon={<Trash2 size={20} className="text-red-500" />}
          title="Xoa tai khoan khach hang?"
          description={`Tai khoan ${deleting.name} se bi xoa khoi database.`}
          confirmLabel="Xoa"
          confirmClass="bg-red-500 hover:bg-red-600"
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteCustomer()}
        />
      )}
    </div>
  );
}

function CustomerDetailModal({
  customer,
  onClose,
  onLock,
  onUnlock,
}: {
  customer: Customer;
  onClose: () => void;
  onLock: () => void;
  onUnlock: () => void;
}) {
  const rows = [
    { icon: <Mail size={15} className="text-[#0F4761]" />, label: "Email", value: customer.email || "Chua cap nhat" },
    { icon: <Phone size={15} className="text-[#0F4761]" />, label: "So dien thoai", value: customer.phone || "Chua cap nhat" },
    { icon: <MapPin size={15} className="text-[#0F4761]" />, label: "Dia chi", value: customer.address || "Chua cap nhat" },
    { icon: <Calendar size={15} className="text-[#0F4761]" />, label: "Sinh nhat", value: customer.birthday || "Chua cap nhat" },
    { icon: <Calendar size={15} className="text-[#0F4761]" />, label: "Tham gia / Don cuoi", value: `${customer.joinedAt} -> ${customer.lastOrderAt || "Chua co"}` },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Chi tiet khach hang</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0F4761] flex items-center justify-center text-white" style={{ fontSize: "20px", fontWeight: 700 }}>
              {customer.name.split(" ").slice(-2).map(word => word[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{customer.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full ${tierColors[customer.tier]}`} style={{ fontSize: "11.5px", fontWeight: 600 }}>{customer.tier}</span>
                <span className={`px-2.5 py-0.5 rounded-full ${statusColors[customer.status]}`} style={{ fontSize: "11.5px" }}>{statusLabel[customer.status]}</span>
              </div>
              <p style={{ fontSize: "12.5px", color: "#9CA3AF", marginTop: "2px", fontFamily: "monospace" }}>KH-{String(customer.id).padStart(4, "0")}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon={<Award size={13} />} label="Diem tich luy" value={customer.points.toLocaleString("vi-VN")} tone="blue" />
            <MetricCard icon={<ShoppingBag size={13} />} label="Tong don" value={String(customer.totalOrders)} tone="green" />
            <MetricCard label="Tong chi tieu" value={fmtCurrency(customer.totalSpent)} tone="amber" />
          </div>
          <div className="grid grid-cols-1 gap-0 divide-y divide-gray-50 border border-gray-100 rounded-xl px-4">
            {rows.map(row => (
              <div key={row.label} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#EBF4FA] flex items-center justify-center shrink-0">{row.icon}</div>
                <div className="flex-1">
                  <p style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{row.label}</p>
                  <p style={{ fontSize: "13.5px", color: "#1F2937", fontWeight: 500 }}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>Dong</button>
          {customer.status === "blocked" ? (
            <button onClick={onUnlock} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700" style={{ fontSize: "13.5px" }}>Mo khoa</button>
          ) : (
            <button onClick={onLock} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600" style={{ fontSize: "13.5px" }}>Khoa tai khoan</button>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone: "blue" | "green" | "amber" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];
  return (
    <div className={`${toneClass} rounded-xl p-3.5`}>
      <div className="flex items-center gap-1.5" style={{ fontSize: "11.5px" }}>{icon}{label}</div>
      <p style={{ fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>{value}</p>
    </div>
  );
}

function ConfirmActionModal({
  icon,
  title,
  description,
  confirmLabel,
  confirmClass,
  disabled = false,
  onClose,
  onConfirm,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">{icon}</div>
          <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>{title}</h2>
          <p style={{ fontSize: "13.5px", color: "#6B7280", marginTop: "6px" }}>{description}</p>
          {children}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600" style={{ fontSize: "13.5px" }}>Huy</button>
          <button onClick={onConfirm} disabled={disabled} className={`px-5 py-2 text-white rounded-xl disabled:opacity-50 ${confirmClass}`} style={{ fontSize: "13.5px" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
