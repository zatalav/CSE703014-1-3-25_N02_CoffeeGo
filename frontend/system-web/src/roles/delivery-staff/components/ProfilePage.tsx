import { LogOut, Package, ShieldCheck, Star, User } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { t, fmt } from "./theme";
import type { Order } from "./types";

export default function ProfilePage({ orders }: { orders: Order[] }) {
  const { session, logout } = useAuth();
  const user = session?.userInfo;
  const completed = orders.filter((order) => order.status === "done");
  const name = user?.name || user?.email || user?.phoneNumber || "Nhan vien van chuyen";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NV";

  return (
    <div className="px-10 py-8 max-w-[960px] mx-auto">
      <h1 style={{ color: t.text, fontSize: 26, fontWeight: 600, letterSpacing: 0, marginBottom: 24 }}>
        Ho so
      </h1>

      <div className="rounded-xl p-6 mb-6 flex items-center gap-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: 72, height: 72, background: t.accentSoft, border: `1px solid ${t.accentBorder}`, color: t.accent, fontSize: 24, fontWeight: 600 }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <div style={{ color: t.text, fontSize: 20, fontWeight: 600 }}>{name}</div>
          <div style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>
            {user?.email || user?.phoneNumber || "Tai khoan nhan vien"}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span
              className="rounded-md flex items-center gap-1"
              style={{ background: t.successSoft, color: t.success, fontSize: 11, padding: "3px 8px", border: "1px solid rgba(16,185,129,0.35)" }}
            >
              <ShieldCheck size={11} /> {user?.status || "active"}
            </span>
            <span
              className="rounded-md flex items-center gap-1"
              style={{ background: t.accentSoft, color: t.accent, fontSize: 11, padding: "3px 8px", border: `1px solid ${t.accentBorder}` }}
            >
              <User size={11} /> {user?.roleName || "Delivery Staff"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard icon={Package} label="Don dang hien thi" value={String(orders.length)} />
        <MetricCard icon={Star} label="Da giao" value={String(completed.length)} />
        <MetricCard icon={Package} label="Tong tien da giao" value={fmt(completed.reduce((sum, order) => sum + order.total, 0))} />
      </div>

      <button
        onClick={() => void logout()}
        className="w-full rounded-xl flex items-center justify-center gap-2 mt-6"
        style={{ background: t.surface, color: t.danger, border: `1px solid ${t.border}`, padding: "12px", fontSize: 14, fontWeight: 500 }}
      >
        <LogOut size={15} /> Dang xuat
      </button>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: t.textMuted, fontSize: 13 }}>{label}</span>
        <Icon size={16} style={{ color: t.textMuted }} />
      </div>
      <div style={{ color: t.text, fontSize: 22, fontWeight: 600, letterSpacing: 0, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
