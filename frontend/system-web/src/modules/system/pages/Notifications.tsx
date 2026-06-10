import { useState } from "react";
import { Bell, AlertTriangle, ShoppingBag, Package, TrendingUp, CheckCheck, Trash2, Settings } from "lucide-react";
import { DeleteConfirmModal } from "../../../shared/components/DeleteConfirmModal";

type NotifType = "order" | "stock" | "ai" | "system" | "all";

const allNotifs: Array<{ id: number; type: Exclude<NotifType, "all">; icon: any; title: string; body: string; time: string; read: boolean; level: string }> = [];

const tabItems: { key: NotifType; label: string; icon: any }[] = [
  { key: "all", label: "Tất cả", icon: Bell },
  { key: "order", label: "Đơn hàng", icon: ShoppingBag },
  { key: "stock", label: "Kho hàng", icon: Package },
  { key: "ai", label: "AI", icon: TrendingUp },
  { key: "system", label: "Hệ thống", icon: Settings },
];

const levelColors: Record<string, { dot: string; bg: string }> = {
  critical: { dot: "bg-red-500", bg: "bg-red-50" },
  warning: { dot: "bg-yellow-400", bg: "bg-yellow-50" },
  info: { dot: "bg-blue-400", bg: "bg-blue-50/40" },
};

export function Notifications() {
  const [activeTab, setActiveTab] = useState<NotifType>("all");
  const [notifs, setNotifs] = useState(allNotifs);
  const [deleting, setDeleting] = useState<(typeof allNotifs)[number] | null>(null);

  const filtered = activeTab === "all" ? notifs : notifs.filter(n => n.type === activeTab);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(notifs.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));
  const remove = () => {
    if (!deleting) return;
    setNotifs(notifs.filter(n => n.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Thông báo</h1>
            {unread > 0 && (
              <span className="px-2.5 py-1 bg-red-500 text-white rounded-full" style={{ fontSize: "12px", fontWeight: 700 }}>{unread} mới</span>
            )}
          </div>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Trung tâm thông báo hệ thống</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
            style={{ fontSize: "13px" }}
          >
            <CheckCheck size={14} className="text-green-600" /> Đọc tất cả
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Chưa đọc", count: unread, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Đơn hàng", count: notifs.filter(n => n.type === "order").length, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Kho hàng", count: notifs.filter(n => n.type === "stock").length, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
          { label: "AI cảnh báo", count: notifs.filter(n => n.type === "ai").length, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border shadow-sm ${s.bg}`}>
            <div style={{ fontSize: "12px", color: "#6B7280" }}>{s.label}</div>
            <div style={{ fontSize: "32px", fontWeight: 800 }} className={s.color}>{s.count}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Tab list */}
        <div className="w-44 shrink-0 space-y-1">
          {tabItems.map(t => {
            const Icon = t.icon;
            const count = t.key === "all" ? notifs.filter(n => !n.read).length : notifs.filter(n => n.type === t.key && !n.read).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === t.key ? "bg-[#0F4761] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                style={{ fontSize: "13.5px" }}
              >
                <div className="flex items-center gap-2">
                  <Icon size={15} />
                  {t.label}
                </div>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === t.key ? "bg-white/20 text-white" : "bg-red-100 text-red-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div className="flex-1 space-y-2">
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <Bell size={40} className="text-gray-300 mx-auto mb-3" />
              <p style={{ fontSize: "14px", color: "#9CA3AF" }}>Không có thông báo nào</p>
            </div>
          )}
          {filtered.map(n => {
            const Icon = n.icon;
            const lc = levelColors[n.level];
            return (
              <div
                key={n.id}
                className={`rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4 transition-all ${!n.read ? "bg-blue-50/40" : "bg-white"}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lc.bg}`}>
                  <Icon size={18} className={`${n.level === "critical" ? "text-red-500" : n.level === "warning" ? "text-yellow-500" : "text-blue-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p style={{ fontSize: "13.5px", fontWeight: n.read ? 500 : 700, color: "#111827" }}>{n.title}</p>
                      {!n.read && <div className={`w-2 h-2 rounded-full shrink-0 ${lc.dot}`} />}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{n.time}</span>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600" title="Đánh dấu đã đọc">
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => setDeleting(n)} className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500" title="Xóa">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {deleting && (
        <DeleteConfirmModal
          title="Xoa thong bao?"
          description={<>Thong bao <strong style={{ color: "#111827" }}>{deleting.title}</strong> se bi xoa khoi danh sach.</>}
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
